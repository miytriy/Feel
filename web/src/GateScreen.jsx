// Feel - 開発中の入口: マスターパスワードを入れる画面(すでにアカウントがある人は、ログインすれば入れる)
import { useState } from 'react'
import { C, FONT } from './ui.js'

export default function GateScreen({ user, notice, onEnter, onLogin, onLogout }) {
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const submit = async (e) => {
    e.preventDefault()
    if (!pw || busy) return
    setBusy(true)
    setErr('')
    try {
      await onEnter(pw)
    } catch (e2) {
      setErr(e2.message)
      setBusy(false)
    }
  }
  const btn = (primary) => ({ width: '100%', padding: '12px 16px', borderRadius: 10, fontSize: 16, fontWeight: 700, fontFamily: FONT, cursor: 'pointer', border: `1.5px solid ${primary ? C.player : C.line}`, background: primary ? C.player : C.card, color: primary ? '#fff' : C.ink })
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: C.paper, color: C.ink, fontFamily: FONT, boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: 380, padding: 20, borderRadius: 14, background: C.card, border: `1px solid ${C.line}`, boxShadow: '0 1px 3px rgba(31,42,68,0.06)' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 22 }}>Feel</h2>
        <p style={{ margin: '0 0 14px', fontSize: 13, color: C.mute }}>開発中のため、マスターパスワードが必要です。</p>
        {notice && <div style={{ padding: 8, marginBottom: 10, borderRadius: 8, background: '#fff3d1', color: '#7a5a00', fontSize: 13 }}>{notice}</div>}
        <form onSubmit={submit}>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="マスターパスワード" autoComplete="current-password" style={{ width: '100%', boxSizing: 'border-box', padding: '12px 10px', borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 16, marginBottom: 8 }} />
          <button type="submit" disabled={busy || !pw} style={{ ...btn(true), opacity: busy || !pw ? 0.6 : 1 }}>{busy ? '確認中…' : '入る'}</button>
        </form>
        {err && <div style={{ marginTop: 8, color: '#c0392b', fontSize: 13 }}>{err}</div>}
        <hr style={{ border: 'none', borderTop: `1px solid ${C.line}`, margin: '16px 0' }} />
        {user ? (
          <div style={{ fontSize: 13 }}>
            <div style={{ marginBottom: 8 }}>ログイン中: <b>{user.displayName}</b>(このアカウントはまだ登録されていません。パスワードを入れて入ってください)</div>
            <button onClick={onLogout} style={btn(false)}>ログアウト</button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: C.mute, marginBottom: 6 }}>すでにアカウントをお持ちの方は、パスワードなしで入れます。</div>
            <button onClick={onLogin} style={btn(false)}>Googleでログイン</button>
          </>
        )}
      </div>
    </div>
  )
}
