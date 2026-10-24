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
// 読み込みバーの進み具合。ロード画面が続けて出ても、0からやり直さず、つづきから進める(1秒以内に出し直したとき)
let lastProgress = { v: 0, t: 0 }
function useLoadProgress(duration) {
  const [v, setV] = useState(() => (Date.now() - lastProgress.t < 1000 ? lastProgress.v : 0))
  useEffect(() => {
    const start = Date.now()
    const from = v
    const id = setInterval(() => {
      setV((cur) => {
        let next
        if (duration) { // 時間がわかっているとき: 時間に合わせて、少しずつ(ときどき止まりながら)100%へ
          const t = Math.min(1, (Date.now() - start) / duration)
          next = Math.max(cur, from + (100 - from) * t)
        } else { // 終わる時間がわからないとき: 90%に近づくまで、だんだん小さな歩幅で進む
          next = cur + (92 - cur) * (0.06 + Math.random() * 0.1)
        }
        lastProgress = { v: next, t: Date.now() }
        return next
      })
    }, duration ? 120 : 380)
    return () => { clearInterval(id); lastProgress = { v: lastProgress.v, t: Date.now() } }
  }, [duration]) // eslint-disable-line react-hooks/exhaustive-deps
  return v
}

export function LoadingScreen({ note, duration }) {
  useChromeStyle()
  const [i, setI] = useState(() => Math.floor(Math.random() * TIPS.length))
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % TIPS.length), 4500)
    return () => clearInterval(t)
  }, [])
  const pct = useLoadProgress(duration)
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
      <div data-testid="load-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span aria-hidden="true" style={{ width: 4, height: 14, borderLeft: '2px solid #f2f2f3', borderTop: '2px solid #f2f2f3', borderBottom: '2px solid #f2f2f3', boxSizing: 'border-box' }} />
        <div style={{ flex: 1, height: 4, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 1, height: 2, backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.7) 0 1px, transparent 1px 3px)' }} />
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: '#f2f2f3', transition: 'width 0.32s ease-out' }} />
        </div>
        <span aria-hidden="true" style={{ width: 4, height: 14, borderRight: '2px solid #f2f2f3', borderTop: '2px solid #f2f2f3', borderBottom: '2px solid #f2f2f3', boxSizing: 'border-box' }} />
        <span style={{ fontFamily: DISPLAY, fontSize: 11, letterSpacing: '0.08em', marginLeft: 4 }}>NOW LOADING...</span>
      </div>
    </div>
  )
}
