// Feel - 画面の共通部品: スマホ/PCの切り替え(画面の幅で自動)と、全体の見た目の基本設定
import { useEffect, useState } from 'react'

export const DESKTOP_MIN = 900 // この幅(px)以上ならPC用の画面にする
export const FONT = '"Hiragino Sans","Noto Sans JP",system-ui,sans-serif'
export const DISPLAY = '"Chakra Petch","Rajdhani","Segoe UI","Hiragino Sans","Noto Sans JP",sans-serif' // 見出し・メニュー用の、角ばった未来風の文字
// 色(暗いグレー + 黄色)。画面はすべてこの色を使う。色を変えるときは、ここだけ直せばよい。
// 色は CSS の変数(--c-xxx)になっていて、画面を class="theme-light"(明るい灰色)や "theme-dark" で包むと、その中だけ色が切り替わる。
const DARK = {
  ink: '#f1f1f2', paper: '#0c0c0e', card: '#19191c', line: '#38383e', mute: '#9b9ba3',
  player: '#ffe600', // 黄色(ボタン・選択・自分のチーム)。この上に文字を置くときは onAccent
  enemy: '#ff5a36', active: '#ff9d00', warn: '#ff9d00', ok: '#9be04a', bad: '#ff6a6a',
  onAccent: '#121212', // 黄色の上の文字色
  soft: '#26262b', softWarn: '#3a3011', softOk: '#1b2f16', dangerBg: '#3a1a1a', // 薄い面
  disabledBg: '#1f1f23', disabledInk: '#5f5f66',
  badge: '#ff7a00', // 通知の印(オレンジの菱形)
}
const LIGHT = {
  ink: '#1d1d20', paper: '#e3e3e5', card: '#f4f4f5', line: '#b9b9be', mute: '#6e6e76',
  player: '#e8c800', enemy: '#e0431f', active: '#e08a00', warn: '#c97700', ok: '#4a9a1a', bad: '#d63a3a',
  onAccent: '#121212',
  soft: '#d6d6da', softWarn: '#f3e7b8', softOk: '#d9ecc8', dangerBg: '#f5d0d0',
  disabledBg: '#d0d0d4', disabledInk: '#9a9aa2',
  badge: '#ff7a00',
}
export const C = Object.fromEntries(Object.keys(DARK).map((k) => [k, `var(--c-${k})`]))
C.neon = C.player // 前の名前(同じ色)
C.red = C.enemy
// 色に透明度をつける(C の色は変数なので、文字をつなげて 55 などを足すことはできない)。pct は 0〜100
export const alpha = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, transparent)`
const vars = (p) => Object.entries(p).map(([k, v]) => `--c-${k}: ${v};`).join(' ')

const query = `(min-width: ${DESKTOP_MIN}px)`
const detect = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false)

// 画面の幅が DESKTOP_MIN 以上のとき true(ウィンドウの大きさを変えると、すぐに切り替わる)
export function useIsDesktop() {
  const [desktop, setDesktop] = useState(detect)
  useEffect(() => {
    if (!window.matchMedia) return
    const mq = window.matchMedia(query)
    const on = () => setDesktop(mq.matches)
    on()
    mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on)
    return () => (mq.removeEventListener ? mq.removeEventListener('change', on) : mq.removeListener(on))
  }, [])
  return desktop
}

// 全体の基本設定(1回だけ入れる): スマホで画面幅に合わせる・余白をなくす・ボタンを押しやすくする
if (typeof document !== 'undefined' && !document.getElementById('feel-base-style')) {
  if (!document.querySelector('meta[name="viewport"]')) {
    const m = document.createElement('meta')
    m.name = 'viewport'
    m.content = 'width=device-width, initial-scale=1, viewport-fit=cover'
    document.head.appendChild(m)
  }
  const st = document.createElement('style')
  st.id = 'feel-base-style'
  st.textContent = `
    *, *::before, *::after { box-sizing: border-box; }
    :root, .theme-dark { ${vars(DARK)} color-scheme: dark; }
    .theme-light { ${vars(LIGHT)} color-scheme: light; }
    html, body { margin: 0; background: ${C.paper}; -webkit-text-size-adjust: 100%; }
    body { font-family: ${FONT}; color: ${C.ink}; }
    h1, h2 { font-family: ${DISPLAY}; letter-spacing: 0.04em; }
    input, select, textarea { background: ${C.card}; color: ${C.ink}; border: 1px solid ${C.line}; border-radius: 8px; }
    input::placeholder { color: ${C.mute}; }
    button { font-family: inherit; touch-action: manipulation; }
    input { font-family: inherit; }
    @keyframes feel-cd-dome { 0% { opacity: 0; transform: scale(0.78); } 14% { opacity: 0.55; transform: scale(0.92); } 30% { opacity: 1; transform: scale(1); } 62% { opacity: 0.95; transform: scale(1.02); } 100% { opacity: 0; transform: scale(0.8); } }
    @keyframes feel-cd-lite { 0% { opacity: 0; } 55% { opacity: 0; } 82% { opacity: 0.8; transform: scale(0.9); } 100% { opacity: 0; transform: scale(0.8); } }
    @keyframes feel-cd-tick { 0% { opacity: 0; } 25% { opacity: 1; } 100% { opacity: 0; } }
    @keyframes feel-flag-pulse { 0% { opacity: 0; } 12% { opacity: 1; } 40% { opacity: 0.9; } 100% { opacity: 0; } }
    @keyframes feel-flag-core { 0% { opacity: 0; transform: translate(-50%, -50%) scale(0.6); } 10% { opacity: 1; transform: translate(-50%, -50%) scale(1); } 50% { opacity: 0; transform: translate(-50%, -50%) scale(1.35); } 100% { opacity: 0; transform: translate(-50%, -50%) scale(1.35); } }
    @keyframes feel-flag-bubble { 0% { opacity: 0; transform: translate(-50%, -50%) scale(0.35); } 10% { opacity: 1; transform: translate(-50%, -50%) scale(0.7); } 24% { opacity: 1; transform: translate(-50%, -50%) scale(0.96); } 60% { opacity: 1; transform: translate(-50%, -50%) scale(1); } 100% { opacity: 0; transform: translate(-50%, -50%) scale(1.03); } }
    @keyframes feel-flag-warm { 0% { opacity: 1; } 38% { opacity: 1; } 70% { opacity: 0; } 100% { opacity: 0; } }
    @keyframes feel-buff-veil { 0% { opacity: 0; } 10% { opacity: 1; } 35% { opacity: 0.7; } 100% { opacity: 0; } }
    @keyframes feel-buff-ring { 0% { opacity: 0; transform: translateY(130%) scale(0.86, 0.8); } 14% { opacity: 1; } 70% { opacity: 0.85; } 100% { opacity: 0; transform: translateY(-210%) scale(1.1, 1); } }
    @keyframes feel-buff-ring3 { 0% { opacity: 0; transform: rotate(0deg) scale(0.6); } 15% { opacity: 0.75; } 70% { opacity: 0.6; } 100% { opacity: 0; transform: rotate(calc(var(--dir, 1) * 300deg)) scale(1.08); } }
    @keyframes feel-sm-haze { 0% { opacity: 0; transform: scale(0.4); } 30% { opacity: 1; } 100% { opacity: 0; transform: scale(1.25); } }
    @keyframes feel-sm-dot { 0% { opacity: 0; transform: scale(0.4); } 40% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(1.6); } }
    @keyframes feel-sm-shock { 0% { opacity: 0.9; transform: scale(0.45); } 100% { opacity: 0; transform: scale(1.6); } }
    @keyframes feel-sm-shard { 0% { opacity: 0; transform: translate(0, 0); } 15% { opacity: 1; } 100% { opacity: 0; transform: translate(var(--sx), calc(var(--sy) + 10%)); } }
    @keyframes feel-sm-disc { 0% { opacity: 0; transform: scale(0.55); } 22% { opacity: 1; transform: scale(1); } 62% { opacity: 0.9; transform: scale(1.05); } 100% { opacity: 0; transform: scale(1.12); } }
    @keyframes feel-sm-ring { 0% { opacity: 0; transform: rotate(0deg) scale(0.6); } 20% { opacity: 1; } 70% { opacity: 0.85; } 100% { opacity: 0; transform: rotate(calc(var(--dir, 1) * 200deg)) scale(1.25); } }
    @keyframes feel-sm-swirl { 0% { opacity: 0; transform: rotate(0deg) scale(0.6); } 20% { opacity: 0.9; } 100% { opacity: 0; transform: rotate(calc(var(--dir, 1) * 260deg)) scale(1.12); } }
    @keyframes feel-sm-spark { 0% { opacity: 0; transform: translateY(4px) scale(0.5); } 30% { opacity: 1; transform: translateY(0) scale(1); } 100% { opacity: 0; transform: translateY(-10px) scale(0.6); } }
    @keyframes feel-buff-rise { 0% { opacity: 0; transform: translateY(20%); } 25% { opacity: var(--o, 1); } 70% { opacity: calc(var(--o, 1) * 0.8); } 100% { opacity: 0; transform: translateY(-8%); } }
    @keyframes feel-buff-spark { 0% { opacity: 0; transform: translateY(0) scale(0.4); } 25% { opacity: 1; transform: translateY(-3px) scale(1); } 50% { opacity: 0.4; } 70% { opacity: 1; } 100% { opacity: 0; transform: translateY(-14px) scale(0.6); } }
    @keyframes feel-flag-cool { 0% { opacity: 0; } 38% { opacity: 0; } 70% { opacity: 1; } 100% { opacity: 0; } }
    @keyframes feel-kw-cycle-2 { 0% { opacity: 0; } 9.00% { opacity: 1; } 41.00% { opacity: 1; } 50.00% { opacity: 0; } 100% { opacity: 0; } }
    @keyframes feel-kw-cycle-3 { 0% { opacity: 0; } 6.00% { opacity: 1; } 27.33% { opacity: 1; } 33.33% { opacity: 0; } 100% { opacity: 0; } }
    @keyframes feel-kw-cycle-4 { 0% { opacity: 0; } 4.50% { opacity: 1; } 20.50% { opacity: 1; } 25.00% { opacity: 0; } 100% { opacity: 0; } }
    @keyframes feel-kw-cycle-5 { 0% { opacity: 0; } 3.60% { opacity: 1; } 16.40% { opacity: 1; } 20.00% { opacity: 0; } 100% { opacity: 0; } }
    @keyframes feel-cd-num { 0% { transform: scale(1.5); filter: brightness(1.8); } 100% { transform: scale(1); filter: brightness(1); } }
    @keyframes feel-cd-rim { 0% { opacity: 0; transform: scale(0.82); } 30% { opacity: 0.9; transform: scale(1); } 100% { opacity: 0; transform: scale(1.05); } }
    @keyframes feel-cd-rays { 0% { transform: scale(0.9); } 55% { transform: scale(1); } 100% { transform: scale(0.55); } }
    @keyframes feel-cd-ray { 0% { opacity: 0; } 8% { opacity: 1; } 58% { opacity: 1; } 100% { opacity: 0; } }
    @keyframes feel-cd-flash { 0% { opacity: 0; transform: scale(0.3); } 20% { opacity: 1; transform: scale(1); } 60% { opacity: 0.7; transform: scale(1); } 100% { opacity: 0; transform: scale(0.5); } }
    @keyframes feel-fin-num { 0% { opacity: 0; transform: scale(0.6); } 40% { opacity: 1; transform: scale(1.18); } 100% { opacity: 1; transform: scale(1); } }
    @keyframes feel-float-c { 0% { opacity: 1; transform: translate(-50%, 0) scale(1); } 60% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -38px) scale(1); } }
    @keyframes feel-hl-wash { 0% { opacity: 0; } 22% { opacity: 1; } 45% { opacity: 0.85; } 100% { opacity: 0; } }
    @keyframes feel-hl-tint { 0% { opacity: 0; } 30% { opacity: 1; } 70% { opacity: 0.7; } 100% { opacity: 0; } }
    @keyframes feel-hl-orb1 { 0% { opacity: 0; transform: scale(0.35); } 25% { opacity: 1; } 55% { opacity: 1; transform: scale(0.95); } 100% { opacity: 0; transform: scale(1.08); } }
    @keyframes feel-hl-orb2 { 0% { opacity: 0; transform: scale(0.8); } 25% { opacity: 1; } 65% { opacity: 0.95; transform: scale(1.03); } 100% { opacity: 0; transform: scale(1.1); } }
    @keyframes feel-hl-thin { 0% { opacity: 0; transform: scale(0.75) rotate(0deg); } 30% { opacity: 1; } 100% { opacity: 0; transform: scale(1.12) rotate(14deg); } }
    @keyframes feel-hl-thin2 { 0% { opacity: 0; transform: scaleX(-1) scale(0.85) rotate(0deg); } 30% { opacity: 0.8; } 100% { opacity: 0; transform: scaleX(-1) scale(1.2) rotate(-12deg); } }
    @keyframes feel-hl-spark { 0% { opacity: 0; transform: scale(0.8); } 35% { opacity: 1; } 100% { opacity: 0; transform: scale(1.05); } }
    @keyframes feel-hl-spark2 { 0% { opacity: 0; transform: rotate(37deg) scale(0.85); } 35% { opacity: 1; } 100% { opacity: 0; transform: rotate(37deg) scale(1.05); } }
    @keyframes feel-hl-num { 0% { opacity: 0; transform: scale(0.5) translateY(8px); } 12% { opacity: 1; transform: scale(1.12); } 22% { transform: scale(1); } 80% { opacity: 1; } 100% { opacity: 0; transform: scale(1); } }
    @keyframes feel-float { 0% { opacity: 0; transform: translate(-50%, 8px) scale(0.8); } 15% { opacity: 1; transform: translate(-50%, 0) scale(1.15); } 100% { opacity: 0; transform: translate(-50%, -38px) scale(1); } }
    .fit-board [data-field-card] { zoom: var(--fit, 1); }
    @keyframes feel-shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(3px); } }
    @keyframes feel-rainbow { from { background-position: 0% 0; } to { background-position: -200% 0; } }
    @keyframes feel-flash { 0% { opacity: 1; transform: scale(0.55); } 30% { opacity: 1; } 100% { opacity: 0; transform: scale(1.2); } }
    @keyframes feel-slash { 0% { opacity: 1; transform: rotate(-32deg) scaleX(0); } 35% { opacity: 1; transform: rotate(-32deg) scaleX(1); } 100% { opacity: 0; transform: rotate(-32deg) scaleX(1.05); } }
    @keyframes feel-slash2 { 0% { opacity: 1; transform: rotate(32deg) scaleX(0); } 35% { opacity: 1; transform: rotate(32deg) scaleX(1); } 100% { opacity: 0; transform: rotate(32deg) scaleX(1.05); } }
    @keyframes feel-earth-haze { 0% { opacity: 0; transform: translate(-4%, 6%) scale(0.9); } 45% { opacity: 1; transform: translate(2%, -2%) scale(1.05); } 100% { opacity: 0; transform: translate(6%, -8%) scale(1.15); } }
    @keyframes feel-earth-spin { to { transform: rotate(360deg); } }
    @keyframes feel-earth-idle { 0%, 100% { opacity: 0.85; transform: translate(-50%, -50%) scale(0.985); } 50% { opacity: 1; transform: translate(-50%, -50%) scale(1.015); } }
    @keyframes feel-d-fade { 0% { opacity: 0.35; } 100% { opacity: 0; } }
    @keyframes feel-d-fadem { 0% { opacity: 0.35; scale: 1.04 1.14; } 100% { opacity: 0.4; scale: 1 1; } }
    @keyframes feel-d-glow { 0% { opacity: 0; } 100% { opacity: 0.45; } }
    @keyframes feel-int-f8 { 0%, 12.4% { opacity: 1; } 12.5%, 100% { opacity: 0; } }
    .tip { position: relative; display: inline-block; cursor: help; border-bottom: 2px dotted currentColor; outline: none; }
    .tip-box { position: absolute; left: 0; top: calc(100% + 8px); z-index: 3500; width: max-content; max-width: min(300px, 78vw); padding: 10px 14px; border-radius: 6px; background: #1c1c20; color: #f1f1f2; border: 1px solid rgba(255,255,255,0.35); box-shadow: 0 6px 18px rgba(0,0,0,0.4); font-size: 14px; font-weight: 400; line-height: 1.6; text-align: left; font-style: normal; opacity: 0; transform: translateY(-4px); pointer-events: none; transition: opacity 0.15s ease-out, transform 0.15s ease-out; will-change: opacity, transform; }
    .tip-box.r { left: auto; right: 0; }
    .tip-box.up { top: auto; bottom: calc(100% + 8px); transform: translateY(4px); }
    .tip-box b { display: block; margin-bottom: 2px; color: #ffe600; font-size: 15px; }
    .tip:hover .tip-box, .tip:focus-visible .tip-box { opacity: 1; transform: none; }
    @keyframes feel-sel-glow { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
    @keyframes feel-note-in { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: none; } }
    @keyframes feel-log-in { from { opacity: 0; transform: translateX(-110%); } 35% { opacity: 1; } to { opacity: 1; transform: translateX(0); } }
@keyframes feel-log-out { from { opacity: 1; } to { opacity: 0; } }
    @keyframes feel-d-frame { 0% { } 100% { background: transparent; border-color: transparent; box-shadow: none; } }
    @keyframes feel-d-fade2m { 0% { opacity: 1; } 100% { opacity: 0.4; } }
    @keyframes feel-d-fade2 { 0% { opacity: 1; } 100% { opacity: 0; } }
    @keyframes feel-d-unmelt { 0% { scale: 1 1; transform-origin: 50% 0; } 100% { scale: 0.9615 0.8772; transform-origin: 50% 0; } } /* feel-d-melt(1.04 × 1.14)の逆: 中の演出を伸ばさない */
    @keyframes feel-d-melt { 0% { opacity: 1; scale: 1 1; transform-origin: 50% 0; } 100% { opacity: 0.35; scale: 1.04 1.14; transform-origin: 50% 0; } }
    @keyframes feel-stl-xf { 0%, 100% { opacity: 0; } 25%, 45% { opacity: 1; } 70% { opacity: 0; } }
    @keyframes feel-stl-breathe { 0%, 100% { opacity: 1; } 50% { opacity: 0.82; } }
    @keyframes feel-stl-drift1 { from { transform: translate(-5px, 4px) scale(1.02); } to { transform: translate(5px, -5px) scale(1.06); } }
    @keyframes feel-stl-drift2 { from { transform: translate(6px, 3px) scale(1.05); } to { transform: translate(-4px, -4px) scale(1.01); } }
    @keyframes feel-stl-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes feel-int-pulse { 0%, 100% { opacity: 0.8; } 50% { opacity: 1; } }
    @keyframes feel-bar-appear { 0% { opacity: 0; } 100% { opacity: 0.85; } }
    @keyframes feel-bar-breathe { 0%, 100% { opacity: 0.82; } 50% { opacity: 1; } }
    @keyframes feel-bb-bubble { 0% { opacity: 1; transform: scale(1); } 30% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(1.12); } }
    @keyframes feel-bb-flash { 0% { opacity: 0; } 22% { opacity: 0; } 34% { opacity: 1; } 55% { opacity: 0.85; } 100% { opacity: 0; transform: scale(1.1); } }
    @keyframes feel-bb-rays { 0% { opacity: 0; transform: scale(0.35); } 30% { opacity: 0; transform: scale(0.45); } 42% { opacity: 1; transform: scale(0.9); } 100% { opacity: 0; transform: scale(1.5); } }
    @keyframes feel-bb-mote { 0% { opacity: 0; transform: translate(0, 0) scale(0.6); } 25% { opacity: 0.95; } 100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(1.1); } }
    @keyframes feel-av-up { 0% { opacity: 0; } 15% { opacity: 1; } 70% { opacity: 0.9; } 100% { opacity: 0; } }
    @keyframes feel-av-down { 0% { opacity: 0; } 15% { opacity: 1; } 70% { opacity: 0.9; } 100% { opacity: 0; } }
    @keyframes feel-bar-out { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-22px); } }
    @keyframes feel-av-band { 0% { opacity: 0; transform: scaleX(0.4); } 15% { opacity: 1; transform: scaleX(1); } 100% { opacity: 0; transform: scaleX(1.2); } }
    @keyframes feel-av-chev { 0% { opacity: 0; } 15% { opacity: 1; } 75% { opacity: 1; } 100% { opacity: 0; } }
    @keyframes feel-ev2-rb { 0% { opacity: 0; transform: scale(0.55); } 30% { opacity: var(--o, 0.9); } 100% { opacity: 0; transform: scale(1.3); } }
    @keyframes feel-ev2-ray { 0% { opacity: 0; transform: scale(0.55) rotate(0deg); } 25% { opacity: 0.9; } 100% { opacity: 0; transform: scale(1.2) rotate(6deg); } }
    @keyframes feel-ev2-burst { 0% { opacity: 0; transform: scale(0.7); } 30% { opacity: 1; } 100% { opacity: 0; transform: scale(1.5); } }
    @keyframes feel-ev2-flash { 0% { opacity: 0; } 25% { opacity: 1; } 60% { opacity: 0.35; } 100% { opacity: 0; } }
    @keyframes feel-ev2-rim { 0% { opacity: 0; } 20% { opacity: 0.95; } 55% { opacity: 0.7; } 100% { opacity: 0; } }
    @keyframes feel-ev2-orb { 0% { opacity: 0; transform: scale(0.6); } 30% { opacity: 0.85; transform: scale(1); } 100% { opacity: 0; transform: scale(1.35); } }
    @keyframes feel-ev2-chain { 0% { opacity: 0; transform: scale(1.1) rotate(-8deg); } 26% { opacity: 1; transform: scale(1.04) rotate(0deg); } 56% { opacity: 1; transform: scale(0.93) rotate(10deg); } 82% { opacity: 0.9; transform: scale(1.1) rotate(22deg); } 100% { opacity: 0; transform: scale(1.16) rotate(28deg); } }
    @keyframes feel-ev2-chain2 { 0% { opacity: 0; transform: scale(1.14) rotate(8deg); } 26% { opacity: 0.95; transform: scale(1.06) rotate(0deg); } 56% { opacity: 0.95; transform: scale(0.96) rotate(-10deg); } 82% { opacity: 0.85; transform: scale(1.12) rotate(-22deg); } 100% { opacity: 0; transform: scale(1.18) rotate(-28deg); } }
    @keyframes feel-ev2-shard { 0% { opacity: 0; transform: scale(0.96) rotate(0deg); } 20% { opacity: 1; } 100% { opacity: 0; transform: scale(1.26) rotate(30deg) translateY(-3%); } }
    @keyframes feel-ev2-shard2 { 0% { opacity: 0; transform: scaleX(-1) scale(0.98) rotate(0deg); } 20% { opacity: 0.8; } 100% { opacity: 0; transform: scaleX(-1) scale(1.3) rotate(-26deg) translateY(-4%); } }
    @keyframes feel-ev2-coin { 0% { opacity: 0; transform: scale(0.6); } 25% { opacity: 1; transform: scale(1); } 60% { opacity: 0.9; transform: scale(1.15); } 100% { opacity: 0; transform: scale(1.5); } }
    @keyframes feel-ev2-tw { 0% { opacity: 0; transform: scale(0.3); } 35% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(0.6) translateY(-6px); } }
    @keyframes feel-fin-sphere { 0% { opacity: 0; transform: scale(0.5); } 8% { opacity: 1; transform: scale(0.78); } 16% { transform: scale(1); } 30% { transform: scale(1.03); } 70% { opacity: 0.96; transform: scale(1.01); } 86% { opacity: 0.85; } 100% { opacity: 0; transform: scale(1); } }
    @keyframes feel-fin-rim { 0% { opacity: 0; transform: scale(0.5); } 8% { opacity: 1; transform: scale(0.64); } 20% { opacity: 1; transform: scale(1.0); } 100% { opacity: 0; transform: scale(1.04); } }
    @keyframes feel-fin-star { 0% { opacity: 0; transform: scale(0.3); } 40% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(0.5) translateY(-4px); } }
    @keyframes feel-fin-scythe { 0% { opacity: 0; transform: rotate(100deg) scale(0.7); } 8% { opacity: 1; } 62% { transform: rotate(-4deg) scale(1.02); } 100% { opacity: 1; transform: rotate(-8deg) scale(1); } }
    @keyframes feel-fin-cloud { 0%, 74% { opacity: 0; transform: scale(0.86); } 100% { opacity: 1; transform: scale(1.04); } }
    @keyframes feel-fin-burst { 0% { opacity: 1; transform: scale(0.8); } 100% { opacity: 0; transform: scale(1.3); } }
    @keyframes feel-fin-dust { 0% { opacity: 0; transform: scale(0.5); } 25% { opacity: 0.95; } 100% { opacity: 0; transform: scale(1.7); } }
    @keyframes feel-fin-ring { 0% { opacity: 1; transform: scale(0.55); } 100% { opacity: 0; transform: scale(1.55); } }
    @keyframes feel-fin-rays { 0% { opacity: 0; transform: scale(0.5) rotate(0deg); } 20% { opacity: 0.95; } 100% { opacity: 0; transform: scale(1.3) rotate(8deg); } }
    @keyframes feel-fin-ghost { 0% { opacity: 0.9; transform: rotate(0deg) scale(1); } 100% { opacity: 0; transform: rotate(14deg) scale(1.18); } }
    @keyframes feel-fin-shard { 0% { opacity: 0; transform: translate(0, 0) rotate(0deg) scale(0.6); } 10% { opacity: 1; } 70% { opacity: 1; } 100% { opacity: 0; transform: translate(var(--dx), var(--dy)) rotate(var(--r)) scale(1); } }
    @keyframes feel-ev2-spark { 0% { opacity: 0; transform: translate(0, 0) scale(0.5); } 25% { opacity: 1; } 100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(1); } }
    @keyframes feel-d-haze { 0% { opacity: 0; transform: scale(0.5); } 15% { opacity: 0.9; transform: scale(0.9); } 100% { opacity: 0; transform: scale(1.5); } }
    @keyframes feel-d-gold { 0%, 8% { opacity: 0; transform: translate(0, 0) scale(0.4); } 22% { opacity: 1; } 100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(1); } }
    @keyframes feel-d-flash { 0% { opacity: 1; transform: scale(0.9); } 100% { opacity: 0; transform: scale(1.2); } }
    @keyframes feel-d-orb { 0% { opacity: 0; transform: scale(0.55); } 12% { opacity: 1; transform: scale(1.06); } 18% { transform: scale(1); } 56% { opacity: 1; transform: scale(1); filter: none; } 76% { opacity: 0.55; transform: scale(1.08); filter: blur(1.5px); } 100% { opacity: 0; transform: scale(1.3); filter: blur(6px); } }
    @keyframes feel-d-skull { 0%, 48% { opacity: 1; } 72% { opacity: 0.2; filter: blur(2px) brightness(0.8); } 100% { opacity: 0; } }
    @keyframes feel-d-ember { 0%, 45% { opacity: 0; transform: translate(0, 0); } 58% { opacity: 1; } 100% { opacity: 0; transform: translate(var(--dx), var(--dy)); } }
    @keyframes feel-d-conf { 0% { opacity: 0; transform: translate(var(--x), var(--y)) rotate(0); } 15% { opacity: 0.95; } 100% { opacity: 0; transform: translate(var(--dx), var(--dy)) rotate(var(--rot)); } }
    @keyframes feel-guard-wave { 0% { opacity: 0; transform: scale(0.7); } 30% { opacity: 1; } 100% { opacity: 0; transform: scale(1.12); } }
    @keyframes feel-aura-idle { 0% { opacity: 0; } 30% { opacity: 1; } 62% { opacity: 1; } 92%, 100% { opacity: 0; } }
    @keyframes feel-guard { 0% { opacity: 1; transform: translate(-50%, -50%) scale(0.35); } 100% { opacity: 0; transform: translate(-50%, -50%) scale(1.7); } }
    @keyframes feel-lunge-up { 0%,100% { transform: translateY(0); } 35% { transform: translateY(-9px) scale(1.03); } }
    @keyframes feel-lunge-down { 0%,100% { transform: translateY(0); } 35% { transform: translateY(9px) scale(1.03); } }
    @keyframes feel-shake2 { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(3px); } }
    @keyframes feel-blink { 0%,100% { opacity: 0.95; } 50% { opacity: 0.2; } }
    @keyframes feel-aura { 0% { opacity: 0; transform: scale(0.9); } 25% { opacity: 1; } 100% { opacity: 0; transform: scale(1.12); } }
    @keyframes feel-rise { 0% { opacity: 0; transform: translateY(14px) scale(0.6); } 25% { opacity: 1; } 100% { opacity: 0; transform: translateY(-34px) scale(1.1); } }
    @keyframes feel-pop { 0% { opacity: 0; transform: translateX(-50%) scale(0.92); } 100% { opacity: 1; transform: translateX(-50%) scale(1); } }
    @media (max-width: ${DESKTOP_MIN - 1}px) { button { min-height: 40px; } input { font-size: 16px; } }
  `
  document.head.appendChild(st)
}

// 画面を出ている間だけでなく、いったん離れて戻ってきたときも、最後に選んでいた項目(タブなど)を覚えておく useState。
// key は画面ごとの名前(例: 'guide.tab')。覚えておくのは、アプリを開いている間だけ(再読み込みで初期にもどる)
const REMEMBERED = new Map()
export function useRemembered(key, init) {
  const [v, setV] = useState(() => (REMEMBERED.has(key) ? REMEMBERED.get(key) : init))
  const set = (x) => setV((prev) => { const nx = typeof x === 'function' ? x(prev) : x; REMEMBERED.set(key, nx); return nx })
  return [v, set]
}
