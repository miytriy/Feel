import { useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider } from './firebase.js'
import { fetchMe, drawGacha } from './api.js'

const PITY_COUNT = 40
const COST = 100

const RARITY = {
  legend: { label: 'レジェンド', color: '#c026d3' },
  gold: { label: 'ゴールド', color: '#d4a017' },
  silver: { label: 'シルバー', color: '#6b7280' },
  bronze: { label: 'ブロンズ', color: '#92400e' },
}

export default function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [me, setMe] = useState(null)
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setAuthLoading(false)
      if (!u) {
        setMe(null)
        setResults(null)
      }
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return
    setBusy(true)
    setError('')
    fetchMe()
      .then(setMe)
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false))
  }, [user])

  const handleLogin = async () => {
    setError('')
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e) {
      setError('ログインに失敗しました: ' + e.code)
    }
  }

  const handleLogout = async () => {
    await signOut(auth)
  }

  const handleGacha = async (times) => {
    setBusy(true)
    setError('')
    try {
      const data = await drawGacha(times)
      setResults(data.pulls)
      setMe(await fetchMe())
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (authLoading) {
    return <div style={{ padding: 20 }}>読み込み中...</div>
  }

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>
      <h1>Feel</h1>

      {!user ? (
        <div>
          <p>ログインしてください</p>
          <button onClick={handleLogin}>Googleでログイン</button>
        </div>
      ) : (
        <div>
          <p>
            ログイン中: {user.displayName}{' '}
            <button onClick={handleLogout}>ログアウト</button>
          </p>

          {me && (
            <div>
              <p>通貨: {me.gems}</p>
              <p>天井まで: あと{PITY_COUNT - me.pityCount}回</p>
              <p>所持キャラ: {Object.keys(me.owned).length}種類</p>
            </div>
          )}

          <button disabled={busy || !me} onClick={() => handleGacha(1)}>
            1回ガチャ({COST})
          </button>{' '}
          <button disabled={busy || !me} onClick={() => handleGacha(10)}>
            10連ガチャ({COST * 10})
          </button>

          {busy && <p>通信中...(最初の1回は1分ほどかかることがあります)</p>}
        </div>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {results &&
        results.map((pull, i) => (
          <div key={i}>
            <h3>
              {i + 1}回目{pull.pity ? '(天井!)' : ''}
            </h3>
            <ul>
              {pull.characters.map((c, j) => (
                <li key={j} style={{ color: RARITY[c.rarity].color }}>
                  [{RARITY[c.rarity].label}] {c.name}
                </li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  )
}
