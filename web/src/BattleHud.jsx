import { winnerView } from './perspective.js'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { C, FONT, DISPLAY } from './ui.js'
import { CommentaryButton } from './BattleLog.jsx'
import { IconClose } from './icons.jsx'

// 戦闘画面の、上の表示と、重ねて出す部品。参考: エンドフィールドの戦闘画面
//   BattleHud     … 左上: ☰(バトルメニュー。Esc と同じ) / ステージ説明 ・ 中: ステージ名(CPU戦 Lv.) とラウンド ・ 右: 両チームの顔ぶれ(体力・いま動くキャラ)
//   StageIntro    … 「ステージ説明」(対戦の始まりに出る。(i)で、いつでも開ける)
//   ExitConfirm   … 退出の確認
//   ResultBanner  … 勝敗の表示(もう一度・レベルを選ぶ・チームを変える・退出)

const TEAM = { A: C.player, B: C.enemy }

// 画面のいちばん外(body)に出す。固定の上の行・下の操作パネルは、それぞれ重なり順の枠(stacking context)を持つので、
// その中に入れると、ほかの表示の下に隠れてしまう。ステージ説明などは、必ず、いちばん上の層に出す
function Top({ children }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}
// 「Lv.5」のような名前は、もう「Lv.5」と出しているので、くり返さない
const nameOf = (levelInfo) => (levelInfo && levelInfo.name && !/^Lv\.\d+$/.test(levelInfo.name) ? levelInfo.name : '')
const InfoIcon = (p) => <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></svg>

const FXR = `${import.meta.env?.BASE_URL || '/'}fx/result/`
const CSS = `
@keyframes bh-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes bh-pop { from { opacity: 0; transform: translateY(14px) scale(0.96); } to { opacity: 1; transform: none; } }
@keyframes bh-band { from { transform: scaleX(0); } to { transform: none; } }
@keyframes bh-rise { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: none; } }
@keyframes bh-pulse { 0%, 100% { box-shadow: 0 0 0 2px var(--tc), 0 0 6px var(--tc); } 50% { box-shadow: 0 0 0 2px var(--tc), 0 0 16px var(--tc); } }

.bh { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.bh-leave { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 36px; padding: 0; line-height: 1; font-size: 20px; border: 0; background: #f2f2f3; color: #1c1c1f; font-family: ${FONT}; font-weight: 700; cursor: pointer; min-height: 0; transition: background 0.15s; }
.bh-leave:hover, .bh-leave:focus-visible { background: ${C.player}; outline: none; }
.bh-icon { width: 36px; height: 36px; display: grid; place-items: center; border: 0; background: rgba(255,255,255,0.12); color: #fff; font-size: 22px; cursor: pointer; padding: 0; min-height: 0; transition: background 0.15s, color 0.15s; }
.bh-icon:hover, .bh-icon:focus-visible { background: ${C.player}; color: #111; outline: none; }
.bh-auto { position: relative; width: 78px; height: 36px; min-height: 0; padding: 0; display: grid; place-items: center; border: 1px solid rgba(214,206,240,0.8); border-radius: 0; background: rgba(8,8,22,0.4); color: #f4f4f8; cursor: pointer; transition: border-color 0.15s, background 0.15s, color 0.15s; } /* 参考: 細い枠の横長の四角(約2.2:1)。中に細い線の⋈ */
.bh-auto:hover, .bh-auto:focus-visible { background: rgba(255,255,255,0.14); outline: none; }
.bh-auto svg { width: 38px; height: 22px; overflow: visible; }
.bh-auto .ba-base { fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linejoin: miter; stroke-linecap: butt; }
.bh-auto .ba-run { display: none; fill: none; stroke: #fff3a0; stroke-width: 2.2; stroke-linejoin: round; stroke-linecap: round; stroke-dasharray: 14 86; filter: drop-shadow(0 0 2px ${C.player}) drop-shadow(0 0 6px ${C.player}); }
.bh-auto::after { content: ''; display: none; position: absolute; left: 50%; bottom: -4px; width: 5px; height: 5px; margin-left: -2.5px; border-radius: 50%; background: #f6e6ee; box-shadow: 0 0 4px rgba(255,255,255,0.8); } /* 枠の下の中央の小さな点(ONの印) */
.bh-auto[aria-pressed="true"] { color: #e6c35a; border-color: rgba(214,206,240,0.95); }
.bh-auto[aria-pressed="true"]::after { display: block; }
.bh-auto[aria-pressed="true"] .ba-base { filter: drop-shadow(0 0 3px rgba(255,214,90,0.7)); }
.bh-auto[aria-pressed="true"] .ba-run { display: block; animation: bh-run 2.4s linear infinite; }
@keyframes bh-run { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -100; } }
.bh-stage { display: inline-flex; align-items: stretch; background: rgba(0,0,0,0.6); border-left: 4px solid ${C.player}; }
.bh-stage b { padding: 4px 12px; font-family: ${DISPLAY}; font-weight: 700; font-size: 16px; letter-spacing: 0.06em; }
.bh-stage span { padding: 4px 12px; background: rgba(255,255,255,0.12); font-size: 12px; display: grid; place-items: center; letter-spacing: 0.08em; }
.bh-teams { margin-left: auto; display: flex; gap: 14px; align-items: center; }
.bh-team { display: flex; gap: 5px; align-items: flex-end; padding: 0 0 0 8px; border-left: 2px solid var(--tc); }
.bh-p { position: relative; width: 40px; text-align: center; }
.bh-face { position: relative; width: 40px; height: 40px; border-radius: 50%; overflow: hidden; background: linear-gradient(165deg, #3a3a42, #1b1b20); box-shadow: 0 0 0 2px rgba(255,255,255,0.18); }
.bh-face svg { position: absolute; inset: 10%; width: 80%; height: 80%; }
.bh-p.act .bh-face { box-shadow: 0 0 0 2px var(--tc), 0 0 10px var(--tc); animation: bh-pulse 1.4s ease-in-out infinite; }
.bh-p.dead .bh-face { filter: grayscale(1) brightness(0.5); }
.bh-hp { height: 3px; margin-top: 4px; background: rgba(255,255,255,0.16); }
.bh-hp i { display: block; height: 100%; }
.bh.big .bh-p, .bh.big .bh-face { width: 46px; } .bh.big .bh-face { height: 46px; }
@media (max-width: 899px) {
  .bh { gap: 8px; }
  .bh-teams { margin-left: 0; width: 100%; justify-content: space-between; gap: 8px; }
  .bh-team { flex: 1; justify-content: flex-start; }
  .bh-p, .bh-face { width: 32px; } .bh-face { height: 32px; }
  .bh-stage b { font-size: 14px; padding: 3px 8px; } .bh-stage span { font-size: 11px; padding: 3px 8px; }
}

/* バトルメニュー(Esc): 中央にメニュー、下に両チームの顔ぶれ(VS) */
@keyframes pm-in { from { opacity: 0; transform: translateY(-14px); } to { opacity: 1; transform: none; } }
.pm { position: fixed; inset: 0; z-index: 3000; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0; padding: 16px; background: rgba(6,6,9,0.82); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); animation: bh-fade 0.2s ease-out backwards; font-family: ${FONT}; color: #f1f1f2; overflow: auto; }
.pm-in { width: min(420px, 100%); animation: pm-in 0.28s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.pm-title { text-align: center; padding: 14px 0; font-family: ${DISPLAY}; font-weight: 700; font-size: 24px; letter-spacing: 0.14em; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12) 20%, rgba(255,255,255,0.12) 80%, transparent); border-top: 2px solid rgba(255,255,255,0.35); border-bottom: 1px solid rgba(255,255,255,0.18); }
.pm-btns { display: flex; flex-direction: column; gap: 14px; padding: 26px 40px; }
.pm-btn { height: 54px; min-height: 0; border: 2px solid rgba(255,255,255,0.55); background: rgba(255,255,255,0.09); color: #fff; font-family: ${DISPLAY}; font-size: 20px; font-weight: 700; letter-spacing: 0.1em; cursor: pointer; clip-path: polygon(14px 0, 100% 0, calc(100% - 14px) 100%, 0 100%); transition: transform 0.15s, background 0.15s, color 0.15s; will-change: transform; }
.pm-btn:hover, .pm-btn:focus-visible { background: ${C.player}; color: #141414; border-color: ${C.player}; outline: none; transform: translateY(-2px); }
.pm-btn.danger { background: rgba(255,90,54,0.28); border-color: ${C.enemy}; }
.pm-btn.danger:hover, .pm-btn.danger:focus-visible { background: ${C.enemy}; color: #fff; border-color: ${C.enemy}; }
.pm-mode { text-align: center; padding: 10px 0; font-size: 15px; letter-spacing: 0.12em; color: #cfcfd5; background: rgba(255,255,255,0.07); border-top: 1px solid rgba(255,255,255,0.18); border-bottom: 1px solid rgba(255,255,255,0.18); }
.pm-vs { width: min(760px, 100%); margin-top: 26px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: stretch; gap: 14px; animation: pm-in 0.34s 0.05s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.pm-side { padding: 12px 16px; border-top: 3px solid var(--tc); background: linear-gradient(180deg, color-mix(in srgb, var(--tc) 22%, #101014), #101014); min-width: 0; }
.pm-side.r { text-align: right; }
.pm-side b { display: block; font-family: ${DISPLAY}; font-size: 20px; letter-spacing: 0.04em; overflow-wrap: anywhere; }
.pm-side small { display: block; margin-top: 4px; font-size: 12px; line-height: 1.6; color: #b9b9c1; overflow-wrap: anywhere; }
.pm-vsmark { align-self: center; font-family: ${DISPLAY}; font-style: italic; font-weight: 700; font-size: 44px; color: ${C.player}; text-shadow: 0 0 18px rgba(255,230,0,0.45); }
@media (max-width: 899px) { .pm-btns { padding: 20px 18px; } .pm-vs { grid-template-columns: 1fr 1fr; } .pm-vsmark { display: none; } .pm-title { font-size: 20px; } }

.bm { position: fixed; inset: 0; z-index: 3000; display: grid; place-items: center; padding: 16px; background: rgba(0,0,0,0.58); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); animation: bh-fade 0.2s ease-out backwards; }
.bm-win { width: min(860px, 100%); max-height: 86vh; display: flex; flex-direction: column; background: #f1f1f2; color: #1c1c1f; box-shadow: 0 16px 50px rgba(0,0,0,0.6); animation: bh-pop 0.28s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.bm-win.sm { width: min(460px, 100%); }
.bm-head { display: flex; align-items: center; justify-content: center; position: relative; padding: 12px 52px; background: #232326; color: #fff; font-weight: 700; font-size: 16px; letter-spacing: 0.08em; }
.bm-x { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); width: 30px; height: 30px; border: 0; background: none; color: #fff; font-size: 24px; display: grid; place-items: center; cursor: pointer; padding: 0; min-height: 0; }
.bm-x:hover, .bm-x:focus-visible { color: ${C.player}; outline: none; }
.bm-body { padding: 20px 28px 22px; overflow-y: auto; font-size: 14px; line-height: 1.8; color: #3a3a3e; }
.bm-body h4 { display: inline-block; margin: 0 0 8px; padding: 2px 12px; background: #d6d6da; color: #1c1c1f; font-size: 13px; }
.bm-body ul { margin: 6px 0 0; padding-left: 1.2em; }
.bm-body li::marker { color: #b89b00; }
.bm-foot { display: flex; justify-content: center; gap: 12px; padding: 0 20px 22px; flex-wrap: wrap; }
.bm-btn { min-width: 150px; height: 42px; padding: 0 22px; border-radius: 999px; border: 2px solid #3a3a3e; background: #3a3a3e; color: #fff; font-size: 14px; font-weight: 700; font-family: ${FONT}; cursor: pointer; min-height: 0; transition: transform 0.15s, filter 0.15s; }
.bm-btn.ok { background: ${C.player}; color: #111; }
.bm-btn:hover, .bm-btn:focus-visible { transform: translateY(-2px); filter: brightness(1.1); outline: none; }

.br { position: fixed; inset: 0; z-index: 2900; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 20px; color: #fff; font-family: ${FONT}; background: rgba(5,5,7,0.74); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px); animation: bh-fade 0.35s ease-out backwards; }
.br-band { width: 100%; padding: 26px 0 22px; text-align: center; background: linear-gradient(90deg, transparent 0%, rgba(8,8,14,0.7) 20%, rgba(8,8,14,0.7) 80%, transparent 100%); transform-origin: center; animation: bh-band 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.br-title { display: flex; justify-content: center; font-family: ${DISPLAY}; font-weight: 700; font-size: clamp(48px, 12vw, 104px); letter-spacing: 0.1em; line-height: 1.05; }
.br-title i { font-style: normal; display: inline-block; padding: 0 0.02em; color: var(--g2); background: linear-gradient(180deg, var(--g1) 0%, var(--g2) 48%, var(--g3) 52%, var(--g4) 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 3px 0 rgba(0,0,0,0.55)) drop-shadow(0 0 14px var(--gl)); animation: br-letter 0.6s cubic-bezier(0.2, 0.9, 0.3, 1.15) backwards; animation-delay: calc(0.25s + var(--i) * 0.06s); }
.br-sub { margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 12px; font-size: 14px; letter-spacing: 0.3em; color: var(--g1); animation: bh-rise 0.5s 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.br-sub::before, .br-sub::after { content: ''; width: min(22vw, 120px); height: 1px; background: linear-gradient(90deg, transparent, var(--g2)); }
.br-sub::after { transform: scaleX(-1); }
.br-sub b { width: 7px; height: 7px; background: var(--g2); transform: rotate(45deg); }
.br-msg { white-space: pre-line; font-size: 15px; color: ${C.player}; min-height: 1.5em; animation: bh-rise 0.5s 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.br-btns { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; animation: bh-rise 0.5s 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.br { overflow-y: auto; justify-content: flex-start; padding-top: max(20px, 7vh); gap: 14px; }
.br > * { flex: none; }
.br-flash { position: fixed; inset: 0; pointer-events: none; background: radial-gradient(circle at 50% 28%, rgba(255,255,255,0.9) 0%, transparent 55%); opacity: 0; animation: br-flash 0.6s ease-out both; will-change: opacity; }
.br-rays { position: fixed; left: 50%; top: 24%; width: 170vmin; height: 170vmin; margin: -85vmin 0 0 -85vmin; pointer-events: none; background: url(${FXR}glow.webp) center / 100% 100% no-repeat; opacity: 0; animation: br-glow-in 1.1s ease-out 0.1s both, br-breathe 5s ease-in-out 1.2s infinite; will-change: transform, opacity; }
.br.draw .br-rays { background-image: url(${FXR}silver.webp); }
.br-spark { position: fixed; left: 50%; top: 24%; width: 120vmin; height: 120vmin; margin: -60vmin 0 0 -60vmin; pointer-events: none; background: url(${FXR}gold.webp) center / 100% 100% no-repeat; opacity: 0; will-change: transform, opacity; animation: br-spark 4.2s ease-in-out 0.5s infinite both; }
.br-spark.b { width: 90vmin; height: 90vmin; margin: -45vmin 0 0 -45vmin; animation-duration: 5.6s; animation-delay: 1.6s; transform: rotate(40deg); }
.br.win { --g1: #fff6c9; --g2: #ffd45a; --g3: #e39a1c; --g4: #ffe48a; --gl: rgba(255,190,60,0.55); }
.br.lose { --g1: #d7b9bd; --g2: #a44a58; --g3: #6d2733; --g4: #a8707a; --gl: rgba(120,30,50,0.4); }
.br.draw { --g1: #f4f7ff; --g2: #c9d3ea; --g3: #8d9abb; --g4: #d4dcf0; --gl: rgba(160,180,230,0.4); }
.br-band { position: relative; overflow: hidden; }
.br-shine { position: absolute; top: 0; bottom: 0; left: 0; width: 38%; pointer-events: none; background: linear-gradient(100deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%); opacity: 0; transform: translateX(-120%) skewX(-14deg); animation: br-shine 0.9s ease-out 0.55s both; will-change: transform, opacity; }
.br.lose .br-title i { animation-name: br-fall; }
.br-stats { width: min(560px, 100%); display: flex; flex-direction: column; gap: 10px; }
.br-tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.br-tile { padding: 8px 6px 7px; text-align: center; background: rgba(0,0,0,0.55); border-top: 2px solid var(--rc); animation: br-up 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; animation-delay: calc(0.6s + var(--i) * 0.07s); }
.br-tile b { display: block; font-family: ${DISPLAY}; font-size: clamp(18px, 5vw, 26px); line-height: 1.1; font-variant-numeric: tabular-nums; }
.br-tile small { display: block; margin-top: 2px; font-size: 10px; letter-spacing: 0.1em; color: #a9a9b2; }
.br-units { display: flex; flex-direction: column; gap: 5px; padding: 8px 10px; background: rgba(0,0,0,0.45); animation: br-up 0.45s 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.br-urow { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr) 64px; align-items: center; gap: 8px; font-size: 12px; }
.br-urow .nm { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.br-urow .bar { height: 8px; background: rgba(255,255,255,0.1); overflow: hidden; }
.br-urow .bar i { display: block; height: 100%; width: 100%; background: var(--rc); transform: scaleX(var(--w, 1)); transform-origin: left center; animation: br-bar 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; animation-delay: calc(1.05s + var(--i) * 0.09s); will-change: transform; }
.br-urow .v { text-align: right; font-variant-numeric: tabular-nums; color: #cfcfd5; }
.br-urow.mvp .nm { color: #ffe66b; font-weight: 700; }
.br-urow.mvp .nm::before { content: 'MVP '; font-size: 9px; letter-spacing: 0.1em; padding: 1px 4px; margin-right: 5px; background: #ffe66b; color: #111; vertical-align: 1px; }
.br-rows { width: min(560px, 100%); display: flex; flex-direction: column; gap: 6px; animation: br-up 0.45s 1.1s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.br-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 12px; background: rgba(0,0,0,0.55); border-left: 3px solid #6e6e76; font-size: 14px; }
.br-row.ok { border-left-color: ${C.player}; } .br-row.bad { border-left-color: ${C.bad}; } .br-row.pending { border-left-color: #8fb7ff; }
.br-row .k { color: #a9a9b2; font-size: 12px; letter-spacing: 0.08em; white-space: nowrap; }
.br-row .v { font-weight: 700; text-align: right; }
.br-row .up { color: ${C.player}; } .br-row .down { color: ${C.bad}; }
.br-row small { display: block; font-weight: 400; color: #a9a9b2; font-size: 11px; }
.br-dots i { display: inline-block; width: 5px; height: 5px; margin-left: 4px; border-radius: 50%; background: #8fb7ff; animation: br-dot 1s ease-in-out infinite both; }
.br-dots i:nth-child(2) { animation-delay: 0.15s; } .br-dots i:nth-child(3) { animation-delay: 0.3s; }
.br-career { font-size: 11px; color: #8e8e96; text-align: center; animation: br-up 0.45s 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.br-reopen { position: fixed; left: 50%; bottom: max(14px, env(safe-area-inset-bottom)); transform: translateX(-50%); z-index: 2800; min-width: 150px; height: 40px; padding: 0 18px; border: 2px solid #f2f2f3; background: rgba(5,5,7,0.82); color: #f2f2f3; font-size: 13px; font-weight: 700; font-family: ${FONT}; cursor: pointer; clip-path: polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%); animation: bh-fade 0.3s ease-out both; }
.br-reopen:hover, .br-reopen:focus-visible { background: #f2f2f3; color: #111; outline: none; }
@keyframes br-flash { 0% { opacity: 0; } 12% { opacity: 0.85; } 100% { opacity: 0; } }
@keyframes br-glow-in { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: none; } }
@keyframes br-breathe { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.06); opacity: 0.8; } }
@keyframes br-spark { 0%, 100% { opacity: 0; transform: translateY(14px) scale(0.97); } 40%, 60% { opacity: 0.95; } 100% { transform: translateY(-26px) scale(1.03); } }
@keyframes br-shine { 0% { opacity: 0; transform: translateX(-120%) skewX(-14deg); } 15% { opacity: 1; } 100% { opacity: 0; transform: translateX(380%) skewX(-14deg); } }
@keyframes br-zoom { from { opacity: 0; transform: scale(1.5); } to { opacity: 1; transform: none; } }
@keyframes br-letter { from { opacity: 0; transform: translateY(26px) scale(1.5); } to { opacity: 1; transform: none; } }
@keyframes br-fall { from { opacity: 0; transform: translateY(-34px) scale(1.08); } to { opacity: 1; transform: none; } }
@keyframes br-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
@keyframes br-bar { from { transform: scaleX(0); } to { transform: scaleX(var(--w, 1)); } }
@keyframes br-dot { 0%, 100% { opacity: 0.25; transform: scale(0.7); } 50% { opacity: 1; transform: scale(1); } }
@media (max-width: 520px) { .br-tiles { grid-template-columns: repeat(2, 1fr); } .br-urow { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 56px; } }
.br-rays, .br-spark, .br-flash, .br-shine { display: block; }
.br.lose .br-rays, .br.lose .br-spark, .br.lose .br-flash, .br.draw .br-spark, .br.draw .br-flash { display: none; }
.br-btn { min-width: 150px; height: 44px; padding: 0 20px; border: 2px solid #f2f2f3; background: transparent; color: #f2f2f3; font-size: 14px; font-weight: 700; font-family: ${FONT}; cursor: pointer; min-height: 0; clip-path: polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%); transition: background 0.15s, color 0.15s; }
.br-btn.ok { background: ${C.player}; border-color: ${C.player}; color: #111; }
.br-btn:hover, .br-btn:focus-visible { background: #f2f2f3; color: #111; outline: none; }
.br-btn.ok:hover, .br-btn.ok:focus-visible { background: #fff35a; }
@media (prefers-reduced-motion: reduce) { .bh-auto[aria-pressed="true"] .ba-run { animation: none; stroke-dasharray: none; } .bm, .bm-win, .br, .br-band, .br-title, .br-sub, .br-msg, .br-btns, .br-flash, .br-rays, .br-spark, .br-title i, .br-shine, .br-tile, .br-units, .br-rows, .br-career, .br-bar i, .br-urow .bar i, .bh-p.act .bh-face { animation: none !important; } }
`

export function BattleHud({ view, level, levelInfo, desktop, onMenu, onIntro, onCommentary, auto = false, onAuto, stage = null, sub = null }) {
  return (
    <div className={`bh${desktop ? ' big' : ''}`} data-testid="battle-hud">
      <style>{CSS}</style>
      <button type="button" className="bh-leave" data-testid="hud-menu" onClick={onMenu} aria-label="メニュー" title="メニュー(Esc)">☰</button>
      {onIntro && <button type="button" className="bh-icon" data-testid="hud-intro" onClick={onIntro} aria-label="ステージ説明" title="ステージ説明"><InfoIcon /></button>}
      <div className="bh-stage"><b>{stage || `CPU戦 Lv.${level}`}</b><span>{sub ? `${sub} ・ ` : nameOf(levelInfo) ? `${nameOf(levelInfo)} ・ ` : ''}ラウンド {view.round}</span></div>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flex: 'none' }}>
        {onAuto && <button type="button" className="bh-auto" data-testid="hud-auto" aria-pressed={auto} aria-label="オート" title={auto ? 'オート: ON(おすと止まる)' : 'オート: OFF(おすと自分の番も自動で進む)'} onClick={onAuto}>
          {/* ⋈(横に1.5倍)。線は、上の左→中央→上の右→下の右→中央→下の左→もどる、の8の字になる。ONのときは、黄色の光がその線の上を走る */}
          <svg viewBox="0 0 56 32" aria-hidden="true"><path className="ba-base" d="M2 2 L28 16 L54 2 L54 30 L28 16 L2 30 Z" /><path className="ba-run" pathLength="100" d="M2 2 L28 16 L54 2 L54 30 L28 16 L2 30 Z" /></svg>
        </button>}
        {onCommentary && <CommentaryButton onClick={onCommentary} />}
      </div>
    </div>
  )
}

// ステージ説明(対戦の始まりに出る)。説明は、CPUの強さの説明 + 共通のルールの要点
export function StageIntro({ level, levelInfo, cpuChars, onClose, first }) {
  const ok = useRef(null)
  useEffect(() => { if (ok.current) ok.current.focus({ preventScroll: true }) }, [])
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <Top><div className="bm" data-testid="stage-intro" role="dialog" aria-label="ステージ説明" onClick={onClose}>
      <style>{CSS}</style>
      <div className="bm-win" onClick={(e) => e.stopPropagation()}>
        <div className="bm-head">ステージ説明<button type="button" className="bm-x" data-testid="intro-x" onClick={onClose} aria-label="閉じる"><IconClose /></button></div>
        <div className="bm-body">
          <h4>CPU戦 Lv.{level}{nameOf(levelInfo) ? ` ${nameOf(levelInfo)}` : ''}</h4>
          <p style={{ margin: '0 0 10px' }}>{levelInfo ? levelInfo.description : ''}</p>
          <h4>対戦のきまり</h4>
          <ul>
            <li>相手のキャラクターをすべて倒すと、勝ちです。</li>
            <li>入場した最初のターンは、スキルで攻撃できません(【突進】【疾走】は例外)。</li>
            <li>MPはターンごとに最大値が+1され、全回復します。進化にはEPが1必要です。</li>
            <li>{cpuChars === 'real' ? 'CPUは、本実装のキャラで戦います。' : 'CPUは、テスト用のキャラで戦います。'}{level >= 5 ? '' : '(クラスは毎回ランダム)'}</li>
            {levelInfo && levelInfo.rule && <li>{levelInfo.rule}</li>}
          </ul>
        </div>
        <div className="bm-foot"><button ref={ok} type="button" className="bm-btn ok" data-testid="intro-ok" onClick={onClose}>{first ? '対戦開始' : '閉じる'}</button></div>
      </div>
    </div></Top>
  )
}

export function ExitConfirm({ onCancel, onExit, online = false }) {
  return (
    <Top><div className="bm" data-testid="exit-confirm" role="dialog" aria-label="退出の確認" onClick={onCancel}>
      <style>{CSS}</style>
      <div className="bm-win sm" onClick={(e) => e.stopPropagation()}>
        <div className="bm-head">退出</div>
        <div className="bm-body" style={{ textAlign: 'center' }}>{online ? '降参して、退出しますか?' : '対戦をやめて、戻りますか?'}<br /><small style={{ color: '#6e6e76' }}>途中で退出すると、報酬はもらえません。</small></div>
        <div className="bm-foot">
          <button type="button" className="bm-btn" data-testid="exit-cancel" onClick={onCancel}>キャンセル</button>
          <button type="button" className="bm-btn ok" data-testid="exit-ok" onClick={onExit}>退出</button>
        </div>
      </div>
    </div></Top>
  )
}

// バトルメニュー(Esc で開く・ポーズ)。リタイア / 設定 / バトルへ戻る と、両チームの顔ぶれ。
// 「バトルへ戻る」は aria-label="戻る"(Esc・Backspace がこれを押す)
export function BattleMenu({ mode = '', me = {}, foe = {}, onResume, onRetire, onSettings = null, online = false }) {
  const resume = useRef(null)
  useEffect(() => { resume.current?.focus() }, [])
  const side = (t, c, r) => (
    <div className={`pm-side${r ? ' r' : ''}`} style={{ '--tc': c }}>
      <b>{t.name}</b>
      {t.sub && <small>{t.sub}</small>}
      <small>{(t.units || []).join(' ・ ')}</small>
    </div>
  )
  return (
    <Top><div className="pm" data-testid="battle-menu" role="dialog" aria-label="バトルメニュー">
      <style>{CSS}</style>
      <div className="pm-in">
        <div className="pm-title">バトルメニュー</div>
        <div className="pm-btns">
          <button type="button" className="pm-btn danger" data-testid="menu-retire" onClick={onRetire}>{online ? '降参' : 'リタイア'}</button>
          {onSettings && <button type="button" className="pm-btn" data-testid="menu-settings" onClick={onSettings}>設定</button>}
          <button type="button" className="pm-btn" data-testid="menu-resume" ref={resume} aria-label="戻る" onClick={onResume}>バトルへ戻る</button>
        </div>
        {mode && <div className="pm-mode">{mode}</div>}
      </div>
      <div className="pm-vs">
        {side(me, C.player, false)}
        <div className="pm-vsmark" aria-hidden="true">VS</div>
        {side(foe, C.enemy, true)}
      </div>
    </div></Top>
  )
}

// 勝敗の表示。buttons: [{ label, onClick, primary }]。「盤面を見る」は onDismiss
const nf = (n) => Math.round(n).toLocaleString('ja-JP')
// rows: [{ key, label, state: 'ok' | 'pending' | 'bad' | 'none', value, sub, delta }]
export function ResultBanner({ winner, message, buttons, onDismiss, match = null, me = 'A', rows = [], career = '' }) {
  winner = winnerView(winner)
  const win = winner === 'A'
  const kind = win ? 'win' : winner === 'B' ? 'lose' : 'draw'
  const rc = win ? C.player : winner === 'B' ? C.enemy : '#cfcfd5'
  const word = win ? 'VICTORY' : winner === 'B' ? 'DEFEAT' : 'DRAW'
  const foe = me === 'A' ? 'B' : 'A'
  const mine = match ? (match.units || []).filter((u) => u.team === me).slice(0, 5) : []
  const top = mine.length ? Math.max(1, mine[0].dealt) : 1
  return (
    <Top><div className={`br ${kind}`} data-testid="result-banner" role="dialog" aria-label="結果" style={{ '--rc': rc }}>
      <style>{CSS}</style>
      <span className="br-flash" aria-hidden="true" />
      <span className="br-rays" aria-hidden="true" />
      <span className="br-spark" aria-hidden="true" />
      <span className="br-spark b" aria-hidden="true" />
      <div className="br-band">
        <div className="br-title" aria-label={word}>{[...word].map((ch, n) => <i key={n} aria-hidden="true" style={{ '--i': n }}>{ch}</i>)}</div>
        <div className="br-sub"><b />{win ? '勝利' : winner === 'B' ? '敗北' : '引き分け'}<b /></div>
        <span className="br-shine" aria-hidden="true" />
      </div>
      {match && (
        <div className="br-stats" data-testid="result-stats">
          <div className="br-tiles">
            {[['ラウンド', match.rounds], ['与えたダメージ', nf(match.totals[me])], ['受けたダメージ', nf(match.totals[foe])], ['回復', nf(match.heal[me])]].map(([k, v], n) => (
              <div className="br-tile" key={k} style={{ '--i': n }}><b>{v}</b><small>{k}</small></div>
            ))}
          </div>
          {mine.some((u) => u.dealt > 0) && (
            <div className="br-units">
              {mine.map((u, n) => (
                <div className={`br-urow${n === 0 && u.dealt > 0 ? ' mvp' : ''}`} key={u.name} style={{ '--i': n }}>
                  <span className="nm">{u.name}</span>
                  <span className="bar"><i style={{ '--w': Math.max(0.03, u.dealt / top) }} /></span>
                  <span className="v">{nf(u.dealt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {(rows.length > 0 || message) && (
        <div className="br-rows" data-testid="result-rows">
          {rows.map((r) => (
            <div className={`br-row ${r.state || 'none'}`} key={r.key}>
              <span className="k">{r.label}</span>
              <span className="v">
                {r.state === 'pending' ? <span className="br-dots" aria-label="計算中"><i /><i /><i /></span> : (<>
                  {r.delta != null ? <span className={r.delta >= 0 ? 'up' : 'down'}>{r.delta >= 0 ? '+' : ''}{r.delta}</span> : null}{r.delta != null && r.value ? ' ' : ''}{r.value}
                </>)}
                {r.sub && r.state !== 'pending' && <small>{r.sub}</small>}
              </span>
            </div>
          ))}
          {rows.length === 0 && message && <div className="br-row none"><span className="v">{message}</span></div>}
        </div>
      )}
      {career && <div className="br-career">{career}</div>}
      <div className="br-btns">
        {buttons.map((b) => <button key={b.label} type="button" className={`br-btn${b.primary ? ' ok' : ''}`} onClick={b.onClick}>{b.label}</button>)}
        {onDismiss && <button type="button" className="br-btn" data-testid="result-dismiss" onClick={onDismiss}>盤面を見る</button>}
      </div>
    </div></Top>
  )
}

// 「盤面を見る」で結果をしまったあと、もう一度結果(とボタン)を出すための小さなボタン
export function ResultReopen({ onClick }) {
  return <button type="button" className="br-reopen" data-testid="result-reopen" onClick={onClick}>結果を表示<style>{CSS}</style></button>
}
