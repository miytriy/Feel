import { useRemembered, C, FONT } from './ui.js'
import GUIDE from './battle/guide/recommended.json'

// 編成ガイド: CPU同士の対戦で集計した「おすすめの環境編成」を、対戦ルール(形式)・クラスごとに出す。
// データは server/scripts/formation_guide.mjs が作る(web/src/battle/guide/recommended.json)。環境が変わったら作り直す。
// 編成画面の「舞台」(PCは2560×1440、スマホは1440×2560 の基準サイズ)の中に重ねて出すので、大きさもその基準で書く。
const FORMATS = [['rotation', 'ローテーション'], ['unlimited', 'アンリミテッド'], ['infinity', 'インフィニティ']]

const CSS = `
.fg-back { position: absolute; inset: 0; z-index: 40; background: rgba(5,5,6,0.94); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); display: flex; flex-direction: column; font-family: ${FONT}; color: ${C.ink}; animation: fm-fade 0.2s ease-out backwards; }
.fg-head { display: flex; align-items: center; gap: 20px; padding: 34px 48px 18px; }
.fg-head h2 { margin: 0; font-size: 44px; font-weight: 800; flex: 1; }
.fg-x { width: 84px; height: 84px; border: 0; background: rgba(255,255,255,0.12); color: #fff; font-size: 40px; cursor: pointer; }
.fg-tabs { display: flex; gap: 12px; padding: 0 48px 14px; flex-wrap: wrap; }
.fg-tab { border: 0; padding: 16px 28px; font-size: 28px; font-weight: 700; background: rgba(255,255,255,0.1); color: #ddd; cursor: pointer; font-family: inherit; }
.fg-tab.on { background: ${C.player}; color: #111; }
.fg-tab.c.on { background: #f2f2f3; }
.fg-note { padding: 0 48px 14px; font-size: 22px; color: #9a9aa3; line-height: 1.6; }
.fg-list { flex: 1; overflow-y: auto; padding: 0 48px 60px; display: grid; gap: 20px; align-content: start; }
.fg-card { background: #17171b; border-left: 8px solid var(--rc, #888); padding: 26px 30px; display: grid; gap: 14px; }
.fg-top { display: flex; align-items: baseline; gap: 18px; }
.fg-rank { font-size: 40px; font-weight: 800; color: var(--rc, #fff); }
.fg-rate { font-size: 40px; font-weight: 800; }
.fg-rate small { font-size: 22px; color: #9a9aa3; font-weight: 600; margin-left: 10px; }
.fg-chars { display: flex; flex-wrap: wrap; gap: 10px; }
.fg-chip { padding: 10px 18px; font-size: 26px; font-weight: 700; background: rgba(255,255,255,0.08); border-bottom: 5px solid var(--rc, #888); }
.fg-chip.sp { border-bottom-color: #6fd2ff; color: #cfeeff; }
.fg-chip.no { opacity: .45; text-decoration: line-through; }
.fg-use { justify-self: end; border: 0; padding: 18px 40px; font-size: 30px; font-weight: 800; background: ${C.player}; color: #111; cursor: pointer; font-family: inherit; }
.fg-empty { padding: 60px 0; font-size: 28px; color: #9a9aa3; text-align: center; }
`

export default function FormationGuide({ allChars, allSpells, toneOf, onApply, onClose, format = 'rotation' }) {
  const [fmtSel, setFmt] = useRemembered('fm.guide.format', format) // 最初は、いま遊ぶ対戦ルールのおすすめ。そのあとは、最後に見ていたもの
  const [clsSel, setCls] = useRemembered('fm.guide.class', '')
  const fmt = FORMATS.some(([k]) => k === fmtSel) ? fmtSel : 'rotation'
  const data = GUIDE.formats?.[fmt]?.classes || {}
  const classes = Object.keys(data).filter((k) => data[k]?.length)
  const cls = classes.includes(clsSel) ? clsSel : classes[0] || ''
  const list = cls ? data[cls] : []
  const chars = new Map(allChars.map((c) => [c.id, c]))
  const spells = new Map(allSpells.map((s) => [s.id, s]))
  const date = GUIDE.generatedAt ? new Date(GUIDE.generatedAt).toLocaleDateString('ja-JP') : ''
  return (
    <div className="fg-back" role="dialog" aria-label="編成ガイド" data-testid="fm-guide">
      <style>{CSS}</style>
      <div className="fg-head">
        <h2>編成ガイド</h2>
        <button type="button" className="fg-x" onClick={onClose} aria-label="戻る">×</button>
      </div>
      <div className="fg-tabs" role="tablist" aria-label="対戦ルール">
        {FORMATS.map(([k, label]) => <button key={k} type="button" role="tab" aria-selected={fmt === k} className={`fg-tab${fmt === k ? ' on' : ''}`} onClick={() => setFmt(k)}>{label}</button>)}
      </div>
      {classes.length > 0 && (
        <div className="fg-tabs" role="tablist" aria-label="クラス">
          {classes.map((k) => <button key={k} type="button" role="tab" aria-selected={cls === k} className={`fg-tab c${cls === k ? ' on' : ''}`} onClick={() => setCls(k)}>{k}</button>)}
        </div>
      )}
      <div className="fg-note">CPU同士(レベル{GUIDE.level})で、ランダムに組んだ編成と対戦した勝率が高かった編成です{date ? `(${date}時点)` : ''}。目安なので、実際の対戦では相手や立ち回りで変わります。</div>
      <div className="fg-list">
        {list.length === 0 && <div className="fg-empty">このルールのデータは、まだありません</div>}
        {list.map((g, i) => {
          const have = g.ids.map((id) => chars.get(id))
          const ok = have.every(Boolean)
          const first = have.find(Boolean)
          return (
            <div key={i} className="fg-card" style={{ '--rc': first ? toneOf(first) : '#888' }}>
              <div className="fg-top"><span className="fg-rank">{i + 1}</span><span className="fg-rate">勝率 {Math.round(g.rate * 100)}%<small>{g.games}戦</small></span></div>
              <div className="fg-chars">
                {g.ids.map((id) => { const c = chars.get(id); return <span key={id} className={`fg-chip${c ? '' : ' no'}`} style={{ '--rc': c ? toneOf(c) : '#888' }}>{c ? c.name : id}</span> })}
                {g.spells.map((id) => { const s = spells.get(id); return <span key={id} className={`fg-chip sp${s ? '' : ' no'}`}>{s ? s.name : id}</span> })}
              </div>
              <button type="button" className="fg-use" onClick={() => onApply(g)} disabled={!have.some(Boolean)} data-testid={`fm-guide-use-${i + 1}`}>{ok ? 'この編成にする' : '使えるぶんだけ入れる'}</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
