import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'

// 新しい版が見つかっても、起動中や操作中に勝手に再読み込みしない(ロード画面が途中でやり直しになるため)。
// 画面を閉じる/裏に回ったときに、こっそり新しい版へ切り替える。
let updateNow = null
let waiting = false
updateNow = registerSW({ immediate: true, onNeedRefresh() { waiting = true } })
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && waiting && updateNow) { waiting = false; updateNow(true) }
})

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
