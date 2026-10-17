import { useEffect, useRef, useState } from 'react'
import { C, FONT, DISPLAY } from './ui.js'
import { RARITY } from './CodexScreen.jsx'
import { IconClose, IconGem } from './icons.jsx'

const IconCheck = (p) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
)

// ガチャ画面。参考: エンドフィールドの「人材発掘」
//   全画面のバナー: 左上に名前と説明・左下に「排出率・詳細」・右下に「1回ガチャ」「10回ガチャ」 → 引くと結果が一覧で出る(1体ずつ順番に)
// 排出率の数字は、サーバー(server/gacha.js)と同じにしておく(表示だけ。抽選はサーバーがやる)

const RATES = [['legend', '1.5%'], ['gold', '6%'], ['silver', '25%'], ['bronze', '67.5%']]

const CSS = `
.gc { position: fixed; inset: 0; z-index: 20; display: flex; flex-direction: column; color: ${C.ink}; font-family: ${FONT}; overflow: hidden; background: #0a0a0c; animation: gc-fade 0.25s ease-out backwards; }
.gc.leaving { animation: gc-fadeout 0.2s ease-in forwards; }
@keyframes gc-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes gc-fadeout { from { opacity: 1; } to { opacity: 0; } }
@keyframes gc-up { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
@keyframes gc-left { from { opacity: 0; transform: translateX(-50px); } to { opacity: 1; transform: none; } }
@keyframes gc-right { from { opacity: 0; transform: translateX(50px); } to { opacity: 1; transform: none; } }
@keyframes gc-pop { from { opacity: 0; transform: scale(0.8) translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes gc-glow { 0%, 100% { box-shadow: 0 0 10px rgba(232,121,249,0.35); } 50% { box-shadow: 0 0 22px rgba(232,121,249,0.8); } }
@keyframes gc-spin { to { transform: rotate(360deg); } }

/* 背景: 暗い地に、黄色の斜めの帯と大きな文字 */
.gc-bg { position: absolute; inset: 0; pointer-events: none; overflow: hidden;
  background: radial-gradient(ellipse at 72% 38%, #2b2f18 0%, #14150d 40%, #0a0a0c 75%); }
.gc-bg i { position: absolute; background: ${C.player}; transform: skewX(-24deg); opacity: 0.9; }
.gc-bg i:nth-child(1) { right: 12%; top: -10%; width: 7vw; height: 130%; opacity: 0.16; animation: gc-right 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.gc-bg i:nth-child(2) { right: 26%; top: -10%; width: 2.2vw; height: 130%; opacity: 0.5; animation: gc-right 0.9s 0.1s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.gc-bg i:nth-child(3) { right: 3%; top: -10%; width: 14vw; height: 130%; opacity: 0.07; animation: gc-right 0.9s 0.2s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.gc-bg b { position: absolute; right: 4%; top: 18%; font-family: ${DISPLAY}; font-weight: 700; font-size: clamp(90px, 17vw, 280px); line-height: 0.9; letter-spacing: 0.04em; color: rgba(255,255,255,0.05); writing-mode: horizontal-tb; white-space: nowrap; animation: gc-fade 1s ease-out backwards; }
.gc-bg svg { position: absolute; right: 8%; top: 50%; width: min(44vw, 460px); transform: translateY(-50%); opacity: 0.9; animation: gc-pop 0.8s 0.2s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.gc > *:not(.gc-bg) { position: relative; z-index: 1; }
.gc > .gc-res, .gc > .gc-back { position: fixed; z-index: 30; }

.gc-top { display: flex; align-items: center; gap: 14px; padding: 14px 20px 6px; padding-top: calc(14px + env(safe-area-inset-top)); }
.gc-title { font-family: ${DISPLAY}; font-weight: 600; font-size: 18px; letter-spacing: 0.08em; color: ${C.mute}; font-style: italic; }
.gc-title b { color: ${C.ink}; font-style: normal; margin-left: 6px; }
.gc-gems { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; padding: 5px 16px; background: rgba(255,255,255,0.1); font-family: ${DISPLAY}; font-weight: 600; font-size: 17px; }
.gc-gems svg { color: ${C.player}; }
.gc-close { width: 40px; height: 40px; border-radius: 50%; border: 0; background: #f2f2f3; color: #1c1c1f; font-size: 24px; display: grid; place-items: center; cursor: pointer; padding: 0; min-height: 0; transition: background 0.15s, transform 0.15s; }
.gc-close:hover, .gc-close:focus-visible { background: ${C.player}; transform: rotate(90deg); outline: none; }

.gc-main { flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: space-between; padding: 14px 4vw calc(16px + env(safe-area-inset-bottom)) 24px; }
.gc-info { max-width: 460px; animation: gc-left 0.5s 0.1s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.gc-tag { display: inline-block; padding: 2px 10px; background: ${C.player}; color: #111; font-family: ${DISPLAY}; font-weight: 700; font-size: 12px; letter-spacing: 0.12em; }
.gc-name { margin: 8px 0 0; font-family: ${DISPLAY}; font-weight: 700; font-size: clamp(34px, 6vw, 64px); letter-spacing: 0.04em; line-height: 1.1; border-bottom: 4px solid ${C.player}; display: inline-block; padding-right: 24px; }
.gc-lines { margin: 14px 0 0; padding: 0; list-style: none; font-size: 14px; line-height: 1.9; color: #d6d6dc; }
.gc-lines li::before { content: '■'; color: ${C.player}; font-size: 9px; margin-right: 8px; vertical-align: 2px; }
.gc-lines em { font-style: normal; color: ${C.player}; font-weight: 700; }
.gc-bar { margin-top: 14px; width: min(100%, 340px); }
.gc-bar small { display: flex; justify-content: space-between; font-size: 11px; color: ${C.mute}; letter-spacing: 0.06em; }
.gc-bar div { margin-top: 4px; height: 6px; background: rgba(255,255,255,0.12); }
.gc-bar div i { display: block; height: 100%; background: ${C.player}; transition: width 0.5s; }

.gc-bottom { display: flex; align-items: flex-end; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.gc-side { display: flex; gap: 10px; animation: gc-left 0.5s 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.gc-sub { padding: 9px 18px; border: 0; background: rgba(255,255,255,0.12); color: #f1f1f2; font-family: ${FONT}; font-size: 13px; font-weight: 600; cursor: pointer; min-height: 0; transition: background 0.15s, color 0.15s; }
.gc-sub:hover, .gc-sub:focus-visible { background: #f2f2f3; color: #111; outline: none; }
.gc-btns { display: flex; gap: 10px; animation: gc-up 0.5s 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.gc-pull { display: inline-flex; align-items: center; gap: 12px; min-width: 190px; padding: 0 0 0 16px; height: 52px; border: 0; background: #f2f2f3; color: #111; font-family: ${FONT}; font-size: 16px; font-weight: 700; cursor: pointer; transition: transform 0.15s, background 0.15s; clip-path: polygon(12px 0, 100% 0, 100% 100%, 0 100%, 0 12px); }
.gc-pull .n { font-family: ${DISPLAY}; font-weight: 700; font-size: 24px; }
.gc-pull .cost { margin-left: auto; align-self: stretch; display: inline-flex; align-items: center; gap: 6px; padding: 0 16px; background: rgba(0,0,0,0.12); font-family: ${DISPLAY}; font-weight: 600; font-size: 15px; }
.gc-pull.hot { background: ${C.player}; }
.gc-pull span { white-space: nowrap; }
.gc-pull:hover:not(:disabled), .gc-pull:focus-visible { transform: translateY(-3px); outline: none; }
.gc-pull:disabled { background: #3a3a3f; color: #77777e; cursor: default; }
.gc-msg { position: absolute !important; left: 24px; right: 4vw; bottom: 82px; font-size: 13px; font-weight: 700; }

.gc-back { position: fixed; inset: 0; z-index: 30; display: grid; place-items: center; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); animation: gc-fade 0.2s ease-out backwards; }
.gc-modal { width: min(560px, 92vw); max-height: 72vh; display: flex; flex-direction: column; background: #f1f1f2; color: #1c1c1f; animation: gc-pop 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.gc-mhead { position: relative; padding: 14px 52px; text-align: center; font-weight: 700; font-size: 16px; border-bottom: 1px solid #c9c9ce; }
.gc-mhead button { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); width: 32px; height: 32px; border: 0; border-radius: 50%; background: #2a2a2e; color: #fff; font-size: 18px; display: grid; place-items: center; cursor: pointer; padding: 0; min-height: 0; }
.gc-mbody { padding: 18px 24px 22px; overflow-y: auto; font-size: 13.5px; line-height: 1.9; color: #3a3a3e; }
.gc-mbody b { color: #111; }
.gc-rates { width: 100%; border-collapse: collapse; margin: 6px 0 14px; }
.gc-rates td { padding: 7px 4px; border-bottom: 1px solid #d3d3d8; }
.gc-rates td:last-child { text-align: right; font-family: ${DISPLAY}; font-weight: 700; }
.gc-dot { display: inline-block; width: 10px; height: 10px; margin-right: 8px; transform: rotate(45deg); }

.gc-res { position: fixed; inset: 0; z-index: 30; display: flex; flex-direction: column; background: rgba(8,8,10,0.97); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); animation: gc-fade 0.25s ease-out backwards; }
.gc-rhead { padding: 16px 20px 8px; padding-top: calc(16px + env(safe-area-inset-top)); font-family: ${DISPLAY}; font-weight: 700; font-size: 22px; letter-spacing: 0.1em; }
.gc-rhead span { color: ${C.player}; margin-right: 8px; }
.gc-rscroll { flex: 1; min-height: 0; overflow-y: auto; padding: 4px 20px 16px; scrollbar-width: none; }
.gc-rscroll::-webkit-scrollbar { display: none; }
.gc-pullrow { margin-bottom: 16px; }
.gc-pullrow h4 { margin: 0 0 6px; font-size: 13px; color: ${C.mute}; letter-spacing: 0.06em; }
.gc-pullrow h4 em { font-style: normal; color: ${C.player}; margin-left: 8px; }
.gc-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 8px; }
.gc-card { position: relative; padding: 18px 8px 12px; background: linear-gradient(160deg, #2e2e33, #1a1a1d); border-top: 3px solid var(--rc); text-align: center; animation: gc-pop 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; animation-delay: var(--d, 0s); }
.gc-card small { position: absolute; left: 8px; top: 5px; font-size: 10px; letter-spacing: 0.08em; color: var(--rc); font-weight: 700; }
.gc-card b { display: block; font-size: 13px; font-weight: 600; line-height: 1.35; min-height: 2.7em; display: flex; align-items: center; justify-content: center; }
.gc-card.legend { animation: gc-pop 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) backwards, gc-glow 2s ease-in-out infinite; animation-delay: var(--d, 0s), 0s; background: linear-gradient(160deg, #4a2552, #1f1424); }
.gc-rfoot { display: flex; justify-content: center; gap: 12px; padding: 10px 20px calc(14px + env(safe-area-inset-bottom)); }
.gc-load { position: absolute !important; inset: 0; z-index: 8; display: grid; place-items: center; background: rgba(0,0,0,0.55); animation: gc-fade 0.2s ease-out backwards; }
.gc-load span { width: 46px; height: 46px; border: 4px solid rgba(255,255,255,0.2); border-top-color: ${C.player}; border-radius: 50%; animation: gc-spin 0.8s linear infinite; }
.gc-load p { position: absolute; top: calc(50% + 40px); margin: 0; font-size: 12px; color: #cfcfd5; }
@media (max-width: 899px) {
  .gc-top { padding: 10px 12px 4px; padding-top: calc(10px + env(safe-area-inset-top)); }
  .gc-main { padding: 10px 14px calc(14px + env(safe-area-inset-bottom)); }
  .gc-bg svg { right: -6%; top: 40%; width: 74vw; opacity: 0.35; }
  .gc-bg b { top: 30%; }
  .gc-bottom { flex-direction: column-reverse; align-items: stretch; }
  .gc-btns { width: 100%; }
  .gc-pull { flex: 1; min-width: 0; height: 56px; font-size: 13px; padding-left: 10px; gap: 6px; }
  .gc-pull .n { font-size: 20px; }
  .gc-pull .cost { padding: 0 10px; font-size: 14px; }
  .gc-msg { left: 14px; right: 14px; bottom: 150px; }
  .gc-cards { grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); }
}
`

// 背景の絵: 菱形を組み合わせた、ガチャのマーク
const Mark = () => (
  <svg viewBox="0 0 200 200" aria-hidden="true">
    <g fill="none" stroke={C.player} strokeWidth="1.2" opacity="0.5"><circle cx="100" cy="100" r="92" /><circle cx="100" cy="100" r="70" strokeDasharray="3 6" /></g>
    <path d="M100 14l56 56-56 56-56-56z" fill={C.player} opacity="0.85" />
    <path d="M100 42l30 30-30 30-30-30z" fill="#0a0a0c" />
    <path d="M100 104l42 42-42 42-42-42z" fill="none" stroke="#f2f2f3" strokeWidth="2" opacity="0.8" />
    <rect x="30" y="92" width="16" height="16" fill="#f2f2f3" transform="rotate(45 38 100)" opacity="0.8" />
    <rect x="154" y="92" width="16" height="16" fill="#f2f2f3" transform="rotate(45 162 100)" opacity="0.8" />
  </svg>
)

export default function GachaScreen({ me, busy, error, results, cost, pityCount, onPull, onCloseResults, onExit }) {
  const [dialog, setDialog] = useState(null) // 'rates' / null
  const [leaving, setLeaving] = useState(false)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const close = () => {
    if (leaving) return
    setLeaving(true)
    timer.current = setTimeout(onExit, 200)
  }
  useEffect(() => {
    if (!dialog) return undefined
    const h = (e) => { if (e.key === 'Escape') setDialog(null) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [dialog])

  const gems = me ? me.gems : 0
  const have = me ? me.pityCount || 0 : 0
  const left = Math.max(0, pityCount - have)
  const can1 = !busy && !!me && gems >= cost
  const can10 = !busy && !!me && gems >= cost * 10

  return (
    <div className={`gc theme-dark${leaving ? ' leaving' : ''}`} data-testid="gacha">
      <style>{CSS}</style>
      <div className="gc-bg" aria-hidden="true"><i /><i /><i /><b>SCOUT</b><Mark /></div>
      <div className="gc-top">
        <div className="gc-title">//<b>ガチャ</b></div>
        <div className="gc-gems"><IconGem />{me ? me.gems : '-'}</div>
        <button type="button" className="gc-close" onClick={close} aria-label="閉じる"><IconClose /></button>
      </div>
      <div className="gc-main">
        <div className="gc-info">
          <span className="gc-tag">常設</span>
          <h2 className="gc-name">通常ガチャ</h2>
          <ul className="gc-lines">
            <li>1回で <em>8体</em> のキャラクターが出ます</li>
            <li>8体のうち1体は、<em>シルバー以上</em> 確定</li>
            <li><em>{pityCount}回</em> 以内に、<em>レジェンド</em> 確定(天井)</li>
          </ul>
          <div className="gc-bar" aria-label="天井まで">
            <small><span>天井まで</span><span>あと {left} 回</span></small>
            <div><i style={{ width: `${Math.min(100, (have / pityCount) * 100)}%` }} /></div>
          </div>
        </div>
        {(error || (me && !can1 && !busy)) && (
          <div className="gc-msg" style={{ color: error ? C.bad : C.warn }}>{error || 'ジェムが足りません'}</div>
        )}
        <div className="gc-bottom">
          <div className="gc-side">
            <button type="button" className="gc-sub" onClick={() => setDialog('rates')}>排出率・詳細</button>
          </div>
          <div className="gc-btns">
            <button type="button" className="gc-pull" disabled={!can1} onClick={() => onPull(1)}>
              <span><span className="n">1</span> 回ガチャ</span><span className="cost"><IconGem />{cost}</span>
            </button>
            <button type="button" className="gc-pull hot" disabled={!can10} onClick={() => onPull(10)}>
              <span><span className="n">10</span> 回ガチャ</span><span className="cost"><IconGem />{cost * 10}</span>
            </button>
          </div>
        </div>
        {busy && <div className="gc-load"><span /><p>通信中...(最初の1回は1分ほどかかることがあります)</p></div>}
      </div>

      {dialog === 'rates' && (
        <div className="gc-back" onClick={() => setDialog(null)}>
          <div className="gc-modal" role="dialog" aria-label="排出率・詳細" onClick={(e) => e.stopPropagation()}>
            <div className="gc-mhead">排出率・詳細<button type="button" onClick={() => setDialog(null)} aria-label="閉じる"><IconClose /></button></div>
            <div className="gc-mbody">
              <b>排出率(1体ごと)</b>
              <table className="gc-rates"><tbody>
                {RATES.map(([k, v]) => (
                  <tr key={k}><td><i className="gc-dot" style={{ background: RARITY[k].color }} />{RARITY[k].label}</td><td>{v}</td></tr>
                ))}
              </tbody></table>
              ・1回のガチャで、8体が出ます。<br />
              ・8体のうち最後の1体は、シルバー以上が確定です(レジェンド 1.5% / ゴールド 6% / シルバー 92.5%)。<br />
              ・{pityCount}回目までにレジェンドが出ていないときは、{pityCount}回目で、レジェンドが1体追加されます(天井)。10回ガチャの途中で天井になっても、その回は1回だけです。<br />
              ・1回 {cost} ジェム、10回で {cost * 10} ジェムです。
            </div>
          </div>
        </div>
      )}

      {results && (
        <div className="gc-res" role="dialog" aria-label="ガチャの結果">
          <div className="gc-rhead"><span>//</span>結果</div>
          <div className="gc-rscroll">
            {results.map((pull, i) => (
              <div className="gc-pullrow" key={i}>
                <h4>{i + 1}回目{pull.pity && <em>天井!</em>}</h4>
                <div className="gc-cards">
                  {pull.characters.map((c, j) => (
                    <div key={j} className={`gc-card ${c.rarity}`} style={{ '--rc': RARITY[c.rarity].color, '--d': `${Math.min((i * 8 + j) * 0.05, 1.4) + 0.1}s` }}>
                      <small>{RARITY[c.rarity].label}</small>
                      <b>{c.name}</b>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="gc-rfoot">
            <button type="button" className="gc-pull hot" style={{ minWidth: 200, justifyContent: 'center', padding: 0 }} onClick={onCloseResults}>確認<IconCheck style={{ marginLeft: 8 }} /></button>
          </div>
        </div>
      )}
    </div>
  )
}
