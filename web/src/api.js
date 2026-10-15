import { auth } from './firebase.js'

const API_URL = import.meta.env.VITE_API_URL

async function request(path, options = {}) {
  const user = auth.currentUser
  if (!user) throw new Error('ログインしてください')
  const token = await user.getIdToken()
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
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
