import { useEffect, useRef, useState } from 'react'
import { C, FONT } from './ui.js'
import BattleScreen from './BattleScreen.jsx'
import { createPvpClient } from './pvp.js'

// 対人戦のロビー。部屋をつくる(コードを相手に伝える) / コードを入れて入る。2人そろったら、バトル画面になる。
// team: 自分のチーム(キャラ定義の配列), spells: スペルセット(定義の配列)
export default function PvpScreen({ team, spells, onExit, onBackTeam }) {
  const clientRef = useRef(null)
  const [phase, setPhase] = useState('menu') // menu | waiting | joining | battle
  const [code, setCode] = useState('')
  const [input, setInput] = useState('')
  const [err, setErr] = useState('')
  const [online, setOnline] = useState(null)
  const teamPayload = () => ({ ids: team.filter(Boolean).map((c) => c.id), spells: (spells || []).map((s) => s.id) })

  const connect = (mode) => {
    setErr('')
    const client = createPvpClient()
    clientRef.current = client
    client.on((m) => {
      if (m.type === 'created') { setCode(m.code); setPhase('waiting') }
      else if (m.type === 'start' && !m.resume) { setOnline({ client, side: m.side, opp: m.opp && m.opp.name, init: m.state, left: m.left, turnMs: m.turnMs }); setPhase('battle') }
      else if (m.type === 'error' && phaseRef.current !== 'battle') { setErr(m.message || '通信に失敗しました'); setPhase('menu'); client.close() }
      else if (m.type === 'offline' && phaseRef.current !== 'battle' && phaseRef.current !== 'waiting') { setErr('対戦サーバーにつながりませんでした。サーバーが起動中か、対人戦に未対応の可能性があります。少し待ってからもう一度お試しください。'); setPhase('menu'); client.close() }
      else if (m.type === 'closed' && phaseRef.current !== 'battle') { setErr(m.reason || '部屋が閉じられました'); setPhase('menu'); client.close() }
    })
    if (mode === 'create') { setPhase('creating'); client.create(teamPayload()) }
    else { setPhase('joining'); client.join(input.trim().toUpperCase(), teamPayload()) }
  }
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  useEffect(() => () => { if (clientRef.current) clientRef.current.close() }, [])

  if (phase === 'battle' && online) {
    return <BattleScreen online={online} onExit={onExit} />
  }
  const cancel = () => { if (clientRef.current) clientRef.current.leave(); clientRef.current = null; setPhase('menu'); setCode('') }
  const box = { maxWidth: 480, margin: '0 auto', padding: 20, minHeight: '100vh', boxSizing: 'border-box', background: C.paper, color: C.ink, fontFamily: FONT }
  const btn = (primary, disabled) => ({ padding: '12px 18px', borderRadius: 10, border: primary ? 'none' : `1px solid ${C.line}`, background: primary ? C.player : C.card, color: primary ? C.onAccent : C.ink, fontWeight: 800, fontSize: 15, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1, fontFamily: FONT })
  const busy = phase !== 'menu'
  return (
    <div style={box} data-testid="pvp-lobby">
      <h2 style={{ margin: '0 0 6px' }}>対人戦(ルーム)</h2>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: C.mute }}>部屋をつくって、コードを友だちに伝えます。2人そろうと、対戦が始まります。1手の持ち時間は45秒。時間切れは、自動で行動します。</p>
      <div style={{ padding: 12, borderRadius: 10, background: C.card, border: `1px solid ${C.line}`, marginBottom: 16, fontSize: 13 }}>
        <b>出すチーム</b>:{team.filter(Boolean).map((c) => c.name).join('、')}
        {spells && spells.length ? <div style={{ marginTop: 4, color: C.mute }}>スペル {spells.length}枚</div> : null}
        {onBackTeam && !busy && <div><button type="button" onClick={onBackTeam} style={{ marginTop: 8, ...btn(false, false), padding: '6px 12px', fontSize: 13 }}>チームを変える</button></div>}
      </div>
      {err && <div data-testid="pvp-err" style={{ marginBottom: 12, padding: 10, borderRadius: 8, background: '#fdecea', color: '#b3261e', fontSize: 13 }}>{err}</div>}
      {phase === 'waiting' ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: C.mute }}>この部屋コードを相手に伝えてください</div>
          <div data-testid="pvp-code" style={{ fontSize: 44, fontWeight: 900, letterSpacing: 8, margin: '10px 0' }}>{code}</div>
          <div style={{ fontSize: 13, color: C.mute, marginBottom: 14 }}>相手が入るのを待っています…</div>
          <button type="button" onClick={cancel} style={btn(false, false)}>やめる</button>
        </div>
      ) : (
        <>
          <button type="button" data-testid="pvp-create" disabled={busy} onClick={() => connect('create')} style={{ ...btn(true, busy), width: '100%', marginBottom: 18 }}>{phase === 'creating' ? 'つくっています…' : '部屋をつくる'}</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <input data-testid="pvp-input" value={input} onChange={(e) => setInput(e.target.value.toUpperCase())} placeholder="部屋コード" maxLength={8} disabled={busy}
              style={{ flex: 1, padding: '12px 14px', borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 18, letterSpacing: 4, textAlign: 'center', fontFamily: FONT }} />
            <button type="button" data-testid="pvp-join" disabled={busy || input.trim().length < 3} onClick={() => connect('join')} style={btn(true, busy || input.trim().length < 3)}>{phase === 'joining' ? '入っています…' : '入る'}</button>
          </div>
        </>
      )}
      <div style={{ marginTop: 24 }}><button type="button" onClick={onExit} style={btn(false, false)}>戻る</button></div>
    </div>
  )
}
