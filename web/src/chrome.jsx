import { useEffect, useState } from 'react'
import { C, FONT, DISPLAY } from './ui.js'
import { IconClose } from './icons.jsx'

// Feel - 画面の共通の枠: 上の帯(「// タイトル」と、右上の丸い×)・タブ・読み込み画面

const CSS = `
.fx-head { display: flex; align-items: center; gap: 14px; padding: 12px 20px; background: ${C.paper}; color: ${C.ink}; position: sticky; top: 0; z-index: 6;
  padding-top: calc(12px + env(safe-area-inset-top)); border-bottom: 1px solid ${C.line}; }
.fx-title { font-family: ${DISPLAY}; font-weight: 600; font-size: 22px; letter-spacing: 0.06em; text-transform: uppercase; display: flex; align-items: baseline; gap: 8px; }
.fx-slash { color: ${C.mute}; font-style: italic; letter-spacing: -0.1em; }
.fx-close { width: 42px; height: 42px; border-radius: 50%; border: 0; background: #f2f2f3; color: #1c1c1f; font-size: 26px; display: grid; place-items: center; cursor: pointer; padding: 0; min-height: 0;
  transition: background 0.15s, transform 0.15s; }
.fx-close:hover, .fx-close:focus-visible { background: ${C.player}; transform: rotate(90deg); outline: none; }
.fx-pill { display: inline-flex; align-items: center; gap: 8px; padding: 8px 18px; border-radius: 999px; border: 1.5px solid ${C.line}; background: transparent; color: ${C.ink};
  font-family: ${DISPLAY}; font-weight: 600; font-size: 15px; letter-spacing: 0.06em; cursor: pointer; white-space: nowrap; min-height: 0; transition: background 0.15s, color 0.15s, border-color 0.15s; }
.fx-pill:hover { border-color: ${C.player}; }
.fx-pill.on { background: #f2f2f3; color: #1c1c1f; border-color: #f2f2f3; }
.fx-pills { display: flex; gap: 10px; padding: 10px 20px 14px; overflow-x: auto; background: ${C.paper}; color: ${C.ink}; }
.fx-chip { display: inline-flex; align-items: center; gap: 8px; padding: 6px 16px; border-radius: 999px; background: ${C.soft}; color: ${C.ink}; font-family: ${DISPLAY}; font-weight: 600; font-size: 16px; }
@keyframes fx-load { 0% { transform: translateX(-100%); } 100% { transform: translateX(260%); } }
@media (max-width: 899px) { .fx-head { padding-left: 14px; padding-right: 14px; } .fx-title { font-size: 19px; } }
`
let injected = false
function useChromeStyle() {
  useEffect(() => {
    if (injected || typeof document === 'undefined') return
    injected = true
    const el = document.createElement('style')
    el.id = 'feel-chrome-style'
    el.textContent = CSS
    document.head.appendChild(el)
  }, [])
}

// 上の帯。「// タイトル」・右に right(通貨など)・右端に丸い ×(onClose)。帯は、どの画面でも暗い色
export function ScreenHeader({ title, onClose, right }) {
  useChromeStyle()
  return (
    <header className="fx-head theme-dark">
      <div className="fx-title"><span className="fx-slash">//</span>{title}</div>
      <div style={{ flex: 1 }} />
      {right}
      {onClose && <button className="fx-close" onClick={onClose} aria-label="閉じる"><IconClose /></button>}
    </header>
  )
}

// 丸いタブ。tabs: [{ key, label }]
export function PillTabs({ tabs, value, onChange }) {
  useChromeStyle()
  return (
    <div className="fx-pills theme-dark" role="tablist">
      {tabs.map((t) => (
        <button key={t.key} role="tab" aria-selected={value === t.key} className={`fx-pill${value === t.key ? ' on' : ''}`} onClick={() => onChange(t.key)}>{t.label}</button>
      ))}
    </div>
  )
}

export function Chip({ children }) {
  useChromeStyle()
  return <span className="fx-chip">{children}</span>
}

// 読み込み画面: 左下に TIPS(ゲームのルールのひとこと)、下に進み具合の線
const TIPS = [
  ['MPのこと', 'MPはターンが進むごとに最大値が+1され、全回復します。味方全体で共有します。'],
  ['EPと進化', '進化にはEPが1必要です。戦闘開始から5ターン目に、EPが2つもらえます。'],
  ['入場したターン', '入場した最初のターンは、スキルで攻撃できません。【突進】【疾走】は例外です。'],
  ['編成のきまり', '編成は同じクラス同士で組みます。ニュートラルだけは、どのクラスとも組めます。'],
  ['行動順', '行動順は10000÷速度で決まります。速度が高いほど、ターンが早く回ってきます。'],
]
export function LoadingScreen({ note }) {
  useChromeStyle()
  const [i, setI] = useState(() => Math.floor(Math.random() * TIPS.length))
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % TIPS.length), 4500)
    return () => clearInterval(t)
  }, [])
  const [title, body] = TIPS[i]
  return (
    <div className="theme-dark" style={{ minHeight: '100vh', color: C.ink, fontFamily: FONT, position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(100deg, #050506 0%, #0c0c0e 45%, #3a3a3e 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 6vw 8vh' }}>
      <div aria-hidden="true" style={{ position: 'absolute', right: '-4vw', top: '14vh', fontFamily: DISPLAY, fontWeight: 700, fontSize: 'clamp(70px, 16vw, 220px)', lineHeight: 0.9, color: 'rgba(255,255,255,0.07)', letterSpacing: '0.02em', textAlign: 'right' }}>FEEL<br />BATTLE</div>
      <div style={{ position: 'relative', borderLeft: `3px solid ${C.player}`, paddingLeft: 14, maxWidth: 560, marginBottom: 36 }}>
        <span style={{ background: '#f2f2f3', color: '#111', fontFamily: DISPLAY, fontWeight: 700, fontSize: 12, padding: '1px 6px', letterSpacing: '0.1em' }}>TIPS:</span>
        <div style={{ fontSize: 22, marginTop: 8 }}>{title}</div>
        <div style={{ fontSize: 15, marginTop: 8, color: C.mute, lineHeight: 1.7, minHeight: 52 }}>{body}</div>
        {note && <div style={{ fontSize: 12, marginTop: 8, color: C.mute }}>{note}</div>}
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.18)', overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, width: '40%', background: '#f2f2f3', animation: 'fx-load 1.4s ease-in-out infinite' }} />
        </div>
        <span style={{ fontFamily: DISPLAY, fontSize: 12, letterSpacing: '0.12em' }}>NOW LOADING...</span>
      </div>
    </div>
  )
}
