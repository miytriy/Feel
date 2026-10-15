// Feel - キャリア画面: 直近の勝率・対戦データ・試合ごとの詳細(1ラウンドごとのダメージ)をふりかえる
import { useEffect, useState } from 'react'
import { useIsDesktop, C, FONT } from './ui.js'
import { summarize } from './career.js'

const RES = { win: { label: '勝利', mark: '○', color: '#1a7f4b' }, lose: { label: '敗北', mark: '×', color: '#c0392b' }, draw: { label: '引き分け', mark: '△', color: C.mute } }
const LEVEL = { 1: 'かんたん', 2: 'ふつう', 3: 'つよい', 4: 'とてもつよい' }
const fmtDate = (t) => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
const n0 = (v) => Math.round(v).toLocaleString('ja-JP')

function Stat({ label, value, sub, big }) {
  return (
    <div style={{ flex: '1 1 110px', padding: big ? 14 : 10, borderRadius: 12, background: C.card, border: `1px solid ${C.line}`, minWidth: 0 }}>
      <div style={{ fontSize: 11, color: C.mute }}>{label}</div>
      <div style={{ fontSize: big ? 26 : 22, fontWeight: 800 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.mute }}>{sub}</div>}
    </div>
  )
}

// 1ラウンドごとのダメージ(青=与えた、赤=受けた)
function RoundChart({ rows }) {
  const max = Math.max(1, ...rows.flatMap((r) => [r.A, r.B]))
  if (!rows.length) return <div style={{ fontSize: 12, color: C.mute }}>ダメージの記録がありません</div>
  return (
    <div data-testid="round-chart">
      {rows.map((r) => (
        <div key={r.round} style={{ display: 'grid', gridTemplateColumns: '34px 1fr', gap: 6, alignItems: 'center', marginBottom: 5 }}>
          <div style={{ fontSize: 11, color: C.mute }}>R{r.round}</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ height: 8, borderRadius: 4, background: C.player, width: `${(r.A / max) * 100}%`, minWidth: r.A ? 2 : 0 }} />
              <span style={{ fontSize: 11, color: C.player }}>{n0(r.A)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <div style={{ height: 8, borderRadius: 4, background: C.enemy, width: `${(r.B / max) * 100}%`, minWidth: r.B ? 2 : 0 }} />
              <span style={{ fontSize: 11, color: C.enemy }}>{n0(r.B)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function Detail({ m, big }) {
  const [showLog, setShowLog] = useState(false)
  const r = RES[m.result]
  const best = m.perRound.reduce((b, x) => (x.A > (b?.A ?? -1) ? x : b), null)
  const maxDealt = Math.max(1, ...m.units.map((u) => u.dealt))
  const box = { padding: big ? 16 : 12, borderRadius: 12, background: C.card, border: `1px solid ${C.line}`, marginBottom: 10 }
  const h = { margin: '0 0 8px', fontSize: 14 }
  return (
    <div data-testid="career-detail">
      <div style={box}>
        <div style={{ fontSize: 22, fontWeight: 800, color: r.color }}>{r.label}</div>
        <div style={{ fontSize: 12, color: C.mute }}>{fmtDate(m.t)} ・ CPU Lv{m.level} {LEVEL[m.level] ?? ''} ・ {m.rounds}ラウンド</div>
        <div style={{ fontSize: 12, marginTop: 8, color: C.player }}><b>自分</b> {m.names.A.join('、')}</div>
        <div style={{ fontSize: 12, marginTop: 2, color: C.enemy }}><b>相手</b> {m.names.B.join('、')}</div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <Stat label="与えたダメージ" value={n0(m.totals.A)} sub={`1ラウンド平均 ${n0(m.totals.A / Math.max(1, m.perRound.length))}`} />
        <Stat label="受けたダメージ" value={n0(m.totals.B)} sub={`1ラウンド平均 ${n0(m.totals.B / Math.max(1, m.perRound.length))}`} />
        <Stat label="最大の1ラウンド" value={best ? n0(best.A) : '-'} sub={best ? `R${best.round}` : ''} />
        <Stat label="回復量" value={n0(m.heal.A)} sub={`相手 ${n0(m.heal.B)}`} />
      </div>
      <div style={box}>
        <h4 style={h}>1ラウンドごとのダメージ <span style={{ fontWeight: 400, fontSize: 11, color: C.mute }}>(<span style={{ color: C.player }}>■</span>与えた <span style={{ color: C.enemy }}>■</span>受けた)</span></h4>
        <RoundChart rows={m.perRound} />
      </div>
      <div style={box}>
        <h4 style={h}>キャラごとの与ダメージ</h4>
        {m.units.length === 0 && <div style={{ fontSize: 12, color: C.mute }}>記録がありません</div>}
        {m.units.map((u) => (
          <div key={u.name + u.team} style={{ marginBottom: 5 }}>
            <div style={{ fontSize: 12, color: u.team === 'A' ? C.player : C.enemy }}>{u.name} <b>{n0(u.dealt)}</b></div>
            <div style={{ height: 6, borderRadius: 3, background: u.team === 'A' ? C.player : C.enemy, width: `${(u.dealt / maxDealt) * 100}%`, minWidth: 2 }} />
          </div>
        ))}
      </div>
      <div style={box}>
        <button onClick={() => setShowLog(!showLog)} style={{ background: 'none', border: 'none', padding: 0, fontSize: 14, fontWeight: 700, color: C.ink, cursor: 'pointer' }}>
          対戦ログ {showLog ? '▲' : '▼'}
        </button>
        {showLog && <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.6, color: C.mute, maxHeight: 360, overflowY: 'auto' }}>{m.log.map((l, i) => <div key={i}>{l}</div>)}</div>}
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
  const btn = { padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.line}`, background: C.card, color: C.ink, fontFamily: FONT, fontSize: 14, cursor: 'pointer' }

  const summary = (
    <>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <Stat big={desktop} label="直近10戦の勝率" value={pct(sm.recentRate)} sub={`${sm.recentN}戦`} />
        <Stat big={desktop} label="通算勝率" value={pct(sm.rate)} sub={`${sm.win}勝 ${sm.lose}敗 ${sm.draw}分`} />
        <Stat big={desktop} label="連勝" value={sm.streak} sub="いまの連勝数" />
        <Stat big={desktop} label="平均ラウンド" value={sm.total ? sm.avgRounds.toFixed(1) : '-'} />
        <Stat big={desktop} label="1ラウンド平均 与ダメ" value={sm.total ? n0(sm.dpsDealt) : '-'} sub={sm.total ? `受ダメ ${n0(sm.dpsTaken)}` : ''} />
      </div>
      {matches.length > 0 && (
        <div data-testid="form-strip" style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
          {matches.slice(0, 10).reverse().map((m) => (
            <span key={m.id} style={{ width: 26, height: 26, borderRadius: 13, background: RES[m.result].color, color: '#fff', fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{RES[m.result].mark}</span>
          ))}
          <span style={{ fontSize: 11, color: C.mute, alignSelf: 'center' }}>← 古い ・ 新しい →</span>
        </div>
      )}
    </>
  )
  const list = (
    <div data-testid="match-list">
      {status === 'loading' && <div style={{ padding: 16, fontSize: 14, color: C.mute }}>読み込み中…</div>}
      {status === 'error' && <div style={{ padding: 12, borderRadius: 10, background: '#fde8e8', color: '#c0392b', fontSize: 13 }}>記録を読み込めませんでした: {errMsg}</div>}
      {status === 'ok' && matches.length === 0 && <div style={{ padding: 16, borderRadius: 12, background: C.card, border: `1px solid ${C.line}`, fontSize: 14 }}>まだ対戦の記録がありません。CPU対戦を終えると、ここに残ります。</div>}
      {matches.map((m) => (
        <div key={m.id} onClick={() => setOpenId(m.id)} style={{ cursor: 'pointer', padding: 10, marginBottom: 6, borderRadius: 10, background: C.card, border: `2px solid ${m.id === openId ? C.player : C.line}`, display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, width: 28, textAlign: 'center', color: RES[m.result].color }}>{RES[m.result].mark}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{RES[m.result].label} <span style={{ fontWeight: 400, fontSize: 12, color: C.mute }}>CPU Lv{m.level} ・ {m.rounds}R</span></div>
            <div style={{ fontSize: 11, color: C.mute }}>{fmtDate(m.t)} ・ 与 {n0(m.totals.A)} / 受 {n0(m.totals.B)}</div>
          </div>
        </div>
      ))}
      {matches.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {confirmClear ? (
            <span style={{ fontSize: 13 }}>全部消しますか? <button onClick={() => { clearCareer().then(() => { setMatches([]); setOpenId(null) }).catch((e) => setErrMsg(e.message)); setConfirmClear(false) }} style={{ ...btn, color: '#c0392b' }}>消す</button> <button onClick={() => setConfirmClear(false)} style={btn}>やめる</button></span>
          ) : (
            <button onClick={() => setConfirmClear(true)} style={{ ...btn, fontSize: 12 }}>記録を全部消す</button>
          )}
          <div style={{ fontSize: 11, color: C.mute, marginTop: 6 }}>記録はアカウントに、最新20試合まで残ります。</div>
        </div>
      )}
    </div>
  )

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <h2 style={{ margin: 0, fontSize: desktop ? 24 : 20, flex: 1 }}>キャリア</h2>
      <button onClick={onExit} style={btn}>戻る</button>
    </div>
  )

  if (desktop) {
    return (
      <div style={{ minHeight: '100vh', padding: '20px 32px', background: C.paper, color: C.ink, fontFamily: FONT, boxSizing: 'border-box' }}>
        {header}
        {summary}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 380px) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
          {list}
          <div>{opened ? <Detail m={opened} big /> : <div style={{ color: C.mute, fontSize: 14 }}>左の一覧から試合を選ぶと、詳細が見られます。</div>}</div>
        </div>
      </div>
    )
  }
  // スマホ: 一覧 → 試合を押すと詳細(「一覧に戻る」で戻る)
  return (
    <div style={{ minHeight: '100vh', padding: 12, background: C.paper, color: C.ink, fontFamily: FONT, boxSizing: 'border-box' }}>
      {header}
      {opened ? (
        <>
          <button onClick={() => setOpenId(null)} style={{ ...btn, marginBottom: 10 }}>← 一覧に戻る</button>
          <Detail m={opened} />
        </>
      ) : (
        <>
          {summary}
          {list}
        </>
      )}
    </div>
  )
}
