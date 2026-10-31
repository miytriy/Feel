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
    @keyframes feel-shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(3px); } }
    @keyframes feel-draw { from { stroke-dashoffset: 1; opacity: 0.2; } to { stroke-dashoffset: 0; opacity: 0.9; } }
    @keyframes feel-lunge-up { 0%,100% { transform: translateY(0); } 35% { transform: translateY(-9px) scale(1.03); } }
    @keyframes feel-lunge-down { 0%,100% { transform: translateY(0); } 35% { transform: translateY(9px) scale(1.03); } }
    @keyframes feel-shake2 { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(3px); } }
    @keyframes feel-blink { 0%,100% { opacity: 0.95; } 50% { opacity: 0.2; } }
    @keyframes feel-pop { 0% { opacity: 0; transform: translateX(-50%) scale(0.92); } 100% { opacity: 1; transform: translateX(-50%) scale(1); } }
    @media (max-width: ${DESKTOP_MIN - 1}px) { button { min-height: 40px; } input { font-size: 16px; } }
  `
  document.head.appendChild(st)
}
