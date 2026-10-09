// Feel サーバー - APIの本体(Firebaseは外から渡す形にして、テストできるようにしてあります)
import express from 'express'
import cors from 'cors'
import { drawGacha } from './gacha.js'
import { CONFIG } from './config.js'
import {
  dayKey, loginBonusStatus, claimLoginBonus, isValidBattleLevel, judgeBattleReward,
  checkGift, normalizeCode, isValidCodeFormat, checkCode, toMillis,
} from './rewards.js'

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export function createApp({ db, auth, FieldValue, allowedOrigins = [], now = () => Date.now(), randomId = () => Math.random().toString(36).slice(2) + Date.now().toString(36) }) {
  const app = express()
  app.use(express.json())
  app.use(cors({ origin: allowedOrigins }))

  const handleError = (res, e) => {
    if (e instanceof HttpError) return res.status(e.status).json({ error: e.message })
    console.error(e)
    res.status(500).json({ error: 'サーバーでエラーが発生しました' })
  }

  // ログインしている人だけ通す
  async function requireAuth(req, res, next) {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) return res.status(401).json({ error: 'ログインが必要です' })
    try {
      req.user = await auth.verifyIdToken(token)
      next()
    } catch (e) {
      res.status(401).json({ error: '認証に失敗しました' })
    }
  }

  const newUserData = () => ({ gems: CONFIG.INITIAL_GEMS, pityCount: 0, owned: {} })
  const userRefOf = (uid) => db.collection('users').doc(uid)

  // ジェムを増やす(必ず、トランザクションの中で呼ぶ)。増減の記録(gem_logs)も同時に残す
  function grantGems(t, uid, data, amount, reason, ref) {
    const gems = (data.gems || 0) + amount
    t.set(db.collection('gem_logs').doc(), {
      uid, amount, reason, ref: ref || null, balanceAfter: gems, createdAt: FieldValue.serverTimestamp(),
    })
    return gems
  }

  const publicMe = (data) => {
    const t = now()
    const lb = loginBonusStatus(data.loginBonus, t)
    const today = dayKey(t)
    const daily = data.battleDaily && data.battleDaily.day === today ? data.battleDaily.count : 0
    return {
      gems: data.gems, pityCount: data.pityCount, owned: data.owned,
      loginBonus: { canClaim: lb.canClaim, streak: lb.streak, nextAmount: lb.nextAmount, cycle: CONFIG.LOGIN_BONUS },
      battle: { todayCount: daily, dailyLimit: CONFIG.BATTLE_REWARD_DAILY_LIMIT, rewards: CONFIG.BATTLE_REWARD },
    }
  }

  app.get('/', (req, res) => res.send('ok'))
  app.get('/health', (req, res) => res.send('ok'))

  // 自分のデータを取得(初回は自動で作成)
  app.get('/api/me', requireAuth, async (req, res) => {
    try {
      const userRef = userRefOf(req.user.uid)
      const data = await db.runTransaction(async (t) => {
        const snap = await t.get(userRef)
        if (snap.exists) return snap.data()
        t.set(userRef, { ...newUserData(), createdAt: FieldValue.serverTimestamp() })
        return newUserData()
      })
      res.json(publicMe(data))
    } catch (e) {
      handleError(res, e)
    }
  })

  // ガチャを引く
  app.post('/api/gacha', requireAuth, async (req, res) => {
    try {
      const times = Number(req.body?.times)
      if (times !== 1 && times !== 10) throw new HttpError(400, '回数が正しくありません')
      const uid = req.user.uid
      const userRef = userRefOf(uid)
      const logRef = db.collection('gacha_logs').doc()

      const result = await db.runTransaction(async (t) => {
        const snap = await t.get(userRef)
        const data = snap.exists ? snap.data() : newUserData()
        const cost = CONFIG.COST_PER_PULL * times
        if (data.gems < cost) throw new HttpError(400, '通貨が足りません')
        const { pulls, newCount } = drawGacha(times, data.pityCount || 0)
        const owned = { ...(data.owned || {}) }
        for (const pull of pulls) for (const c of pull.characters) owned[c.id] = (owned[c.id] || 0) + 1
        const gems = data.gems - cost
        t.set(userRef, { gems, pityCount: newCount, owned, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
        t.set(logRef, {
          uid, times, cost,
          pulls: pulls.map((p) => ({ pity: p.pity, ids: p.characters.map((c) => c.id) })),
          createdAt: FieldValue.serverTimestamp(),
        })
        return { pulls, gems, pityCount: newCount }
      })
      res.json(result)
    } catch (e) {
      handleError(res, e)
    }
  })

  // ---------- ログインボーナス ----------
  app.post('/api/login-bonus/claim', requireAuth, async (req, res) => {
    try {
      const uid = req.user.uid
      const userRef = userRefOf(uid)
      const out = await db.runTransaction(async (t) => {
        const snap = await t.get(userRef)
        const data = snap.exists ? snap.data() : newUserData()
        const r = claimLoginBonus(data.loginBonus, now())
        if (!r.ok) throw new HttpError(400, r.error)
        const gems = grantGems(t, uid, data, r.amount, 'login_bonus', r.state.lastDay)
        t.set(userRef, { ...(snap.exists ? {} : newUserData()), gems, loginBonus: r.state, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
        return { amount: r.amount, streak: r.state.streak, gems }
      })
      res.json(out)
    } catch (e) {
      handleError(res, e)
    }
  })

  // ---------- 対戦の報酬 ----------
  // 対戦を始めるとき: 「対戦券」をサーバーが発行する(1人1枚。新しく始めると前のものは無効)
  app.post('/api/battle/start', requireAuth, async (req, res) => {
    try {
      const level = Number(req.body?.level)
      if (!isValidBattleLevel(level)) throw new HttpError(400, 'CPUのレベルが正しくありません')
      const userRef = userRefOf(req.user.uid)
      const ticket = { id: randomId(), level, startedAt: now() }
      await db.runTransaction(async (t) => {
        const snap = await t.get(userRef)
        t.set(userRef, { ...(snap.exists ? {} : newUserData()), openTicket: ticket }, { merge: true })
      })
      res.json({ ticketId: ticket.id })
    } catch (e) {
      handleError(res, e)
    }
  })

  // 対戦が終わったとき: 勝利なら報酬(開始から30秒以上・1日5回まで)
  app.post('/api/battle/finish', requireAuth, async (req, res) => {
    try {
      const uid = req.user.uid
      const { ticketId, result } = req.body || {}
      if (typeof ticketId !== 'string' || (result !== 'win' && result !== 'lose')) throw new HttpError(400, 'リクエストが正しくありません')
      const userRef = userRefOf(uid)
      const out = await db.runTransaction(async (t) => {
        const snap = await t.get(userRef)
        if (!snap.exists) throw new HttpError(400, '対戦の記録が見つかりません')
        const data = snap.data()
        const j = judgeBattleReward({ ticket: data.openTicket, ticketId, result, daily: data.battleDaily }, now())
        if (!j.ok) throw new HttpError(400, j.error)
        const update = { openTicket: null, updatedAt: FieldValue.serverTimestamp() }
        let gems = data.gems
        if (j.reward > 0) {
          gems = grantGems(t, uid, data, j.reward, 'battle', ticketId)
          update.gems = gems
        }
        if (j.daily) update.battleDaily = j.daily
        t.set(userRef, update, { merge: true })
        return { reward: j.reward, reason: j.reason, gems, todayCount: j.daily ? j.daily.count : undefined }
      })
      res.json(out)
    } catch (e) {
      handleError(res, e)
    }
  })

  // ---------- 運営からのプレゼント ----------
  // 受け取れるプレゼントの一覧(全員向け + 自分宛て、期限内、未受け取り)
  app.get('/api/gifts', requireAuth, async (req, res) => {
    try {
      const uid = req.user.uid
      const [snap, giftsSnap] = await Promise.all([userRefOf(uid).get(), db.collection('gifts').get()])
      const claimed = (snap.exists && snap.data().claimedGifts) || {}
      const t = now()
      const list = []
      for (const d of giftsSnap.docs) {
        if (claimed[d.id]) continue
        const g = d.data()
        const c = checkGift(g, uid, claimed, t)
        if (c.ok) list.push({ id: d.id, title: String(g.title || 'プレゼント'), message: g.message ? String(g.message) : '', gems: c.amount, expiresAt: toMillis(g.expiresAt) })
      }
      res.json({ gifts: list })
    } catch (e) {
      handleError(res, e)
    }
  })

  app.post('/api/gifts/claim', requireAuth, async (req, res) => {
    try {
      const uid = req.user.uid
      const giftId = req.body?.giftId
      if (typeof giftId !== 'string' || !giftId || giftId.includes('/')) throw new HttpError(400, 'リクエストが正しくありません')
      const userRef = userRefOf(uid)
      const giftRef = db.collection('gifts').doc(giftId)
      const out = await db.runTransaction(async (t) => {
        const [uSnap, gSnap] = [await t.get(userRef), await t.get(giftRef)]
        const data = uSnap.exists ? uSnap.data() : newUserData()
        const claimed = data.claimedGifts || {}
        if (claimed[giftId]) throw new HttpError(400, 'このプレゼントは受け取り済みです')
        const c = checkGift(gSnap.exists ? gSnap.data() : null, uid, claimed, now())
        if (!c.ok) throw new HttpError(400, c.error)
        const gems = grantGems(t, uid, data, c.amount, 'gift', giftId)
        t.set(userRef, { ...(uSnap.exists ? {} : newUserData()), gems, claimedGifts: { [giftId]: now() }, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
        return { amount: c.amount, gems }
      })
      res.json(out)
    } catch (e) {
      handleError(res, e)
    }
  })

  // ---------- 合言葉(ギフトコード) ----------
  app.post('/api/codes/redeem', requireAuth, async (req, res) => {
    try {
      const uid = req.user.uid
      const code = normalizeCode(req.body?.code)
      if (!isValidCodeFormat(code)) throw new HttpError(400, '合言葉の形が正しくありません(英数字3〜32文字)')
      const userRef = userRefOf(uid)
      const codeRef = db.collection('gift_codes').doc(code)
      const today = dayKey(now())

      const out = await db.runTransaction(async (t) => {
        const [uSnap, cSnap] = [await t.get(userRef), await t.get(codeRef)]
        const data = uSnap.exists ? uSnap.data() : newUserData()
        const fails = data.codeFails && data.codeFails.day === today ? data.codeFails.count : 0
        if (fails >= CONFIG.CODE_FAIL_LIMIT_PER_DAY) return { status: 429, error: '合言葉を間違えすぎました。明日もう一度試してください' }
        const redeemed = !!(data.redeemedCodes && data.redeemedCodes[code])
        const c = checkCode(cSnap.exists ? cSnap.data() : null, redeemed, now())
        if (!c.ok) {
          // 間違いの回数を数える(使用済みは数えない)。エラーを返しても、この記録は残る
          if (!c.used) t.set(userRef, { ...(uSnap.exists ? {} : newUserData()), codeFails: { day: today, count: fails + 1 } }, { merge: true })
          return { status: 400, error: c.error }
        }
        const gems = grantGems(t, uid, data, c.amount, 'code', code)
        t.set(codeRef, { uses: (cSnap.data().uses || 0) + 1 }, { merge: true })
        t.set(userRef, { ...(uSnap.exists ? {} : newUserData()), gems, redeemedCodes: { [code]: now() }, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
        return { status: 200, amount: c.amount, gems }
      })
      if (out.status !== 200) return res.status(out.status).json({ error: out.error })
      res.json({ amount: out.amount, gems: out.gems })
    } catch (e) {
      handleError(res, e)
    }
  })

  return app
}
