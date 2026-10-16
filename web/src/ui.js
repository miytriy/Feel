// Feel - 画面の共通部品: スマホ/PCの切り替え(画面の幅で自動)と、全体の見た目の基本設定
import { useEffect, useState } from 'react'

export const DESKTOP_MIN = 900 // この幅(px)以上ならPC用の画面にする
export const FONT = '"Hiragino Sans","Noto Sans JP",system-ui,sans-serif'
export const DISPLAY = '"Chakra Petch","Rajdhani","Segoe UI","Hiragino Sans","Noto Sans JP",sans-serif' // 見出し・メニュー用の、角ばった未来風の文字
// 色(夜の藍色 + 青のネオン)。画面はすべてこの色を使う。色を変えるときは、ここだけ直せばよい
export const C = {
  ink: '#e9eefc', paper: '#0a0f1f', card: '#121a33', line: '#2a3560', mute: '#8d9acb',
  player: '#4cc9ff', // ネオン(ボタン・選択・自分のチーム)。この上に文字を置くときは onAccent
  enemy: '#ff4d6d', active: '#ffd24a', warn: '#ff9a4d', ok: '#3ddc97', bad: '#ff6b81',
  onAccent: '#041423', // ネオンの上の文字色
  soft: '#1a2550', softWarn: '#352a14', softOk: '#0f2f2a', dangerBg: '#3a1a2a', // 薄い面
  disabledBg: '#141c38', disabledInk: '#5d6896',
  neon: '#4cc9ff', red: '#ff4d6d',
}
export const NEON_RGB = '76,201,255' // ネオンの光(影)に使う

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
    html { color-scheme: dark; }
    html, body { margin: 0; background: ${C.paper}; -webkit-text-size-adjust: 100%; }
    body { font-family: ${FONT}; color: ${C.ink}; }
    h1, h2 { font-family: ${DISPLAY}; letter-spacing: 0.04em; }
    input, select, textarea { background: ${C.card}; color: ${C.ink}; border: 1px solid ${C.line}; border-radius: 8px; }
    input::placeholder { color: ${C.mute}; }
    /* ホームのメニュー: 白い大きな文字。カーソルを乗せる(押す・キーで選ぶ)と、ネオン色になって右に少し動く */
    .feel-menu { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: clamp(2px, 1vh, 10px); }
    .feel-menu-item { display: flex; align-items: center; gap: 16px; background: none; border: 0; padding: 4px 0; cursor: pointer; text-align: left; color: #fff;
      font-family: ${DISPLAY}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; line-height: 1.1; font-size: clamp(26px, 4.2vw, 46px); min-height: 0; }
    .feel-menu-item.primary { color: ${C.red}; font-weight: 700; font-size: clamp(40px, 6.4vw, 70px); }
    /* 項目の左の印: 短い線。選ぶと、長くなってネオン色になる */
    .feel-menu-item .bullet { flex: none; width: 18px; height: 3px; border-radius: 2px; background: rgba(255,255,255,0.7); transition: width 0.18s ease, background 0.16s; }
    .feel-menu-item.primary .bullet { background: ${C.red}; width: 26px; height: 4px; }
    .feel-menu-item .label { display: inline-block; transition: transform 0.16s ease, color 0.16s ease, text-shadow 0.16s ease; }
    .feel-menu-item.locked { opacity: 0.45; }
    .feel-menu-item:focus-visible, .feel-menu-item:active { outline: none; }
    .feel-menu-item:focus-visible .label, .feel-menu-item:active .label { color: ${C.neon}; transform: translateX(12px); text-shadow: 0 0 18px rgba(${NEON_RGB},0.55); }
    .feel-menu-item:focus-visible .bullet, .feel-menu-item:active .bullet { background: ${C.neon}; width: 40px; }
    @media (hover: hover) {
      .feel-menu-item:hover .label { color: ${C.neon}; transform: translateX(12px); text-shadow: 0 0 18px rgba(${NEON_RGB},0.55); }
      .feel-menu-item:hover .bullet { background: ${C.neon}; width: 40px; }
      .feel-menu-item.locked:hover { opacity: 0.75; }
    }
    .feel-back { background: none; border: 0; cursor: pointer; color: ${C.mute}; font-family: ${DISPLAY}; font-weight: 600; font-size: 17px; letter-spacing: 0.1em; padding: 6px 0; min-height: 0; transition: color 0.16s, transform 0.16s; }
    .feel-back:hover, .feel-back:focus-visible { color: ${C.neon}; transform: translateX(-4px); outline: none; }
    button { font-family: inherit; touch-action: manipulation; }
    input { font-family: inherit; }
    @keyframes feel-float { 0% { opacity: 0; transform: translate(-50%, 8px) scale(0.8); } 15% { opacity: 1; transform: translate(-50%, 0) scale(1.15); } 100% { opacity: 0; transform: translate(-50%, -38px) scale(1); } }
    @keyframes feel-shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(3px); } }
    @keyframes feel-shake2 { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(3px); } }
    @keyframes feel-blink { 0%,100% { opacity: 0.95; } 50% { opacity: 0.2; } }
    @keyframes feel-pop { 0% { opacity: 0; transform: translateX(-50%) scale(0.92); } 100% { opacity: 1; transform: translateX(-50%) scale(1); } }
    @media (max-width: ${DESKTOP_MIN - 1}px) { button { min-height: 40px; } input { font-size: 16px; } }
  `
  document.head.appendChild(st)
}
