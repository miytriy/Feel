import { auth } from './firebase.js'

const API_URL = import.meta.env.VITE_API_URL

// ---- 開発中の入口(マスターパスワード) ----
const GATE_KEY = 'feel.gate.v1'
export const getGateToken = () => { try { return localStorage.getItem(GATE_KEY) || '' } catch { return '' } }
export const setGateToken = (t) => { try { t ? localStorage.setItem(GATE_KEY, t) : localStorage.removeItem(GATE_KEY) } catch { /* 保存できなくても動く */ } }

async function plain(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || '通信に失敗しました')
  return data
}
export const gateStatus = () => plain('/api/gate/status') // { required }
export const gateEnter = async (password) => { const r = await plain('/api/gate/enter', { method: 'POST', body: JSON.stringify({ password }) }); setGateToken(r.token); return r }
export const gateCheck = (token) => plain('/api/gate/check', { method: 'POST', body: JSON.stringify({ token }) }) // { ok }
export const gateMe = async () => { // ログイン中の人が、すでにアカウントを持っているか(持っていれば、パスワード免除)
  const user = auth.currentUser
  if (!user) throw new Error('ログインしてください')
  return plain('/api/gate/me', { headers: { Authorization: `Bearer ${await user.getIdToken()}` } })
}

async function request(path, options = {}) {
  const user = auth.currentUser
  if (!user) throw new Error('ログインしてください')
  const token = await user.getIdToken()
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(getGateToken() ? { 'X-Gate-Token': getGateToken() } : {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || '通信に失敗しました')
  return data
}

export const fetchMe = () => request('/api/me')

export const drawGacha = (times) =>
  request('/api/gacha', { method: 'POST', body: JSON.stringify({ times }) })

// ---- 通貨の配布 ----
export const claimLoginBonus = () => request('/api/login-bonus/claim', { method: 'POST', body: '{}' })
export const startBattleTicket = (level) => request('/api/battle/start', { method: 'POST', body: JSON.stringify({ level }) })
export const finishBattle = (ticketId, result) => request('/api/battle/finish', { method: 'POST', body: JSON.stringify({ ticketId, result }) })
// ---- キャリア(対戦の記録。アカウントに保存される) ----
export const fetchCareer = () => request('/api/career')
export const recordMatch = (match) => request('/api/career', { method: 'POST', body: JSON.stringify({ match }) })
export const clearCareer = () => request('/api/career', { method: 'DELETE' })
export const fetchGifts = () => request('/api/gifts')
export const claimGift = (giftId) => request('/api/gifts/claim', { method: 'POST', body: JSON.stringify({ giftId }) })
export const redeemCode = (code) => request('/api/codes/redeem', { method: 'POST', body: JSON.stringify({ code }) })
