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
    @keyframes feel-float { 0% { opacity: 0; transform: translate(-50%, 8px) scale(0.8); } 15% { opacity: 1; transform: translate(-50%, 0) scale(1.15); } 100% { opacity: 0; transform: translate(-50%, -38px) scale(1); } }
    .no-sb { scrollbar-width: none; -ms-overflow-style: none; }
    .no-sb::-webkit-scrollbar { display: none; width: 0; height: 0; }
    @keyframes feel-shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(3px); } }
    @keyframes feel-rainbow { from { background-position: 0% 0; } to { background-position: -200% 0; } }
    @keyframes feel-flash { 0% { opacity: 1; transform: scale(0.55); } 30% { opacity: 1; } 100% { opacity: 0; transform: scale(1.2); } }
    @keyframes feel-slash { 0% { opacity: 1; transform: rotate(-32deg) scaleX(0); } 35% { opacity: 1; transform: rotate(-32deg) scaleX(1); } 100% { opacity: 0; transform: rotate(-32deg) scaleX(1.05); } }
    @keyframes feel-slash2 { 0% { opacity: 1; transform: rotate(32deg) scaleX(0); } 35% { opacity: 1; transform: rotate(32deg) scaleX(1); } 100% { opacity: 0; transform: rotate(32deg) scaleX(1.05); } }
    @keyframes feel-earth-haze { 0% { opacity: 0; transform: translate(-4%, 6%) scale(0.9); } 45% { opacity: 1; transform: translate(2%, -2%) scale(1.05); } 100% { opacity: 0; transform: translate(6%, -8%) scale(1.15); } }
    @keyframes feel-earth-spin { to { transform: rotate(360deg); } }
    @keyframes feel-earth-idle { 0%, 100% { opacity: 0.85; transform: translate(-50%, -50%) scale(0.985); } 50% { opacity: 1; transform: translate(-50%, -50%) scale(1.015); } }
    @keyframes feel-d-melt { 0% { filter: none; opacity: 1; scale: 1 1; transform-origin: 50% 0; } 100% { filter: blur(3px) brightness(1.35) saturate(1.3); opacity: 0.35; scale: 1.04 1.14; transform-origin: 50% 0; } }
    @keyframes feel-d-flash { 0% { opacity: 1; transform: scale(0.9); } 100% { opacity: 0; transform: scale(1.2); } }
    @keyframes feel-d-orb { 0% { opacity: 0; transform: scale(0.55); } 12% { opacity: 1; transform: scale(1.06); } 18% { transform: scale(1); } 56% { opacity: 1; transform: scale(1); filter: none; } 76% { opacity: 0.55; transform: scale(1.08); filter: blur(1.5px); } 100% { opacity: 0; transform: scale(1.3); filter: blur(6px); } }
    @keyframes feel-d-skull { 0%, 48% { opacity: 1; } 72% { opacity: 0.2; filter: blur(2px) brightness(0.8); } 100% { opacity: 0; } }
    @keyframes feel-d-ember { 0%, 45% { opacity: 0; transform: translate(0, 0); } 58% { opacity: 1; } 100% { opacity: 0; transform: translate(var(--dx), var(--dy)); } }
    @keyframes feel-d-conf { 0% { opacity: 0; transform: translate(var(--x), var(--y)) rotate(0); } 15% { opacity: 0.95; } 100% { opacity: 0; transform: translate(var(--dx), var(--dy)) rotate(var(--rot)); } }
    @keyframes feel-v-disc { 0% { opacity: 0; transform: scale(0.55); } 9% { opacity: 1; transform: scale(1); } 40% { opacity: 1; transform: scale(1); } 60% { opacity: 0; transform: scale(0.5); } 100% { opacity: 0; } }
    @keyframes feel-v-ring { 0%, 4% { opacity: 0; transform: scale(1.05); } 12% { opacity: 1; transform: scale(1); } 40% { opacity: 1; transform: scale(1); } 62% { opacity: 1; transform: scale(0.5); } 74% { opacity: 0; transform: scale(0.28); } 100% { opacity: 0; } }
    @keyframes feel-v-smoke { 0%, 54% { opacity: 0; transform: translate(-50%, -50%) scale(0.4); } 68% { opacity: 0.9; transform: translate(-50%, -50%) scale(0.75); } 100% { opacity: 0; transform: translate(-50%, -50%) scale(1.25); } }
    @keyframes feel-v-core { 0%, 50% { opacity: 0; transform: translate(-50%, -50%) scale(0.2); } 62% { opacity: 1; transform: translate(-50%, -50%) scale(0.6); } 74% { opacity: 1; transform: translate(-50%, -50%) scale(0.45); } 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); } }
    @keyframes feel-v-glow { 0%, 62% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); } 76% { opacity: 1; transform: translate(-50%, -50%) scale(0.9); } 100% { opacity: 0; transform: translate(-50%, -50%) scale(1.15); } }
    @keyframes feel-v-spark { 0%, 60% { opacity: 0; transform: translate(0, 0); } 70% { opacity: 1; } 100% { opacity: 0; transform: translate(var(--dx), var(--dy)); } }
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
