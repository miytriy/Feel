import admin from 'firebase-admin'
import { createApp } from './app.js'

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
  allowedOrigins,
})

const PORT = process.env.PORT || 10000
app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`)
})
