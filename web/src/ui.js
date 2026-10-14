// Feel - 画面の共通部品: スマホ/PCの切り替え(画面の幅で自動)と、全体の見た目の基本設定
import { useEffect, useState } from 'react'

export const DESKTOP_MIN = 900 // この幅(px)以上ならPC用の画面にする
export const FONT = '"Hiragino Sans","Noto Sans JP",system-ui,sans-serif'
export const C = {
  ink: '#1f2a44', paper: '#eef1f6', card: '#ffffff', line: '#cdd3df', mute: '#6b7488',
  player: '#2f5bea', enemy: '#b83a6b', active: '#e0a100', warn: '#c2570c', ok: '#1a7f4b',
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
    html, body { margin: 0; background: ${C.paper}; -webkit-text-size-adjust: 100%; }
    body { font-family: ${FONT}; color: ${C.ink}; }
    button { font-family: inherit; touch-action: manipulation; }
    input { font-family: inherit; }
    @media (max-width: ${DESKTOP_MIN - 1}px) { button { min-height: 40px; } input { font-size: 16px; } }
  `
  document.head.appendChild(st)
}
