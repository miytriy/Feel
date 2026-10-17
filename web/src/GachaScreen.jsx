import { useEffect, useMemo, useRef, useState } from 'react'
import { C, FONT, DISPLAY } from './ui.js'
import { RARITY } from './CodexScreen.jsx'
import { IconClose, IconGem } from './icons.jsx'

const IconCheck = (p) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
)

// ガチャ画面。参考: エンドフィールドの「人材発掘」
//   全画面のバナー: 左上に名前と説明・左下に「排出率・詳細」・右下に「1回ガチャ」「10回ガチャ」 → 引くと結果が一覧で出る(1体ずつ順番に)
// 排出率の数字は、サーバー(server/gacha.js)と同じにしておく(表示だけ。抽選はサーバーがやる)

const RATES = [['legend', '1.5%'], ['gold', '6%'], ['silver', '25%'], ['bronze', '67.5%']]

const CSS = `
.gc { position: fixed; inset: 0; z-index: 20; display: flex; flex-direction: column; color: ${C.ink}; font-family: ${FONT}; overflow: hidden; background: #0a0a0c; animation: gc-fade 0.25s ease-out backwards; }
.gc.leaving { animation: gc-fadeout 0.2s ease-in forwards; }
@keyframes gc-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes gc-fadeout { from { opacity: 1; } to { opacity: 0; } }
@keyframes gc-up { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
@keyframes gc-left { from { opacity: 0; transform: translateX(-50px); } to { opacity: 1; transform: none; } }
@keyframes gc-right { from { opacity: 0; transform: translateX(50px); } to { opacity: 1; transform: none; } }
@keyframes gc-pop { from { opacity: 0; transform: scale(0.8) translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes gc-glow { 0%, 100% { box-shadow: 0 0 10px rgba(232,121,249,0.35); } 50% { box-shadow: 0 0 22px rgba(232,121,249,0.8); } }
@keyframes gc-spin { to { transform: rotate(360deg); } }

/* 背景: 暗い地に、黄色の斜めの帯と大きな文字 */
.gc-bg { position: absolute; inset: 0; pointer-events: none; overflow: hidden;
  background: radial-gradient(ellipse at 72% 38%, #2b2f18 0%, #14150d 40%, #0a0a0c 75%); }
.gc-bg i { position: absolute; background: ${C.player}; transform: skewX(-24deg); opacity: 0.9; }
.gc-bg i:nth-child(1) { right: 12%; top: -10%; width: 7vw; height: 130%; opacity: 0.16; animation: gc-right 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.gc-bg i:nth-child(2) { right: 26%; top: -10%; width: 2.2vw; height: 130%; opacity: 0.5; animation: gc-right 0.9s 0.1s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.gc-bg i:nth-child(3) { right: 3%; top: -10%; width: 14vw; height: 130%; opacity: 0.07; animation: gc-right 0.9s 0.2s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.gc-bg b { position: absolute; right: 4%; top: 18%; font-family: ${DISPLAY}; font-weight: 700; font-size: clamp(90px, 17vw, 280px); line-height: 0.9; letter-spacing: 0.04em; color: rgba(255,255,255,0.05); writing-mode: horizontal-tb; white-space: nowrap; animation: gc-fade 1s ease-out backwards; }
.gc-bg svg { position: absolute; right: 8%; top: 50%; width: min(44vw, 460px); transform: translateY(-50%); opacity: 0.9; animation: gc-pop 0.8s 0.2s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.gc > *:not(.gc-bg) { position: relative; z-index: 1; }
.gc > .gc-res, .gc > .gc-back { position: fixed; z-index: 30; }

.gc-top { display: flex; align-items: center; gap: 14px; padding: 14px 20px 6px; padding-top: calc(14px + env(safe-area-inset-top)); }
.gc-title { font-family: ${DISPLAY}; font-weight: 600; font-size: 18px; letter-spacing: 0.08em; color: ${C.mute}; font-style: italic; }
.gc-title b { color: ${C.ink}; font-style: normal; margin-left: 6px; }
.gc-gems { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; padding: 5px 16px; background: rgba(255,255,255,0.1); font-family: ${DISPLAY}; font-weight: 600; font-size: 17px; }
.gc-gems svg { color: ${C.player}; }
.gc-close { width: 40px; height: 40px; border-radius: 50%; border: 0; background: #f2f2f3; color: #1c1c1f; font-size: 24px; display: grid; place-items: center; cursor: pointer; padding: 0; min-height: 0; transition: background 0.15s, transform 0.15s; }
.gc-close:hover, .gc-close:focus-visible { background: ${C.player}; transform: rotate(90deg); outline: none; }

.gc-main { flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: space-between; padding: 14px 4vw calc(16px + env(safe-area-inset-bottom)) 24px; }
.gc-info { max-width: 460px; animation: gc-left 0.5s 0.1s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.gc-tag { display: inline-block; padding: 2px 10px; background: ${C.player}; color: #111; font-family: ${DISPLAY}; font-weight: 700; font-size: 12px; letter-spacing: 0.12em; }
.gc-name { margin: 8px 0 0; font-family: ${DISPLAY}; font-weight: 700; font-size: clamp(34px, 6vw, 64px); letter-spacing: 0.04em; line-height: 1.1; border-bottom: 4px solid ${C.player}; display: inline-block; padding-right: 24px; }
.gc-lines { margin: 14px 0 0; padding: 0; list-style: none; font-size: 14px; line-height: 1.9; color: #d6d6dc; }
.gc-lines li::before { content: '■'; color: ${C.player}; font-size: 9px; margin-right: 8px; vertical-align: 2px; }
.gc-lines em { font-style: normal; color: ${C.player}; font-weight: 700; }
.gc-bar { margin-top: 14px; width: min(100%, 340px); }
.gc-bar small { display: flex; justify-content: space-between; font-size: 11px; color: ${C.mute}; letter-spacing: 0.06em; }
.gc-bar div { margin-top: 4px; height: 6px; background: rgba(255,255,255,0.12); }
.gc-bar div i { display: block; height: 100%; background: ${C.player}; transition: width 0.5s; }

.gc-bottom { display: flex; align-items: flex-end; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.gc-side { display: flex; gap: 10px; animation: gc-left 0.5s 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.gc-sub { padding: 9px 18px; border: 0; background: rgba(255,255,255,0.12); color: #f1f1f2; font-family: ${FONT}; font-size: 13px; font-weight: 600; cursor: pointer; min-height: 0; transition: background 0.15s, color 0.15s; }
.gc-sub:hover, .gc-sub:focus-visible { background: #f2f2f3; color: #111; outline: none; }
.gc-btns { display: flex; gap: 10px; animation: gc-up 0.5s 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.gc-pull { display: inline-flex; align-items: center; gap: 12px; min-width: 190px; padding: 0 0 0 16px; height: 52px; border: 0; background: #f2f2f3; color: #111; font-family: ${FONT}; font-size: 16px; font-weight: 700; cursor: pointer; transition: transform 0.15s, background 0.15s; clip-path: polygon(12px 0, 100% 0, 100% 100%, 0 100%, 0 12px); }
.gc-pull .n { font-family: ${DISPLAY}; font-weight: 700; font-size: 24px; }
.gc-pull .cost { margin-left: auto; align-self: stretch; display: inline-flex; align-items: center; gap: 6px; padding: 0 16px; background: rgba(0,0,0,0.12); font-family: ${DISPLAY}; font-weight: 600; font-size: 15px; }
.gc-pull.hot { background: ${C.player}; }
.gc-pull span { white-space: nowrap; }
.gc-pull:hover:not(:disabled), .gc-pull:focus-visible { transform: translateY(-3px); outline: none; }
.gc-pull:disabled { background: #3a3a3f; color: #77777e; cursor: default; }
.gc-msg { position: absolute !important; left: 24px; right: 4vw; bottom: 82px; font-size: 13px; font-weight: 700; }

.gc-back { position: fixed; inset: 0; z-index: 30; display: grid; place-items: center; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); animation: gc-fade 0.2s ease-out backwards; }
.gc-modal { width: min(560px, 92vw); max-height: 72vh; display: flex; flex-direction: column; background: #f1f1f2; color: #1c1c1f; animation: gc-pop 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.gc-mhead { position: relative; padding: 14px 52px; text-align: center; font-weight: 700; font-size: 16px; border-bottom: 1px solid #c9c9ce; }
.gc-mhead button { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); width: 32px; height: 32px; border: 0; border-radius: 50%; background: #2a2a2e; color: #fff; font-size: 18px; display: grid; place-items: center; cursor: pointer; padding: 0; min-height: 0; }
.gc-mbody { padding: 18px 24px 22px; overflow-y: auto; font-size: 13.5px; line-height: 1.9; color: #3a3a3e; }
.gc-mbody b { color: #111; }
.gc-rates { width: 100%; border-collapse: collapse; margin: 6px 0 14px; }
.gc-rates td { padding: 7px 4px; border-bottom: 1px solid #d3d3d8; }
.gc-rates td:last-child { text-align: right; font-family: ${DISPLAY}; font-weight: 700; }
.gc-dot { display: inline-block; width: 10px; height: 10px; margin-right: 8px; transform: rotate(45deg); }

.gc-load { position: absolute !important; inset: 0; z-index: 8; display: grid; place-items: center; background: rgba(0,0,0,0.55); animation: gc-fade 0.2s ease-out backwards; }
.gc-load span { width: 46px; height: 46px; border: 4px solid rgba(255,255,255,0.2); border-top-color: ${C.player}; border-radius: 50%; animation: gc-spin 0.8s linear infinite; }
.gc-load p { position: absolute; top: calc(50% + 40px); margin: 0; font-size: 12px; color: #cfcfd5; }
@media (max-width: 899px) {
  .gc-top { padding: 10px 12px 4px; padding-top: calc(10px + env(safe-area-inset-top)); }
  .gc-main { padding: 10px 14px calc(14px + env(safe-area-inset-bottom)); }
  .gc-bg svg { right: -6%; top: 40%; width: 74vw; opacity: 0.35; }
  .gc-bg b { top: 30%; }
  .gc-bottom { flex-direction: column-reverse; align-items: stretch; }
  .gc-btns { width: 100%; }
  .gc-pull { flex: 1; min-width: 0; height: 56px; font-size: 13px; padding-left: 10px; gap: 6px; }
  .gc-pull .n { font-size: 20px; }
  .gc-pull .cost { padding: 0 10px; font-size: 14px; }
  .gc-msg { left: 14px; right: 14px; bottom: 150px; }
}
/* ---------- ガチャ演出(参考: エンドフィールドの人材発掘) ----------
   確認 → 黒い画面に縦の帯が左から順に現れる → 1本ずつ開示(レア度の色) → 報酬一覧(ぼかした背景に、獲得したキャラ) */
@keyframes gk-open { from { opacity: 0; transform: scaleY(0.05); } to { opacity: 1; transform: none; } }
@keyframes gs-in { from { opacity: 0; transform: translateY(40px) scaleY(0.6); } to { opacity: 1; transform: none; } }
@keyframes gs-reveal { 0% { clip-path: inset(100% 0 0 0); filter: brightness(3.2); } 55% { filter: brightness(1.7); } 100% { clip-path: inset(0); filter: none; } }
@keyframes gs-flash { 0% { opacity: 0; } 18% { opacity: var(--fa, 0.5); } 100% { opacity: 0; } }
@keyframes gs-float { from { opacity: 0; transform: translateY(18px) scale(0.9); } to { opacity: 1; transform: none; } }

.gk { position: fixed; inset: 0; z-index: 35; display: grid; place-items: center; background: rgba(0,0,0,0.58); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); animation: gc-fade 0.2s ease-out backwards; }
.gk-band { width: 100%; padding: 24px 16px 26px; background: #f1f1f2; color: #1c1c1f; text-align: center; box-shadow: 0 0 0 1px rgba(0,0,0,0.2), 0 20px 50px rgba(0,0,0,0.5); animation: gk-open 0.28s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.gk-msg { font-size: 15px; font-weight: 700; line-height: 1.6; }
.gk-cost { display: inline-flex; flex-direction: column; align-items: center; gap: 4px; margin: 14px 0 18px; }
.gk-cost > span:first-child { display: grid; place-items: center; width: 60px; height: 60px; background: #1f1f23; color: ${C.player}; font-size: 30px; }
.gk-cost small { font-size: 11px; color: #5c5c63; }
.gk-cost b { color: #1c1c1f; font-family: ${DISPLAY}; }
.gk-btns { display: flex; justify-content: center; gap: 14px; flex-wrap: wrap; }
.gk-btn { display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-width: 190px; height: 44px; padding: 0 18px; border-radius: 999px; border: 2px solid #3a3a3e; background: #3a3a3e; color: #fff; font-family: ${FONT}; font-size: 14px; font-weight: 700; cursor: pointer; min-height: 0; transition: transform 0.15s, filter 0.15s; }
.gk-btn.ok { background: ${C.player}; border-color: #2a2a2e; color: #111; }
.gk-btn:hover, .gk-btn:focus-visible { transform: translateY(-2px); filter: brightness(1.12); outline: none; }

.gs { position: fixed; inset: 0; z-index: 40; background: #000; color: #fff; font-family: ${FONT}; display: flex; flex-direction: column; align-items: center; justify-content: center; animation: gc-fade 0.25s ease-out backwards; overflow: hidden; }
.gs-top { position: absolute; left: 0; right: 0; top: 0; z-index: 4; display: flex; align-items: center; gap: 12px; padding: 12px 16px 8px; padding-top: calc(12px + env(safe-area-inset-top)); }
.gs-count { font-family: ${DISPLAY}; font-weight: 700; font-size: 18px; letter-spacing: 0.1em; }
.gs-count small { color: ${C.mute}; font-size: 13px; margin-left: 6px; }
.gs-pity { padding: 2px 10px; background: #e879f9; color: #111; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; animation: gc-glow 1.6s ease-in-out infinite; }
.gs-x { margin-left: auto; min-height: 0; border: 0; cursor: pointer; transition: background 0.15s, transform 0.15s; }
.gs-x.skip { padding: 8px 20px; border-radius: 999px; background: rgba(255,255,255,0.14); color: #fff; font-family: ${DISPLAY}; font-weight: 700; font-size: 13px; letter-spacing: 0.14em; }
.gs-x.skip:hover, .gs-x.skip:focus-visible { background: #f2f2f3; color: #111; outline: none; }
.gs-x.round { width: 42px; height: 42px; padding: 0; border-radius: 50%; background: #f2f2f3; color: #1c1c1f; font-size: 26px; display: grid; place-items: center; }
.gs-x.round:hover, .gs-x.round:focus-visible { background: ${C.player}; transform: rotate(90deg); outline: none; }

.gs-row { display: flex; gap: 3px; width: min(1120px, 96vw); height: min(72vh, 620px); position: relative; z-index: 2; }
.gs-strip { position: relative; flex: 1; min-width: 0; overflow: hidden; background: #0a0a10; transform-origin: bottom; animation: gs-in 0.42s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; animation-delay: calc(var(--i) * 75ms); }
.gs-strip .bg { position: absolute; inset: 0; background: linear-gradient(180deg, #0a0a10 0%, #0a0a10 38%, color-mix(in srgb, var(--rc) 42%, #0a0a10) 100%); }
.gs-strip .sil { position: absolute; left: 50%; bottom: 0; height: 46%; width: 90%; transform: translateX(-50%); fill: #000; filter: drop-shadow(0 0 6px color-mix(in srgb, var(--rc) 60%, transparent)); }
.gs-strip .art { position: absolute; left: 0; right: 0; top: 0; bottom: 46%; background: linear-gradient(165deg, color-mix(in srgb, var(--rc) 55%, #fff) 0%, var(--rc) 38%, #17171d 100%); animation: gs-reveal 0.6s ease-out backwards; animation-delay: calc(var(--rv) * 1ms); }
.gs-strip .art svg { position: absolute; left: 50%; top: 12%; width: 76%; transform: translateX(-50%); opacity: 0.92; mix-blend-mode: multiply; }
.gs-strip .art .nm { position: absolute; left: 0; right: 0; bottom: 8px; text-align: center; font-size: clamp(11px, 1.5vw, 15px); font-weight: 700; line-height: 1.3; color: #111; padding: 0 3px; text-shadow: 0 0 6px rgba(255,255,255,0.6); writing-mode: vertical-rl; margin: 0 auto; max-height: 62%; overflow: hidden; }
.gs-strip .rl { position: absolute; left: 0; right: 0; bottom: 0; height: 7px; background: var(--rc); }
.gs-strip .new { position: absolute; right: 4px; top: 6px; z-index: 2; padding: 1px 5px; background: var(--c-badge); color: #fff; font-family: ${DISPLAY}; font-weight: 700; font-size: 10px; letter-spacing: 0.08em; animation: gs-reveal 0.4s ease-out backwards; animation-delay: calc(var(--rv) * 1ms); }
.gs-flash { position: absolute; inset: 0; z-index: 3; pointer-events: none; mix-blend-mode: screen; background: radial-gradient(ellipse at 50% 55%, var(--rc) 0%, transparent 62%); animation: gs-flash 1s ease-out backwards; animation-delay: calc(var(--rv) * 1ms); }
.gs-floor { position: absolute; left: 50%; bottom: calc(50% - min(36vh, 310px) - 26px); width: min(1120px, 96vw); height: 34px; transform: translateX(-50%); background: radial-gradient(ellipse at 50% 0%, rgba(150,110,255,0.45) 0%, transparent 70%); z-index: 1; }
.gs-next { position: absolute; z-index: 4; left: 50%; bottom: calc(env(safe-area-inset-bottom) + 18px); transform: translateX(-50%); min-width: 190px; height: 46px; padding: 0 22px; border-radius: 999px; border: 2px solid #2a2a2e; background: ${C.player}; color: #111; font-family: ${FONT}; font-size: 14px; font-weight: 700; cursor: pointer; min-height: 0; animation: gs-float 0.3s ease-out backwards; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
.gs-next:hover, .gs-next:focus-visible { filter: brightness(1.1); outline: none; }
.gs.fast .gs-strip, .gs.fast .art, .gs.fast .gs-flash, .gs.fast .new { animation-duration: 0.01s !important; animation-delay: 0s !important; }

.gl { position: fixed; inset: 0; z-index: 40; display: flex; flex-direction: column; align-items: center; background: rgba(8,8,10,0.74); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); color: #fff; font-family: ${FONT}; animation: gc-fade 0.3s ease-out backwards; }
.gl.leaving { animation: gc-fadeout 0.22s ease-in forwards; }
.gl-head { width: 100%; padding: 18px 0 10px; padding-top: calc(18px + env(safe-area-inset-top)); text-align: center; border-bottom: 1px solid rgba(255,255,255,0.35); font-weight: 700; font-size: 15px; letter-spacing: 0.1em; }
.gl-head svg { display: block; margin: 0 auto 4px; font-size: 26px; }
.gl-body { flex: 1; min-height: 0; width: min(900px, 94vw); overflow-y: auto; padding: 22px 0; scrollbar-width: none; }
.gl-body::-webkit-scrollbar { display: none; }
.gl-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px 10px; }
.gl-item { position: relative; width: 104px; text-align: center; animation: gs-float 0.34s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; animation-delay: calc(var(--i) * 55ms + 120ms); }
.gl-tile { position: relative; aspect-ratio: 1; overflow: hidden; background: linear-gradient(165deg, color-mix(in srgb, var(--rc) 55%, #fff) 0%, var(--rc) 40%, #17171d 100%); box-shadow: 0 3px 8px rgba(0,0,0,0.5); }
.gl-tile svg { position: absolute; inset: 14% 14% 18% 14%; width: 72%; height: 68%; mix-blend-mode: multiply; opacity: 0.92; }
.gl-tile .rl { position: absolute; left: 0; right: 0; bottom: 0; height: 5px; background: var(--rc); }
.gl-tile .ct { position: absolute; right: 4px; bottom: 8px; padding: 0 5px; background: rgba(0,0,0,0.72); font-family: ${DISPLAY}; font-weight: 700; font-size: 13px; }
.gl-tile .new { position: absolute; left: 4px; top: 4px; padding: 0 5px; background: var(--c-badge); font-family: ${DISPLAY}; font-weight: 700; font-size: 10px; letter-spacing: 0.08em; }
.gl-name { margin-top: 6px; font-size: 11px; line-height: 1.35; min-height: 2.7em; color: #e6e6ea; }
.gl-foot { padding: 6px 0 calc(22px + env(safe-area-inset-bottom)); }
.gl-ok { width: 54px; height: 54px; border-radius: 50%; border: 2px solid #2a2a2e; background: #f2f2f3; color: #1c1c1f; font-size: 28px; display: grid; place-items: center; cursor: pointer; padding: 0; min-height: 0; transition: background 0.15s, transform 0.15s; }
.gl-ok:hover, .gl-ok:focus-visible { background: ${C.player}; transform: scale(1.08); outline: none; }
@media (prefers-reduced-motion: reduce) { .gk-band, .gs-strip, .gs .art, .gs-flash, .gl-item { animation: none !important; } }
@media (max-width: 899px) {
  .gs-row { gap: 2px; width: 98vw; height: min(66vh, 560px); }
  .gs-floor { bottom: calc(50% - min(33vh, 280px) - 24px); }
  .gk-btn { min-width: 150px; }
  .gl-item { width: 88px; }
}

`

// 背景の絵: 菱形を組み合わせた、ガチャのマーク
const Mark = () => (
  <svg viewBox="0 0 200 200" aria-hidden="true">
    <g fill="none" stroke={C.player} strokeWidth="1.2" opacity="0.5"><circle cx="100" cy="100" r="92" /><circle cx="100" cy="100" r="70" strokeDasharray="3 6" /></g>
    <path d="M100 14l56 56-56 56-56-56z" fill={C.player} opacity="0.85" />
    <path d="M100 42l30 30-30 30-30-30z" fill="#0a0a0c" />
    <path d="M100 104l42 42-42 42-42-42z" fill="none" stroke="#f2f2f3" strokeWidth="2" opacity="0.8" />
    <rect x="30" y="92" width="16" height="16" fill="#f2f2f3" transform="rotate(45 38 100)" opacity="0.8" />
    <rect x="154" y="92" width="16" height="16" fill="#f2f2f3" transform="rotate(45 162 100)" opacity="0.8" />
  </svg>
)

const IconBox = (p) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true" {...p}><path d="M3 4h18l1 5H2zM3 10h18v10H3zm6 2v2h6v-2z" fillRule="evenodd" /></svg>
)

// ---- 演出に使う部品 ----
const RANK = { legend: 0, gold: 1, silver: 2, bronze: 3 }

function hash(str) {
  let h = 2166136261
  for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) }
  return h >>> 0
}
// キャラの絵(まだ画像がないので、名前から決まる左右対称のブロック模様)
function Emblem({ seed, color = '#111' }) {
  const h = hash(seed)
  const cells = []
  for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) {
    if ((h >> (y * 3 + x)) & 1) { cells.push([x, y]); if (x < 2) cells.push([4 - x, y]) }
  }
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 3l29 29-29 29L3 32z" fill="none" stroke={color} strokeOpacity="0.35" strokeWidth="1" />
      {cells.map(([x, y]) => <rect key={x + '-' + y} x={9 + x * 9.2} y={9 + y * 9.2} width="8" height="8" fill={color} opacity="0.85" />)}
    </svg>
  )
}
// 帯の下に立つ、人のシルエット(3種類)
const FIGURES = [
  <path key="a" d="M20 5a8 8 0 1 1 0 16 8 8 0 0 1 0-16zM9 26h22l3 34h-7l-1 40h-7l-1-30-1 30h-7l-1-40h-7z" />,
  <path key="b" d="M20 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM3 24l17-5 17 5v8H3zM8 32h24l2 28h-6l-1 40h-6l-1-28-1 28h-6l-1-40h-6z" />,
  <path key="c" d="M20 3a10 9 0 1 1 0 18 10 9 0 0 1 0-18zM4 28h32l4 38-11 34H11L0 66z" />,
]
const Silhouette = ({ seed }) => <svg className="sil" viewBox="-2 0 44 100" preserveAspectRatio="xMidYMax meet" aria-hidden="true">{FIGURES[hash(seed) % FIGURES.length]}</svg>

// 結果を、演出用に整える: 各キャラが「初めて出たか(NEW)」・全体の獲得一覧(ダブりは数にまとめる)
function buildShow(results, ownedBefore) {
  const seen = new Set()
  const pulls = results.map((pull) => ({
    pity: !!pull.pity,
    items: pull.characters.map((c) => {
      const isNew = !ownedBefore[c.id] && !seen.has(c.id)
      seen.add(c.id)
      return { ...c, isNew }
    }),
  }))
  const map = new Map()
  for (const pull of pulls) for (const c of pull.items) {
    const e = map.get(c.id) || { ...c, count: 0, isNew: false }
    e.count += 1
    e.isNew = e.isNew || c.isNew
    map.set(c.id, e)
  }
  const list = [...map.values()].sort((a, b) => (RANK[a.rarity] ?? 9) - (RANK[b.rarity] ?? 9) || b.count - a.count || a.name.localeCompare(b.name, 'ja'))
  return { pulls, list }
}
// 帯の開示のタイミング(ms)。左から順に、間隔をあけて。高いレアは、少し間をためる
const revealAt = (items) => {
  let t = items.length * 75 + 380
  return items.map((c) => { const at = t; t += 120 + (c.rarity === 'legend' ? 520 : c.rarity === 'gold' ? 260 : 0); return at })
}

export default function GachaScreen({ me, busy, error, results, cost, pityCount, onPull, onCloseResults, onExit }) {
  const [dialog, setDialog] = useState(null) // 'rates' / null
  const [leaving, setLeaving] = useState(false)
  const [confirm, setConfirm] = useState(0) // 確認ダイアログ(回数。0=出していない)
  const [phase, setPhase] = useState(null) // null / 'wait'(通信中) / 'strips'(帯の演出) / 'list'(報酬一覧)
  const [pi, setPi] = useState(0) // 何回目の演出か(10回ガチャは、1回ずつ順に見せる)
  const [fast, setFast] = useState(false) // SKIP: いまの回を、すぐ最後まで進める
  const [done, setDone] = useState(false) // いまの回の開示が終わった
  const [listLeaving, setListLeaving] = useState(false)
  const timer = useRef(null)
  const ownedBefore = useRef({})
  useEffect(() => () => clearTimeout(timer.current), [])
  const close = () => {
    if (leaving) return
    setLeaving(true)
    timer.current = setTimeout(onExit, 200)
  }
  useEffect(() => {
    if (!dialog && !confirm) return undefined
    const h = (e) => { if (e.key === 'Escape') { setDialog(null); setConfirm(0) } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [dialog, confirm])

  // 引く: 確認 →「確定」でサーバーに送る → 結果が届いたら、演出を始める
  const start = (times) => {
    ownedBefore.current = { ...((me && me.owned) || {}) } // 「NEW」の判定用(引く前の持ち物)
    setConfirm(0)
    setPhase('wait')
    setPi(0); setFast(false); setDone(false)
    onPull(times)
  }
  useEffect(() => {
    if (phase !== 'wait') return
    if (results) setPhase('strips')
    else if (error) setPhase(null) // 失敗したときは、バナーに戻る(エラーはバナーに出る)
  }, [phase, results, error])

  const show = useMemo(() => (results ? buildShow(results, ownedBefore.current) : null), [results])
  const pull = phase === 'strips' && show ? show.pulls[pi] : null
  const at = useMemo(() => (pull ? revealAt(pull.items) : []), [pull])
  // 開示が終わる時刻(最後の帯が開いてから、少し待つ)
  useEffect(() => {
    if (phase !== 'strips' || !pull) return undefined
    setDone(false)
    const total = fast ? 120 : at[at.length - 1] + 700
    const t = setTimeout(() => setDone(true), total)
    return () => clearTimeout(t)
  }, [phase, pi, fast, pull, at])

  const nextPull = () => {
    if (!show) return
    setFast(false)
    if (pi < show.pulls.length - 1) setPi(pi + 1)
    else setPhase('list')
  }
  const finish = () => { // 報酬一覧を閉じる → バナーに戻る
    if (listLeaving) return
    setListLeaving(true)
    timer.current = setTimeout(() => { setListLeaving(false); setPhase(null); onCloseResults() }, 220)
  }

  const gems = me ? me.gems : 0
  const have = me ? me.pityCount || 0 : 0
  const left = Math.max(0, pityCount - have)
  const can1 = !busy && !!me && gems >= cost && !phase
  const can10 = !busy && !!me && gems >= cost * 10 && !phase

  return (
    <div className={`gc theme-dark${leaving ? ' leaving' : ''}`} data-testid="gacha">
      <style>{CSS}</style>
      <div className="gc-bg" aria-hidden="true"><i /><i /><i /><b>SCOUT</b><Mark /></div>
      <div className="gc-top">
        <div className="gc-title">//<b>ガチャ</b></div>
        <div className="gc-gems"><IconGem />{me ? me.gems : '-'}</div>
        <button type="button" className="gc-close" onClick={close} aria-label="閉じる"><IconClose /></button>
      </div>
      <div className="gc-main">
        <div className="gc-info">
          <span className="gc-tag">常設</span>
          <h2 className="gc-name">通常ガチャ</h2>
          <ul className="gc-lines">
            <li>1回で <em>8体</em> のキャラクターが出ます</li>
            <li>8体のうち1体は、<em>シルバー以上</em> 確定</li>
            <li><em>{pityCount}回</em> 以内に、<em>レジェンド</em> 確定(天井)</li>
          </ul>
          <div className="gc-bar" aria-label="天井まで">
            <small><span>天井まで</span><span>あと {left} 回</span></small>
            <div><i style={{ width: `${Math.min(100, (have / pityCount) * 100)}%` }} /></div>
          </div>
        </div>
        {(error || (me && gems < cost && !busy && !phase)) && (
          <div className="gc-msg" style={{ color: error ? C.bad : C.warn }}>{error || 'ジェムが足りません'}</div>
        )}
        <div className="gc-bottom">
          <div className="gc-side">
            <button type="button" className="gc-sub" onClick={() => setDialog('rates')}>排出率・詳細</button>
          </div>
          <div className="gc-btns">
            <button type="button" className="gc-pull" data-testid="pull-1" disabled={!can1} onClick={() => setConfirm(1)}>
              <span><span className="n">1</span> 回ガチャ</span><span className="cost"><IconGem />{cost}</span>
            </button>
            <button type="button" className="gc-pull hot" data-testid="pull-10" disabled={!can10} onClick={() => setConfirm(10)}>
              <span><span className="n">10</span> 回ガチャ</span><span className="cost"><IconGem />{cost * 10}</span>
            </button>
          </div>
        </div>
        {busy && phase !== 'strips' && phase !== 'list' && <div className="gc-load"><span /><p>通信中...(最初の1回は1分ほどかかることがあります)</p></div>}
      </div>

      {dialog === 'rates' && (
        <div className="gc-back" onClick={() => setDialog(null)}>
          <div className="gc-modal" role="dialog" aria-label="排出率・詳細" onClick={(e) => e.stopPropagation()}>
            <div className="gc-mhead">排出率・詳細<button type="button" onClick={() => setDialog(null)} aria-label="閉じる"><IconClose /></button></div>
            <div className="gc-mbody">
              <b>排出率(1体ごと)</b>
              <table className="gc-rates"><tbody>
                {RATES.map(([k, v]) => (
                  <tr key={k}><td><i className="gc-dot" style={{ background: RARITY[k].color }} />{RARITY[k].label}</td><td>{v}</td></tr>
                ))}
              </tbody></table>
              ・1回のガチャで、8体が出ます。<br />
              ・8体のうち最後の1体は、シルバー以上が確定です(レジェンド 1.5% / ゴールド 6% / シルバー 92.5%)。<br />
              ・{pityCount}回目までにレジェンドが出ていないときは、{pityCount}回目で、レジェンドが1体追加されます(天井)。10回ガチャの途中で天井になっても、その回は1回だけです。<br />
              ・1回 {cost} ジェム、10回で {cost * 10} ジェムです。
            </div>
          </div>
        </div>
      )}

      {/* 確認: ぼかした背景に、白い帯がまん中からひらく */}
      {confirm > 0 && (
        <div className="gk" onClick={() => setConfirm(0)}>
          <div className="gk-band" role="dialog" aria-label="ガチャの確認" onClick={(e) => e.stopPropagation()}>
            <div className="gk-msg">「通常ガチャ」 ジェム×{cost * confirm} を消費して、{confirm}回ガチャをしますか?</div>
            <div className="gk-cost"><span><IconGem /></span><small>所持 <b>{gems}</b> → 残り <b>{Math.max(0, gems - cost * confirm)}</b></small></div>
            <div className="gk-btns">
              <button type="button" className="gk-btn" onClick={() => setConfirm(0)}>キャンセル<IconClose /></button>
              <button type="button" className="gk-btn ok" data-testid="pull-ok" onClick={() => start(confirm)}>確定<IconCheck /></button>
            </div>
          </div>
        </div>
      )}

      {/* 演出: 黒い画面に、縦の帯が左から順に現れて、1本ずつ開く */}
      {pull && (
        <div className={`gs${fast ? ' fast' : ''}`} data-testid="gacha-show" role="dialog" aria-label="ガチャの演出">
          <div className="gs-top">
            <span className="gs-count">{pi + 1}<small>/ {show.pulls.length} 回目</small></span>
            {pull.pity && <span className="gs-pity">天井!</span>}
            {done
              ? <button type="button" className="gs-x round" onClick={() => setPhase('list')} aria-label="報酬一覧へ"><IconClose /></button>
              : <button type="button" className="gs-x skip" data-testid="gs-skip" onClick={() => setFast(true)}>SKIP</button>}
          </div>
          <div className="gs-row" key={pi}>
            {pull.items.map((c, i) => (
              <div key={i} className={`gs-strip ${c.rarity}`} style={{ '--rc': RARITY[c.rarity].color, '--i': i, '--rv': at[i], '--fa': c.rarity === 'legend' ? 0.7 : 0.4 }}>
                <div className="bg" />
                <Silhouette seed={c.id + i} />
                <div className="art">
                  <Emblem seed={c.id} />
                  <span className="nm">{c.name}</span>
                </div>
                {c.isNew && <span className="new">NEW</span>}
                <i className="rl" />
                {(c.rarity === 'legend' || c.rarity === 'gold') && <i className="gs-flash" />}
              </div>
            ))}
          </div>
          <div className="gs-floor" aria-hidden="true" />
          {done && <button type="button" className="gs-next" data-testid="gs-next" onClick={nextPull}>{pi < show.pulls.length - 1 ? '次へ' : '報酬一覧へ'}</button>}
        </div>
      )}

      {/* 報酬一覧: ぼかした背景に、獲得したキャラが1つずつ並ぶ */}
      {phase === 'list' && show && (
        <div className={`gl${listLeaving ? ' leaving' : ''}`} data-testid="gacha-list" role="dialog" aria-label="報酬一覧">
          <div className="gl-head"><IconBox />報酬一覧</div>
          <div className="gl-body">
            <div className="gl-grid">
              {show.list.map((c, i) => (
                <div key={c.id} className="gl-item" style={{ '--rc': RARITY[c.rarity].color, '--i': Math.min(i, 24) }}>
                  <div className="gl-tile">
                    <Emblem seed={c.id} />
                    {c.isNew && <span className="new">NEW</span>}
                    {c.count > 1 && <span className="ct">×{c.count}</span>}
                    <i className="rl" />
                  </div>
                  <div className="gl-name">{c.name}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="gl-foot"><button type="button" className="gl-ok" data-testid="gl-ok" onClick={finish} aria-label="確認"><IconCheck /></button></div>
        </div>
      )}
    </div>
  )
}
