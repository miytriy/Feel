// ログインの窓(Google / メール+パスワード)。どの画面からでも openLogin() で開く。main.jsx に <LoginHost /> を1つ置いてある
import { useEffect, useState } from 'react'
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile } from 'firebase/auth'
import { auth, googleProvider } from './firebase.js'
import { C, FONT } from './ui.js'

const listeners = new Set()
export const openLogin = () => listeners.forEach((f) => f(true))

const MSG = {
  'auth/invalid-email': 'メールアドレスの形が正しくありません。',
  'auth/missing-password': 'パスワードを入れてください。',
  'auth/weak-password': 'パスワードは6文字以上にしてください。',
  'auth/email-already-in-use': 'このメールアドレスは、すでに登録されています。ログインしてください。',
  'auth/invalid-credential': 'メールアドレスかパスワードが違います。',
  'auth/user-not-found': 'メールアドレスかパスワードが違います。',
  'auth/wrong-password': 'メールアドレスかパスワードが違います。',
  'auth/too-many-requests': '試行が多すぎます。しばらくしてからもう一度お試しください。',
  'auth/operation-not-allowed': 'この方法は、まだ有効になっていません(Firebaseコンソールで「メール/パスワード」を有効にしてください)。',
  'auth/network-request-failed': '通信に失敗しました。',
  'auth/popup-closed-by-user': '',
  'auth/cancelled-popup-request': '',
}

export function LoginHost() {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('login') // login | signup | reset
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  useEffect(() => { listeners.add(setOpen); return () => listeners.delete(setOpen) }, [])
  useEffect(() => { // ログインできたら閉じる
    if (!open) return undefined
    return auth.onAuthStateChanged((u) => { if (u) { setOpen(false); setPw('') } })
  }, [open])
  if (!open) return null

  const fail = (e) => setErr(e.code in MSG ? MSG[e.code] : 'うまくいきませんでした: ' + (e.code || e.message))
  const run = async (fn) => { setBusy(true); setErr(''); setInfo(''); try { await fn() } catch (e) { fail(e) } setBusy(false) }
  const submit = (e) => {
    e.preventDefault()
    if (busy) return
    run(async () => {
      if (mode === 'login') await signInWithEmailAndPassword(auth, email.trim(), pw)
      else if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), pw)
        try { await updateProfile(cred.user, { displayName: email.trim().split('@')[0].slice(0, 20) }) } catch { /* 名前は付かなくても使える */ }
      } else { await sendPasswordResetEmail(auth, email.trim()); setInfo('再設定のメールを送りました。届かないときは、迷惑メールも見てください。') }
    })
  }
  const btn = (primary) => ({ width: '100%', padding: '12px 16px', borderRadius: 10, fontSize: 16, fontWeight: 700, fontFamily: FONT, cursor: 'pointer', border: `1.5px solid ${primary ? C.player : C.line}`, background: primary ? C.player : C.card, color: primary ? C.onAccent : C.ink })
  const input = { width: '100%', boxSizing: 'border-box', padding: '12px 10px', borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 16, marginBottom: 8 }
  const link = { background: 'none', border: 'none', color: C.player, cursor: 'pointer', fontSize: 13, fontFamily: FONT, padding: 4 }
  return (
    <div onPointerDown={(e) => { if (e.target === e.currentTarget) setOpen(false) }} style={{ position: 'fixed', inset: 0, zIndex: 9500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.55)', fontFamily: FONT }}>
      <div role="dialog" aria-label="ログイン" style={{ width: '100%', maxWidth: 380, padding: 20, borderRadius: 14, background: C.card, color: C.ink, border: `1px solid ${C.line}`, boxSizing: 'border-box' }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 20 }}>{mode === 'signup' ? '新規登録' : mode === 'reset' ? 'パスワードの再設定' : 'ログイン'}</h2>
        <form onSubmit={submit}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="メールアドレス" autoComplete="email" style={input} />
          {mode !== 'reset' && <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="パスワード(6文字以上)" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} style={input} />}
          <button type="submit" disabled={busy || !email || (mode !== 'reset' && !pw)} style={{ ...btn(true), opacity: busy || !email || (mode !== 'reset' && !pw) ? 0.6 : 1 }}>{busy ? '処理中…' : mode === 'signup' ? '登録する' : mode === 'reset' ? '再設定メールを送る' : 'ログイン'}</button>
        </form>
        {err && <div style={{ marginTop: 8, color: C.bad, fontSize: 13 }}>{err}</div>}
        {info && <div style={{ marginTop: 8, fontSize: 13 }}>{info}</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          {mode === 'login' ? <button type="button" onClick={() => { setMode('signup'); setErr(''); setInfo('') }} style={link}>新規登録</button> : <button type="button" onClick={() => { setMode('login'); setErr(''); setInfo('') }} style={link}>ログインにもどる</button>}
          {mode === 'login' && <button type="button" onClick={() => { setMode('reset'); setErr(''); setInfo('') }} style={link}>パスワードを忘れた</button>}
        </div>
        <hr style={{ border: 'none', borderTop: `1px solid ${C.line}`, margin: '12px 0' }} />
        <button type="button" disabled={busy} onClick={() => run(() => signInWithPopup(auth, googleProvider))} style={btn(false)}>Googleでログイン</button>
        <button type="button" onClick={() => setOpen(false)} style={{ ...link, display: 'block', margin: '10px auto 0' }}>閉じる</button>
      </div>
    </div>
  )
}
