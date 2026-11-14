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
      ...(options.gateToken || getGateToken() ? { 'X-Gate-Token': options.gateToken || getGateToken() } : {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || '通信に失敗しました')
  return data
}

export const fetchMe = () => request('/api/me')

export const drawGacha = (times, banner = 'normal') =>
  request('/api/gacha', { method: 'POST', body: JSON.stringify({ times, banner }) })

export const exchangeTicket = (kind, count) => request('/api/exchange-ticket', { method: 'POST', body: JSON.stringify({ kind, count }) })
export const exchangeCrystal = (mode, amount) => request('/api/crystal', { method: 'POST', body: JSON.stringify({ mode, amount }) })
export const buyPass = () => request('/api/pass/buy', { method: 'POST', body: JSON.stringify({}) })
export const saveKeys = (keys) => request('/api/keys', { method: 'POST', body: JSON.stringify({ keys }) })
export const enhanceChar = (id) => request('/api/enhance', { method: 'POST', body: JSON.stringify({ id }) })

// ---- 通貨の配布 ----
export const claimLoginBonus = () => request('/api/login-bonus/claim', { method: 'POST', body: '{}' })
export const startBattleTicket = (level) => request('/api/battle/start', { method: 'POST', body: JSON.stringify({ level }) })
export const finishBattle = (ticketId, result) => request('/api/battle/finish', { method: 'POST', body: JSON.stringify({ ticketId, result }) })
// ---- キャリア(対戦の記録。アカウントに保存される) ----
export const fetchCareer = () => request('/api/career')
export const recordMatch = (match) => request('/api/career', { method: 'POST', body: JSON.stringify({ match }) })
export const clearCareer = (kind) => request(kind === 'pvp' ? '/api/career?kind=pvp' : '/api/career', { method: 'DELETE' })
export const fetchGifts = () => request('/api/gifts')
export const markMailRead = (giftId) => request('/api/mail/read', { method: 'POST', body: JSON.stringify({ giftId }) })
export const setMailStar = (giftId, star) => request('/api/mail/star', { method: 'POST', body: JSON.stringify({ giftId, star }) })
export const deleteMail = (giftId) => request('/api/mail/delete', { method: 'POST', body: JSON.stringify({ giftId }) })
export const purgeReadMail = () => request('/api/mail/purge-read', { method: 'POST', body: '{}' })
export const claimGift = (giftId) => request('/api/gifts/claim', { method: 'POST', body: JSON.stringify({ giftId }) })
export const redeemCode = (code) => request('/api/codes/redeem', { method: 'POST', body: JSON.stringify({ code }) })

// ランクマッチの成績 { rank: { mp, wins, losses, streak } }
export const fetchRank = () => request('/api/pvp/rank')

// ---- カジュアルマッチで全キャラを使う(マスターパスワードの機能) ----
// サーバーが確認する。パスワードを入れると、サーバーが「通行証」を返し、この端末に保存する。対戦に入るとき、それをサーバーに見せる。
const ALLCHARS_KEY = 'feel.allchars.v1'
export const getAllCharsToken = () => { try { return localStorage.getItem(ALLCHARS_KEY) || '' } catch { return '' } }
export const clearAllChars = () => { try { localStorage.removeItem(ALLCHARS_KEY) } catch { /* 何もしない */ } }
export const enableAllChars = async (password) => {
  const r = await plain('/api/gate/enter', { method: 'POST', body: JSON.stringify({ password }) })
  if (!r.token) throw new Error('サーバーにマスターパスワードが設定されていないため、使えません')
  try { localStorage.setItem(ALLCHARS_KEY, r.token) } catch { /* 保存できなくても、そのままでは使えない */ }
  return true
}

// ---- 部位つき遺物(所持・装備はサーバーに保存) ----
export const fetchRelics = () => request('/api/relics') // { relics, equip, max }
// 検証用(マスターパスワードの通行証が要る)。入口の通行証が無いときは、カジュアルマッチの全キャラ用の通行証を使い、それも無ければ、マスターパスワードを入れてもらう
export const forgeRelicApi = async (opts, askPassword) => {
  let t = getGateToken() || getAllCharsToken()
  if (!t) {
    const pw = askPassword ? await askPassword() : ''
    if (!pw) throw new Error('マスターパスワードが必要です')
    await enableAllChars(pw)
    t = getAllCharsToken()
  }
  return request('/api/relics/forge', { method: 'POST', body: JSON.stringify(opts), gateToken: t })
}
export const equipRelicApi = (charId, part, relicId) => request('/api/relics/equip', { method: 'POST', body: JSON.stringify({ charId, part, relicId }) })
export const deleteRelicApi = (relicId) => request('/api/relics/delete', { method: 'POST', body: JSON.stringify({ relicId }) })
