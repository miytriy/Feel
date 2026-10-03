import { useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider } from './firebase.js'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

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

  if (loading) {
    return <div style={{ padding: 20 }}>読み込み中...</div>
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>ターン制バトル</h1>
      {user ? (
        <div>
          <p>ログイン中: {user.displayName}</p>
          <button onClick={handleLogout}>ログアウト</button>
        </div>
      ) : (
        <div>
          <p>ログインしてください</p>
          <button onClick={handleLogin}>Googleでログイン</button>
        </div>
      )}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  )
}
