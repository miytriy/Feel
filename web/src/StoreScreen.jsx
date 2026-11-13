// Feel - 購買部: ログインボーナスと合言葉(あとで、買い物の機能を足す)
// 見た目は、エンドフィールドの購買部をお手本に: 黒い上の帯 + 角丸のタブ + 明るい舞台 + 左の一覧 + 黄色の大きなボタン
import { useEffect, useRef, useState } from 'react'
import { C, FONT, DISPLAY } from './ui.js'
import { IconGem, IconStore, IconClose } from './icons.jsx'

const TABS = [
  { key: 'bonus', label: 'ログインボーナス', Icon: IconGem },
  { key: 'code', label: '合言葉', Icon: IconStore },
  { key: 'stones', label: '石購入', Icon: IconGem },
  { key: 'pass', label: '月パス', Icon: IconStore },
]
const STONE_TABS = [
  { key: 'ticket', label: '交易石購入' },
  { key: 'crystal', label: '盟晶購入' },
]
const TICKETS = [
  { kind: 'normal', name: '通常採用券', note: '通常ガチャで、1枚で1回引けます。' },
  { kind: 'limited', name: '限定採用券', note: '限定ガチャ(ピックアップ・復刻)で、1枚で1回引けます。' },
]

const CSS = `
.sp { position: relative; min-height: 100vh; overflow-x: hidden; color: #1b1b1f; font-family: ${FONT}; background: linear-gradient(160deg, #f2f2f3 0%, #dedee1 55%, #cbcbd0 100%); animation: sp-fade 0.25s ease-out backwards; }
.sp button, .sp input { font-family: ${FONT}; }
@keyframes sp-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes sp-rise { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: none; } }
@keyframes sp-side { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: none; } }

/* 舞台のかざり: 等高線と、黄色の斜めの帯 */
.sp-bg { position: absolute; inset: 0; pointer-events: none; overflow: hidden; background: repeating-radial-gradient(ellipse 1300px 460px at 80% 112%, transparent 0 64px, rgba(0,0,0,0.05) 64px 66px); }
.sp-bg i { position: absolute; top: -10%; height: 130%; transform: skewX(-24deg); }
.sp-bg i:nth-child(1) { right: 12%; width: 150px; background: ${C.player}; opacity: 0.5; }
.sp-bg i:nth-child(2) { right: 26%; width: 18px; background: ${C.player}; opacity: 0.75; }
.sp-bg i:nth-child(3) { right: 7%; width: 12px; background: #1b1b1f; opacity: 0.1; }

/* 黒い上の帯: // 購買部 ・ 持っている交易石 ・ 丸い × / その下に、角丸のタブ */
.sp-bar { position: sticky; top: 0; z-index: 6; background: #0b0b0d; color: #fff; padding-top: env(safe-area-inset-top); }
.sp-row { display: flex; align-items: center; gap: 12px; padding: 10px 28px 4px; }
.sp-title { font-family: ${DISPLAY}; font-weight: 600; font-size: 16px; letter-spacing: 0.12em; color: #d6d6dc; }
.sp-title b { color: ${C.player}; font-style: italic; margin-right: 2px; }
.sp-chip { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; padding: 4px 18px; border-radius: 999px; background: #232327; font-family: ${DISPLAY}; font-weight: 600; font-size: 19px; }
.sp-chip svg { color: ${C.player}; font-size: 20px; }
.sp-x { width: 44px; height: 44px; padding: 0; min-height: 0; border: 0; border-radius: 50%; background: #f2f2f3; color: #1c1c1f; font-size: 26px; display: grid; place-items: center; cursor: pointer; transition: background 0.15s, transform 0.15s; }
.sp-x:hover, .sp-x:focus-visible { background: ${C.player}; transform: rotate(90deg); outline: none; }
.sp-tabs { display: flex; gap: 10px; padding: 8px 28px 12px; overflow-x: auto; scrollbar-width: none; }
.sp-tabs::-webkit-scrollbar { display: none; }
.sp-tab { flex: none; display: inline-flex; align-items: center; gap: 10px; min-height: 0; padding: 8px 30px 8px 22px; border-radius: 999px; border: 2px solid rgba(255,255,255,0.22); background: #1d1d21; color: #9c9ca4; font-family: ${DISPLAY}; font-weight: 600; font-size: 18px; letter-spacing: 0.03em; cursor: pointer; transition: background 0.15s, color 0.15s, border-color 0.15s; }
.sp-tab svg { font-size: 22px; }
.sp-tab:hover, .sp-tab:focus-visible { border-color: ${C.player}; color: #fff; outline: none; }
.sp-tab.on { background: #f2f2f3; border-color: #f2f2f3; color: #1b1b1f; }
.sp-tab.on svg { color: #d9b800; }

.sp-body { position: relative; z-index: 1; max-width: 1280px; margin: 0 auto; padding: 26px 32px 44px; display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 34px; align-items: start; }

/* 左の一覧(いまの状態): 黄色の印 + 灰色 */
.sp-side { background: linear-gradient(180deg, #f8f8f9, #e2e2e5); box-shadow: 0 10px 24px rgba(0,0,0,0.14); animation: sp-side 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.sp-sr { position: relative; padding: 13px 18px 13px 24px; border-bottom: 1px solid rgba(0,0,0,0.08); }
.sp-sr:last-child { border-bottom: 0; }
.sp-sr .lb { font-size: 12px; color: #66666e; }
.sp-sr .v { font-family: ${DISPLAY}; font-weight: 700; font-style: italic; font-size: 28px; line-height: 1.15; }
.sp-sr .v small { font-size: 14px; font-style: normal; font-weight: 600; margin-left: 4px; color: #66666e; }
.sp-sr.hi { background: #6f6f76; color: #fff; }
.sp-sr.hi .lb, .sp-sr.hi .v small { color: #d6d6dc; }
.sp-sr.hi::before { content: ''; position: absolute; left: -9px; top: 6px; bottom: 6px; width: 4px; background: ${C.player}; }

.sp-msg { margin-bottom: 18px; padding: 12px 18px; background: #1b1b1f; color: #fff; font-size: 15px; font-weight: 700; border-left: 6px solid ${C.player}; animation: sp-rise 0.3s ease-out backwards; }
.sp-msg.bad { border-left-color: #ff5a36; color: #ffd6cc; }

.sp-eb { font-family: ${DISPLAY}; font-weight: 700; font-size: 13px; letter-spacing: 0.3em; color: #6a6a72; }
.sp-h { margin: 2px 0 6px; font-size: 38px; font-weight: 800; letter-spacing: 0.02em; }
.sp-h::after { content: ''; display: block; width: 190px; height: 5px; margin-top: 6px; background: ${C.player}; }
.sp-sub { margin: 10px 0 22px; font-size: 14px; color: #55555c; line-height: 1.7; }

/* 7日ぶんのカード */
.sp-days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 12px; }
.sp-day { position: relative; display: flex; flex-direction: column; align-items: center; padding: 14px 6px 0; min-height: 250px; background: linear-gradient(#fbfbfb, #e4e4e8); box-shadow: 0 10px 20px rgba(0,0,0,0.15); clip-path: polygon(0 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%); animation: sp-rise 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; animation-delay: calc(var(--i, 0) * 55ms); }
.sp-day .dn { font-family: ${DISPLAY}; font-weight: 700; font-size: 13px; letter-spacing: 0.18em; color: #6a6a72; }
.sp-day .gm { margin: 18px 0 10px; font-size: 62px; color: #e6c800; filter: drop-shadow(0 6px 5px rgba(0,0,0,0.25)); }
.sp-day .am { font-family: ${DISPLAY}; font-weight: 700; font-style: italic; font-size: 34px; line-height: 1; }
.sp-day .bd { margin-top: auto; width: 100%; padding: 7px 0 9px; text-align: center; font-weight: 800; font-size: 14px; background: #d6d6da; color: #3a3a40; }
.sp-day.sp7 .bd { background: #ff5a36; color: #fff; }
.sp-day.done { opacity: 0.62; }
.sp-day.done .bd { background: #8b8b92; color: #fff; }
.sp-day.now { transform: translateY(-8px); box-shadow: 0 16px 26px rgba(0,0,0,0.22); background: linear-gradient(#fffbe0, #f6e98a); }
.sp-day.now .bd { background: ${C.player}; color: #141414; }

.sp-act { display: flex; align-items: center; justify-content: flex-end; gap: 22px; flex-wrap: wrap; margin-top: 28px; }
.sp-act .nt { margin-right: auto; font-size: 14px; color: #44444a; line-height: 1.7; }
.sp-buy { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 26px; min-width: 310px; min-height: 0; padding: 14px 26px 14px 78px; border: 0; background: linear-gradient(105deg, #e3c800 0 22%, ${C.player} 22% 100%); color: #141414; font-size: 21px; font-weight: 800; cursor: pointer; transition: transform 0.14s, filter 0.14s; }
.sp-buy .ar { font-family: ${DISPLAY}; font-size: 30px; line-height: 1; }
.sp-buy small { font-size: 14px; font-weight: 700; margin-left: 8px; }
.sp-buy:hover:not(:disabled), .sp-buy:focus-visible { transform: translateX(-4px); filter: brightness(1.05); outline: none; }
.sp-buy:disabled { background: linear-gradient(105deg, #aeaeb4 0 22%, #c4c4c9 22% 100%); color: #77777e; cursor: default; }

/* 合言葉 */
.sp-code { padding: 24px 28px 26px; background: linear-gradient(#fbfbfb, #e6e6e9); box-shadow: 0 10px 22px rgba(0,0,0,0.14); clip-path: polygon(0 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%); }
.sp-code label { display: block; font-weight: 700; font-size: 13px; letter-spacing: 0.06em; color: #6a6a72; margin-bottom: 8px; }
.sp-in { width: 100%; box-sizing: border-box; min-height: 0; border-radius: 0; padding: 12px 14px; border: 0; border-bottom: 4px solid ${C.player}; background: #fff; color: #1b1b1f; font-size: 26px; font-weight: 700; letter-spacing: 0.08em; outline: none; }
.sp-in::placeholder { color: #b4b4ba; font-weight: 400; letter-spacing: 0.02em; }
.sp-in:focus { box-shadow: 0 0 0 3px rgba(255,230,0,0.5); }
.sp-load { padding: 40px 0; text-align: center; color: #55555c; font-size: 16px; }

@media (max-width: 899px) {
  .sp-row { padding: 8px 14px 2px; } .sp-tabs { padding: 8px 14px 10px; } .sp-tab { padding: 7px 22px 7px 16px; font-size: 16px; }
  .sp-body > div { min-width: 0; }
  .sp-body { grid-template-columns: minmax(0, 1fr); gap: 20px; padding: 16px 14px calc(30px + env(safe-area-inset-bottom)); }
  .sp-side { display: grid; grid-template-columns: 1fr 1fr; }
  .sp-sr { border-bottom: 1px solid rgba(0,0,0,0.08); padding: 10px 12px 10px 18px; } .sp-sr .v { font-size: 24px; }
  .sp-sr.hi::before { left: -6px; }
  .sp-h { font-size: 30px; }
  .sp-days { grid-template-columns: repeat(7, 112px); overflow-x: auto; padding: 14px 4px 18px; margin: 0 -4px; scroll-snap-type: x proximity; }
  .sp-day { scroll-snap-align: start; min-height: 232px; }
  .sp-act { margin-top: 12px; } .sp-buy { min-width: 0; width: 100%; box-sizing: border-box; }
  .sp-in { font-size: 22px; }
}
/* 動き(transform と opacity だけ: EFFECTS.md) */
@keyframes sp-pop { from { opacity: 0; transform: scale(0.92) translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes sp-bump { 0% { transform: scale(1.4); } 100% { transform: scale(1); } }
.sp-pane > * { animation: sp-rise 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.sp-pane > *:nth-child(2) { animation-delay: 0.05s; } .sp-pane > *:nth-child(3) { animation-delay: 0.1s; } .sp-pane > *:nth-child(4) { animation-delay: 0.15s; } .sp-pane > *:nth-child(5) { animation-delay: 0.2s; }
.sp-card { position: relative; transition: transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1); animation: sp-rise 0.55s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; animation-delay: calc(0.12s + var(--i, 0) * 0.09s); }
.sp-card:hover { transform: translateY(-5px); }
.sp-st { position: relative; transition: transform 0.15s; }
.sp-st:hover { transform: translateY(-2px); } .sp-st:active { transform: scale(0.95); }
.sp-st.on { animation: sp-pop 0.28s cubic-bezier(0.2, 0.9, 0.3, 1.2); }
.sp-step button { transition: transform 0.12s; } .sp-step button:active:not(:disabled) { transform: scale(0.88); }
.sp-step output.pulse { animation: sp-bump 0.22s cubic-bezier(0.2, 0.8, 0.2, 1); }
.sp-sr .v > span { display: inline-block; animation: sp-bump 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); transform-origin: left center; }
.sp-buy:active:not(:disabled) { transform: translateX(-4px) scale(0.98); }
.sp-dim { animation: sp-fade 0.2s ease-out; }
.sp-dlg { animation: sp-pop 0.3s cubic-bezier(0.2, 0.9, 0.3, 1.15) backwards; }
.sp-dlg .bt button { transition: transform 0.12s; } .sp-dlg .bt button:hover { transform: translateY(-2px); } .sp-dlg .bt button:active { transform: scale(0.95); }

/* 購買部ぜんたいの動き */
@keyframes sp-draw { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes sp-slide { from { opacity: 0; transform: translateX(-14px); } to { opacity: 1; transform: none; } }
@keyframes sp-nudge { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(6px); } }
@keyframes sp-drift { from { translate: 0 0; } to { translate: 0 -18px; } }
@keyframes sp-pulse { 0%, 100% { transform: translateY(-8px) scale(1); } 50% { transform: translateY(-12px) scale(1.035); } }
@keyframes sp-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
@keyframes sp-tabin { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: none; } }
.sp-bg i { animation: sp-drift 6s ease-in-out infinite alternate; } .sp-bg i:nth-child(2) { animation-duration: 4.4s; } .sp-bg i:nth-child(3) { animation-duration: 7.5s; }
.sp-tab { animation: sp-tabin 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; transition: transform 0.15s; }
.sp-tab:nth-child(2) { animation-delay: 0.06s; } .sp-tab:nth-child(3) { animation-delay: 0.12s; } .sp-tab:nth-child(4) { animation-delay: 0.18s; }
.sp-tab:hover { transform: translateY(-2px); } .sp-tab:active { transform: scale(0.95); }
.sp-tab.on svg { animation: sp-bump 0.35s cubic-bezier(0.2, 0.8, 0.2, 1); }
.sp-chip svg { animation: sp-float 2.6s ease-in-out infinite; }
.sp-eb { animation: sp-slide 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.sp-h::after { transform-origin: left center; animation: sp-draw 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) 0.15s backwards; }
.sp-day { animation: sp-rise 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; animation-delay: calc(var(--i, 0) * 0.06s); }
.sp-day.now { animation: sp-rise 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) 0.45s backwards, sp-pulse 1.8s ease-in-out 1s infinite; }
.sp-buy:not(:disabled) .ar { animation: sp-nudge 1.4s ease-in-out infinite; }
.sp-buy:disabled .ar { animation: none; }
.sp-card h3, .sp-card .own { transition: transform 0.22s; }
.sp-msg { animation: sp-rise 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }

/* 石購入: 小さなタブ + 券のカード + 盟晶 */
.sp-sub-tabs { display: flex; gap: 8px; margin: 14px 0 22px; flex-wrap: wrap; }
.sp-st { min-height: 0; padding: 8px 22px; border: 2px solid #1b1b1f; background: transparent; color: #1b1b1f; font-family: ${FONT}; font-weight: 800; font-size: 15px; cursor: pointer; }
.sp-st.on { background: #1b1b1f; color: #fff; }
.sp-st:hover, .sp-st:focus-visible { border-color: #d9b800; outline: none; }
.sp-tk { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 18px; }
.sp-card { padding: 20px 22px; background: linear-gradient(#fbfbfb, #e4e4e8); box-shadow: 0 10px 20px rgba(0,0,0,0.12); }
.sp-card h3 { margin: 0; font-size: 22px; font-weight: 800; }
.sp-card .own { margin-top: 4px; font-size: 14px; color: #55555c; }
.sp-card .own b { font-family: ${DISPLAY}; font-size: 26px; color: #1b1b1f; margin: 0 4px; }
.sp-card .nt { margin: 10px 0 14px; font-size: 13px; color: #55555c; line-height: 1.6; }
.sp-step { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.sp-step button { width: 40px; height: 40px; min-height: 0; padding: 0; border: 0; background: #1b1b1f; color: #fff; font-size: 22px; font-weight: 800; cursor: pointer; }
.sp-step button:disabled { opacity: 0.35; cursor: default; }
.sp-step button:focus-visible { outline: 3px solid #d9b800; }
.sp-step output { min-width: 56px; text-align: center; font-family: ${DISPLAY}; font-weight: 700; font-size: 26px; }
.sp-step small { color: #55555c; font-size: 13px; }
.sp-num { width: 100%; box-sizing: border-box; min-height: 0; padding: 10px 12px; border: 2px solid #1b1b1f; border-radius: 0; background: #fff; color: #1b1b1f; -webkit-text-fill-color: #1b1b1f; caret-color: #1b1b1f; font-family: ${DISPLAY}; font-weight: 700; font-size: 24px; margin-bottom: 14px; outline: none; }
.sp-num::placeholder { color: #9a9aa2; -webkit-text-fill-color: #9a9aa2; font-weight: 400; font-size: 18px; }
.sp-num:focus { border-color: #d9b800; box-shadow: 0 0 0 3px rgba(255,230,0,0.45); }
.sp-two { display: flex; gap: 12px; flex-wrap: wrap; }
.sp-two .sp-buy { min-width: 0; flex: 1 1 220px; }
.sp-dim { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; background: rgba(0,0,0,0.55); }
.sp-dlg { width: min(460px, 92vw); padding: 24px 26px; background: #fff; color: #1b1b1f; box-shadow: 0 20px 50px rgba(0,0,0,0.4); }
.sp-dlg h3 { margin: 0 0 10px; font-size: 20px; font-weight: 800; }
.sp-dlg p { margin: 0 0 8px; font-size: 15px; line-height: 1.7; }
.sp-dlg .warn { padding: 10px 12px; background: #fff3cf; border-left: 5px solid #d9b800; font-size: 14px; font-weight: 700; }
.sp-dlg .bl { margin: 12px 0 0; font-size: 14px; color: #44444a; }
.sp-dlg .bt { display: flex; gap: 12px; justify-content: flex-end; margin-top: 18px; }
.sp-dlg .bt button { min-height: 0; padding: 10px 24px; border: 0; font-weight: 800; font-size: 15px; cursor: pointer; background: #d6d6da; color: #1b1b1f; }
.sp-dlg .bt button.ok { background: #1b1b1f; color: #fff; }
.sp-dlg .bt button:focus-visible { outline: 3px solid #d9b800; }
@media (prefers-reduced-motion: reduce) { .sp, .sp-side, .sp-msg, .sp-day, .sp-pane > *, .sp-card, .sp-bg i, .sp-tab, .sp-tab svg, .sp-chip svg, .sp-eb, .sp-h::after, .sp-buy .ar, .sp-st, .sp-dim, .sp-dlg, .sp-step output, .sp-sr .v > span { animation: none !important; } .sp-buy, .sp-x, .sp-card, .sp-st, .sp-step button, .sp-dlg .bt button { transition: none; } }
`

function Row({ label, value, unit, hi }) {
  return (
    <div className={`sp-sr${hi ? ' hi' : ''}`}>
      <div className="lb">{label}</div>
      <div className="v"><span key={String(value)}>{value}</span>{unit && <small>{unit}</small>}</div>
    </div>
  )
}

export default function StoreScreen({ me, busy, notice, error, tab, onTab, stoneTab = 'ticket', onStoneTab = () => {}, code, onCode, onClaimBonus, onRedeem, onTicket, onCrystal, onPass, pityCount = 40, onExit }) {
  const nowRef = useRef(null)
  const [counts, setCounts] = useState({ normal: 1, limited: 1 }) // 券を買う枚数
  const [amount, setAmount] = useState('') // 盟晶の数
  const [dlg, setDlg] = useState(null) // 確認のダイアログ
  const lb = me && me.loginBonus
  const cycle = (lb && lb.cycle) || []
  const len = cycle.length || 7
  // 今日(または、受け取った日)が、7日の何日目か。受け取る前は streak 日ぶん終わっている
  const todayIdx = lb ? (lb.canClaim ? lb.streak % len : (lb.streak - 1 + len) % len) : 0
  useEffect(() => {
    if (nowRef.current && nowRef.current.scrollIntoView) nowRef.current.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [tab, todayIdx, !!lb]) // eslint-disable-line react-hooks/exhaustive-deps

  const msg = (notice || error) && <div className={`sp-msg${error && !notice ? ' bad' : ''}`} role="status">{notice || error}</div>

  const bonus = lb && (
    <>
      <div className="sp-eb">LOGIN BONUS</div>
      <h2 className="sp-h">ログインボーナス</h2>
      <p className="sp-sub">毎日1回、交易石がもらえます。連続でログインすると、7日目に特別な量になります。</p>
      <div className="sp-days" role="list">
        {cycle.map((amount, i) => {
          const done = lb.canClaim ? i < todayIdx : i <= todayIdx
          const now = lb.canClaim && i === todayIdx
          const last = i === len - 1
          return (
            <div key={i} role="listitem" ref={now ? nowRef : null} className={`sp-day${done ? ' done' : ''}${now ? ' now' : ''}${last ? ' sp7' : ''}`} style={{ '--i': i }}>
              <div className="dn">DAY {i + 1}</div>
              <IconGem className="gm" />
              <div className="am">{amount}</div>
              <div className="bd">{done ? '受取済 ✓' : now ? 'TODAY' : last ? 'スペシャル' : `あと${i - todayIdx}日`}</div>
            </div>
          )
        })}
      </div>
      <div className="sp-act">
        <div className="nt">
          {lb.canClaim ? `今日の分: +${lb.nextAmount} 交易石${lb.passBonus ? ` + 月パス ${lb.passBonus}` : ''}` : `今日は受け取り済みです(連続${lb.streak}日)。明日は +${lb.nextAmount} 交易石`}
        </div>
        <button type="button" className="sp-buy" disabled={busy || !lb.canClaim} onClick={onClaimBonus}>
          <span>{lb.canClaim ? '受け取る' : '受け取り済み'}{lb.canClaim && <small>+{lb.nextAmount}</small>}</span>
          <span className="ar" aria-hidden="true">{lb.canClaim ? '→' : '✓'}</span>
        </button>
      </div>
    </>
  )

  const cost = (me && me.ticketCost) || 500
  const gems = me ? me.gems : 0
  const crystals = me ? me.crystals || 0 : 0
  const pass = me && me.pass // 月パス
  const free = !!(me && me.crystalFree) // 盟晶は、いまは無料(お金も交易石も使わない)
  const amt = Math.max(0, Math.floor(Number(amount) || 0))
  const ok = (fn) => () => { setDlg(null); fn() }

  const stones = me && (
    <>
      <div className="sp-eb">STONE SHOP</div>
      <h2 className="sp-h">石購入</h2>
      <div className="sp-sub-tabs" role="tablist" aria-label="石購入">
        {STONE_TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={stoneTab === t.key} className={`sp-st${stoneTab === t.key ? ' on' : ''}`} data-testid={`st-${t.key}`} onClick={() => onStoneTab(t.key)}>{t.label}</button>
        ))}
      </div>
      {stoneTab === 'ticket' ? (
        <>
          <p className="sp-sub" style={{ marginTop: 0 }}>交易石を使って、採用券を買えます。どちらも1枚 {cost} 交易石です。</p>
          <div className="sp-tk">
            {TICKETS.map((t) => {
              const n = counts[t.kind], total = cost * n, have = (me.tickets && me.tickets[t.kind]) || 0
              return (
                <div className="sp-card" key={t.kind} style={{ '--i': t.kind === 'normal' ? 0 : 1 }} data-testid={`tk-${t.kind}`}>
                  <h3>{t.name}</h3>
                  <div className="own">所持<b>{have}</b>枚</div>
                  <p className="nt">{t.note}</p>
                  <div className="sp-step">
                    <button type="button" aria-label="1枚減らす" disabled={n <= 1} onClick={() => setCounts({ ...counts, [t.kind]: n - 1 })}>−</button>
                    <output key={n} className="pulse">{n}</output>
                    <button type="button" aria-label="1枚増やす" disabled={n >= 99} onClick={() => setCounts({ ...counts, [t.kind]: n + 1 })}>＋</button>
                    <small>枚 = 交易石 {total}</small>
                  </div>
                  <button type="button" className="sp-buy" style={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }} data-testid={`tk-buy-${t.kind}`} disabled={busy || gems < total} onClick={() => setDlg({ type: 'ticket', t, n, total })}>
                    <span>{gems < total ? '交易石が足りません' : '交換する'}<small>{total}</small></span><span className="ar" aria-hidden="true">→</span>
                  </button>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <>
          <p className="sp-sub" style={{ marginTop: 0 }}>{free ? '盟晶は、いま無料で手に入ります。' : '交易石と盟晶を、1対1で交換できます。'}</p>
          <div className="sp-card" data-testid="crystal-card">
            <h3>盟晶</h3>
            <div className="own">所持<b>{crystals}</b>個 ・ 交易石<b>{gems}</b>個</div>
            <p className="nt">盟晶では、ガチャを直接引けません。ガチャに使うには、交易石に変換(1対1)します。</p>
            <input className="sp-num" type="number" inputMode="numeric" min="1" value={amount} placeholder="交換する数" aria-label="交換する数" data-testid="crystal-amount" onChange={(e) => setAmount(e.target.value)} />
            <div className="sp-two">
              <button type="button" className="sp-buy" data-testid="crystal-buy" disabled={busy || amt < 1 || (!free && gems < amt)} onClick={() => setDlg({ type: 'crystal', mode: 'buy', n: amt })}>
                <span>{free ? '盟晶を無料でもらう' : '盟晶を買う'}<small>{free ? '' : '交易石 → 盟晶'}</small></span><span className="ar" aria-hidden="true">→</span>
              </button>
              <button type="button" className="sp-buy" data-testid="crystal-back" disabled={busy || amt < 1 || crystals < amt} onClick={() => setDlg({ type: 'crystal', mode: 'back', n: amt })}>
                <span>交易石に変換<small>盟晶 → 交易石</small></span><span className="ar" aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )

  const dialog = dlg && (
    <div className="sp-dim" onClick={() => setDlg(null)}>
      <div className="sp-dlg" role="dialog" aria-label="交換の確認" data-testid="store-dialog" onClick={(e) => e.stopPropagation()}>
        {dlg.type === 'pass' ? (
          <>
            <h3>月パスを買いますか?</h3>
            <p>盟晶 {pass.cost} 個を消費して、月パス({pass.days}日間)を{pass.active ? '買い足します' : '買います'}。</p>
            <div className="bl">盟晶 {crystals} → {crystals - pass.cost}</div>
            <div className="bt"><button type="button" aria-label="閉じる" onClick={() => setDlg(null)}>キャンセル</button><button type="button" className="ok" data-testid="store-ok" onClick={ok(() => onPass())}>確定</button></div>
          </>
        ) : dlg.type === 'ticket' ? (
          <>
            <h3>{dlg.t.name} を買いますか?</h3>
            <p>交易石 {dlg.total} を消費して、{dlg.t.name} を {dlg.n} 枚 手に入れます。</p>
            <div className="bl">交易石 {gems} → {gems - dlg.total}</div>
            <div className="bt"><button type="button" aria-label="閉じる" onClick={() => setDlg(null)}>キャンセル</button><button type="button" className="ok" data-testid="store-ok" onClick={ok(() => { onTicket(dlg.t.kind, dlg.n); setCounts({ ...counts, [dlg.t.kind]: 1 }) })}>確定</button></div>
          </>
        ) : dlg.mode === 'buy' ? (
          <>
            <h3>{free ? '盟晶を受け取りますか?' : '盟晶を買いますか?'}</h3>
            <p>{free ? `盟晶 ${dlg.n} 個を、無料で受け取ります(交易石は減りません)。` : `交易石 ${dlg.n} を消費して、盟晶 ${dlg.n} 個に交換します。`}</p>
            <p className="warn">盟晶では、ガチャを直接引けません。ガチャに使うときは、盟晶を交易石に変換(1対1)する必要があります。</p>
            <div className="bl">{!free && <>交易石 {gems} → {gems - dlg.n} ・ </>}盟晶 {crystals} → {crystals + dlg.n}</div>
            <div className="bt"><button type="button" aria-label="閉じる" onClick={() => setDlg(null)}>キャンセル</button><button type="button" className="ok" data-testid="store-ok" onClick={ok(() => { onCrystal('buy', dlg.n); setAmount('') })}>確定</button></div>
          </>
        ) : (
          <>
            <h3>交易石に変換しますか?</h3>
            <p>盟晶 {dlg.n} 個を、交易石 {dlg.n} 個に変換します。</p>
            <p className="warn">変換した交易石は、ガチャや採用券に使えます。</p>
            <div className="bl">盟晶 {crystals} → {crystals - dlg.n} ・ 交易石 {gems} → {gems + dlg.n}</div>
            <div className="bt"><button type="button" aria-label="閉じる" onClick={() => setDlg(null)}>キャンセル</button><button type="button" className="ok" data-testid="store-ok" onClick={ok(() => { onCrystal('back', dlg.n); setAmount('') })}>確定</button></div>
          </>
        )}
      </div>
    </div>
  )

  const passTab = pass && (
    <>
      <div className="sp-eb">MONTHLY PASS</div>
      <h2 className="sp-h">月パス</h2>
      <p className="sp-sub">月パスの間は、ログインボーナスを受け取るたびに、交易石が {pass.dailyGems} 個 追加でもらえます。</p>
      <div className="sp-card pass" data-testid="pass-card">
        <h3>月パス({pass.days}日間)</h3>
        <div className="own">{pass.active ? <>有効期限 <b>{pass.expiresDay}</b>まで(あと <b>{pass.daysLeft}</b>日)</> : '月パスは、まだありません'}</div>
        <p className="nt">
          ・買った日から {pass.days} 日間(買った日を1日目と数えます)。<br />
          ・ログインボーナスを受け取ったときだけ、+{pass.dailyGems} 交易石がもらえます。<br />
          ・受け取らなかった日の分は、あとから受け取れません(ためられません)。<br />
          ・期間の途中で買い足すと、いまの期限の翌日から、さらに {pass.days} 日ぶん伸びます。
        </p>
        <div className="own" style={{ marginBottom: 14 }}>盟晶 所持<b>{crystals}</b>個 / 必要<b>{pass.cost}</b>個</div>
        <button type="button" className="sp-buy" style={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }} data-testid="pass-buy" disabled={busy || crystals < pass.cost} onClick={() => setDlg({ type: 'pass' })}>
          <span>{crystals < pass.cost ? '盟晶が足りません' : pass.active ? '買い足す' : '買う'}<small>盟晶 {pass.cost}</small></span><span className="ar" aria-hidden="true">→</span>
        </button>
        {crystals < pass.cost && <p className="nt" style={{ marginTop: 10 }}>盟晶は「石購入」の「盟晶購入」で手に入ります。</p>}
      </div>
    </>
  )

  const codeTab = (
    <>
      <div className="sp-eb">CODE</div>
      <h2 className="sp-h">合言葉</h2>
      <p className="sp-sub">合言葉を入れると、交易石などを受け取れます。</p>
      <div className="sp-code">
        <label htmlFor="sp-code">合言葉を入力</label>
        <input id="sp-code" className="sp-in" value={code} maxLength={40} placeholder="ここに入力" autoComplete="off" onChange={(e) => onCode(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !busy && code.trim()) onRedeem() }} />
      </div>
      <div className="sp-act">
        <button type="button" className="sp-buy" disabled={busy || !code.trim()} onClick={onRedeem}>
          <span>受け取る</span><span className="ar" aria-hidden="true">→</span>
        </button>
      </div>
    </>
  )

  return (
    <div className="sp" data-testid="store">
      <style>{CSS}</style>
      <div className="sp-bg" aria-hidden="true"><i /><i /><i /></div>
      <div className="sp-bar">
        <div className="sp-row">
          <div className="sp-title"><b>//</b>購買部</div>
          {me && <div className="sp-chip" aria-label="交易石"><IconGem />{me.gems}</div>}
          <button type="button" className="sp-x" onClick={onExit} aria-label="閉じる"><IconClose /></button>
        </div>
        <div className="sp-tabs" role="tablist">
          {TABS.map(({ key, label, Icon }) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} className={`sp-tab${tab === key ? ' on' : ''}`} onClick={() => onTab(key)}><Icon />{label}</button>
          ))}
        </div>
      </div>
      <div className="sp-body">
        <div className="sp-side">
          <Row hi label="交易石" value={me ? me.gems : '-'} />
          <Row label="通常採用券" value={me && me.tickets ? me.tickets.normal : '-'} unit="枚" />
          <Row label="限定採用券" value={me && me.tickets ? me.tickets.limited : '-'} unit="枚" />
          <Row label="盟晶" value={me ? me.crystals || 0 : '-'} unit="個" />
          <Row label="連続ログイン" value={lb ? lb.streak : '-'} unit="日" />
          <Row label="今日の対戦報酬" value={me && me.battle ? `${me.battle.todayCount}/${me.battle.dailyLimit}` : '-'} unit="回" />
          <Row label="ガチャの天井まで" value={me ? Math.max(0, pityCount - (me.pityCount || 0)) : '-'} unit="回" />
        </div>
        <div>
          {msg}
          {!me ? <div className="sp-load">読み込み中…</div> : <div className="sp-pane" key={`${tab}-${stoneTab}`}>{tab === 'bonus' ? bonus : tab === 'stones' ? stones : tab === 'pass' ? passTab : codeTab}</div>}
        </div>
      </div>
      {dialog}
    </div>
  )
}
