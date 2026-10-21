// Feel サーバー - APIの本体(Firebaseは外から渡す形にして、テストできるようにしてあります)
import express from 'express'
import cors from 'cors'
import { drawGacha } from './gacha.js'
import { sanitizeMatch, addMatch } from './career.js'
import { checkPassword, checkToken, gateToken, makeFailLimiter } from './gate.js'
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

export function createApp({ db, auth, FieldValue, masterPassword = '', allowedOrigins = [], now = () => Date.now(), randomId = () => Math.random().toString(36).slice(2) + Date.now().toString(36) }) {
  const app = express()
  app.use(express.json({ limit: '300kb' })) // キャリアの記録(対戦ログつき)が入る大きさ
  app.use(cors({ origin: allowedOrigins }))

  const handleError = (res, e) => {
    if (e instanceof HttpError) return res.status(e.status).json({ error: e.message })
    console.error(e)
    res.status(500).json({ error: 'サーバーでエラーが発生しました' })
  }

  // ---------- 開発中の入口(マスターパスワード) ----------
  // masterPassword が空なら、入口は無し。あれば、すでにアカウントがある人か、パスワードを通った人だけがAPIを使える
  const gateOn = !!masterPassword
  const failLimiter = makeFailLimiter()
  const knownUids = new Set() // アカウントがあると確認ずみの人(毎回の確認を省く)
  const ipOf = (req) => String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim()
  const gatePassed = (req) => checkToken(req.headers['x-gate-token'], masterPassword)
  async function hasAccount(uid) {
    if (knownUids.has(uid)) return true
    const snap = await db.collection('users').doc(uid).get()
    if (snap.exists) knownUids.add(uid)
    return snap.exists
  }

  // ログインしている人だけ通す(skipGate: 入口の確認そのものに使うときは、入口のチェックをしない)
  const makeAuth = (skipGate) => async (req, res, next) => {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) return res.status(401).json({ error: 'ログインが必要です' })
    try {
      req.user = await auth.verifyIdToken(token)
    } catch (e) {
      return res.status(401).json({ error: '認証に失敗しました' })
    }
    try {
      if (gateOn && !skipGate && !gatePassed(req) && !(await hasAccount(req.user.uid))) {
        return res.status(403).json({ error: '開発中のため、マスターパスワードが必要です' })
      }
      next()
    } catch (e) {
      handleError(res, e)
    }
  }
  const requireAuth = makeAuth(false)
  const authOnly = makeAuth(true)

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

  // 入口: 必要かどうか / パスワードを入れる / 通行証の確認 / 自分がアカウント持ちか
  app.get('/api/gate/status', (req, res) => res.json({ required: gateOn }))
  app.post('/api/gate/enter', (req, res) => {
    if (!gateOn) return res.json({ ok: true, token: '' })
    const key = ipOf(req)
    if (failLimiter.blocked(key, now())) return res.status(429).json({ error: '間違えすぎました。しばらくしてからもう一度試してください' })
    if (!checkPassword(req.body?.password, masterPassword)) {
      failLimiter.fail(key, now())
      return res.status(401).json({ error: 'パスワードが違います' })
    }
    failLimiter.reset(key)
    res.json({ ok: true, token: gateToken(masterPassword) })
  })
  app.post('/api/gate/check', (req, res) => res.json({ ok: !gateOn || checkToken(req.body?.token, masterPassword) }))
  app.get('/api/gate/me', authOnly, async (req, res) => {
    try {
      res.json({ exempt: !gateOn || (await hasAccount(req.user.uid)) })
    } catch (e) {
      handleError(res, e)
    }
  })

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

  // ---------- 運営からのプレゼント(メールボックス) ----------
  // メールの一覧: 全員向け + 自分宛て。受け取れるもの(期限内・未受け取り)と、受け取り済みで、まだ消していないもの。
  //   claimed: 受け取り済み / read: 既読 / star: ★(「既読削除」で消えない)。消したメール(deleted)は出さない
  app.get('/api/gifts', requireAuth, async (req, res) => {
    try {
      const uid = req.user.uid
      const [snap, giftsSnap] = await Promise.all([userRefOf(uid).get(), db.collection('gifts').get()])
      const udata = snap.exists ? snap.data() : {}
      const claimed = udata.claimedGifts || {}
      const mail = udata.mail || {}
      const t = now()
      const list = []
      for (const d of giftsSnap.docs) {
        const g = d.data()
        const st = mail[d.id] || {}
        if (st.deleted) continue
        const base = { id: d.id, title: String(g.title || 'プレゼント'), message: g.message ? String(g.message) : '', expiresAt: toMillis(g.expiresAt), read: !!st.read, star: !!st.star }
        if (claimed[d.id]) {
          const mine = g.target === 'all' || (Array.isArray(g.target) && g.target.includes(uid))
          if (mine && Number.isInteger(g.gems) && g.gems > 0) list.push({ ...base, gems: g.gems, claimed: true })
          continue
        }
        const c = checkGift(g, uid, claimed, t)
        if (c.ok) list.push({ ...base, gems: c.amount, claimed: false })
      }
      res.json({ gifts: list })
    } catch (e) {
      handleError(res, e)
    }
  })

  // メールの状態(既読・★・削除)を、自分のデータに書く
  const patchMail = async (uid, fn) => {
    const userRef = userRefOf(uid)
    await db.runTransaction(async (t) => {
      const uSnap = await t.get(userRef)
      const data = uSnap.exists ? uSnap.data() : newUserData()
      const patch = fn(data.mail || {}, data.claimedGifts || {})
      if (!patch || Object.keys(patch).length === 0) return
      t.set(userRef, { ...(uSnap.exists ? {} : newUserData()), mail: patch, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    })
  }
  const giftIdOf = (body) => {
    const id = body?.giftId
    if (typeof id !== 'string' || !id || id.includes('/')) throw new HttpError(400, 'リクエストが正しくありません')
    return id
  }
  app.post('/api/mail/read', requireAuth, async (req, res) => {
    try {
      const id = giftIdOf(req.body)
      await patchMail(req.user.uid, (mail) => (mail[id]?.read ? null : { [id]: { read: true } }))
      res.json({ ok: true })
    } catch (e) { handleError(res, e) }
  })
  app.post('/api/mail/star', requireAuth, async (req, res) => {
    try {
      const id = giftIdOf(req.body)
      const star = req.body?.star === true
      await patchMail(req.user.uid, () => ({ [id]: { star } }))
      res.json({ ok: true })
    } catch (e) { handleError(res, e) }
  })
  // 1通を消す(受け取り済みのものだけ。受け取っていないプレゼントは、消せない)
  app.post('/api/mail/delete', requireAuth, async (req, res) => {
    try {
      const id = giftIdOf(req.body)
      await patchMail(req.user.uid, (mail, claimed) => {
        if (!claimed[id]) throw new HttpError(400, '受け取ってから消してください')
        return { [id]: { deleted: true } }
      })
      res.json({ ok: true })
    } catch (e) { handleError(res, e) }
  })
  // 既読削除: 受け取り済み・既読・★なし のメールをまとめて消す
  app.post('/api/mail/purge-read', requireAuth, async (req, res) => {
    try {
      let n = 0
      await patchMail(req.user.uid, (mail, claimed) => {
        const patch = {}
        for (const [id, st] of Object.entries(mail)) {
          if (st && st.read && !st.star && !st.deleted && claimed[id]) { patch[id] = { deleted: true }; n++ }
        }
        return patch
      })
      res.json({ ok: true, deleted: n })
    } catch (e) { handleError(res, e) }
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
        t.set(userRef, { ...(uSnap.exists ? {} : newUserData()), gems, claimedGifts: { [giftId]: now() }, mail: { [giftId]: { read: true } }, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
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

  // ---------- キャリア(対戦の記録): ログイン中の人のぶんを、サーバーに残す ----------
  const careerRefOf = (uid) => db.collection('careers').doc(uid)

  app.get('/api/career', requireAuth, async (req, res) => {
    try {
      const snap = await careerRefOf(req.user.uid).get()
      res.json({ matches: (snap.exists && snap.data().matches) || [] })
    } catch (e) {
      handleError(res, e)
    }
  })

  app.post('/api/career', requireAuth, async (req, res) => {
    try {
      const match = sanitizeMatch(req.body?.match, now())
      if (!match) throw new HttpError(400, '対戦の記録が正しくありません')
      const ref = careerRefOf(req.user.uid)
      const matches = await db.runTransaction(async (t) => {
        const snap = await t.get(ref)
        const next = addMatch(snap.exists ? snap.data().matches : [], match)
        t.set(ref, { matches: next, updatedAt: FieldValue.serverTimestamp() })
        return next
      })
      res.json({ count: matches.length })
    } catch (e) {
      handleError(res, e)
    }
  })

  // 自分の記録を全部消す
  app.delete('/api/career', requireAuth, async (req, res) => {
    try {
      const ref = careerRefOf(req.user.uid)
      await db.runTransaction(async (t) => { t.set(ref, { matches: [], updatedAt: FieldValue.serverTimestamp() }) })
      res.json({ ok: true })
    } catch (e) {
      handleError(res, e)
    }
  })

  return app
}
