import { useRef, useState } from 'react'
import { C, FONT, DISPLAY, useRemembered } from './ui.js'
import { ScreenHeader } from './chrome.jsx'
import { measureDpt, DPT_DEFAULTS } from './dpt.js'
import { enhanceDef } from './enhance.js'
import { withRelicPieces } from './relicInv.js'
import { ALL_CHARACTERS } from './battle/characters/index.js'
import { ARTIFACT_CATALOG } from './battle/artifact/index.js'
import { isTestChar } from './battle/teams.js'

// DPTテスト場: 動かない「的」を相手に、選んだチームを自動で戦わせ、1ターンあたりのダメージ(DPT)を測る。
//   1ターン = 自分のキャラの行動1回(召喚物・効果のダメージも、その行動のぶんに数える)。ラウンドごとの集計も出す。
//   的は攻撃せず、HPは行動のたびに満タンへ戻る。操作はCPU(AI)が行う。
// props: team(キャラ定義の配列) / spells / format / onChangeTeam / onExit

const nf = (n) => Math.round(n).toLocaleString('ja-JP')
const OPT = {
  count: [[1, '1体'], [3, '3体']],
  hp: [[5000, '5,000'], [20000, '2万'], [100000, '10万']],
  def: [[0, '0'], [100, '100'], [300, '300'], [600, '600']],
  rounds: [[5, '5'], [10, '10'], [15, '15'], [20, '20']],
  level: [[3, 'Lv.3'], [4, 'Lv.4'], [5, 'Lv.5']],
}
const LABEL = { count: '的の数', hp: '的のHP', def: '的の防御', rounds: 'ラウンド数', level: 'AIの強さ' }

const CSS = `
.dpt { position: fixed; inset: 0; z-index: 20; display: flex; flex-direction: column; background: #050506; color: ${C.ink}; font-family: ${FONT}; overflow-y: auto; }
.dpt-body { width: min(920px, 100%); margin: 0 auto; padding: 16px 16px 40px; display: flex; flex-direction: column; gap: 14px; box-sizing: border-box; }
.dpt-card { background: rgba(255,255,255,0.05); border: 1px solid ${C.line}; padding: 12px 14px; }
.dpt-team { font-size: 13px; color: ${C.mute}; line-height: 1.6; }
.dpt-team b { color: ${C.ink}; font-weight: 600; }
.dpt-opts { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px 16px; }
.dpt-opt .k { font-size: 11px; letter-spacing: 0.1em; color: ${C.mute}; margin-bottom: 4px; }
.dpt-seg { display: flex; gap: 4px; flex-wrap: wrap; }
.dpt-seg button { min-width: 44px; height: 32px; padding: 0 10px; border: 1.5px solid ${C.line}; background: transparent; color: ${C.ink}; font-size: 13px; font-weight: 600; cursor: pointer; min-height: 0; font-family: ${FONT}; }
.dpt-seg button.on { background: #f2f2f3; color: #111; border-color: #f2f2f3; }
.dpt-seg button:focus-visible { outline: 2px solid ${C.player}; }
.dpt-act { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.dpt-btn { min-width: 150px; height: 44px; padding: 0 20px; border: 2px solid #f2f2f3; background: transparent; color: #f2f2f3; font-size: 14px; font-weight: 700; font-family: ${FONT}; cursor: pointer; min-height: 0; }
.dpt-btn.ok { background: ${C.player}; border-color: ${C.player}; color: #111; }
.dpt-btn:disabled { opacity: 0.5; cursor: default; }
.dpt-note { font-size: 12px; color: ${C.mute}; }
.dpt-prog { height: 6px; background: rgba(255,255,255,0.1); overflow: hidden; width: 100%; }
.dpt-prog i { display: block; height: 100%; width: 100%; background: ${C.player}; transform-origin: left; transition: transform 0.2s; }
.dpt-tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.dpt-tile { padding: 10px 6px; text-align: center; background: rgba(0,0,0,0.55); border-top: 2px solid ${C.player}; }
.dpt-tile b { display: block; font-family: ${DISPLAY}; font-size: clamp(20px, 5vw, 30px); line-height: 1.1; font-variant-numeric: tabular-nums; }
.dpt-tile small { display: block; margin-top: 2px; font-size: 10px; letter-spacing: 0.1em; color: ${C.mute}; }
.dpt-tile.main b { color: ${C.player}; }
.dpt-tbl { width: 100%; border-collapse: collapse; font-size: 13px; font-variant-numeric: tabular-nums; }
.dpt-tbl th { text-align: right; font-size: 11px; letter-spacing: 0.08em; font-weight: 600; color: ${C.mute}; padding: 4px 6px; border-bottom: 1px solid ${C.line}; }
.dpt-tbl th:first-child, .dpt-tbl td:first-child { text-align: left; }
.dpt-tbl td { text-align: right; padding: 5px 6px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.dpt-bar { position: relative; min-width: 80px; }
.dpt-bar i { position: absolute; left: 0; top: 4px; bottom: 4px; width: 100%; background: ${C.player}; opacity: 0.28; transform-origin: left; transform: scaleX(var(--w, 0)); }
.dpt-bar span { position: relative; }
.dpt h3 { margin: 0 0 6px; font-family: ${DISPLAY}; font-size: 15px; letter-spacing: 0.08em; font-weight: 600; }
@media (max-width: 520px) { .dpt-tiles { grid-template-columns: repeat(2, 1fr); } }
`

function Seg({ k, value, onChange, disabled }) {
  return (
    <div className="dpt-opt">
      <div className="k">{LABEL[k]}</div>
      <div className="dpt-seg" role="group" aria-label={LABEL[k]}>
        {OPT[k].map(([v, label]) => <button key={v} type="button" disabled={disabled} className={value === v ? 'on' : ''} aria-pressed={value === v} onClick={() => onChange(v)}>{label}</button>)}
      </div>
    </div>
  )
}

export default function DptScreen({ team, spells = [], format = 'rotation', onChangeTeam, onExit }) {
  const [o, setO] = useRemembered('dpt.opts', DPT_DEFAULTS)
  const opts = { ...DPT_DEFAULTS, ...(o || {}) }
  const set = (k) => (v) => setO({ ...opts, [k]: v })
  const [busy, setBusy] = useState(false)
  const [prog, setProg] = useState(0)
  const [res, setRes] = useState(null)
  const [err, setErr] = useState('')
  const cancelRef = useRef(false)
  const names = (team || []).filter(Boolean).map((c) => c.name)

  const run = async () => {
    cancelRef.current = false
    setBusy(true); setErr(''); setProg(0)
    try {
      const real = ALL_CHARACTERS.filter((c) => !isTestChar(c))
      const r = await measureDpt({
        team: (team || []).filter(Boolean).map((d) => enhanceDef(withRelicPieces(d, format))), spells, pool: real, catalog: ALL_CHARACTERS, artifactCatalog: ARTIFACT_CATALOG,
        ...opts, onProgress: (r0, n) => setProg(r0 / n), isCancelled: () => cancelRef.current,
      })
      setRes({ ...r, opts })
    } catch (e) { setErr(e.message || String(e)) }
    setBusy(false)
  }
  const top = res ? Math.max(1, ...res.chars.map((c) => c.dmg)) : 1
  const topRound = res ? Math.max(1, ...res.rows.map((r) => r.dmg)) : 1
  const note = { dummy: '的が倒れて、途中で終わりました(的のHPを上げてください)', guard: '手数が多すぎて、途中で打ち切りました', stuck: '行動を選べなくなり、途中で終わりました', cancel: '中止しました' }

  return (
    <div className="dpt" data-testid="dpt-screen">
      <style>{CSS}</style>
      <ScreenHeader title="DPTテスト場" onClose={onExit} />
      <div className="dpt-body">
        <div className="dpt-card dpt-team"><b>チーム</b>　{names.length ? names.join(' / ') : '(未選択)'}{spells.length ? <><br /><b>スペル</b>　{spells.map((s) => s.name).join(' / ')}</> : null}</div>
        <div className="dpt-card">
          <div className="dpt-opts">{Object.keys(OPT).map((k) => <Seg key={k} k={k} value={opts[k]} onChange={set(k)} disabled={busy} />)}</div>
        </div>
        <div className="dpt-act">
          <button type="button" className="dpt-btn ok" data-testid="dpt-run" disabled={busy || !names.length} onClick={run}>{busy ? '測定中…' : '測定する'}</button>
          {busy && <button type="button" className="dpt-btn" onClick={() => { cancelRef.current = true }}>中止</button>}
          {onChangeTeam && <button type="button" className="dpt-btn" disabled={busy} onClick={onChangeTeam}>チームを変える</button>}
        </div>
        {busy && <div className="dpt-prog" aria-label="進み具合"><i style={{ transform: `scaleX(${prog})` }} /></div>}
        <div className="dpt-note">1ターン = 自分のキャラの行動1回(召喚物・効果のダメージも、その行動に数える)。的は攻撃せず、HPは行動のたびに満タンへ戻ります。操作はAIが行い、毎回の結果は乱数で少し変わります。Lv.5は数十秒かかることがあります。</div>
        {err && <div className="dpt-card" style={{ color: C.bad }}>エラー: {err}</div>}
        {res && (
          <>
            <div className="dpt-tiles" data-testid="dpt-result">
              <div className="dpt-tile main"><b>{nf(res.dpt)}</b><small>平均DPT(1ターン)</small></div>
              <div className="dpt-tile"><b>{nf(res.perRound)}</b><small>1ラウンドあたり</small></div>
              <div className="dpt-tile"><b>{nf(res.total)}</b><small>合計ダメージ</small></div>
              <div className="dpt-tile"><b>{res.myTurns}</b><small>自分のターン数</small></div>
            </div>
            {res.ended !== 'rounds' && <div className="dpt-note" style={{ color: C.bad }}>{note[res.ended] || res.ended}</div>}
            <div className="dpt-card">
              <h3>キャラ別</h3>
              <table className="dpt-tbl"><thead><tr><th>キャラ</th><th>ダメージ</th><th>ターン</th><th>DPT</th></tr></thead><tbody>
                {res.chars.map((c) => (
                  <tr key={c.name}><td>{c.name}</td><td className="dpt-bar" style={{ '--w': c.dmg / top }}><i /><span>{nf(c.dmg)}</span></td><td>{c.turns || '-'}</td><td>{c.turns ? nf(c.dpt) : '-'}</td></tr>
                ))}
              </tbody></table>
            </div>
            <div className="dpt-card">
              <h3>ラウンド別</h3>
              <table className="dpt-tbl"><thead><tr><th>ラウンド</th><th>ダメージ</th><th>ターン</th><th>DPT</th></tr></thead><tbody>
                {res.rows.map((r) => (
                  <tr key={r.round}><td>R{r.round}</td><td className="dpt-bar" style={{ '--w': r.dmg / topRound }}><i /><span>{nf(r.dmg)}</span></td><td>{r.turns}</td><td>{r.turns ? nf(r.dpt) : '-'}</td></tr>
                ))}
              </tbody></table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
