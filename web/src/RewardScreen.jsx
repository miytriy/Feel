import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { C, FONT, DISPLAY } from './ui.js'
import { IconGem } from './icons.jsx'

// アイテムを受け取ったときの「報酬一覧」。参考: エンドフィールドの報酬一覧
//   流れ(動画と同じ): ぼかした背景 → まん中に「報酬一覧」の記号と文字が、横の線といっしょに出る → 少し待って、上へ移る
//   → まん中に、受け取ったものが1つずつ浮かんで並び(まわりに円)、下に丸いチェックが出る → 押すと閉じる
// 使い方(どの画面からでも):  showRewards([{ name: 'ジェム', count: 300 }], 閉じたあとにやること(省略可))
//   name: 名前 / count: 個数(数字、または '×2' のような文字) / art: 絵(省略するとジェム) / isNew: true で NEW 表示 / rarity: 'legend' | 'gold' | 'silver' | 'bronze'(枠の色。省略可)

const CSS = `
.rw { position: fixed; inset: 0; z-index: 90; display: flex; flex-direction: column; align-items: center; color: #fff; font-family: ${FONT};
  background: linear-gradient(180deg, rgba(20,20,24,0.55) 0%, rgba(60,60,66,0.4) 38%, rgba(28,28,32,0.62) 70%, rgba(8,8,10,0.85) 100%); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); animation: rw-fade 0.3s ease-out backwards; }
.rw.leaving { animation: rw-fadeout 0.22s ease-in forwards; }
@keyframes rw-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes rw-fadeout { from { opacity: 1; } to { opacity: 0; } }
@keyframes rw-line { from { transform: scaleX(0); } to { transform: scaleX(1); } }
/* 見出し: まん中に出る → 少し待つ → 上へ移る */
@keyframes rw-head { 0% { opacity: 0; transform: translateY(calc(50vh - 64px)) scale(0.92); } 22% { opacity: 1; transform: translateY(calc(50vh - 64px)); } 58% { opacity: 1; transform: translateY(calc(50vh - 64px)); animation-timing-function: cubic-bezier(0.3, 0.9, 0.2, 1); } 100% { opacity: 1; transform: none; } }
@keyframes rw-float { from { opacity: 0; transform: translateY(22px) scale(0.9); } to { opacity: 1; transform: none; } }
@keyframes rw-pop { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: none; } }
@keyframes rw-ring { from { opacity: 0; transform: translate(-50%, -50%) scale(0.6); } to { opacity: 1; transform: translate(-50%, -50%); } }
.rw-ring { position: absolute; left: 50%; top: 50%; width: min(70vw, 440px); aspect-ratio: 1; border: 1px solid rgba(255,255,255,0.22); border-radius: 50%; transform: translate(-50%, -50%); pointer-events: none; animation: rw-ring 0.8s 1.2s ease-out backwards; }
.rw-ring::after { content: ''; position: absolute; inset: 9%; border: 1px dashed rgba(255,230,0,0.35); border-radius: 50%; }
.rw-head { position: absolute; left: 0; right: 0; top: 0; z-index: 2; width: 100%; padding: 18px 0 10px; padding-top: calc(18px + env(safe-area-inset-top)); text-align: center; font-weight: 700; font-size: 15px; letter-spacing: 0.12em; animation: rw-head 1.5s linear backwards; }
.rw-head svg { display: block; margin: 0 auto 4px; font-size: 26px; }
.rw-head::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 1px; background: rgba(255,255,255,0.4); transform-origin: center; animation: rw-line 0.5s 0.1s ease-out backwards; }
.rw-body { position: relative; z-index: 1; flex: 1; min-height: 0; width: min(900px, 94vw); display: flex; align-items: center; justify-content: center; overflow-y: auto; padding: 18px 0; scrollbar-width: none; }
.rw-body::-webkit-scrollbar { display: none; }
.rw-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 16px 14px; margin: auto 0; }
.rw-item { width: 96px; text-align: center; animation: rw-float 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; animation-delay: calc(1.3s + var(--i) * 0.09s); }
.rw-tile { position: relative; aspect-ratio: 1; display: grid; place-items: center; background: linear-gradient(165deg, color-mix(in srgb, var(--rc) 55%, #fff) 0%, var(--rc) 45%, #2a2a2f 100%); box-shadow: 0 4px 14px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.25); color: #1c1608; font-size: 46px; }
.rw-tile .art { position: absolute; inset: 0; }
.rw-tile .art svg { position: absolute; inset: 14% 14% 18% 14%; width: 72%; height: 68%; mix-blend-mode: multiply; opacity: 0.92; }
.rw-tile .new { position: absolute; left: 4px; top: 4px; padding: 0 5px; background: var(--c-badge, #e11d48); color: #fff; font-family: ${DISPLAY}; font-weight: 700; font-size: 10px; letter-spacing: 0.08em; }
.rw-tile::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 4px; background: var(--rc); filter: brightness(0.8); }
.rw-tile .ct { position: absolute; right: 3px; bottom: 7px; padding: 0 5px; background: rgba(0,0,0,0.75); color: #fff; font-family: ${DISPLAY}; font-weight: 700; font-size: 13px; }
.rw-name { margin-top: 6px; font-size: 12px; line-height: 1.35; color: #e6e6ea; }
.rw-foot { position: relative; margin-top: auto; z-index: 1; padding: 6px 0 calc(24px + env(safe-area-inset-bottom)); }
.rw-ok { width: 54px; height: 54px; border-radius: 50%; border: 2px solid #2a2a2e; background: #f2f2f3; color: #1c1c1f; font-size: 28px; display: grid; place-items: center; cursor: pointer; padding: 0; min-height: 0; transition: background 0.15s, transform 0.15s; animation: rw-pop 0.3s 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.rw-ok:hover, .rw-ok:focus-visible { background: ${C.player}; transform: scale(1.08); outline: none; }
@media (prefers-reduced-motion: reduce) { .rw, .rw-item, .rw-ring, .rw-ok, .rw-head::after { animation: none !important; } }
`

const GOLD = '#ffd400'
const RARITY_COLOR = { legend: '#b9a8ff', gold: '#d8b059', silver: '#abb2cc', bronze: '#b3643b' }

const IconBox = (p) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true" {...p}><path d="M3 4h18l1 5H2zM3 10h18v10H3zm6 2v2h6v-2z" fillRule="evenodd" /></svg>
)
const IconCheck = (p) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
)

export function RewardScreen({ items, onClose }) {
  const [leaving, setLeaving] = useState(false)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const close = () => {
    if (leaving) return
    setLeaving(true)
    timer.current = setTimeout(onClose, 220)
  }
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape' || e.key === 'Enter') close() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`rw theme-dark${leaving ? ' leaving' : ''}`} data-testid="rewards" role="dialog" aria-label="報酬一覧">
      <style>{CSS}</style>
      <div className="rw-ring" aria-hidden="true" />
      <div className="rw-head"><IconBox />報酬一覧</div>
      <div className="rw-body">
        <div className="rw-grid">
          {items.map((it, i) => (
            <div className="rw-item" key={i} style={{ '--i': i, '--rc': it.color || RARITY_COLOR[it.rarity] || GOLD }}>
              <div className="rw-tile">
                {it.art ? <span className="art">{it.art}</span> : <IconGem />}
                {it.isNew && <span className="new">NEW</span>}
                {it.count != null && it.count !== 0 && it.count !== '' && <span className="ct">{it.count}</span>}
              </div>
              <div className="rw-name">{it.name}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="rw-foot"><button type="button" className="rw-ok" data-testid="rewards-ok" onClick={close} aria-label="確認"><IconCheck /></button></div>
    </div>
  )
}

// どの画面からでも呼べる。いま出ているものがあれば、置き換える
let host = null
export function showRewards(items, after) {
  if (typeof document === 'undefined' || !items || items.length === 0) return
  if (host) { host.root.unmount(); host.el.remove(); host = null }
  const el = document.createElement('div')
  document.body.appendChild(el)
  const root = createRoot(el)
  host = { el, root }
  const onClose = () => {
    if (host && host.el === el) host = null
    root.unmount()
    el.remove()
    if (after) after()
  }
  root.render(<RewardScreen items={items} onClose={onClose} />)
}
