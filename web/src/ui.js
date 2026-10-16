// Feel - 画面の共通部品: スマホ/PCの切り替え(画面の幅で自動)と、全体の見た目の基本設定
import { useEffect, useState } from 'react'

export const DESKTOP_MIN = 900 // この幅(px)以上ならPC用の画面にする
export const FONT = '"Hiragino Sans","Noto Sans JP",system-ui,sans-serif'
export const DISPLAY = '"Barlow Condensed","Oswald","Arial Narrow","Impact","Hiragino Sans","Noto Sans JP",sans-serif' // 見出し・メニュー用の、細長くて太い文字
// 色(暗いティール基調 + ネオン)。画面はすべてこの色を使う。色を変えるときは、ここだけ直せばよい
export const C = {
  ink: '#e8f4f2', paper: '#08171c', card: '#102730', line: '#25505b', mute: '#82a3aa',
  player: '#34f0c8', // ネオン(ボタン・選択・自分のチーム)。この上に文字を置くときは onAccent
  enemy: '#ff4655', active: '#ffd24a', warn: '#ff9a4d', ok: '#3ddc97', bad: '#ff6b6b',
  onAccent: '#032320', // ネオンの上の文字色
  soft: '#16363f', softWarn: '#352a14', softOk: '#10342a', dangerBg: '#3a1a22', // 薄い面
  disabledBg: '#122a31', disabledInk: '#5d7c83',
  neon: '#34f0c8', red: '#ff4655',
}

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
    .feel-menu-item { display: flex; align-items: center; gap: 18px; background: none; border: 0; padding: 4px 0; cursor: pointer; text-align: left; color: #fff;
      font-family: ${DISPLAY}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em; line-height: 1.05; font-size: clamp(34px, 5.2vw, 58px); min-height: 0; }
    .feel-menu-item.primary { color: ${C.red}; font-size: clamp(56px, 8.6vw, 96px); }
    .feel-menu-item .bullet { flex: none; width: 9px; height: 9px; margin-left: 4px; background: #fff; transform: rotate(45deg); transition: background 0.16s; }
    .feel-menu-item.primary .bullet { background: ${C.red}; }
    .feel-menu-item .label { display: inline-block; transition: transform 0.16s ease, color 0.16s ease, text-shadow 0.16s ease; }
    .feel-menu-item.locked { opacity: 0.45; }
    .feel-menu-item:focus-visible, .feel-menu-item:active { outline: none; }
    .feel-menu-item:focus-visible .label, .feel-menu-item:active .label { color: ${C.neon}; transform: translateX(12px); text-shadow: 0 0 18px rgba(52,240,200,0.55); }
    .feel-menu-item:focus-visible .bullet, .feel-menu-item:active .bullet { background: ${C.neon}; }
    @media (hover: hover) {
      .feel-menu-item:hover .label { color: ${C.neon}; transform: translateX(12px); text-shadow: 0 0 18px rgba(52,240,200,0.55); }
      .feel-menu-item:hover .bullet { background: ${C.neon}; }
      .feel-menu-item.locked:hover { opacity: 0.75; }
    }
    .feel-back { background: none; border: 0; cursor: pointer; color: ${C.mute}; font-family: ${DISPLAY}; font-weight: 700; font-size: 20px; letter-spacing: 0.06em; padding: 6px 0; min-height: 0; transition: color 0.16s, transform 0.16s; }
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
