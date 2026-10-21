// Feel - 足跡(キャリア)画面: 直近の勝率・対戦データ・試合ごとの詳細(1ラウンドごとのダメージ)をふりかえる
// 見た目は、ほかの画面(ホーム・人事・編成)と同じ: 暗い地に黄色の斜めの帯、斜めに切った板、角ばった数字
import { useEffect, useState } from 'react'
import { useIsDesktop, C, FONT, DISPLAY } from './ui.js'
import { IconCareer, IconClose, IconBack } from './icons.jsx'
import { summarize } from './career.js'

// 勝ちは黄色、負けは赤橙(相手の色)、引き分けは灰色。bg=板の色、ink=その上の文字色
const RES = {
  win: { label: '勝利', mark: '○', bg: '#ffe600', ink: '#121212', text: '#ffe600' },
  lose: { label: '敗北', mark: '×', bg: '#ff5a36', ink: '#ffffff', text: '#ff5a36' },
  draw: { label: '引き分け', mark: '△', bg: '#6d6d74', ink: '#ffffff', text: '#b4b4bb' },
}
const LEVEL = { 1: 'Lv.1', 2: 'Lv.2', 3: 'Lv.3', 4: 'Lv.4', 5: 'Lv.5' }
const fmtDate = (t) => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
const n0 = (v) => Math.round(v).toLocaleString('ja-JP')

const CSS = `
.ft { position: relative; min-height: 100vh; background: #050506; color: ${C.ink}; font-family: ${FONT}; overflow-x: hidden; animation: ft-fade 0.25s ease-out backwards; }
.ft button { font-family: ${FONT}; }
@keyframes ft-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes ft-rise { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: none; } }
@keyframes ft-side { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: none; } }
@keyframes ft-num { from { opacity: 0; transform: translateX(60px); } to { opacity: 1; transform: none; } }

/* 背景: 暗い地に、等高線と、黄色の斜めの帯(編成画面と同じ) */
.ft-bg { position: fixed; inset: 0; pointer-events: none;
  background:
    repeating-radial-gradient(ellipse 1500px 520px at 62% 125%, transparent 0 70px, rgba(255,255,255,0.045) 70px 73px),
    radial-gradient(ellipse at 62% 40%, #25272b 0%, #15161a 48%, #0a0a0c 80%); }
.ft-bg i { position: absolute; top: -10%; height: 130%; background: ${C.player}; transform: skewX(-24deg); }
.ft-bg i:nth-child(1) { right: 6%; width: 120px; opacity: 0.07; }
.ft-bg i:nth-child(2) { right: 15%; width: 26px; opacity: 0.22; }
.ft-no { position: fixed; right: 150px; top: 30px; font-family: ${DISPLAY}; font-weight: 700; font-style: italic; font-size: clamp(140px, 22vw, 380px); line-height: 1; color: rgba(255,255,255,0.05); pointer-events: none; animation: ft-num 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }

.ft-in { position: relative; z-index: 1; padding: 0 56px 60px; max-width: 1500px; margin: 0 auto; }
.ft-top { display: flex; align-items: center; gap: 14px; padding: 30px 0 22px; padding-top: calc(30px + env(safe-area-inset-top)); }
.ft-title { display: flex; align-items: center; gap: 14px; font-family: ${DISPLAY}; font-weight: 600; font-style: italic; font-size: 38px; letter-spacing: 0.08em; color: ${C.mute}; }
.ft-title b { color: ${C.ink}; font-style: normal; }
.ft-title svg { font-size: 46px; color: ${C.player}; }
.ft-x { margin-left: auto; width: 68px; height: 68px; padding: 0; min-height: 0; border: 0; border-radius: 50%; background: #f2f2f3; color: #1c1c1f; font-size: 36px; display: grid; place-items: center; cursor: pointer; transition: background 0.15s, transform 0.15s; }
.ft-x:hover, .ft-x:focus-visible { background: ${C.player}; transform: rotate(90deg); outline: none; }

/* 上の帯: 勝率(黄色の板) + 数字の板 */
.ft-sum { display: grid; grid-template-columns: minmax(300px, 400px) minmax(0, 1fr); gap: 26px; align-items: stretch; margin-bottom: 30px; }
.ft-rate { position: relative; padding: 20px 56px 18px 34px; color: #141414; clip-path: polygon(0 0, 100% 0, 93% 100%, 0 100%);
  background: linear-gradient(135deg, #fff55c 0%, ${C.player} 55%, #e2cb00 100%); animation: ft-side 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.ft-rate .lb { font-family: ${DISPLAY}; font-weight: 700; font-size: 14px; letter-spacing: 0.22em; }
.ft-rate .big { font-family: ${DISPLAY}; font-weight: 700; font-style: italic; font-size: 104px; line-height: 1; letter-spacing: 0.01em; }
.ft-rate .big small { font-size: 44px; margin-left: 4px; }
.ft-rate .sb { font-size: 17px; font-weight: 700; margin-top: 2px; }
.ft-form { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 14px; }
.ft-form i { width: 24px; height: 24px; transform: skewX(-14deg); display: grid; place-items: center; background: var(--rb); color: var(--ri); font-style: normal; font-family: ${DISPLAY}; font-weight: 700; font-size: 14px; }
.ft-form i b { transform: skewX(14deg); font-weight: 700; }
.ft-form i.win { background: #141414; color: ${C.player}; }
.ft-form span { font-size: 11px; opacity: 0.65; margin-left: 4px; }
.ft-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; }

/* 数字の板: 明るい灰色 + うしろに、少しずれた暗い板(ホームの板と同じ) */
.ft-cell { position: relative; filter: drop-shadow(0 6px 10px rgba(0,0,0,0.45)); animation: ft-rise 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; animation-delay: calc(var(--i, 0) * 60ms); }
.ft-cell::before { content: ''; position: absolute; inset: 0; background: #0a0a0b; opacity: 0.85; transform: translate(6px, 6px); clip-path: polygon(7% 0, 100% 0, 93% 100%, 0 100%); }
.ft-cell > .ft-stat { height: 100%; }
.ft-stat { position: relative; padding: 12px 22px 12px 26px; color: #1c1c1f; clip-path: polygon(7% 0, 100% 0, 93% 100%, 0 100%); background: linear-gradient(135deg, #ececee 0%, #c6c6ca 100%); }
.ft-stat .lb { font-family: ${DISPLAY}; font-weight: 600; font-size: 12px; letter-spacing: 0.1em; color: rgba(0,0,0,0.55); }
.ft-stat .v { font-family: ${DISPLAY}; font-weight: 700; font-style: italic; font-size: 38px; line-height: 1.1; }
.ft-stat .sb { font-size: 12px; color: rgba(0,0,0,0.55); min-height: 16px; }
.ft-stat.dk { background: linear-gradient(135deg, #2a2a2f 0%, #1c1c20 100%); color: ${C.ink}; }
.ft-stat.dk .lb, .ft-stat.dk .sb { color: ${C.mute}; }

.ft-main { display: grid; grid-template-columns: minmax(320px, 420px) minmax(0, 1fr); gap: 30px; align-items: start; }
.ft-hd { display: flex; align-items: center; gap: 10px; margin: 0 0 12px; font-family: ${DISPLAY}; font-weight: 700; font-size: 16px; letter-spacing: 0.16em; color: ${C.mute}; }
.ft-hd::before { content: ''; width: 12px; height: 12px; background: ${C.player}; transform: rotate(45deg); }

/* 試合の一覧 */
.ft-row { position: relative; display: flex; align-items: center; gap: 14px; width: 100%; margin: 0 0 8px; padding: 10px 18px 10px 0; min-height: 0; border: 0; text-align: left; cursor: pointer; color: ${C.ink};
  background: #1d1d21; clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%);
  transition: transform 0.14s, background 0.14s; animation: ft-rise 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; animation-delay: calc(var(--i, 0) * 40ms); }
.ft-row .bd { flex: none; width: 66px; align-self: stretch; display: grid; place-items: center; background: var(--rb); color: var(--ri); font-family: ${DISPLAY}; font-weight: 700; font-size: 30px; clip-path: polygon(0 0, 100% 0, 82% 100%, 0 100%); }
.ft-row .tx { flex: 1; min-width: 0; }
.ft-row .nm { font-size: 18px; font-weight: 700; }
.ft-row .nm small { margin-left: 6px; font-size: 12px; font-weight: 400; color: ${C.mute}; }
.ft-row .dt { margin-top: 1px; font-size: 12px; color: ${C.mute}; }
.ft-vs { display: flex; height: 6px; margin-top: 6px; background: #ff5a36; transform: skewX(-20deg); }
.ft-vs i { display: block; height: 100%; background: ${C.player}; }
.ft-row:hover, .ft-row:focus-visible { transform: translateX(6px); background: #26262b; outline: none; }
.ft-row.on { background: #2e2a10; transform: translateX(10px); }
.ft-row.on::after { content: ''; position: absolute; inset: 0; border-left: 5px solid ${C.player}; pointer-events: none; }

.ft-note { margin-top: 14px; font-size: 12px; color: ${C.mute}; line-height: 1.6; }
.ft-pill { display: inline-flex; align-items: center; gap: 8px; padding: 8px 20px; min-height: 0; border-radius: 999px; border: 1.5px solid ${C.line}; background: transparent; color: ${C.ink}; font-family: ${DISPLAY}; font-weight: 600; font-size: 15px; letter-spacing: 0.06em; cursor: pointer; transition: background 0.15s, color 0.15s, border-color 0.15s; }
.ft-pill:hover, .ft-pill:focus-visible { border-color: ${C.player}; outline: none; }
.ft-pill.bad { border-color: ${C.bad}; color: ${C.bad}; }
.ft-pill.on { background: #f2f2f3; color: #1c1c1f; border-color: #f2f2f3; }
.ft-empty { padding: 22px 24px; border: 2px dashed rgba(255,255,255,0.22); color: #d6d6dc; font-size: 15px; line-height: 1.7; }
.ft-err { padding: 14px 18px; background: ${C.dangerBg}; border-left: 5px solid ${C.bad}; color: ${C.bad}; font-size: 14px; }

/* 試合の詳細 */
.ft-det { animation: ft-fade 0.25s ease-out backwards; }
.ft-ttl { display: flex; align-items: center; gap: 18px; margin-bottom: 14px; }
.ft-ttl .mk { flex: none; width: 76px; height: 76px; transform: rotate(45deg) scale(0.8); display: grid; place-items: center; background: var(--rb); }
.ft-ttl .mk b { transform: rotate(-45deg); color: var(--ri); font-family: ${DISPLAY}; font-weight: 700; font-size: 46px; }
.ft-ttl .rs { font-family: ${DISPLAY}; font-weight: 700; font-style: italic; font-size: 54px; line-height: 1; color: var(--rt); }
.ft-ttl .mt { margin-top: 6px; font-size: 14px; color: ${C.mute}; }
.ft-teams { margin-bottom: 18px; font-size: 14px; line-height: 1.7; }
.ft-teams div { padding: 4px 14px; margin-bottom: 4px; background: rgba(0,0,0,0.45); border-left: 5px solid var(--tc); }
.ft-teams b { color: var(--tc); margin-right: 8px; letter-spacing: 0.1em; }
.ft-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin-bottom: 20px; }
.ft-pn { position: relative; margin-bottom: 18px; padding: 16px 20px 18px 24px; background: #17171b; border-left: 5px solid ${C.player}; clip-path: polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 0 100%); }
.ft-pn h4 { margin: 0 0 12px; font-size: 15px; letter-spacing: 0.04em; }
.ft-pn h4 span { font-weight: 400; font-size: 12px; color: ${C.mute}; }
.ft-bar { height: 9px; transform-origin: left; transform: skewX(-20deg); min-width: 2px; }
.ft-log { margin-top: 12px; max-height: 360px; overflow-y: auto; font-size: 12px; line-height: 1.7; color: ${C.mute}; }

@media (max-width: 899px) {
  .ft-in { padding: 0 14px 40px; }
  .ft-top { padding: 14px 0 14px; padding-top: calc(14px + env(safe-area-inset-top)); }
  .ft-title { font-size: 28px; } .ft-title svg { font-size: 34px; }
  .ft-x { width: 52px; height: 52px; font-size: 28px; }
  .ft-no { right: 10px; top: 60px; }
  .ft-sum { grid-template-columns: 1fr; gap: 16px; margin-bottom: 22px; }
  .ft-rate { padding: 16px 46px 14px 22px; } .ft-rate .big { font-size: 84px; }
  .ft-stats { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .ft-stat .v { font-size: 30px; }
  .ft-main { grid-template-columns: 1fr; gap: 18px; }
  .ft-bg i:nth-child(1) { right: -4%; }
  .ft-ttl .mk { width: 60px; height: 60px; } .ft-ttl .mk b { font-size: 36px; } .ft-ttl .rs { font-size: 40px; }
}
@media (prefers-reduced-motion: reduce) { .ft, .ft-no, .ft-rate, .ft-cell, .ft-row, .ft-det { animation: none !important; } .ft-row, .ft-x { transition: none; } }
`

const rv = (r) => ({ '--rb': RES[r].bg, '--ri': RES[r].ink, '--rt': RES[r].text })

function Cell({ label, value, sub, i = 0 }) {
  return (
    <div className="ft-cell" style={{ '--i': i }}>
      <div className="ft-stat"><div className="lb">{label}</div><div className="v">{value}</div><div className="sb">{sub || ' '}</div></div>
    </div>
  )
}
function Tile({ label, value, sub, i = 0 }) {
  return (
    <div className="ft-cell" style={{ '--i': i }}>
      <div className="ft-stat dk"><div className="lb">{label}</div><div className="v">{value}</div><div className="sb">{sub || ' '}</div></div>
    </div>
  )
}

// 1ラウンドごとのダメージ(黄=与えた、赤橙=受けた)
function RoundChart({ rows }) {
  const max = Math.max(1, ...rows.flatMap((r) => [r.A, r.B]))
  if (!rows.length) return <div style={{ fontSize: 13, color: C.mute }}>ダメージの記録がありません</div>
  return (
    <div data-testid="round-chart">
      {rows.map((r) => (
        <div key={r.round} style={{ display: 'grid', gridTemplateColumns: '38px 1fr', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 13, color: C.mute }}>R{r.round}</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="ft-bar" style={{ background: C.player, width: `${(r.A / max) * 100}%`, minWidth: r.A ? 3 : 0 }} />
              <span style={{ fontSize: 12, color: C.player }}>{n0(r.A)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
              <div className="ft-bar" style={{ background: C.enemy, width: `${(r.B / max) * 100}%`, minWidth: r.B ? 3 : 0 }} />
              <span style={{ fontSize: 12, color: C.enemy }}>{n0(r.B)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function Detail({ m }) {
  const [showLog, setShowLog] = useState(false)
  const r = RES[m.result]
  const best = m.perRound.reduce((b, x) => (x.A > (b?.A ?? -1) ? x : b), null)
  const maxDealt = Math.max(1, ...m.units.map((u) => u.dealt))
  return (
    <div className="ft-det" data-testid="career-detail" style={rv(m.result)}>
      <div className="ft-ttl">
        <div className="mk"><b>{r.mark}</b></div>
        <div>
          <div className="rs">{r.label}</div>
          <div className="mt">{fmtDate(m.t)} ・ CPU Lv{m.level} {LEVEL[m.level] ?? ''} ・ {m.rounds}ラウンド</div>
        </div>
      </div>
      <div className="ft-teams">
        <div style={{ '--tc': C.player }}><b>自分</b>{m.names.A.join('、')}</div>
        <div style={{ '--tc': C.enemy }}><b>相手</b>{m.names.B.join('、')}</div>
      </div>
      <div className="ft-tiles">
        <Tile i={0} label="与えたダメージ" value={n0(m.totals.A)} sub={`DPR ${n0(m.totals.A / Math.max(1, m.perRound.length))}${m.turns?.A ? ` ・ DPT ${n0(m.totals.A / m.turns.A)}` : ''}`} />
        <Tile i={1} label="受けたダメージ" value={n0(m.totals.B)} sub={`DPR ${n0(m.totals.B / Math.max(1, m.perRound.length))}${m.turns?.B ? ` ・ DPT ${n0(m.totals.B / m.turns.B)}` : ''}`} />
        {m.turns && <Tile i={2} label="ターン数" value={`${m.turns.A} / ${m.turns.B}`} sub="自分 / 相手" />}
        <Tile i={3} label="最大の1ラウンド" value={best ? n0(best.A) : '-'} sub={best ? `R${best.round}` : ''} />
        <Tile i={4} label="回復量" value={n0(m.heal.A)} sub={`相手 ${n0(m.heal.B)}`} />
      </div>
      <div style={{ fontSize: 11, color: C.mute, margin: '-8px 0 16px' }}>DPR = 1ラウンドあたりのダメージ ・ DPT = 1ターン(1回の行動)あたりのダメージ</div>
      <div className="ft-pn">
        <h4>1ラウンドごとのダメージ(DPR) <span>(<span style={{ color: C.player }}>■</span>与えた <span style={{ color: C.enemy }}>■</span>受けた)</span></h4>
        <RoundChart rows={m.perRound} />
      </div>
      <div className="ft-pn">
        <h4>キャラごとの与ダメージ</h4>
        {m.units.length === 0 && <div style={{ fontSize: 13, color: C.mute }}>記録がありません</div>}
        {m.units.map((u) => (
          <div key={u.name + u.team} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 13, color: u.team === 'A' ? C.player : C.enemy }}>{u.name} <b>{n0(u.dealt)}</b></div>
            <div className="ft-bar" style={{ background: u.team === 'A' ? C.player : C.enemy, width: `${(u.dealt / maxDealt) * 100}%`, height: 7, marginTop: 3 }} />
          </div>
        ))}
      </div>
      <div className="ft-pn">
        <button type="button" className={`ft-pill${showLog ? ' on' : ''}`} onClick={() => setShowLog(!showLog)}>対戦ログ {showLog ? '▲' : '▼'}</button>
        {showLog && <div className="ft-log">{m.log.map((l, i) => <div key={i}>{l}</div>)}</div>}
      </div>
    </div>
  )
}

// fetchCareer() → { matches }(アカウントに保存された記録), clearCareer() → 全部消す
export default function CareerScreen({ onExit, fetchCareer, clearCareer }) {
  const desktop = useIsDesktop()
  const [matches, setMatches] = useState([])
  const [status, setStatus] = useState('loading') // loading / ok / error
  const [errMsg, setErrMsg] = useState('')
  useEffect(() => {
    let alive = true
    fetchCareer()
      .then((r) => { if (alive) { setMatches(r.matches || []); setStatus('ok') } })
      .catch((e) => { if (alive) { setErrMsg(e.message); setStatus('error') } })
    return () => { alive = false }
  }, [fetchCareer])
  const [openId, setOpenId] = useState(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const sm = summarize(matches)
  const opened = matches.find((m) => m.id === openId) || null
  const pct = (v) => (v == null ? '-' : `${v}%`)

  const summary = (
    <div className="ft-sum">
      <div className="ft-rate">
        <div className="lb">WIN RATE ・ 通算勝率</div>
        <div className="big">{sm.rate == null ? '--' : sm.rate}<small>%</small></div>
        <div className="sb">{sm.win}勝 {sm.lose}敗 {sm.draw}分(全{sm.total}戦)</div>
        {matches.length > 0 && (
          <div className="ft-form" data-testid="form-strip">
            {matches.slice(0, 10).reverse().map((m) => <i key={m.id} className={m.result} style={rv(m.result)}><b>{RES[m.result].mark}</b></i>)}
            <span>← 古い ・ 新しい →</span>
          </div>
        )}
      </div>
      <div className="ft-stats">
        <Cell i={0} label="直近10戦の勝率" value={pct(sm.recentRate)} sub={`${sm.recentN}戦`} />
        <Cell i={1} label="連勝" value={sm.streak} sub="いまの連勝数" />
        <Cell i={2} label="平均ラウンド" value={sm.total ? sm.avgRounds.toFixed(1) : '-'} />
        <Cell i={3} label="DPR(1ラウンドの与ダメ)" value={sm.total ? n0(sm.dpsDealt) : '-'} sub={sm.total ? `受ダメ ${n0(sm.dpsTaken)}` : ''} />
        <Cell i={4} label="DPT(1ターンの与ダメ)" value={sm.hasTurns ? n0(sm.dptDealt) : '-'} sub={sm.hasTurns ? `受ダメ ${n0(sm.dptTaken)}` : ''} />
      </div>
    </div>
  )

  const list = (
    <div data-testid="match-list">
      <div className="ft-hd">対戦の記録</div>
      {status === 'loading' && <div className="ft-empty">読み込み中…</div>}
      {status === 'error' && <div className="ft-err">記録を読み込めませんでした: {errMsg}</div>}
      {status === 'ok' && matches.length === 0 && <div className="ft-empty">まだ対戦の記録がありません。CPU対戦を終えると、ここに残ります。</div>}
      {matches.map((m, i) => {
        const tot = Math.max(1, m.totals.A + m.totals.B)
        return (
          <button key={m.id} type="button" className={`ft-row${m.id === openId ? ' on' : ''}`} style={{ ...rv(m.result), '--i': i }} onClick={() => setOpenId(m.id)}>
            <span className="bd">{RES[m.result].mark}</span>
            <span className="tx">
              <div className="nm">{RES[m.result].label}<small>CPU Lv{m.level} ・ {m.rounds}R</small></div>
              <div className="dt">{fmtDate(m.t)} ・ 与 {n0(m.totals.A)} / 受 {n0(m.totals.B)}</div>
              <div className="ft-vs" aria-hidden="true"><i style={{ width: `${(m.totals.A / tot) * 100}%` }} /></div>
            </span>
          </button>
        )
      })}
      {matches.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {confirmClear ? (
            <span style={{ fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>全部消しますか?
              <button type="button" className="ft-pill bad" onClick={() => { clearCareer().then(() => { setMatches([]); setOpenId(null) }).catch((e) => setErrMsg(e.message)); setConfirmClear(false) }}>消す</button>
              <button type="button" className="ft-pill" onClick={() => setConfirmClear(false)}>やめる</button>
            </span>
          ) : (
            <button type="button" className="ft-pill" style={{ fontSize: 13 }} onClick={() => setConfirmClear(true)}>記録を全部消す</button>
          )}
          <div className="ft-note">記録はアカウントに、最新20試合まで残ります。</div>
        </div>
      )}
    </div>
  )

  const top = (
    <div className="ft-top">
      <div className="ft-title"><IconCareer /><span>//<b>足跡</b></span></div>
      <button type="button" className="ft-x" onClick={onExit} aria-label="閉じる"><IconClose /></button>
    </div>
  )
  const body = desktop ? (
    <>
      {summary}
      <div className="ft-main">
        {list}
        <div>{opened ? <Detail m={opened} /> : <div className="ft-empty" style={{ marginTop: 34 }}>左の一覧から試合を選ぶと、詳細が見られます。</div>}</div>
      </div>
    </>
  ) : opened ? (
    <>
      <button type="button" className="ft-pill" style={{ marginBottom: 14 }} onClick={() => setOpenId(null)}><IconBack /> 一覧に戻る</button>
      <Detail m={opened} />
    </>
  ) : (
    <>
      {summary}
      {list}
    </>
  )
  return (
    <div className="ft theme-dark">
      <style>{CSS}</style>
      <div className="ft-bg" aria-hidden="true"><i /><i /></div>
      <div className="ft-no" aria-hidden="true">05</div>
      <div className="ft-in">{top}{body}</div>
    </div>
  )
}
