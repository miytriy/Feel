import { useEffect, useRef, useState } from 'react'
import { C, FONT, DISPLAY, useIsDesktop, useRemembered } from './ui.js'
import { ScreenHeader } from './chrome.jsx'
import { Emblem } from './emblem.jsx'
import { tone } from './FormationScreen.jsx'
import BattleScreen from './BattleScreen.jsx'
import { MatchedOverlay } from './PvpScreen.jsx'
import { createPvpClient } from './pvp.js'
import { fetchRank } from './api.js'
import { rankOf, emptyRank, TIERS, DIVS, matchWindow } from './battle/rank.js'

// ランダムマッチ画面。左: モード(ランクマッチ / カジュアルマッチ) / 中: 説明・ルール・使用デッキ / 右: 段位・BP・バトルボタン。
// 「バトル」を押すと、待ち行列に入り、相手が見つかったら、対戦が始まる。ランクは、近い BP の相手と組まれ、終わると BP が増減する。
// カジュアルは、BP に影響せず、ログインしていなくても(匿名プレイヤーとして)遊べる。
// 動かすのは transform / opacity だけ(web/EFFECTS.md)

// 段位のバッジ(自前の図形)。段位の色の盾 + 段階の数のシェブロン(3段階が下、1段階が上)。グランドマスターは冠つき
export function RankBadge({ rank, size = 200 }) {
  const col = rank.tier.color
  const pips = DIVS + 1 - rank.div // 1〜3
  const gm = rank.tier.key === 'grandmaster'
  const id = `rb-${rank.tier.key}`
  return (
    <svg viewBox="0 0 200 220" width={size} height={size * 1.1} role="img" aria-label={rank.label} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`${id}-f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={col} stopOpacity="1" /><stop offset="0.55" stopColor={col} stopOpacity="0.45" /><stop offset="1" stopColor="#14141a" stopOpacity="1" />
        </linearGradient>
        <linearGradient id={`${id}-s`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor={col} /></linearGradient>
      </defs>
      {gm && <path d="M40 38 L58 8 L80 30 L100 0 L120 30 L142 8 L160 38 Z" fill={col} stroke="#fff" strokeOpacity=".7" strokeWidth="2" />}
      <path d="M100 22 L176 52 L168 138 Q158 186 100 214 Q42 186 32 138 L24 52 Z" fill={`url(#${id}-f)`} stroke={`url(#${id}-s)`} strokeWidth="5" strokeLinejoin="round" />
      <path d="M100 38 L160 62 L153 134 Q145 172 100 196 Q55 172 47 134 L40 62 Z" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="2" />
      {Array.from({ length: pips }).map((_, i) => {
        const y = 92 + i * 26 - (pips - 1) * 13
        return <path key={i} d={`M62 ${y} L100 ${y + 22} L138 ${y} L138 ${y + 12} L100 ${y + 34} L62 ${y + 12} Z`} fill="#fff" fillOpacity=".92" />
      })}
    </svg>
  )
}

const CSS = `
.rk { position: fixed; inset: 0; z-index: 20; overflow-y: auto; background: #07070a; color: ${C.ink}; font-family: ${FONT}; animation: rk-fade .25s ease-out backwards; }
.rk button { font-family: ${FONT}; }
@keyframes rk-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes rk-up { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: none } }
@keyframes rk-right { from { opacity: 0; transform: translateX(30px) } to { opacity: 1; transform: none } }
@keyframes rk-left { from { opacity: 0; transform: translateX(-30px) } to { opacity: 1; transform: none } }
@keyframes rk-ring { 0% { transform: scale(.4); opacity: .7 } 100% { transform: scale(1.5); opacity: 0 } }
@keyframes rk-glow { 0%, 100% { opacity: .5; transform: scale(1) } 50% { opacity: 1; transform: scale(1.08) } }
@keyframes rk-spin { to { transform: rotate(360deg) } }
.rk-bg { position: fixed; inset: 0; pointer-events: none; background: radial-gradient(ellipse at 72% 38%, #3a3220 0%, #17151a 46%, #08080b 80%), #08080b; }
.rk-bg i { position: absolute; top: -10%; height: 130%; background: #e8c800; transform: skewX(-24deg); }
.rk-bg i:nth-child(1) { right: 4%; width: 140px; opacity: .06 } .rk-bg i:nth-child(2) { right: 13%; width: 22px; opacity: .22 }
.rk-wrap { position: relative; max-width: 1180px; margin: 0 auto; padding: 16px 14px calc(30px + env(safe-area-inset-bottom)); display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); }
@media (min-width: 900px) { .rk-wrap { grid-template-columns: 190px minmax(0, 1fr) 340px; gap: 22px; padding: 30px 28px; align-items: stretch } }
.rk-rail { display: flex; gap: 10px; animation: rk-left .35s ease-out backwards }
@media (min-width: 900px) { .rk-rail { flex-direction: column; align-self: start } .rk-mode { flex: none !important; min-height: 130px !important } }
@media (max-width: 899px) { .rk-right { order: 1 } .rk-mid { order: 2 } }
.rk-mode { flex: 1; position: relative; display: grid; place-items: center; gap: 6px; padding: 16px 10px; border-radius: 12px; border: 1px solid ${C.line}; background: #111114; color: ${C.mute}; font-weight: 800; font-size: 14px; cursor: pointer; text-align: center; min-height: 64px }
.rk-mode.on { background: linear-gradient(180deg, #f1d24a, #a8860f); color: #1b1500; border-color: #ffe27a; cursor: default }
.rk-mode:hover:not(.on) { border-color: ${C.player}; color: ${C.ink} }
.rk-mode svg { width: 44px; height: 44px }
.rk-mid { display: flex; flex-direction: column; gap: 14px; min-width: 0; animation: rk-up .4s .05s ease-out backwards }
.rk-title { display: flex; align-items: center; gap: 12px; font-family: ${DISPLAY}; font-weight: 700; font-size: 26px; letter-spacing: .08em; color: #f6e7a8 }
.rk-title::after { content: ''; flex: 1; height: 2px; background: linear-gradient(90deg, #a8860f, transparent) }
.rk-desc { margin: 0; font-size: 14px; line-height: 1.6; color: #d8d3c0 }
.rk-rules { display: grid; gap: 8px; max-width: 360px }
.rk-rule { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-radius: 8px; font-weight: 800; font-size: 15px; border: 1px solid transparent }
.rk-rule.on { background: linear-gradient(90deg, #1f4d9a, #153269); border-color: #4d86e0; color: #fff }
.rk-rule.off { background: #1b1814; border-color: #3a3328; color: ${C.mute}; opacity: .8 }
.rk-rule .dot { width: 22px; height: 22px; border-radius: 50%; border: 2px solid #8fb4ff; background: #0b0b0e }
.rk-rule.on .dot { background: #32d2ff; box-shadow: none; border-color: #fff }
.rk-rule small { font-size: 11px; font-weight: 700; color: ${C.mute} }
.rk-deck { padding: 14px; border-radius: 12px; background: #111114; border: 1px solid ${C.line}; display: grid; gap: 12px }
.rk-deck h3 { margin: 0; font-size: 13px; color: #f6e7a8; letter-spacing: .08em; display: flex; align-items: center; justify-content: space-between }
.rk-units { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px }
.rk-unit { flex: 0 0 74px; --rc: #888 }
.rk-unit .fig { position: relative; width: 74px; height: 80px; background: linear-gradient(170deg, color-mix(in srgb, var(--rc) 55%, #fff) 0%, var(--rc) 42%, #14141a 100%); clip-path: polygon(10% 0, 100% 0, 90% 100%, 0 100%) }
.rk-unit .fig svg, .rk-unit .fig img.art { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover }
.rk-unit .n { font-size: 10px; font-weight: 700; line-height: 1.25; margin-top: 4px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical }
.rk-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 40px; padding: 0 20px; border-radius: 999px; border: 1.5px solid #7fb4ff; background: #12233f; color: #fff; font-weight: 800; font-size: 14px; cursor: pointer }
.rk-btn:hover { background: #1a3560 }
.rk-right { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 18px 16px; border-radius: 16px; background: linear-gradient(180deg, rgba(60,50,25,.55), rgba(18,16,14,.92)); border: 1px solid #6d5a1a; animation: rk-right .4s .1s ease-out backwards; position: relative; overflow: hidden }
.rk-badge { position: relative; display: grid; place-items: center; margin-top: 6px }
.rk-badge::before { content: ''; position: absolute; inset: -10%; border-radius: 50%; background: radial-gradient(circle, var(--tc) 0%, transparent 62%); opacity: .5; animation: rk-glow 3.2s ease-in-out infinite }
.rk-badge svg { position: relative }
.rk-rank { font-family: ${DISPLAY}; font-weight: 700; font-size: 34px; text-align: center; line-height: 1.1; background: linear-gradient(180deg, #fff, var(--tc)); -webkit-background-clip: text; background-clip: text; color: transparent }
.rk-bp { width: 100%; display: grid; gap: 6px }
.rk-bp .row { display: flex; align-items: baseline; justify-content: space-between; font-family: ${DISPLAY}; font-weight: 700 }
.rk-bp .row b { font-size: 26px; color: #fff }
.rk-bar { height: 10px; border-radius: 5px; background: #0b0f1a; border: 1px solid #243455; overflow: hidden }
.rk-bar i { display: block; height: 100%; width: 100%; transform-origin: left; background: linear-gradient(90deg, #2b8cff, #6fe0ff) }
.rk-next { text-align: right; font-size: 12px; color: ${C.mute} }
.rk-rec { display: flex; justify-content: space-between; width: 100%; font-size: 13px; color: #d8d3c0 }
.rk-rec b { color: #fff; font-family: ${DISPLAY}; font-size: 18px }
.rk-battle { position: relative; width: 148px; height: 148px; margin-top: 6px; border-radius: 50%; border: 3px solid #d8b85a; background: radial-gradient(circle at 50% 35%, #4aa8ff, #1553c4 60%, #0a2a6e); color: #fff; font-family: ${DISPLAY}; font-weight: 700; font-size: 30px; letter-spacing: .1em; cursor: pointer; display: grid; place-items: center }
.rk-battle::before { content: ''; position: absolute; inset: -6px; border-radius: 50%; border: 2px solid #7fd0ff; animation: rk-ring 2.2s ease-out infinite }
.rk-battle:hover:not(:disabled) { transform: scale(1.04) }
.rk-battle:disabled { filter: grayscale(.7); cursor: default } .rk-battle:disabled::before { display: none }
.rk-err { padding: 10px 12px; border-radius: 10px; background: rgba(224,67,31,.14); border: 1px solid ${C.enemy}; color: #ffb4a0; font-size: 13px; line-height: 1.5 }
.rk-search { position: fixed; inset: 0; z-index: 300; display: grid; place-items: center; background: rgba(5,5,8,.94) }
.rk-search .box { text-align: center; padding: 20px; max-width: 360px }
.rk-radar { position: relative; width: 150px; height: 150px; margin: 0 auto 14px }
.rk-radar i { position: absolute; inset: 0; border-radius: 50%; border: 2px solid #6fe0ff; animation: rk-ring 2.4s ease-out infinite }
.rk-radar i:nth-child(2) { animation-delay: .8s } .rk-radar i:nth-child(3) { animation-delay: 1.6s }
.rk-radar u { position: absolute; inset: 54px; border-radius: 50%; background: #6fe0ff }
.rk-time { font-family: ${DISPLAY}; font-size: 42px; font-weight: 700; margin: 6px 0 }
@media (prefers-reduced-motion: reduce) { .rk *, .rk-search * { animation-duration: .01s !important; animation-iteration-count: 1 !important } }
`

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// team: 使うチーム(キャラ定義) / spells: スペル / onChangeTeam: 「確認」→チームを選び直す / onRoom: 部屋コードで対戦 / loggedIn: ログイン中か
export default function RandomMatchScreen({ team, spells, onChangeTeam, onRoom, loggedIn = true, onExit, myName = 'あなた' }) {
  const desktop = useIsDesktop()
  const clientRef = useRef(null)
  const [modeSel, setMode] = useRemembered('random.mode', 'rank')
  const mode = loggedIn ? modeSel : 'casual' // ログインしていなければ、カジュアルだけ
  const ranked = mode === 'rank'
  const [rank, setRank] = useState(null)
  const [err, setErr] = useState('')
  const [phase, setPhase] = useState('menu') // menu | connecting | searching | battle
  const phaseRef = useRef(phase); phaseRef.current = phase
  const [waited, setWaited] = useState(0)
  const [online, setOnline] = useState(null)
  const [matched, setMatched] = useState(false)
  const chars = (team || []).filter(Boolean)

  const load = () => fetchRank().then((r) => setRank({ ...emptyRank(), ...(r.rank || {}) })).catch((e) => setErr(`ランクの情報を読み込めませんでした: ${e.message}`))
  useEffect(() => { if (loggedIn) load() }, [loggedIn]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (clientRef.current) clientRef.current.close() }, [])
  useEffect(() => { if (phase !== 'searching') return; setWaited(0); const t = setInterval(() => setWaited((w) => w + 1), 1000); return () => clearInterval(t) }, [phase])
  useEffect(() => { if (!matched) return; const t = setTimeout(() => setMatched(false), 2000); return () => clearTimeout(t) }, [matched])

  const start = () => {
    setErr('')
    if (clientRef.current) clientRef.current.close()
    const client = createPvpClient()
    clientRef.current = client
    const back = (msg) => { if (msg) setErr(msg); setPhase('menu'); client.close() }
    client.on((m) => {
      if (phaseRef.current === 'battle') return
      if (m.type === 'queued') setPhase('searching')
      else if (m.type === 'start' && !m.resume) { setOnline({ client, side: m.side, opp: m.opp && m.opp.name, oppBp: m.opp && m.opp.bp, ranked: !!m.ranked, init: m.state, left: m.left, turnMs: m.turnMs }); setPhase('battle'); setMatched(true) }
      else if (m.type === 'queue-left') back(m.reason === 'やめました' ? '' : m.reason)
      else if (m.type === 'error') back(m.message || '通信に失敗しました')
      else if (m.type === 'closed') back(m.reason || '部屋が閉じられました')
      else if (m.type === 'offline') back('対戦サーバーにつながりませんでした。サーバーが起動中の可能性があります。少し待って、もう一度お試しください。')
    })
    setPhase('connecting')
    client.queue({ ids: chars.map((c) => c.id), spells: (spells || []).map((s) => s.id) }, ranked)
  }
  const cancel = () => { if (clientRef.current) { clientRef.current.cancelQueue(); clientRef.current.close(); clientRef.current = null } setPhase('menu') }
  const leaveBattle = () => { setOnline(null); setPhase('menu'); load() } // 対戦のあと: 最新の BP を読み直す

  if (phase === 'battle' && online) {
    return (
      <>
        <BattleScreen online={online} onExit={leaveBattle} />
        {matched && <MatchedOverlay me={loggedIn ? myName : '匿名プレイヤー'} opp={online.opp} ranked={online.ranked} oppBp={online.oppBp} />}
      </>
    )
  }

  const ri = rank ? rankOf(rank.bp) : null
  const tc = ri ? ri.tier.color : '#c98a52'
  const busy = phase !== 'menu'
  return (
    <div className="rk theme-dark" data-testid="random-screen">
      <style>{CSS}</style>
      <div className="rk-bg"><i /><i /></div>
      <ScreenHeader title="ランダムマッチ" onClose={onExit} />
      <div className="rk-wrap">
        <nav className="rk-rail" aria-label="モード">
          <button type="button" className={`rk-mode${ranked ? ' on' : ''}`} onClick={() => setMode('rank')} disabled={busy || !loggedIn} data-testid="mode-rank" aria-pressed={ranked}>
            <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4 L42 11 L40 28 Q37 40 24 45 Q11 40 8 28 L6 11 Z" fill="none" stroke="currentColor" strokeWidth="3" /><path d="M15 22 L24 30 L33 22" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            ランクマッチ
            {!loggedIn && <small style={{ fontSize: 10, fontWeight: 700 }}>ログインが必要</small>}
          </button>
          <button type="button" className={`rk-mode${!ranked ? ' on' : ''}`} onClick={() => setMode('casual')} disabled={busy} data-testid="mode-casual" aria-pressed={!ranked}>
            <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="17" fill="none" stroke="currentColor" strokeWidth="3" /><path d="M16 24 H32 M24 16 V32" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
            カジュアルマッチ
          </button>
        </nav>

        <section className="rk-mid">
          <div className="rk-title">{ranked ? 'ランクマッチ' : 'カジュアルマッチ'}</div>
          <p className="rk-desc">{ranked
            ? 'ランクをかけて争う、ランダムマッチング戦です。勝つとバトルポイント(BP)が増え、一定のBPで段位が上がります。負けるとBPが減りますが、段位(ブロンズ・シルバー…)そのものは下がりません。'
            : 'ランクに影響しない、気軽なランダムマッチング戦です。BPは増減せず、すぐに相手が見つかります。ログインしていなくても、匿名プレイヤーとして遊べます。'}</p>
          <div className="rk-rules">
            <div className="rk-rule on" data-testid="rule-rotation">ローテーション<span className="dot" /></div>
            <div className="rk-rule off">アンリミテッド<small>準備中</small></div>
          </div>
          <div className="rk-deck">
            <h3>使用デッキ<button type="button" className="rk-btn" onClick={onChangeTeam} disabled={busy} data-testid="rank-deck">確認・変更</button></h3>
            <div className="rk-units">
              {chars.map((c) => (
                <div key={c.id} className="rk-unit" style={{ '--rc': tone(c) }}>
                  <div className="fig"><Emblem seed={c.id} /></div>
                  <div className="n">{c.name}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: C.mute }}>{spells && spells.length ? `スペル ${spells.length}枚` : 'スペルなし'} ・ 1手の持ち時間 45秒</div>
          </div>
          {err && <div className="rk-err" data-testid="rank-err">{err}</div>}
        </section>

        <aside className="rk-right" style={{ '--tc': tc }}>
          {!ranked ? (
            <>
              <div className="rk-badge" style={{ '--tc': '#6fe0ff' }}><svg viewBox="0 0 200 200" width={desktop ? 170 : 130} height={desktop ? 170 : 130} aria-hidden="true"><circle cx="100" cy="100" r="84" fill="none" stroke="#6fe0ff" strokeWidth="6" /><circle cx="100" cy="100" r="62" fill="#12233f" stroke="#fff" strokeOpacity=".4" strokeWidth="3" /><path d="M70 130 L130 70 M130 130 L70 70" stroke="#fff" strokeWidth="10" strokeLinecap="round" /></svg></div>
              <div className="rk-rank" style={{ fontSize: 28 }}>CASUAL</div>
              <div style={{ fontSize: 13, color: '#d8d3c0', textAlign: 'center', lineHeight: 1.6 }}>BPは増減しません<br />{loggedIn ? '' : '匿名プレイヤーとして参戦します'}</div>
            </>
          ) : ri ? (
            <>
              <div className="rk-badge"><RankBadge rank={ri} size={desktop ? 190 : 150} /></div>
              <div className="rk-rank" data-testid="rank-label">{ri.label}</div>
              <div className="rk-bp">
                <div className="row"><span>BP</span><b data-testid="rank-bp">{rank.bp}</b></div>
                <div className="rk-bar"><i style={{ transform: `scaleX(${Math.max(0.02, ri.progress)})` }} /></div>
                <div className="rk-next">{ri.next == null ? '最高ランク' : `NEXT ${ri.next - rank.bp}`}</div>
              </div>
              <div className="rk-rec"><span>勝利 <b>{rank.wins}</b></span><span>敗北 <b>{rank.losses}</b></span><span>連勝 <b>{rank.streak}</b></span></div>
            </>
          ) : (
            <div style={{ padding: '70px 0', color: C.mute, fontSize: 13 }}>{err ? '' : '読み込み中…'}</div>
          )}
          <button type="button" className="rk-battle" data-testid="rank-battle" disabled={busy || (ranked && !rank) || chars.length === 0} onClick={start}>バトル</button>
          {!ranked && onRoom && <button type="button" className="rk-btn" style={{ marginTop: 6 }} onClick={onRoom} disabled={busy} data-testid="to-room">部屋コードで友だちと対戦</button>}
        </aside>
      </div>

      {busy && (
        <div className="rk-search" data-testid="random-search">
          <div className="box">
            <div className="rk-radar"><i /><i /><i /><u /></div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{phase === 'connecting' ? 'サーバーにつないでいます…' : '対戦相手を探しています…'}</div>
            {phase === 'searching' && <>
              <div className="rk-time">{fmt(waited)}</div>
              <div style={{ fontSize: 12, color: C.mute }}>{ranked ? `探している範囲: BP ±${matchWindow(waited)}(待つほど広がります)` : 'カジュアルマッチ'}</div>
            </>}
            {phase === 'connecting' && <div style={{ fontSize: 12, color: C.mute, marginTop: 8 }}>サーバーが眠っていると、30秒ほどかかることがあります</div>}
            <button type="button" className="rk-btn" style={{ marginTop: 20 }} onClick={cancel} data-testid="rank-cancel">やめる</button>
          </div>
        </div>
      )}
    </div>
  )
}
