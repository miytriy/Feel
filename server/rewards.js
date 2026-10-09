// Feel サーバー - 通貨の配布のルール(Firebaseに依存しない部分。テストしやすいように分けてあります)
import { CONFIG } from './config.js'

const HOUR = 3600 * 1000

// 時刻(ミリ秒)→「その日」を表す文字列(例 '2026-10-10')。日本時間・切り替え時刻はCONFIGどおり
export const dayKey = (ms, cfg = CONFIG) =>
  new Date(ms + (cfg.TZ_OFFSET_HOURS - cfg.RESET_HOUR) * HOUR).toISOString().slice(0, 10)

export const prevDayKey = (key) => {
  const d = new Date(`${key}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

// Firestoreの日時(Timestamp) / Date / 数字 のどれでもミリ秒にする。なければ null
export function toMillis(v) {
  if (v == null) return null
  if (typeof v === 'number') return v
  if (typeof v.toMillis === 'function') return v.toMillis()
  if (v instanceof Date) return v.getTime()
  return null
}

const isPosInt = (x) => Number.isInteger(x) && x > 0

// ---------- ログインボーナス ----------
// lb = { lastDay, streak } (ユーザーのデータに保存されているもの。なければ空)
export function loginBonusStatus(lb, nowMs, cfg = CONFIG) {
  const today = dayKey(nowMs, cfg)
  const cur = lb || {}
  const table = cfg.LOGIN_BONUS
  const claimedToday = cur.lastDay === today
  const nextStreak = claimedToday ? (cur.streak || 0) + 1 : cur.lastDay === prevDayKey(today) ? (cur.streak || 0) + 1 : 1
  return {
    canClaim: !claimedToday,
    streak: claimedToday ? cur.streak || 1 : cur.streak && cur.lastDay === prevDayKey(today) ? cur.streak : 0,
    // 次に受け取れるジェム(今日まだなら今日の分、受け取り済みなら明日の分)
    nextAmount: table[(nextStreak - 1) % table.length],
    today,
    nextStreak,
  }
}

export function claimLoginBonus(lb, nowMs, cfg = CONFIG) {
  const st = loginBonusStatus(lb, nowMs, cfg)
  if (!st.canClaim) return { ok: false, error: '今日のログインボーナスは受け取り済みです' }
  return { ok: true, amount: st.nextAmount, state: { lastDay: st.today, streak: st.nextStreak } }
}

// ---------- 対戦の報酬 ----------
export const isValidBattleLevel = (level, cfg = CONFIG) => Object.prototype.hasOwnProperty.call(cfg.BATTLE_REWARD, level)

// ticket = ユーザーのデータの openTicket { id, level, startedAt }。result = 'win' | 'lose'
// daily = { day, count }(その日に報酬をもらった勝利の回数)
export function judgeBattleReward({ ticket, ticketId, result, daily }, nowMs, cfg = CONFIG) {
  if (!ticket || ticket.id !== ticketId) return { ok: false, error: '対戦の記録が見つかりません' }
  const base = { ok: true, closeTicket: true }
  if (result !== 'win') return { ...base, reward: 0, reason: '勝利したときだけ報酬がもらえます' }
  const elapsed = (nowMs - ticket.startedAt) / 1000
  if (elapsed < cfg.BATTLE_MIN_SECONDS) return { ...base, reward: 0, reason: '対戦が短すぎるため、報酬はありません' }
  if (elapsed > cfg.BATTLE_TICKET_MAX_MINUTES * 60) return { ...base, reward: 0, reason: '時間が経ちすぎたため、報酬はありません' }
  const today = dayKey(nowMs, cfg)
  const count = daily && daily.day === today ? daily.count : 0
  if (count >= cfg.BATTLE_REWARD_DAILY_LIMIT) return { ...base, reward: 0, reason: '今日の報酬の上限に達しています', daily: { day: today, count } }
  const reward = cfg.BATTLE_REWARD[ticket.level] || 0
  return { ...base, reward, reason: '', daily: { day: today, count: count + 1 } }
}

// ---------- プレゼント(運営から) ----------
// gift = Firestoreの gifts/{id} の中身 { title, gems, target:'all' | [uid...], startAt?, expiresAt?, enabled? }
export function checkGift(gift, uid, claimed, nowMs, cfg = CONFIG) {
  if (!gift) return { ok: false, error: 'プレゼントが見つかりません' }
  if (gift.enabled === false) return { ok: false, error: 'このプレゼントは受け取れません' }
  if (!isPosInt(gift.gems) || gift.gems > cfg.GIFT_MAX_GEMS) return { ok: false, error: 'このプレゼントの内容が正しくありません' }
  const t = gift.target
  if (!(t === 'all' || (Array.isArray(t) && t.includes(uid)))) return { ok: false, error: 'このプレゼントは受け取れません' }
  const start = toMillis(gift.startAt)
  const end = toMillis(gift.expiresAt)
  if (start != null && nowMs < start) return { ok: false, error: 'まだ受け取れる期間ではありません' }
  if (end != null && nowMs >= end) return { ok: false, error: '受け取り期限が過ぎています' }
  return { ok: true, amount: gift.gems }
}

// ---------- 合言葉(ギフトコード) ----------
export function normalizeCode(raw) {
  if (typeof raw !== 'string') return ''
  return raw.normalize('NFKC').trim().toUpperCase()
}
export const isValidCodeFormat = (code) => /^[A-Z0-9_-]{3,32}$/.test(code)

// codeDoc = gift_codes/{合言葉} { gems, maxUses?, uses?, expiresAt?, startAt?, enabled? }
export function checkCode(codeDoc, alreadyRedeemed, nowMs, cfg = CONFIG) {
  // 存在しない・期限切れ・使い切りは、同じ文言にして、どれが当たっているかを教えない
  const generic = { ok: false, error: '合言葉が正しくないか、使えません' }
  if (!codeDoc || codeDoc.enabled === false) return generic
  if (!isPosInt(codeDoc.gems) || codeDoc.gems > cfg.GIFT_MAX_GEMS) return generic
  const start = toMillis(codeDoc.startAt)
  const end = toMillis(codeDoc.expiresAt)
  if (start != null && nowMs < start) return generic
  if (end != null && nowMs >= end) return generic
  if (codeDoc.maxUses != null && (codeDoc.uses || 0) >= codeDoc.maxUses) return generic
  if (alreadyRedeemed) return { ok: false, error: 'この合言葉は、すでに使っています', used: true }
  return { ok: true, amount: codeDoc.gems }
}
