import express from 'express'
import cors from 'cors'
import admin from 'firebase-admin'
import { drawGacha } from './gacha.js'

// ===== 設定(この2つの数字は自由に変えてOK) =====
const INITIAL_GEMS = 3000 // 新しいユーザーの最初の通貨
const COST_PER_PULL = 100 // 1回ガチャで使う通貨
// ===============================================

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
const db = admin.firestore()
const { FieldValue } = admin.firestore

const allowedOrigins = (process.env.ALLOWED_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const app = express()
app.use(express.json())
app.use(cors({ origin: allowedOrigins }))

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function handleError(res, e) {
  if (e instanceof HttpError) {
    return res.status(e.status).json({ error: e.message })
  }
  console.error(e)
  res.status(500).json({ error: 'サーバーでエラーが発生しました' })
}

// ログインしている人だけ通す
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    return res.status(401).json({ error: 'ログインが必要です' })
  }
  try {
    req.user = await admin.auth().verifyIdToken(token)
    next()
  } catch (e) {
    res.status(401).json({ error: '認証に失敗しました' })
  }
}

const newUserData = () => ({ gems: INITIAL_GEMS, pityCount: 0, owned: {} })

app.get('/', (req, res) => res.send('ok'))
app.get('/health', (req, res) => res.send('ok'))

// 自分のデータを取得(初回は自動で作成)
app.get('/api/me', requireAuth, async (req, res) => {
  try {
    const userRef = db.collection('users').doc(req.user.uid)
    const data = await db.runTransaction(async (t) => {
      const snap = await t.get(userRef)
      if (snap.exists) return snap.data()
      t.set(userRef, { ...newUserData(), createdAt: FieldValue.serverTimestamp() })
      return newUserData()
    })
    res.json({ gems: data.gems, pityCount: data.pityCount, owned: data.owned })
  } catch (e) {
    handleError(res, e)
  }
})

// ガチャを引く
app.post('/api/gacha', requireAuth, async (req, res) => {
  try {
    const times = Number(req.body?.times)
    if (times !== 1 && times !== 10) {
      throw new HttpError(400, '回数が正しくありません')
    }
    const uid = req.user.uid
    const userRef = db.collection('users').doc(uid)
    const logRef = db.collection('gacha_logs').doc()

    const result = await db.runTransaction(async (t) => {
      const snap = await t.get(userRef)
      const data = snap.exists ? snap.data() : newUserData()

      const cost = COST_PER_PULL * times
      if (data.gems < cost) {
        throw new HttpError(400, '通貨が足りません')
      }

      const { pulls, newCount } = drawGacha(times, data.pityCount || 0)

      const owned = { ...(data.owned || {}) }
      for (const pull of pulls) {
        for (const c of pull.characters) {
          owned[c.id] = (owned[c.id] || 0) + 1
        }
      }

      const gems = data.gems - cost
      t.set(
        userRef,
        { gems, pityCount: newCount, owned, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      )
      t.set(logRef, {
        uid,
        times,
        cost,
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

const PORT = process.env.PORT || 10000
app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`)
})
