// Feel サーバー - 開発中の入口(マスターパスワード)のルール。Firebaseに依存しない部分
import crypto from 'node:crypto'

// パスワードから「通行証」を作る。パスワードを変えると、古い通行証は全部使えなくなる
export function gateToken(password) {
  return crypto.createHmac('sha256', String(password)).update('feel-gate-v1').digest('hex')
}

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest()

// 入力されたパスワードが合っているか(時間差で当てられないように、同じ長さにして比べる)
export function checkPassword(input, password) {
  if (!password || typeof input !== 'string') return false
  return crypto.timingSafeEqual(sha(input), sha(password))
}

export function checkToken(token, password) {
  if (!password || typeof token !== 'string' || token.length !== 64) return false
  return crypto.timingSafeEqual(sha(token), sha(gateToken(password)))
}

// 間違えすぎを止める: 同じ接続元から、WINDOW_MS の間に MAX_FAILS 回まで
export function makeFailLimiter({ maxFails = 8, windowMs = 15 * 60 * 1000 } = {}) {
  const map = new Map() // key -> { count, resetAt }
  return {
    blocked(key, now) {
      const r = map.get(key)
      return !!r && r.resetAt > now && r.count >= maxFails
    },
    fail(key, now) {
      const r = map.get(key)
      if (!r || r.resetAt <= now) map.set(key, { count: 1, resetAt: now + windowMs })
      else r.count++
      if (map.size > 5000) for (const [k, v] of map) if (v.resetAt <= now) map.delete(k)
    },
    reset(key) { map.delete(key) },
  }
}
