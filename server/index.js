import admin from 'firebase-admin'
import { createApp } from './app.js'
import { attachPvp } from './pvp/ws.js'

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })

const allowedOrigins = (process.env.ALLOWED_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const app = createApp({
  db: admin.firestore(),
  auth: admin.auth(),
  FieldValue: admin.firestore.FieldValue,
  masterPassword: process.env.MASTER_PASSWORD || '', // 開発中の入口のパスワード(Renderの環境変数。空なら入口なし)
  allowedOrigins,
})

const PORT = process.env.PORT || 10000
const server = app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`)
})
// 対人戦(WebSocket: /pvp)。バトルの計算はサーバーで行う。所持していないキャラの編成は、PVP_REQUIRE_OWNED=0 で許可(開発用)
attachPvp({ server, auth: admin.auth(), db: admin.firestore(), allowedOrigins, requireOwned: process.env.PVP_REQUIRE_OWNED !== '0' })
