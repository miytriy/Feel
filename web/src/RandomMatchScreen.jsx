import { useEffect, useRef, useState } from 'react'
import { C, FONT, DISPLAY, useIsDesktop, useRemembered } from './ui.js'
import { ScreenHeader } from './chrome.jsx'
import { Emblem } from './emblem.jsx'
import { tone } from './FormationScreen.jsx'
import BattleScreen from './BattleScreen.jsx'
import { MatchedOverlay } from './PvpScreen.jsx'
import RotationMark from './RotationMark.jsx'
import UnlimitedMark from './UnlimitedMark.jsx'
import InfinityMark from './InfinityMark.jsx'
import { createPvpClient } from './pvp.js'
import { fetchRank, getAllCharsToken } from './api.js'
import { rankOf, emptyRank, TIERS, DIVS, matchWindow } from './battle/rank.js'

// ランダムマッチ画面。左: モード(ランクマッチ / カジュアルマッチ) / 中: 説明・ルール・使用デッキ / 右: 段位・BP・バトルボタン。
// 「バトル」を押すと、待ち行列に入り、相手が見つかったら、対戦が始まる。ランクは、近い BP の相手と組まれ、終わると BP が増減する。
// カジュアルは、BP に影響せず、ログインしていなくても(匿名プレイヤーとして)遊べる。
// 動かすのは transform / opacity だけ(web/EFFECTS.md)

// 段位のバッジ(自前の図形): 宝石(段位ごとに、色とカットがちがう)と、金の飾り枠。とげの数は、上の段位ほど多い。
// 下の小さなひし形が、段階の数(3段階 = 1つ、1段階 = 3つ)
const GEM_CX = 100, GEM_CY = 104
const spikePath = (n, r1, r2) => {
  const pts = []
  for (let i = 0; i < n; i++) {
    const a = (-90 + (360 / n) * i) * (Math.PI / 180), w = (Math.PI / n) * 0.42
    pts.push([GEM_CX + Math.cos(a - w) * r1, GEM_CY + Math.sin(a - w) * r1], [GEM_CX + Math.cos(a) * r2, GEM_CY + Math.sin(a) * r2], [GEM_CX + Math.cos(a + w) * r1, GEM_CY + Math.sin(a + w) * r1])
  }
  return pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ') + ' Z'
}
function Gem({ k, fill }) {
  const line = { stroke: '#fff', strokeOpacity: 0.4, strokeWidth: 1.6, fill: 'none', strokeLinejoin: 'round' }
  const cx = GEM_CX, cy = GEM_CY
  if (k === 'emerald') { // 長方形に近い八角形(ステップカット)
    return (<g>
      <polygon points="66,62 134,62 156,84 156,126 134,148 66,148 44,126 44,84" fill={fill} />
      <polygon points="76,74 124,74 142,90 142,120 124,136 76,136 58,120 58,90" {...line} />
      <polygon points="88,86 112,86 124,96 124,114 112,124 88,124 76,114 76,96" {...line} />
      <path d="M66 62 L76 74 M134 62 L124 74 M156 84 L142 90 M156 126 L142 120 M134 148 L124 136 M66 148 L76 136 M44 126 L58 120 M44 84 L58 90" {...line} />
    </g>)
  }
  if (k === 'topaz') { // たて長の楕円(オーバルカット)
    return (<g>
      <ellipse cx={cx} cy={cy} rx="46" ry="62" fill={fill} />
      <ellipse cx={cx} cy={cy} rx="30" ry="42" {...line} />
      <path d={`M${cx} ${cy - 62} L${cx} ${cy - 42} M${cx} ${cy + 62} L${cx} ${cy + 42} M${cx - 46} ${cy} L${cx - 30} ${cy} M${cx + 46} ${cy} L${cx + 30} ${cy} M${cx - 33} ${cy - 44} L${cx - 21} ${cy - 30} M${cx + 33} ${cy - 44} L${cx + 21} ${cy - 30} M${cx - 33} ${cy + 44} L${cx - 21} ${cy + 30} M${cx + 33} ${cy + 44} L${cx + 21} ${cy + 30}`} {...line} />
    </g>)
  }
  if (k === 'ruby') { // ひし形(ダイヤカット)
    return (<g>
      <polygon points={`${cx},38 ${cx + 58},${cy} ${cx},170 ${cx - 58},${cy}`} fill={fill} />
      <polygon points={`${cx},58 ${cx + 38},${cy} ${cx},150 ${cx - 38},${cy}`} {...line} />
      <path d={`M${cx} 38 L${cx} 58 M${cx + 58} ${cy} L${cx + 38} ${cy} M${cx} 170 L${cx} 150 M${cx - 58} ${cy} L${cx - 38} ${cy} M${cx - 38} ${cy} L${cx + 38} ${cy} M${cx} 58 L${cx} 150`} {...line} />
    </g>)
  }
  if (k === 'sapphire') { // 丸(ラウンドブリリアント)
    return (<g>
      <circle cx={cx} cy={cy} r="58" fill={fill} />
      <circle cx={cx} cy={cy} r="38" {...line} />
      <circle cx={cx} cy={cy} r="16" {...line} />
      <path d={Array.from({ length: 8 }).map((_, i) => { const a = (i * 45 + 22.5) * Math.PI / 180; return `M${(cx + Math.cos(a) * 16).toFixed(1)} ${(cy + Math.sin(a) * 16).toFixed(1)} L${(cx + Math.cos(a) * 58).toFixed(1)} ${(cy + Math.sin(a) * 58).toFixed(1)}` }).join(' ')} {...line} />
    </g>)
  }
  // diamond: ブリリアントカット(上が平らで、下がとがる)
  return (<g>
    <polygon points={`${cx - 42},56 ${cx + 42},56 ${cx + 68},${cy - 4} ${cx},172 ${cx - 68},${cy - 4}`} fill={fill} />
    <polygon points={`${cx - 42},56 ${cx + 42},56 ${cx + 68},${cy - 4} ${cx - 68},${cy - 4}`} fill="#fff" fillOpacity="0.14" />
    <path d={`M${cx - 68} ${cy - 4} L${cx + 68} ${cy - 4} M${cx - 42} 56 L${cx - 24} ${cy - 4} L${cx} 56 L${cx + 24} ${cy - 4} L${cx + 42} 56 M${cx - 24} ${cy - 4} L${cx} 172 L${cx + 24} ${cy - 4} M${cx - 68} ${cy - 4} L${cx - 24} ${cy - 4} M${cx + 68} ${cy - 4} L${cx + 24} ${cy - 4}`} {...line} />
  </g>)
}

export function RankBadge({ rank, size = 200 }) {
  const col = rank.tier.color
  const key = rank.tier.key
  const pips = DIVS + 1 - rank.div // 1〜3
  const id = `rb-${key}`
  const spikes = 4 + rank.tierIdx * 1 // エメラルド4 … ダイヤモンド8
  return (
    <svg viewBox="0 0 200 220" width={size} height={size * 1.1} role="img" aria-label={rank.label} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff1b0" /><stop offset="0.5" stopColor="#e2b93e" /><stop offset="1" stopColor="#8a6a14" /></linearGradient>
        <linearGradient id={`${id}-g`} x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0.85" /><stop offset="0.35" stopColor={col} /><stop offset="1" stopColor="#000" stopOpacity="0.55" /></linearGradient>
      </defs>
      <path d={spikePath(spikes, 80, 100)} fill={`url(#${id}-gold)`} stroke="#5a430a" strokeOpacity=".5" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx={GEM_CX} cy={GEM_CY} r="80" fill="#15131a" stroke={`url(#${id}-gold)`} strokeWidth="6" />
      <circle cx={GEM_CX} cy={GEM_CY} r="72" fill="none" stroke="#fff" strokeOpacity=".18" strokeWidth="1.5" />
      <Gem k={key} fill={`url(#${id}-g)`} />
      <ellipse cx="82" cy="78" rx="14" ry="7" fill="#fff" fillOpacity=".5" transform="rotate(-35 82 78)" />
      {key === 'diamond' && <path d="M150 58 L153 68 L163 71 L153 74 L150 84 L147 74 L137 71 L147 68 Z" fill="#fff" fillOpacity=".95" />}
      {Array.from({ length: pips }).map((_, i) => {
        const x = 100 + (i - (pips - 1) / 2) * 22
        return <polygon key={i} points={`${x},196 ${x + 8},204 ${x},212 ${x - 8},204`} fill={`url(#${id}-gold)`} stroke="#5a430a" strokeOpacity=".6" strokeWidth="1" />
      })}
    </svg>
  )
}

const CSS = `
.rk { position: fixed; inset: 0; z-index: 20; overflow-y: auto; background: #07070a; color: ${C.ink}; font-family: ${FONT}; animation: rk-fade .25s ease-out backwards; }
.rk button { font-family: ${FONT}; }
@keyframes rk-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes rk-up { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: none } }
@keyframes rk-right { from { opacity: 0; transform: translateX(30px) } to { opacity: 1; transform: none } }
@keyframes rk-left { from { opacity: 0; transform: translateX(-30px) } to { opacity: 1; transform: none } }
@keyframes rk-ring { 0% { transform: scale(.4); opacity: .7 } 100% { transform: scale(1.5); opacity: 0 } }
@keyframes rk-glow { 0%, 100% { opacity: .5; transform: scale(1) } 50% { opacity: 1; transform: scale(1.08) } }
@keyframes rk-spin { to { transform: rotate(360deg) } }
.rk-bg { position: fixed; inset: 0; pointer-events: none; background: radial-gradient(ellipse at 72% 38%, #3a3220 0%, #17151a 46%, #08080b 80%), #08080b; }
.rk-bg i { position: absolute; top: -10%; height: 130%; background: #e8c800; transform: skewX(-24deg); }
.rk-bg i:nth-child(1) { right: 4%; width: 140px; opacity: .06 } .rk-bg i:nth-child(2) { right: 13%; width: 22px; opacity: .22 }
.rk-wrap { position: relative; max-width: 1180px; margin: 0 auto; padding: 16px 14px calc(30px + env(safe-area-inset-bottom)); display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); }
@media (min-width: 900px) { .rk-wrap { grid-template-columns: 190px minmax(0, 1fr) 340px; gap: 22px; padding: 30px 28px; align-items: stretch } }
.rk-rail { display: flex; gap: 10px; animation: rk-left .35s ease-out backwards }
@media (min-width: 900px) { .rk-rail { flex-direction: column; align-self: start } .rk-mode { flex: none !important; min-height: 130px !important } }
@media (max-width: 899px) { .rk-right { order: 1 } .rk-mid { order: 2 } }
.rk-mode { flex: 1; position: relative; display: grid; place-items: center; gap: 6px; padding: 16px 10px; border-radius: 12px; border: 1px solid ${C.line}; background: #111114; color: ${C.mute}; font-weight: 800; font-size: 14px; cursor: pointer; text-align: center; min-height: 64px }
.rk-mode.on { background: linear-gradient(180deg, #f1d24a, #a8860f); color: #1b1500; border-color: #ffe27a; cursor: default }
.rk-mode:hover:not(.on) { border-color: ${C.player}; color: ${C.ink} }
.rk-mode svg { width: 44px; height: 44px }
.rk-mid { display: flex; flex-direction: column; gap: 14px; min-width: 0; animation: rk-up .4s .05s ease-out backwards }
.rk-title { display: flex; align-items: center; gap: 12px; font-family: ${DISPLAY}; font-weight: 700; font-size: 26px; letter-spacing: .08em; color: #f6e7a8 }
.rk-title::after { content: ''; flex: 1; height: 2px; background: linear-gradient(90deg, #a8860f, transparent) }
.rk-desc { margin: 0; font-size: 14px; line-height: 1.6; color: #d8d3c0 }
.rk-rules { display: grid; gap: 8px; max-width: 360px }
.rk-rule { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-radius: 8px; font-weight: 800; font-size: 15px; border: 1px solid transparent }
.rk-rule.on { background: linear-gradient(90deg, #1f4d9a, #153269); border-color: #4d86e0; color: #fff }
.rk-rule.off { background: #1b1814; border-color: #3a3328; color: ${C.mute}; opacity: .8 }
.rk-rule .dot { width: 22px; height: 22px; border-radius: 50%; border: 2px solid #8fb4ff; background: #0b0b0e }
.rk-rule.on .dot { background: #32d2ff; box-shadow: none; border-color: #fff }
.rk-rule small { font-size: 11px; font-weight: 700; color: ${C.mute} }
.rk-deck { padding: 14px; border-radius: 12px; background: #111114; border: 1px solid ${C.line}; display: grid; gap: 12px }
.rk-deck h3 { margin: 0; font-size: 13px; color: #f6e7a8; letter-spacing: .08em; display: flex; align-items: center; justify-content: space-between }
.rk-units { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px }
.rk-unit { flex: 0 0 74px; --rc: #888 }
.rk-unit .fig { position: relative; width: 74px; height: 80px; background: linear-gradient(170deg, color-mix(in srgb, var(--rc) 55%, #fff) 0%, var(--rc) 42%, #14141a 100%); clip-path: polygon(10% 0, 100% 0, 90% 100%, 0 100%) }
.rk-unit .fig svg, .rk-unit .fig img.art { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover }
.rk-unit .n { font-size: 10px; font-weight: 700; line-height: 1.25; margin-top: 4px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical }
.rk-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 40px; padding: 0 20px; border-radius: 999px; border: 1.5px solid #7fb4ff; background: #12233f; color: #fff; font-weight: 800; font-size: 14px; cursor: pointer }
.rk-btn:hover { background: #1a3560 }
.rk-right { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 18px 16px; border-radius: 16px; background: linear-gradient(180deg, rgba(60,50,25,.55), rgba(18,16,14,.92)); border: 1px solid #6d5a1a; animation: rk-right .4s .1s ease-out backwards; position: relative; overflow: hidden }
.rk-badge { position: relative; display: grid; place-items: center; margin-top: 6px }
.rk-badge::before { content: ''; position: absolute; inset: -10%; border-radius: 50%; background: radial-gradient(circle, var(--tc) 0%, transparent 62%); opacity: .5; animation: rk-glow 3.2s ease-in-out infinite }
.rk-badge svg { position: relative }
.rk-rank { font-family: ${DISPLAY}; font-weight: 700; font-size: 34px; text-align: center; line-height: 1.1; background: linear-gradient(180deg, #fff, var(--tc)); -webkit-background-clip: text; background-clip: text; color: transparent }
.rk-bp { width: 100%; display: grid; gap: 6px }
.rk-bp .row { display: flex; align-items: baseline; justify-content: space-between; font-family: ${DISPLAY}; font-weight: 700 }
.rk-bp .row b { font-size: 26px; color: #fff }
.rk-bar { height: 10px; border-radius: 5px; background: #0b0f1a; border: 1px solid #243455; overflow: hidden }
.rk-bar i { display: block; height: 100%; width: 100%; transform-origin: left; background: linear-gradient(90deg, #2b8cff, #6fe0ff) }
.rk-next { text-align: right; font-size: 12px; color: ${C.mute} }
.rk-rec { display: flex; justify-content: space-between; width: 100%; font-size: 13px; color: #d8d3c0 }
.rk-rec b { color: #fff; font-family: ${DISPLAY}; font-size: 18px }
.rk-chip { display: inline-flex; align-items: center; gap: 8px; padding: 4px 16px 4px 8px; border-radius: 999px; border: 1.5px solid #4d86e0; background: #11224a; color: #fff; font-weight: 800; font-size: 13px; margin-top: 4px }
.rk-battle { position: relative; width: 148px; height: 148px; margin-top: 6px; border-radius: 50%; border: 3px solid #d8b85a; background: radial-gradient(circle at 50% 35%, #4aa8ff, #1553c4 60%, #0a2a6e); color: #fff; font-family: ${DISPLAY}; font-weight: 700; font-size: 30px; letter-spacing: .1em; cursor: pointer; display: grid; place-items: center }
.rk-battle::before { content: ''; position: absolute; inset: -6px; border-radius: 50%; border: 2px solid #7fd0ff; animation: rk-ring 2.2s ease-out infinite }
.rk-battle:hover:not(:disabled) { transform: scale(1.04) }
.rk-battle:disabled { filter: grayscale(.7); cursor: default } .rk-battle:disabled::before { display: none }
.rk-err { padding: 10px 12px; border-radius: 10px; background: rgba(224,67,31,.14); border: 1px solid ${C.enemy}; color: #ffb4a0; font-size: 13px; line-height: 1.5 }
.rk-search { position: fixed; inset: 0; z-index: 300; display: grid; place-items: center; background: rgba(5,5,8,.94) }
.rk-search .box { text-align: center; padding: 20px; max-width: 360px }
.rk-radar { position: relative; width: 150px; height: 150px; margin: 0 auto 14px }
.rk-radar i { position: absolute; inset: 0; border-radius: 50%; border: 2px solid #6fe0ff; animation: rk-ring 2.4s ease-out infinite }
.rk-radar i:nth-child(2) { animation-delay: .8s } .rk-radar i:nth-child(3) { animation-delay: 1.6s }
.rk-radar u { position: absolute; inset: 54px; border-radius: 50%; background: #6fe0ff }
.rk-time { font-family: ${DISPLAY}; font-size: 42px; font-weight: 700; margin: 6px 0 }
/* ---- 動き(すべて transform / opacity だけ) ---- */
.rk-bg i { will-change: transform, opacity; animation: rk-beam 9s ease-in-out infinite alternate }
.rk-bg i:nth-child(2) { animation-duration: 6.5s; animation-delay: -2s }
@keyframes rk-beam { from { transform: skewX(-24deg) translateX(-40px) } to { transform: skewX(-24deg) translateX(60px) } }
.rk-glow { position: absolute; border-radius: 50%; will-change: transform, opacity; background: radial-gradient(circle, rgba(255,214,90,.34) 0%, rgba(255,214,90,0) 66%) }
.rk-glow.g1 { width: 760px; height: 760px; right: -160px; top: 4%; animation: rk-drift 14s ease-in-out infinite alternate }
.rk-glow.g2 { width: 560px; height: 560px; left: -200px; bottom: -120px; background: radial-gradient(circle, rgba(70,150,255,.26) 0%, rgba(70,150,255,0) 66%); animation: rk-drift 18s -6s ease-in-out infinite alternate-reverse }
@keyframes rk-drift { from { transform: translate(0, 0) scale(1); opacity: .65 } to { transform: translate(-60px, 40px) scale(1.18); opacity: 1 } }
.rk-mote { position: absolute; bottom: -12px; width: 5px; height: 5px; border-radius: 50%; background: #ffe58a; box-shadow: 0 0 0 0 transparent; opacity: 0; will-change: transform, opacity; animation: rk-rise var(--d, 9s) var(--dl, 0s) linear infinite }
.rk-mote.b { background: #8fd4ff }
@keyframes rk-rise { 0% { transform: translate3d(0, 0, 0) scale(.6); opacity: 0 } 12% { opacity: .9 } 70% { opacity: .6 } 100% { transform: translate3d(var(--dx, 30px), -105vh, 0) scale(1.3); opacity: 0 } }
@media (max-width: 899px) { .rk-mote:nth-child(n+9) { display: none } }

/* 入場: 順番にすべり込む */
@keyframes rk-pop { from { opacity: 0; transform: scale(.6) rotate(-8deg) } 60% { opacity: 1; transform: scale(1.07) rotate(1.5deg) } to { opacity: 1; transform: none } }
@keyframes rk-grow { from { transform: scaleX(0) } }
@keyframes rk-fill { from { transform: scaleX(0) } }
@keyframes rk-tick { from { opacity: .5; transform: scale(1.18) } to { opacity: 1; transform: scale(1) } }
.rk-in { animation: rk-up .5s var(--i, 0ms) cubic-bezier(.2, .8, .2, 1) backwards }
.rk-rail .rk-mode:nth-child(2) { animation: rk-left .4s .08s ease-out backwards }
.rk-title::after { transform-origin: left; animation: rk-grow .8s .25s cubic-bezier(.2, .8, .2, 1) backwards }
.rk-right { animation: rk-right .5s .12s cubic-bezier(.2, .8, .2, 1) backwards }
.rk-badge > svg, .rk-badge > .rk-clip { animation: rk-pop .8s .3s cubic-bezier(.2, 1.3, .4, 1) backwards }
.rk-badge > svg { will-change: transform }
.rk-float { animation: rk-bob 4.2s ease-in-out infinite; will-change: transform }
@keyframes rk-bob { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-7px) } }
.rk-rank { animation: rk-up .5s .55s ease-out backwards }
.rk-bp { animation: rk-up .5s .65s ease-out backwards }
.rk-bar i { animation: rk-fill 1.1s .8s cubic-bezier(.2, .8, .2, 1) backwards }
.rk-rec { animation: rk-up .5s .8s ease-out backwards }
.rk-chip { animation: rk-up .5s .9s ease-out backwards }

/* バッジの光: 斜めの光がゆっくり横切る + きらめき */
.rk-clip { position: absolute; inset: 15% 14%; border-radius: 50%; overflow: hidden; pointer-events: none }
.rk-clip::after { content: ''; position: absolute; top: -10%; bottom: -10%; left: 0; width: 38%; background: linear-gradient(105deg, rgba(255,255,255,0), rgba(255,255,255,.55), rgba(255,255,255,0)); transform: translateX(-160%) skewX(-18deg); animation: rk-sweep 4.6s 1.4s ease-in-out infinite; will-change: transform }
@keyframes rk-sweep { 0% { transform: translateX(-160%) skewX(-18deg) } 38%, 100% { transform: translateX(380%) skewX(-18deg) } }
.rk-spark { position: absolute; width: 16px; height: 16px; background: #fff; clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%); opacity: 0; will-change: transform, opacity; animation: rk-twinkle 2.8s var(--dl, 0s) ease-in-out infinite }
@keyframes rk-twinkle { 0%, 70%, 100% { opacity: 0; transform: scale(.2) rotate(0) } 82% { opacity: 1; transform: scale(1) rotate(45deg) } }

/* モードボタン: 選んでいるものは光が走る。さわると浮く */
.rk-mode { overflow: hidden; transition: transform .18s ease-out }
.rk-mode:hover:not(.on):not(:disabled) { transform: translateY(-3px) }
.rk-mode:active:not(:disabled) { transform: scale(.97) }
.rk-mode.on::after { content: ''; position: absolute; top: 0; bottom: 0; left: 0; width: 45%; pointer-events: none; background: linear-gradient(105deg, rgba(255,255,255,0), rgba(255,255,255,.6), rgba(255,255,255,0)); transform: translateX(-160%) skewX(-18deg); animation: rk-sweep 3.4s .6s ease-in-out infinite }
.rk-mode.on svg { animation: rk-pulse 2.4s ease-in-out infinite }
@keyframes rk-pulse { 0%, 100% { transform: scale(1) } 50% { transform: scale(1.1) } }
.rk-rule.on .dot { animation: rk-pulse 1.8s ease-in-out infinite }
.rk-unit { transition: transform .18s ease-out }
.rk-unit:hover { transform: translateY(-4px) }

/* バトルボタン: 呼吸 + 二重の波紋 + 光 + 回る点線の輪 */
.rk-bwrap { position: relative; display: grid; place-items: center; margin-top: 6px; width: 196px; height: 196px }
.rk-bwrap > .rk-breathe { display: grid; place-items: center; animation: rk-breathe 2.6s ease-in-out infinite; will-change: transform }
@keyframes rk-breathe { 0%, 100% { transform: scale(1) } 50% { transform: scale(1.045) } }
.rk-bwrap .rk-orbit { position: absolute; inset: 4px; border-radius: 50%; border: 2px dashed rgba(127,208,255,.55); animation: rk-spin 16s linear infinite; will-change: transform; pointer-events: none }
.rk-bwrap .rk-orbit.r { inset: 14px; border-color: rgba(216,184,90,.45); animation-direction: reverse; animation-duration: 22s }
.rk-bwrap .rk-wave { position: absolute; width: 148px; height: 148px; border-radius: 50%; border: 2px solid #7fd0ff; opacity: 0; pointer-events: none; will-change: transform, opacity; animation: rk-ring 2.2s 1.1s ease-out infinite }
.rk-battle { margin-top: 0 !important; overflow: visible }
.rk-bclip { position: absolute; inset: 0; border-radius: 50%; overflow: hidden; pointer-events: none }
.rk-bclip::after { content: ''; position: absolute; top: -10%; bottom: -10%; left: 0; width: 34%; background: linear-gradient(105deg, rgba(255,255,255,0), rgba(255,255,255,.6), rgba(255,255,255,0)); transform: translateX(-180%) skewX(-18deg); animation: rk-sweep 3.2s .8s ease-in-out infinite; will-change: transform }
.rk-battle:disabled ~ .rk-orbit, .rk-bwrap:has(.rk-battle:disabled) .rk-orbit, .rk-bwrap:has(.rk-battle:disabled) .rk-wave, .rk-bwrap:has(.rk-battle:disabled) .rk-breathe { animation: none }
.rk-battle:active:not(:disabled) { transform: scale(.94) }
.rk-battle { transition: transform .15s ease-out }

/* 検索中: レーダー */
.rk-search { animation: rk-fade .3s ease-out backwards }
.rk-search .box { animation: rk-pop .55s cubic-bezier(.2, 1.2, .4, 1) backwards }
.rk-radar { width: 190px; height: 190px }
.rk-radar .grid { position: absolute; inset: 0; border-radius: 50%; border: 1px solid rgba(111,224,255,.3); background: radial-gradient(circle, rgba(111,224,255,.12), rgba(111,224,255,0) 70%) }
.rk-radar .grid.s1 { inset: 31px } .rk-radar .grid.s2 { inset: 62px }
.rk-radar .beam { position: absolute; inset: 0; border-radius: 50%; background: conic-gradient(from 0deg, rgba(111,224,255,0) 0deg, rgba(111,224,255,0) 250deg, rgba(111,224,255,.6) 360deg); animation: rk-spin 2.2s linear infinite; will-change: transform }
.rk-radar .sat { position: absolute; inset: -14px; border-radius: 50%; animation: rk-spin 7s linear infinite; will-change: transform }
.rk-radar .sat b { position: absolute; left: 50%; top: -4px; width: 9px; height: 9px; margin-left: -4.5px; border-radius: 50%; background: #ffe58a }
.rk-radar .sat b:nth-child(2) { top: auto; bottom: -4px; background: #8fd4ff }
.rk-radar .blip { position: absolute; width: 10px; height: 10px; margin: -5px; border-radius: 50%; background: #fff; opacity: 0; will-change: transform, opacity; animation: rk-blip 2.2s var(--dl, 0s) ease-out infinite }
@keyframes rk-blip { 0% { opacity: 0; transform: scale(.3) } 8% { opacity: 1; transform: scale(1.4) } 60% { opacity: .35; transform: scale(1) } 100% { opacity: 0; transform: scale(1) } }
.rk-radar u { inset: 86px; animation: rk-glow 1.4s ease-in-out infinite; will-change: transform, opacity }
.rk-dots span { display: inline-block; animation: rk-hop 1.1s ease-in-out infinite }
.rk-dots span:nth-child(2) { animation-delay: .15s } .rk-dots span:nth-child(3) { animation-delay: .3s }
@keyframes rk-hop { 0%, 60%, 100% { transform: translateY(0) } 30% { transform: translateY(-6px) } }
.rk-time > span { display: inline-block; animation: rk-tick .35s ease-out backwards }
@media (prefers-reduced-motion: reduce) { .rk *, .rk-search * { animation-duration: .01s !important; animation-iteration-count: 1 !important } }
`

// 背景に漂う光の粒(位置・速さは固定の並び。毎回同じ)
const MOTES = Array.from({ length: 16 }, (_, i) => ({ x: (i * 37 + 11) % 97 + 1, d: 8 + (i * 5) % 7, dl: -((i * 3.7) % 10), dx: ((i * 29) % 80) - 40, s: 3 + (i % 3) * 2 }))

// 数字を、0から目標まで数え上げる(rAF。画面の見た目だけ)
function useCountUp(target, ms = 900) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (target == null) return
    let raf, t0
    const tick = (t) => { t0 ??= t; const k = Math.min(1, (t - t0) / ms); setV(Math.round(target * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// team: 使うチーム(キャラ定義) / spells: スペル / onChangeTeam: 「確認」→チームを選び直す / onRoom: 部屋コードで対戦 / loggedIn: ログイン中か
export default function RandomMatchScreen({ settingsView = null, team, spells, onChangeTeam, onRoom, loggedIn = true, onExit, myName = 'あなた' }) {
  const desktop = useIsDesktop()
  const clientRef = useRef(null)
  const [modeSel, setMode] = useRemembered('random.mode', 'rank')
  const mode = loggedIn ? modeSel : 'casual' // ログインしていなければ、カジュアルだけ
  const ranked = mode === 'rank'
  const [rank, setRank] = useState(null)
  const [err, setErr] = useState('')
  const [phase, setPhase] = useState('menu') // menu | connecting | searching | battle
  const phaseRef = useRef(phase); phaseRef.current = phase
  const [waited, setWaited] = useState(0)
  const [online, setOnline] = useState(null)
  const [matched, setMatched] = useState(false)
  const chars = (team || []).filter(Boolean)

  const load = () => fetchRank().then((r) => setRank({ ...emptyRank(), ...(r.rank || {}) })).catch((e) => setErr(`ランクの情報を読み込めませんでした: ${e.message}`))
  useEffect(() => { if (loggedIn) load() }, [loggedIn]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (clientRef.current) clientRef.current.close() }, [])
  useEffect(() => { if (phase !== 'searching') return; setWaited(0); const t = setInterval(() => setWaited((w) => w + 1), 1000); return () => clearInterval(t) }, [phase])
  useEffect(() => { if (!matched) return; const t = setTimeout(() => setMatched(false), 2000); return () => clearTimeout(t) }, [matched])

  const start = () => {
    setErr('')
    if (clientRef.current) clientRef.current.close()
    const client = createPvpClient()
    clientRef.current = client
    const back = (msg) => { if (msg) setErr(msg); setPhase('menu'); client.close() }
    client.on((m) => {
      if (phaseRef.current === 'battle') return
      if (m.type === 'queued') setPhase('searching')
      else if (m.type === 'start' && !m.resume) { setOnline({ client, side: m.side, opp: m.opp && m.opp.name, oppBp: m.opp && m.opp.bp, ranked: !!m.ranked, init: m.state, left: m.left, turnMs: m.turnMs }); setPhase('battle'); setMatched(true) }
      else if (m.type === 'queue-left') back(m.reason === 'やめました' ? '' : m.reason)
      else if (m.type === 'error') back(m.message || '通信に失敗しました')
      else if (m.type === 'closed') back(m.reason || '部屋が閉じられました')
      else if (m.type === 'offline') back('対戦サーバーにつながりませんでした。サーバーが起動中の可能性があります。少し待って、もう一度お試しください。')
    })
    setPhase('connecting')
    client.queue({ ids: chars.map((c) => c.id), spells: (spells || []).map((s) => s.id) }, ranked)
  }
  const cancel = () => { if (clientRef.current) { clientRef.current.cancelQueue(); clientRef.current.close(); clientRef.current = null } setPhase('menu') }
  const leaveBattle = () => { setOnline(null); setPhase('menu'); load() } // 対戦のあと: 最新の BP を読み直す

  // フックは、早期リターン(下の対戦中の return)より前に呼ぶ。後ろに置くと、対戦が始まった描画でフックの数が減って、React エラー #300 になる
  const bpShown = useCountUp(rank ? rank.bp : null)

  if (phase === 'battle' && online) {
    return (
      <>
        <BattleScreen settingsView={settingsView} online={online} onExit={leaveBattle} />
        {matched && <MatchedOverlay me={loggedIn ? myName : '匿名プレイヤー'} opp={online.opp} ranked={online.ranked} oppBp={online.oppBp} />}
      </>
    )
  }

  const ri = rank ? rankOf(rank.bp) : null
  const tc = ri ? ri.tier.color : '#c98a52'
  const busy = phase !== 'menu'
  return (
    <div className="rk theme-dark" data-testid="random-screen">
      <style>{CSS}</style>
      <div className="rk-bg" aria-hidden="true"><i /><i /><span className="rk-glow g1" /><span className="rk-glow g2" />{MOTES.map((m, i) => <span key={i} className={`rk-mote${i % 3 === 2 ? ' b' : ''}`} style={{ left: `${m.x}%`, '--d': `${m.d}s`, '--dl': `${m.dl}s`, '--dx': `${m.dx}px`, width: m.s, height: m.s }} />)}</div>
      <ScreenHeader title="ランダムマッチ" onClose={onExit} />
      <div className="rk-wrap">
        <nav className="rk-rail" aria-label="モード">
          <button type="button" className={`rk-mode${ranked ? ' on' : ''}`} onClick={() => setMode('rank')} disabled={busy || !loggedIn} data-testid="mode-rank" aria-pressed={ranked}>
            <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4 L42 11 L40 28 Q37 40 24 45 Q11 40 8 28 L6 11 Z" fill="none" stroke="currentColor" strokeWidth="3" /><path d="M15 22 L24 30 L33 22" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            ランクマッチ
            {!loggedIn && <small style={{ fontSize: 10, fontWeight: 700 }}>ログインが必要</small>}
          </button>
          <button type="button" className={`rk-mode${!ranked ? ' on' : ''}`} onClick={() => setMode('casual')} disabled={busy} data-testid="mode-casual" aria-pressed={!ranked}>
            <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="17" fill="none" stroke="currentColor" strokeWidth="3" /><path d="M16 24 H32 M24 16 V32" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
            カジュアルマッチ
          </button>
        </nav>

        <section className="rk-mid">
          <div className="rk-title">{ranked ? 'ランクマッチ' : 'カジュアルマッチ'}</div>
          <p className="rk-desc">{ranked
            ? 'ランクをかけて争う、ランダムマッチング戦です。勝つとバトルポイント(BP)が増え、一定のBPで段位が上がります。負けるとBPが減りますが、段位(エメラルド・トパーズ…)そのものは下がりません。'
            : 'ランクに影響しない、気軽なランダムマッチング戦です。BPは増減せず、すぐに相手が見つかります。ログインしていなくても、匿名プレイヤーとして遊べます。'}</p>
          <div className="rk-rules">
            <div className="rk-rule on rk-in" style={{ '--i': '120ms' }} data-testid="rule-rotation"><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><RotationMark size={30} />ローテーション</span><span className="dot" /></div>
            <div className="rk-rule off rk-in" style={{ '--i': '200ms' }}><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><UnlimitedMark size={30} />アンリミテッド</span><small>準備中</small></div>
            <div className="rk-rule off rk-in" style={{ '--i': '280ms' }}><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><InfinityMark size={30} />インフィニティ</span><small>準備中</small></div>
          </div>
          <div className="rk-deck">
            <h3>使用デッキ<button type="button" className="rk-btn" onClick={onChangeTeam} disabled={busy} data-testid="rank-deck">確認・変更</button></h3>
            <div className="rk-units">
              {chars.map((c, i) => (
                <div key={c.id} className="rk-unit rk-in" style={{ '--rc': tone(c), '--i': `${360 + i * 70}ms` }}>
                  <div className="fig"><Emblem seed={c.id} /></div>
                  <div className="n">{c.name}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: C.mute }}>{spells && spells.length ? `スペル ${spells.length}枚` : 'スペルなし'} ・ 1手の持ち時間 45秒</div>
          </div>
          {err && <div className="rk-err" data-testid="rank-err">{err}</div>}
        </section>

        <aside className="rk-right" style={{ '--tc': tc }}>
          {!ranked ? (
            <>
              <div className="rk-badge" style={{ '--tc': '#6fe0ff' }}><svg viewBox="0 0 200 200" width={desktop ? 170 : 130} height={desktop ? 170 : 130} aria-hidden="true"><circle cx="100" cy="100" r="84" fill="none" stroke="#6fe0ff" strokeWidth="6" /><circle cx="100" cy="100" r="62" fill="#12233f" stroke="#fff" strokeOpacity=".4" strokeWidth="3" /><path d="M70 130 L130 70 M130 130 L70 70" stroke="#fff" strokeWidth="10" strokeLinecap="round" /></svg></div>
              <div className="rk-rank" style={{ fontSize: 28 }}>CASUAL</div>
              <div style={{ fontSize: 13, color: '#d8d3c0', textAlign: 'center', lineHeight: 1.6 }}>BPは増減しません<br />{loggedIn ? '' : '匿名プレイヤーとして参戦します'}</div>
              {!loggedIn && !getAllCharsToken() && <div style={{ fontSize: 11, color: C.mute, textAlign: 'center', lineHeight: 1.6 }}>※ アカウントがないと、使えるキャラがありません。設定の「カジュアルで全キャラを使う」をオンにしてください</div>}
            </>
          ) : ri ? (
            <>
              <div className="rk-badge"><div className="rk-float" style={{ position: 'relative' }}><RankBadge rank={ri} size={desktop ? 190 : 150} /><span className="rk-clip" /><i className="rk-spark" style={{ left: '8%', top: '22%', '--dl': '0.4s' }} /><i className="rk-spark" style={{ right: '6%', top: '14%', width: 22, height: 22, '--dl': '1.3s' }} /><i className="rk-spark" style={{ right: '14%', bottom: '26%', width: 12, height: 12, '--dl': '2.1s' }} /></div></div>
              <div className="rk-rank" data-testid="rank-label">{ri.label}</div>
              <div className="rk-bp">
                <div className="row"><span>BP</span><b data-testid="rank-bp">{bpShown}</b></div>
                <div className="rk-bar"><i style={{ transform: `scaleX(${Math.max(0.02, ri.progress)})` }} /></div>
                <div className="rk-next">{ri.next == null ? '最高ランク' : `NEXT ${ri.next - rank.bp}`}</div>
              </div>
              <div className="rk-rec"><span>勝利 <b>{rank.wins}</b></span><span>敗北 <b>{rank.losses}</b></span><span>連勝 <b>{rank.streak}</b></span></div>
            </>
          ) : (
            <div style={{ padding: '70px 0', color: C.mute, fontSize: 13 }}>{err ? '' : '読み込み中…'}</div>
          )}
          <div className="rk-chip" data-testid="rule-chip"><RotationMark size={22} />ローテーション</div>
          <div className="rk-bwrap"><span className="rk-orbit" /><span className="rk-orbit r" /><span className="rk-wave" /><div className="rk-breathe"><button type="button" className="rk-battle" data-testid="rank-battle" disabled={busy || (ranked && !rank) || chars.length === 0} onClick={start}><span className="rk-bclip" /><span style={{ position: 'relative' }}>バトル</span></button></div></div>
          {!ranked && onRoom && <button type="button" className="rk-btn" style={{ marginTop: 6 }} onClick={onRoom} disabled={busy} data-testid="to-room">部屋コードで友だちと対戦</button>}
        </aside>
      </div>

      {busy && (
        <div className="rk-search" data-testid="random-search">
          <div className="box">
            <div className="rk-radar" aria-hidden="true"><span className="grid" /><span className="grid s1" /><span className="grid s2" /><span className="beam" /><span className="sat"><b /><b /></span><i /><i /><i /><u /><span className="blip" style={{ left: '72%', top: '30%', '--dl': '.3s' }} /><span className="blip" style={{ left: '28%', top: '64%', '--dl': '1.1s' }} /><span className="blip" style={{ left: '58%', top: '78%', '--dl': '1.7s' }} /></div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{phase === 'connecting' ? 'サーバーにつないでいます' : '対戦相手を探しています'}<span className="rk-dots"><span>.</span><span>.</span><span>.</span></span></div>
            {phase === 'searching' && <>
              <div className="rk-time"><span key={waited}>{fmt(waited)}</span></div>
              <div style={{ fontSize: 12, color: C.mute }}>{ranked ? `探している範囲: BP ±${matchWindow(waited)}(待つほど広がります)` : 'カジュアルマッチ'}</div>
            </>}
            {phase === 'connecting' && <div style={{ fontSize: 12, color: C.mute, marginTop: 8 }}>サーバーが眠っていると、30秒ほどかかることがあります</div>}
            <button type="button" className="rk-btn" style={{ marginTop: 20 }} onClick={cancel} data-testid="rank-cancel">やめる</button>
          </div>
        </div>
      )}
    </div>
  )
}
