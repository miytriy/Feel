import { useEffect, useRef, useState } from 'react'
import { C, FONT, DISPLAY, useIsDesktop } from './ui.js'
import { ScreenHeader } from './chrome.jsx'
import { Emblem } from './emblem.jsx'
import { tone, rarityBg, isLeg } from './FormationScreen.jsx'
import BattleScreen from './BattleScreen.jsx'
import { createPvpClient } from './pvp.js'

// 対人戦のロビー(ルーム戦)。部屋をつくってコードを伝える / コードを入れて入る。2人そろったら「MATCHED」を見せて、バトル画面へ。
// team: 自分のチーム(キャラ定義の配列) / spells: スペルセット(定義の配列)
// 動かすのは transform / opacity だけ(web/EFFECTS.md)

const CSS = `
.pv { position: fixed; inset: 0; z-index: 20; overflow-y: auto; background: #050506; color: ${C.ink}; font-family: ${FONT}; animation: pv-fade .25s ease-out backwards; }
.pv button, .pv input { font-family: ${FONT}; }
@keyframes pv-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes pv-up { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: none } }
@keyframes pv-ring { 0% { transform: scale(.35); opacity: .7 } 100% { transform: scale(1.5); opacity: 0 } }
@keyframes pv-spin { to { transform: rotate(360deg) } }
@keyframes pv-pop { 0% { opacity: 0; transform: scale(.6) } 60% { transform: scale(1.08) } 100% { opacity: 1; transform: none } }
@keyframes pv-vs-l { from { opacity: 0; transform: translateX(-80px) } to { opacity: 1; transform: none } }
@keyframes pv-vs-r { from { opacity: 0; transform: translateX(80px) } to { opacity: 1; transform: none } }
.pv-bg { position: fixed; inset: 0; pointer-events: none; background: repeating-linear-gradient(115deg, transparent 0 120px, rgba(255,255,255,.025) 120px 122px), radial-gradient(ellipse at 70% 30%, #2a2c22 0%, #15161a 50%, #09090b 82%); }
.pv-bg i { position: absolute; top: -10%; height: 130%; background: ${C.player}; transform: skewX(-24deg); }
.pv-bg i:nth-child(1) { right: 5%; width: 120px; opacity: .06 }
.pv-bg i:nth-child(2) { right: 14%; width: 24px; opacity: .2 }
.pv-wrap { position: relative; max-width: 1040px; margin: 0 auto; padding: 18px 16px calc(28px + env(safe-area-inset-bottom)); display: grid; grid-template-columns: minmax(0, 1fr); gap: 22px; }
.pv-wrap > section { min-width: 0 }
@media (max-width: 899px) { .pv-wrap > .pv-card { order: -1 } }
@media (min-width: 900px) { .pv-wrap { grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); padding: 34px 32px; gap: 36px; align-items: start } }
.pv-h { font-family: ${DISPLAY}; font-style: italic; font-weight: 600; letter-spacing: .1em; font-size: 15px; color: ${C.player}; margin: 0 0 10px; display: flex; align-items: center; gap: 10px }
.pv-h::after { content: ''; flex: 1; height: 1px; background: ${C.line} }
.pv-team { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 10px; animation: pv-up .35s ease-out backwards }
.pv-unit { position: relative; --rc: #888; border-radius: 10px; overflow: hidden; background: #111115; border: 1px solid ${C.line} }
.pv-fig { position: relative; aspect-ratio: 1 / 1.05; background: linear-gradient(170deg, color-mix(in srgb, var(--rc) 55%, #fff) 0%, var(--rc) 42%, #14141a 100%); clip-path: polygon(10% 0, 100% 0, 90% 100%, 0 100%) }
.pv-fig.leg { background: var(--rbg) }
.pv-fig svg, .pv-fig img.art { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover }
.pv-fig::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 6px; background: var(--rbg) }
.pv-nm { padding: 6px 8px 7px; font-size: 12px; font-weight: 700; line-height: 1.25 }
.pv-cl { font-size: 10px; color: var(--rc); font-weight: 700; margin-top: 1px }
.pv-sub { margin-top: 10px; font-size: 12px; color: ${C.mute} }
.pv-card { padding: 18px; border-radius: 14px; background: #121216; border: 1px solid ${C.line}; animation: pv-up .35s .08s ease-out backwards }
.pv-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; padding: 0 22px; border-radius: 999px; border: 1.5px solid ${C.line}; background: transparent; color: ${C.ink}; font-weight: 800; font-size: 15px; letter-spacing: .04em; cursor: pointer; transition: transform .15s, border-color .15s }
.pv-btn:hover:not(:disabled) { border-color: ${C.player} }
.pv-btn.main { background: ${C.player}; color: ${C.onAccent}; border-color: ${C.player} }
.pv-btn:disabled { opacity: .45; cursor: default }
.pv-btn.wide { width: 100% }
.pv-or { display: flex; align-items: center; gap: 12px; margin: 16px 0; color: ${C.mute}; font-size: 12px }
.pv-or::before, .pv-or::after { content: ''; flex: 1; height: 1px; background: ${C.line} }
.pv-in { flex: 1; min-width: 0; height: 48px; padding: 0 14px; border-radius: 12px; border: 1.5px solid ${C.line}; background: #0b0b0e; color: ${C.ink}; font-size: 22px; font-weight: 800; letter-spacing: .3em; text-align: center; text-transform: uppercase }
.pv-in:focus { outline: none; border-color: ${C.player} }
.pv-err { margin-bottom: 14px; padding: 10px 12px; border-radius: 10px; background: rgba(224,67,31,.14); border: 1px solid ${C.enemy}; color: #ffb4a0; font-size: 13px; line-height: 1.5 }
.pv-code { display: flex; justify-content: center; gap: 8px; margin: 14px 0 }
.pv-code b { width: 44px; height: 58px; display: grid; place-items: center; border-radius: 10px; background: #0b0b0e; border: 1.5px solid ${C.player}; color: ${C.player}; font-family: ${DISPLAY}; font-size: 32px; animation: pv-pop .4s backwards }
.pv-radar { position: relative; width: 120px; height: 120px; margin: 8px auto 4px }
.pv-radar i { position: absolute; inset: 0; border-radius: 50%; border: 2px solid ${C.player}; animation: pv-ring 2.4s ease-out infinite }
.pv-radar i:nth-child(2) { animation-delay: .8s } .pv-radar i:nth-child(3) { animation-delay: 1.6s }
.pv-radar u { position: absolute; inset: 44px; border-radius: 50%; background: ${C.player} }
.pv-spin { width: 26px; height: 26px; border-radius: 50%; border: 3px solid ${C.line}; border-top-color: ${C.player}; animation: pv-spin .8s linear infinite }
.pv-match { position: fixed; inset: 0; z-index: 400; display: grid; place-items: center; background: rgba(5,5,6,.94); font-family: ${FONT}; color: ${C.ink} }
.pv-match .row { display: flex; align-items: center; gap: 22px; padding: 0 16px; width: 100%; max-width: 760px; box-sizing: border-box }
.pv-match .side { flex: 1; min-width: 0; padding: 16px 14px; border-radius: 12px; background: #121216; border-left: 6px solid var(--sc); font-weight: 800; font-size: 20px; overflow-wrap: anywhere }
.pv-match .side small { display: block; font-size: 11px; color: ${C.mute}; margin-bottom: 4px; letter-spacing: .1em }
.pv-match .l { animation: pv-vs-l .45s ease-out backwards } .pv-match .r { animation: pv-vs-r .45s ease-out backwards; text-align: right; border-left: 0; border-right: 6px solid var(--sc) }
.pv-match .vs { font-family: ${DISPLAY}; font-style: italic; font-size: 46px; color: ${C.player}; animation: pv-pop .5s .25s backwards }
.pv-match h3 { position: absolute; top: 22%; left: 0; right: 0; margin: 0; text-align: center; font-family: ${DISPLAY}; font-style: italic; letter-spacing: .3em; font-size: 20px; color: ${C.player}; animation: pv-up .4s backwards }
@media (prefers-reduced-motion: reduce) { .pv *, .pv-match * { animation-duration: .01s !important; animation-iteration-count: 1 !important } }
`

// 対戦が決まったときの「MATCHED」の表示(バトル画面の上に、少しの間かぶせる)
export function MatchedOverlay({ me = 'あなた', opp = '相手', ranked = false, oppBp = null }) {
  return (
    <div className="pv-match" data-testid="pvp-matched"><style>{CSS}</style>
      <h3>{ranked ? 'RANK MATCH' : 'MATCHED'}</h3>
      <div className="row">
        <div className="side l" style={{ '--sc': C.player }}><small>YOU</small>{me}</div>
        <div className="vs">VS</div>
        <div className="side r" style={{ '--sc': C.enemy }}><small>OPPONENT{oppBp != null ? ` ・ ${oppBp} BP` : ''}</small>{opp || '相手'}</div>
      </div>
    </div>
  )
}

export default function PvpScreen({ settingsView = null, team, spells, onExit, onBackTeam, myName = 'あなた' }) {
  const desktop = useIsDesktop()
  const clientRef = useRef(null)
  const [phase, setPhase] = useState('menu') // menu | creating | joining | waiting | battle
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const [code, setCode] = useState('')
  const [input, setInput] = useState('')
  const [err, setErr] = useState('')
  const [online, setOnline] = useState(null)
  const [matched, setMatched] = useState(false)
  const chars = team.filter(Boolean)
  const teamPayload = () => ({ ids: chars.map((c) => c.id), spells: (spells || []).map((s) => s.id) })

  const connect = (mode) => {
    setErr('')
    if (clientRef.current) clientRef.current.close()
    const client = createPvpClient()
    clientRef.current = client
    const back = (msg) => { setErr(msg); setPhase('menu'); client.close() }
    client.on((m) => {
      const inBattle = phaseRef.current === 'battle'
      if (m.type === 'created') { setCode(m.code); setPhase('waiting') }
      else if (m.type === 'start' && !m.resume) { setOnline({ client, side: m.side, opp: m.opp && m.opp.name, init: m.state, left: m.left, turnMs: m.turnMs }); setPhase('battle'); setMatched(true) }
      else if (inBattle) return
      else if (m.type === 'error') back(m.message || '通信に失敗しました')
      else if (m.type === 'closed') back(m.reason || '部屋が閉じられました')
      else if (m.type === 'offline' && phaseRef.current !== 'waiting') back('対戦サーバーにつながりませんでした。サーバーが起動中の可能性があります。少し待って、もう一度お試しください。')
    })
    if (mode === 'create') { setPhase('creating'); client.create(teamPayload()) }
    else { setPhase('joining'); client.join(input.trim().toUpperCase(), teamPayload()) }
  }
  useEffect(() => () => { if (clientRef.current) clientRef.current.close() }, [])
  useEffect(() => { if (!matched) return; const t = setTimeout(() => setMatched(false), 1900); return () => clearTimeout(t) }, [matched])
  const cancel = () => { if (clientRef.current) clientRef.current.leave(); clientRef.current = null; setPhase('menu'); setCode('') }

  if (phase === 'battle' && online) {
    return (
      <>
        <BattleScreen settingsView={settingsView} online={online} onExit={onExit} />
        {matched && (
          <MatchedOverlay me={myName} opp={online.opp} ranked={online.ranked} oppBp={online.oppBp} />
        )}
      </>
    )
  }

  const busy = phase === 'creating' || phase === 'joining'
  const canJoin = !busy && input.trim().length >= 3
  return (
    <div className="pv theme-dark" data-testid="pvp-lobby">
      <style>{CSS}</style>
      <div className="pv-bg"><i /><i /></div>
      <ScreenHeader title="対人戦" onClose={phase === 'waiting' ? cancel : onExit} />
      <div className="pv-wrap">
        <section>
          <h2 className="pv-h">出すチーム</h2>
          <div className="pv-team">
            {chars.map((c, i) => (
              <div key={c.id} className="pv-unit" style={{ '--rc': tone(c), '--rbg': rarityBg(c), animation: `pv-up .35s ${i * 0.05}s ease-out backwards` }}>
                <div className={`pv-fig${isLeg(c) ? ' leg' : ''}`}><Emblem seed={c.id} /></div>
                <div className="pv-nm">{c.name}<div className="pv-cl">{c.class}</div></div>
              </div>
            ))}
          </div>
          <div className="pv-sub">{spells && spells.length ? `スペル ${spells.length}枚` : 'スペルなし'} ・ 1手の持ち時間 45秒(時間切れは自動で行動)</div>
          {onBackTeam && phase === 'menu' && <button type="button" className="pv-btn" style={{ marginTop: 12, minHeight: 40 }} onClick={onBackTeam}>チームを変える</button>}
        </section>
        <section className="pv-card">
          {err && <div className="pv-err" data-testid="pvp-err">{err}</div>}
          {phase === 'waiting' ? (
            <div style={{ textAlign: 'center' }}>
              <div className="pv-radar"><i /><i /><i /><u /></div>
              <div style={{ fontSize: 13, color: C.mute, marginTop: 6 }}>この部屋コードを、対戦相手に伝えてください</div>
              <div className="pv-code" data-testid="pvp-code">{code.split('').map((ch, i) => <b key={i} style={{ animationDelay: `${i * 0.05}s` }}>{ch}</b>)}</div>
              <div style={{ fontSize: 13, marginBottom: 16 }}>相手が入るのを待っています…</div>
              <button type="button" className="pv-btn" onClick={cancel}>部屋を閉じる</button>
            </div>
          ) : busy ? (
            <div style={{ textAlign: 'center', padding: '26px 0' }}>
              <div className="pv-spin" style={{ margin: '0 auto 14px' }} />
              <div style={{ fontWeight: 800 }}>{phase === 'creating' ? '部屋をつくっています…' : '部屋に入っています…'}</div>
              <div style={{ fontSize: 12, color: C.mute, marginTop: 6 }}>サーバーが眠っていると、30秒ほどかかることがあります</div>
              <button type="button" className="pv-btn" style={{ marginTop: 16, minHeight: 40 }} onClick={cancel}>やめる</button>
            </div>
          ) : (
            <>
              <h2 className="pv-h" style={{ marginTop: 0 }}>部屋をつくる</h2>
              <button type="button" className="pv-btn main wide" data-testid="pvp-create" onClick={() => connect('create')}>部屋をつくる</button>
              <div className="pv-or">または</div>
              <h2 className="pv-h">コードで入る</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="pv-in" data-testid="pvp-input" value={input} onChange={(e) => setInput(e.target.value.toUpperCase())} placeholder="CODE" maxLength={8} autoCapitalize="characters" autoComplete="off" />
                <button type="button" className="pv-btn main" data-testid="pvp-join" disabled={!canJoin} onClick={() => connect('join')}>入る</button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
