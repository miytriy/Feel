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
