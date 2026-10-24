import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { C, FONT, DISPLAY } from './ui.js'
import { ALL_CHARACTERS } from './battle/characters/index.js'
import { ALL_SPELLS } from './battle/spells/index.js'
import { RELICS } from './battle/engine.js'
import { CLASSES } from './battle/characters/validate.js'
import { RARITY, fold, searchText, spellClassName, RarityBadge, CharDetail, SpellDetail } from './CodexScreen.jsx'
import { artOf, ArtImg, useArtStatus } from './charArt.jsx'
import { IconClose, IconBack, IconSearch, IconFolder } from './icons.jsx'

// Wiki(旧・資料集)。参考: エンドフィールドのWiki
//   ホーム: 項目のタイル(キャラクター・スペル・遺物…) → 項目の中: 左に分類、右にカードの一覧 → カードを選ぶと詳細
//   上の行は、いま居る場所を、エクスプローラーのように「Feel Wiki > キャラクター > エルフ > …」と出す(前の場所へ戻れる)。右に検索欄。
// ★ 項目を足すときは、下の SECTIONS に1つ足す(items: 一覧、subOf: 分類の決め方、subs: 分類の並び)。

const RELIC_ITEMS = Object.entries(RELICS).map(([name, r]) => ({ id: `relic:${name}`, name, desc: r.desc, class: '遺物', rarity: null }))
const RELIC_USERS = (name) => ALL_CHARACTERS.filter((c) => c.relic === name)

// ---- 項目ごとの大きな図(灰色の四角を組み合わせた、補助線つきの図形) ----
const G = '#9d9da2'
const guide = <g fill="none" stroke="#7d7d84" strokeWidth="0.8" opacity="0.55"><path d="M0 40h160M0 80h160M0 120h160M40 0v160M80 0v160M120 0v160" /><path d="M10 150L150 10" strokeDasharray="4 4" /><circle cx="80" cy="80" r="46" /></g>
const GlyphChar = () => (<svg viewBox="0 0 160 160">{guide}<rect x="58" y="14" width="44" height="44" fill={G} /><rect x="42" y="66" width="76" height="50" fill={G} /><rect x="22" y="70" width="14" height="46" fill={G} /><rect x="124" y="70" width="14" height="46" fill={G} /><rect x="50" y="122" width="24" height="30" fill={G} /><rect x="86" y="122" width="24" height="30" fill={G} /><path d="M80 24l8 8-8 8-8-8z" fill="#ececee" /></svg>)
const GlyphSpell = () => (<svg viewBox="0 0 160 160">{guide}<path d="M80 12l36 36-36 36-36-36z" fill={G} /><path d="M80 30l18 18-18 18-18-18z" fill="#ececee" /><path d="M80 90l22 22-22 22-22-22z" fill={G} /><rect x="128" y="40" width="14" height="86" fill={G} /><path d="M128 40l7-12 7 12z" fill={G} /></svg>)
const GlyphRelic = () => (<svg viewBox="0 0 160 160">{guide}<rect x="36" y="48" width="88" height="86" fill={G} /><rect x="58" y="28" width="44" height="26" fill={G} /><rect x="70" y="36" width="20" height="10" fill="#ececee" /><path d="M80 70l16 16-16 16-16-16z" fill="#ececee" /><rect x="22" y="58" width="10" height="66" fill={G} /><rect x="128" y="58" width="10" height="66" fill={G} /></svg>)

const GlyphAmulet = () => (<svg viewBox="0 0 160 160">{guide}<path d="M80 14l46 26v52c0 24-20 40-46 54-26-14-46-30-46-54V40z" fill={G} /><path d="M80 40l24 14v34c0 12-10 22-24 30-14-8-24-18-24-30V54z" fill="#ececee" /><circle cx="80" cy="76" r="9" fill={G} /></svg>)
const AMULET_IDS = new Set(ALL_CHARACTERS.filter((c) => c.amulet).map((c) => c.id)) // アミュレットは、キャラクターとは別の項目(03)

const SECTIONS = [
  { key: 'chars', no: '01', label: 'キャラクター', Glyph: GlyphChar, items: ALL_CHARACTERS.filter((c) => !c.amulet), subOf: (d) => d.class, subs: CLASSES, rarity: true },
  { key: 'spells', no: '02', label: 'スペル', Glyph: GlyphSpell, items: ALL_SPELLS, subOf: spellClassName, subs: CLASSES, rarity: true },
  { key: 'amulets', no: '03', label: 'アミュレット', Glyph: GlyphAmulet, items: ALL_CHARACTERS.filter((c) => c.amulet), subOf: (d) => d.class, subs: CLASSES, rarity: true },
  { key: 'relics', no: '04', label: '遺物', Glyph: GlyphRelic, items: RELIC_ITEMS, subOf: () => 'すべて', subs: [], rarity: false },
]
const SLOTS = 6 // ホームに並べる数(足りないぶんは、準備中のタイル)
const secOf = (key) => SECTIONS.find((s) => s.key === key)
const firstSub = (key) => secOf(key)?.subs[0] || 'all' // 項目を開いたときは、いちばん上の分類から始まる(「すべて」は無い)

// ---- カードの絵: 名前から決まる、左右対称のブロック模様 ----
function hash(str) {
  let h = 2166136261
  for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) }
  return h >>> 0
}
function Emblem({ seed, color = '#d9d9de', stops = null }) {
  useArtStatus()
  const gid = `wkr${useId().replace(/:/g, '')}`
  if (artOf(seed)) return <ArtImg id={seed} />
  const h = hash(seed)
  const cells = []
  for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) {
    if ((h >> (y * 3 + x)) & 1) { cells.push([x, y]); if (x < 2) cells.push([4 - x, y]) }
  }
  const rainbow = !!stops
  const fill = rainbow ? `url(#${gid})` : color // レアリティの色(グラデーション)でぬる
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      {rainbow && (
        <defs>
          <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1="3" y1="3" x2="61" y2="61">
            {stops.map((c, k) => <stop key={k} offset={k / (stops.length - 1)} stopColor={c} />)}
          </linearGradient>
        </defs>
      )}
      <path d="M32 3l29 29-29 29L3 32z" fill="none" stroke={fill} strokeOpacity="0.4" strokeWidth="1" />
      {cells.map(([x, y]) => <rect key={x + '-' + y} x={9 + x * 9.2} y={9 + y * 9.2} width="8" height="8" fill={fill} opacity={rainbow ? 1 : 0.85} />)}
    </svg>
  )
}

const CSS = `
.wk { min-height: 100vh; min-height: 100dvh; position: relative; overflow: hidden; color: ${C.ink}; font-family: ${FONT};
  background: linear-gradient(180deg, #ececee 0%, #dedee1 100%); display: flex; flex-direction: column; }
.wk::before { content: ''; position: absolute; left: 50%; top: 52%; width: min(70vw, 620px); aspect-ratio: 1; transform: translate(-50%, -50%); opacity: 0.07; pointer-events: none;
  background: linear-gradient(to bottom, #000, #000) center / 100% 100% no-repeat; clip-path: polygon(0 4%, 100% 4%, 50% 96%); }
.wk > * { position: relative; }
.wk-corner { position: absolute !important; width: 36px; height: 36px; border: 1px solid rgba(0,0,0,0.3); pointer-events: none; }
.wk-corner::after { content: ''; position: absolute; left: 6px; right: 6px; top: 50%; height: 1px; background: rgba(0,0,0,0.35); transform: rotate(45deg); }
.wk-bar { display: flex; align-items: center; gap: 14px; padding: 14px 20px; padding-top: calc(14px + env(safe-area-inset-top));
  background: radial-gradient(rgba(0,0,0,0.12) 1px, transparent 1.2px) 0 0 / 6px 6px, rgba(255,255,255,0.35); border-bottom: 1px solid rgba(0,0,0,0.12); }
.wk-path { flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px; height: 46px; padding: 0 12px; background: #f1f1f2; border: 1.5px solid #2a2a2e; overflow-x: auto; white-space: nowrap; font-size: 17px; color: #1c1c1f; scrollbar-width: none; }
.wk-path::-webkit-scrollbar { display: none; }
.wk-path > svg { font-size: 24px; flex: none; }
.wk-sep { color: #6e6e76; font-size: 15px; flex: none; }
.wk-crumb { flex: none; border: 0; background: #2a2a2e; color: #fff; padding: 4px 12px; font-size: 16px; font-family: ${FONT}; cursor: pointer; min-height: 0; transition: background 0.15s, color 0.15s; }
.wk-crumb:hover, .wk-crumb:focus-visible { background: ${C.player}; color: #111; outline: none; }
.wk-here { flex: none; padding: 4px 6px; font-weight: 600; }
.wk-search { display: flex; align-items: center; gap: 8px; width: min(320px, 32vw); height: 46px; padding: 0 12px; background: #f1f1f2; border: 1.5px solid #2a2a2e; color: #1c1c1f; font-size: 22px; }
.wk-search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; color: #1c1c1f; font-size: 16px; font-family: ${FONT}; padding: 0; }
.wk-search input::placeholder { color: #8a8a92; }
.wk-search:focus-within { border-color: ${C.player}; box-shadow: 0 0 0 2px rgba(255,230,0,0.5); }
.wk-search button { border: 0; background: none; color: #6e6e76; font-size: 18px; cursor: pointer; padding: 0 2px; min-height: 0; }
.wk-round { flex: none; width: 46px; height: 46px; border-radius: 50%; border: 0; background: #3a3a3e; color: #fff; font-size: 28px; display: grid; place-items: center; cursor: pointer; padding: 0; min-height: 0; transition: background 0.15s, color 0.15s, transform 0.15s; }
.wk-round:hover, .wk-round:focus-visible { background: ${C.player}; color: #111; outline: none; transform: scale(1.06); }

/* ---- 出入りのアニメーション(参考: エンドフィールドのWiki) ---- */
@keyframes wk-in-tl { from { opacity: 0; transform: translate(-90px, -90px); } to { opacity: 1; transform: none; } }
@keyframes wk-in-tr { from { opacity: 0; transform: translate(90px, -90px); } to { opacity: 1; transform: none; } }
@keyframes wk-in-bl { from { opacity: 0; transform: translate(-90px, 90px); } to { opacity: 1; transform: none; } }
@keyframes wk-in-br { from { opacity: 0; transform: translate(90px, 90px); } to { opacity: 1; transform: none; } }
@keyframes wk-up { from { opacity: 0; transform: translateY(34px); } to { opacity: 1; transform: none; } }
@keyframes wk-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes wk-fadeout { from { opacity: 1; } to { opacity: 0; } }
@keyframes wk-right-in { from { opacity: 0; transform: translateX(60px); } to { opacity: 1; transform: none; } }
@keyframes wk-right-out { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateX(60px); } }
@keyframes wk-left-in { from { opacity: 0; transform: translateX(-60px); } to { opacity: 1; transform: none; } }
@keyframes wk-left-out { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateX(-60px); } }
.wk-corner.tl { animation: wk-in-tl 0.55s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.wk-corner.tr { animation: wk-in-tr 0.55s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.wk-corner.bl { animation: wk-in-bl 0.55s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.wk-corner.br { animation: wk-in-br 0.55s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.wk-tile { animation: wk-up 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; animation-delay: calc(0.25s + var(--i, 0) * 0.07s); }
.wk-side { animation: wk-left-in 0.38s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.wk-sub { animation: wk-left-in 0.38s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; animation-delay: calc(var(--i, 0) * 0.04s); }
.wk-card { animation: wk-fade 0.3s ease-out backwards; animation-delay: calc(min(var(--i, 0) * 0.035s, 0.8s) + 0.12s); }
.wk-filters { animation: wk-fade 0.3s ease-out backwards; }
.wk-detail { animation: wk-fade 0.35s ease-out backwards; }
/* Wikiを閉じる: 四隅の飾りは外へ、タイルは下へ順に消え、最後に全体がフェードアウト */
@keyframes wk-out-tl { to { opacity: 0; transform: translate(-90px, -90px); } }
@keyframes wk-out-tr { to { opacity: 0; transform: translate(90px, -90px); } }
@keyframes wk-out-bl { to { opacity: 0; transform: translate(-90px, 90px); } }
@keyframes wk-out-br { to { opacity: 0; transform: translate(90px, 90px); } }
@keyframes wk-down { to { opacity: 0; transform: translateY(34px); } }
.wk.exiting { pointer-events: none; animation: wk-fadeout 0.2s 0.34s ease-in forwards; }
.wk.exiting .wk-corner.tl { animation: wk-out-tl 0.4s cubic-bezier(0.5, 0, 0.8, 0.4) forwards; }
.wk.exiting .wk-corner.tr { animation: wk-out-tr 0.4s cubic-bezier(0.5, 0, 0.8, 0.4) forwards; }
.wk.exiting .wk-corner.bl { animation: wk-out-bl 0.4s cubic-bezier(0.5, 0, 0.8, 0.4) forwards; }
.wk.exiting .wk-corner.br { animation: wk-out-br 0.4s cubic-bezier(0.5, 0, 0.8, 0.4) forwards; }
.wk.exiting .wk-tile { animation: wk-down 0.28s ease-in forwards; animation-delay: calc(var(--i, 0) * 0.025s); }
.wk.exiting .wk-bar { animation: wk-fadeout 0.28s ease-in forwards; }
.wk-body.closing .wk-side { animation: wk-left-out 0.26s ease-in forwards; }
.wk-body.closing .wk-sub { animation: none; }
.wk-body.closing .wk-main { animation: wk-right-out 0.26s ease-in forwards; }
.wk-body.back .wk-main { animation: wk-right-in 0.38s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.wk-body.back .wk-card, .wk-body.back .wk-filters { animation: none; }
.wk-body.closing .wk-card, .wk-body.closing .wk-filters { animation: none; }

/* ホーム: 項目のタイル */
.wk-home { flex: 1; display: grid; place-items: center; padding: 28px 4vw 60px; }
.wk-tiles { width: min(1100px, 100%); display: grid; grid-template-columns: repeat(${SLOTS}, minmax(0, 1fr)); gap: 8px; }
.wk-tile { position: relative; display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px 6px 10px; border: 0; background: none; cursor: pointer; color: #5c5c63; min-height: 0; font-family: ${DISPLAY}; transition: color 0.16s, transform 0.16s; }
.wk-tile .wk-big { position: absolute; top: 0; left: 50%; transform: translateX(-50%); font-weight: 700; font-size: clamp(54px, 8vw, 118px); line-height: 1; color: rgba(0,0,0,0.055); letter-spacing: 0.02em; pointer-events: none; }
.wk-tile svg { position: relative; width: min(100%, 150px); aspect-ratio: 1; display: block; transition: transform 0.16s; }
.wk-tile svg path[fill="${G}"], .wk-tile svg rect[fill="${G}"] { transition: fill 0.16s; }
.wk-tile .wk-name2 { position: relative; font-family: ${FONT}; font-size: clamp(13px, 1.5vw, 18px); font-weight: 500; color: #3a3a3e; }
.wk-tile:hover svg, .wk-tile:focus-visible svg { transform: translateY(-6px); }
.wk-tile:hover svg [fill="${G}"], .wk-tile:focus-visible svg [fill="${G}"] { fill: #2a2a2e; }
.wk-tile:hover .wk-name2, .wk-tile:focus-visible .wk-name2 { color: #111; }
.wk-tile:hover .wk-name2::after, .wk-tile:focus-visible .wk-name2::after { content: ''; display: block; height: 3px; margin-top: 4px; background: ${C.player}; }
.wk-tile:focus-visible { outline: none; }
.wk-tile.soon { cursor: default; opacity: 0.55; }
.wk-tile.soon:hover svg { transform: none; }
.wk-tile.soon:hover svg [fill="${G}"] { fill: ${G}; }
.wk-tile.soon .wk-name2::after { display: none !important; }
.wk-soonbox { position: relative; width: min(100%, 150px); aspect-ratio: 1; border: 1px dashed rgba(0,0,0,0.3); display: grid; place-items: center; font-size: 11px; letter-spacing: 0.16em; color: rgba(0,0,0,0.4); }
.wk-badge { position: absolute; right: 18%; top: 38px; width: 13px; height: 13px; background: var(--c-badge); transform: rotate(45deg); }

/* 項目の中: 左に分類、右に一覧・詳細 */
.wk-body { flex: 1; display: grid; grid-template-columns: minmax(200px, 270px) 1fr; gap: 22px; padding: 22px 4vw 40px; align-items: start; align-content: start; } /* align-content: start = 行(分類・一覧)の高さを、中身だけにする。入れないと、余った高さが行に配られて、分類と一覧の間が空く */
.wk-side { display: flex; flex-direction: column; gap: 6px; position: sticky; top: 14px; max-height: calc(100vh - 110px); overflow-y: auto; overflow-x: hidden; padding-right: 6px; scrollbar-width: none; }
.wk-side::-webkit-scrollbar { display: none; }
.wk-sub { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 0 16px 0 18px; height: 52px; border: 0; cursor: pointer; text-align: left; min-height: 0;
  background: linear-gradient(135deg, #cfcfd3, #bfbfc4); color: #3a3a3e; font-size: 18px; font-family: ${FONT}; transition: background 0.15s, transform 0.15s; }
.wk-sub .wk-n { font-family: ${DISPLAY}; font-weight: 600; font-size: 14px; color: rgba(0,0,0,0.45); }
.wk-sub:hover, .wk-sub:focus-visible { background: linear-gradient(135deg, #d9d9dd, #c8c8cd); transform: translateX(4px); outline: none; }
.wk-sub.on { background: #262629; color: #fff; box-shadow: inset 5px 0 0 ${C.player}; }
.wk-sub.on .wk-n { color: ${C.player}; }
.wk-sub.zero { opacity: 0.55; }
.wk-main { min-width: 0; }
.wk-filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
.wk-fchip { padding: 5px 14px; border: 1.5px solid #2a2a2e; background: transparent; color: #2a2a2e; font-size: 13px; font-weight: 600; font-family: ${FONT}; cursor: pointer; min-height: 0; transition: background 0.15s, color 0.15s; }
.wk-fchip.on { background: #2a2a2e; color: #fff; }
.wk-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.wk-card { position: relative; aspect-ratio: 1 / 1.08; border: 0; padding: 0; cursor: pointer; overflow: hidden; text-align: center; color: #fff; min-height: 0; font-family: ${FONT};
  background: radial-gradient(circle at 50% 38%, #34343a 0%, #1b1b1e 70%), #1b1b1e; box-shadow: 0 2px 6px rgba(0,0,0,0.25); transition: transform 0.15s, box-shadow 0.15s; }
.wk-card img.art, .wk-hero img.art { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; z-index: 0; }
.wk-card svg { position: absolute; left: 50%; top: 16%; width: 58%; transform: translateX(-50%); transition: transform 0.2s; }
.wk-card .wk-dots { position: absolute; left: 8px; top: 8px; width: 18px; height: 4px; background: rgba(255,255,255,0.55); box-shadow: 8px 0 0 -1px rgba(255,255,255,0.0); }
.wk-card .wk-dots::after { content: ''; position: absolute; left: 22px; top: 0; width: 4px; height: 4px; background: rgba(255,255,255,0.55); box-shadow: 7px 0 0 rgba(255,255,255,0.35), 14px 0 0 rgba(255,255,255,0.2); }
.wk-card .wk-tag { position: absolute; right: 8px; top: 6px; font-size: 10px; letter-spacing: 0.1em; color: ${C.player}; font-weight: 700; }
.wk-card .wk-cname { position: absolute; left: 0; right: 0; bottom: 8px; padding: 0 8px; font-size: 15px; font-weight: 600; line-height: 1.25; text-shadow: 0 1px 3px #000; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.wk-card .wk-rar { position: absolute; left: 0; right: 0; bottom: 0; height: 5px; }
.wk-card:hover, .wk-card:focus-visible { transform: translateY(-3px); box-shadow: 0 8px 16px rgba(0,0,0,0.3); outline: 2px solid ${C.player}; outline-offset: -2px; }
.wk-card:hover svg { transform: translateX(-50%) scale(1.08); }
.wk-empty { padding: 30px 6px; color: #5c5c63; font-size: 15px; }

/* 詳細 */
.wk-detail { display: grid; grid-template-columns: minmax(180px, 240px) 1fr; gap: 22px; align-items: start; }
.wk-hero { position: relative; aspect-ratio: 1 / 1.08; background: radial-gradient(circle at 50% 38%, #34343a 0%, #1b1b1e 70%); color: #fff; }
.wk-hero svg { position: absolute; left: 50%; top: 14%; width: 66%; transform: translateX(-50%); }
.wk-hero .wk-rar { position: absolute; left: 0; right: 0; bottom: 0; height: 6px; }
.wk-info { background: ${C.card}; border: 1px solid ${C.line}; padding: 18px 22px 22px; min-width: 0; }
.wk-info h2 { margin: 0; font-size: 26px; }
.wk-meta { font-size: 12px; color: ${C.mute}; margin-top: 3px; }

@media (max-width: 899px) {
  .wk-bar { flex-wrap: wrap; gap: 10px; padding: 10px 12px; padding-top: calc(10px + env(safe-area-inset-top)); }
  .wk-path { order: 1; height: 42px; font-size: 15px; }
  .wk-round { order: 2; width: 42px; height: 42px; font-size: 24px; }
  .wk-search { order: 3; width: 100%; height: 42px; }
  .wk-corner { width: 24px; height: 24px; left: auto; right: auto; }
  .wk-corner.tl { left: 10px !important; right: auto !important; top: 150px !important; bottom: auto !important; }
  .wk-corner.tr { right: 10px !important; left: auto !important; top: 150px !important; bottom: auto !important; }
  .wk-corner.bl { left: 10px !important; right: auto !important; bottom: 14px !important; top: auto !important; }
  .wk-corner.br { right: 10px !important; left: auto !important; bottom: 14px !important; top: auto !important; }
  .wk-tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 8px; }
  .wk-tile.soon { display: none; }
  .wk-home { align-items: start; padding-top: 18px; }
  .wk-body { grid-template-columns: 1fr; gap: 12px; padding: 12px 12px 30px; }
  .wk-side { flex-direction: row; overflow-x: auto; overflow-y: visible; position: static; max-height: none; padding-bottom: 6px; }
  .wk-sub { flex: none; height: 42px; font-size: 15px; padding: 0 14px; gap: 8px; }
  .wk-grid { grid-template-columns: repeat(auto-fill, minmax(128px, 1fr)); gap: 8px; }
  .wk-detail { grid-template-columns: 1fr; }
  .wk-hero { max-width: 200px; }
}
`

function Card({ sec, d, i, showTag, onOpen }) {
  const r = d.rarity ? RARITY[d.rarity] : null
  return (
    <button type="button" className="wk-card" style={{ '--i': i }} data-testid={`wk-card-${d.id}`} onClick={() => onOpen(sec, d.id, true)}>
      <i className="wk-dots" />
      {showTag && <span className="wk-tag">{secOf(sec).label}</span>}
      <Emblem seed={d.id} color={r ? r.color : '#d9d9de'} stops={r ? r.stops : null} />
      <span className="wk-cname">{d.name}</span>
      <i className="wk-rar" style={{ background: r ? r.bg || r.color : '#8d8d93' }} />
    </button>
  )
}

function RelicDetail({ def, onOpen }) {
  const users = RELIC_USERS(def.name)
  return (
    <>
      <div style={{ marginTop: 14, fontSize: 15, lineHeight: 1.7 }}>効果: {def.desc}</div>
      <div style={{ marginTop: 16, fontSize: 13, fontWeight: 700, color: C.mute, borderBottom: `1px solid ${C.line}`, paddingBottom: 3 }}>この遺物を持つキャラクター</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        {users.length === 0 && <span style={{ fontSize: 13, color: C.mute }}>まだいません</span>}
        {users.map((u) => (
          <button key={u.id} onClick={() => onOpen('chars', u.id)} style={{ padding: '6px 12px', border: `1.5px solid ${C.line}`, background: C.card, color: C.ink, fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{u.name}</button>
        ))}
      </div>
    </>
  )
}

export default function WikiScreen({ onExit }) {
  const [nav, setNav] = useState({ section: null, sub: 'all', itemId: null })
  const [query, setQuery] = useState('')
  const [rarity, setRarity] = useState('all')

  // 検索用の文字は最初に1回だけ作る
  const index = useMemo(
    () => SECTIONS.flatMap((s) => s.items.map((d) => ({ sec: s.key, d, t: s.key === 'relics' ? fold(`${d.name} ${d.desc} 遺物`) : searchText(d, s.key === 'spells') }))),
    [],
  )

  const terms = fold(query).split(/\s+/).filter(Boolean)
  const sec = nav.section ? secOf(nav.section) : null
  const searching = terms.length > 0
  const selected = nav.itemId ? index.find((x) => x.sec === nav.section && x.d.id === nav.itemId)?.d || null : null
  const isRoot = !sec && !searching && !selected

  // 一覧: 場所(項目)・レアリティ・検索の言葉で絞る。分類(左)の件数は、分類で絞る前の数
  const base = index.filter((x) => (!sec || x.sec === sec.key) && (rarity === 'all' || x.d.rarity === rarity) && terms.every((w) => x.t.includes(w)))
  const subOf = (x) => secOf(x.sec).subOf(x.d)
  const counts = {}
  for (const x of base) counts[subOf(x)] = (counts[subOf(x)] || 0) + 1
  const shown = base.filter((x) => nav.sub === 'all' || searching || subOf(x) === nav.sub)

  // ---- 移動 ----
  const [closing, setClosing] = useState(false)
  const [exiting, setExiting] = useState(false) // Wiki自体を閉じるアニメーション中
  const [back, setBack] = useState(false) // 詳細から一覧へ戻ったとき(カードは順番に出さず、左右からそのまま入る)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  // 一覧からホームへ戻るとき・カードを開くときは、左の分類は左へ、右のカード部分は右へ出ていってから切り替える
  const leaveToRoot = (after) => {
    if (closing) return
    if (!nav.section) { after(); return }
    setClosing(true)
    timer.current = setTimeout(() => { setClosing(false); after() }, 260)
  }
  const exitWiki = () => {
    if (exiting) return
    setExiting(true)
    timer.current = setTimeout(onExit, 540)
  }
  const goRootNow = () => { setBack(false); setNav({ section: null, sub: 'all', itemId: null }); setQuery(''); setRarity('all') }
  const goRoot = () => { setBack(false); leaveToRoot(goRootNow) }
  const goSection = (key, sub = firstSub(key)) => { setBack(!!selected && key === nav.section); setNav({ section: key, sub, itemId: null }); setQuery(''); setRarity('all') }
  // 一覧のカードを開くとき(fromList)は、いまの分類・検索・レアリティをそのまま残す(← で、同じ一覧に戻れる)。関連(召喚するキャラなど)から開くときは、リセットする
  const open = (key0, id, fromList = false) => {
    const key = key0 === 'chars' && AMULET_IDS.has(id) ? 'amulets' : key0 // アミュレットへのリンクは、アミュレットの項目で開く
    if (fromList) { setBack(false); leaveToRoot(() => setNav({ section: key, sub: key === nav.section ? nav.sub : firstSub(key), itemId: id })); return }
    setBack(false)
    setNav({ section: key, sub: firstSub(key), itemId: id }); setQuery(''); setRarity('all')
  }
  const up = () => {
    if (selected) { setBack(true); setNav({ ...nav, itemId: null }) }
    else if (searching) setQuery('')
    else goRoot()
  }

  // ---- 上の行(いま居る場所) ----
  const crumbs = [{ label: 'Feel Wiki', go: goRoot }]
  if (sec) crumbs.push({ label: sec.label, go: () => goSection(sec.key) })
  if (searching && !selected) crumbs.push({ label: '検索結果' })
  if (selected) crumbs.push({ label: selected.name })

  const path = (
    <div className="wk-path" aria-label="いまの場所">
      <IconFolder />
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1
        return (
          <span key={i} style={{ display: 'contents' }}>
            <span className="wk-sep">›</span>
            {last || !c.go ? <span className="wk-here">{c.label}</span> : <button type="button" className="wk-crumb" onClick={c.go}>{c.label}</button>}
          </span>
        )
      })}
    </div>
  )

  const searchBox = (
    <label className="wk-search">
      <IconSearch />
      <input value={query} onChange={(e) => { setQuery(e.target.value); setNav((n) => ({ ...n, itemId: null })) }} placeholder={sec ? `${sec.label}を検索` : '検索'} aria-label="検索" />
      {query && <button type="button" onClick={() => setQuery('')} aria-label="検索をクリア">×</button>}
    </label>
  )

  const topBar = (
    <div className="wk-bar" key="wk-topbar">
      {path}
      {searchBox}
      <button type="button" className="wk-round" onClick={isRoot ? exitWiki : up} aria-label={isRoot ? '閉じる' : '前の場所へ'}>{isRoot ? <IconClose /> : <IconBack />}</button>
    </div>
  )

  // ---- ホーム: 項目のタイル ----
  if (isRoot) {
    return (
      <div className={`wk theme-light${exiting ? ' exiting' : ''}`} style={{ background: undefined }}>
        <style>{CSS}</style>
        {[['tl', { left: 110, top: 150 }], ['tr', { right: 110, top: 150 }], ['bl', { left: 110, bottom: 36 }], ['br', { right: 110, bottom: 36 }]].map(([k, p]) => <i key={k} className={`wk-corner ${k}`} style={p} />)}
        {topBar}
        <div className="wk-home">
          <div className="wk-tiles">
            {SECTIONS.map((s, i) => (
              <button key={s.key} type="button" data-testid={`wk-sec-${s.key}`} className="wk-tile" style={{ '--i': i }} onClick={() => goSection(s.key)}>
                <span className="wk-big">{s.no}</span>
                <s.Glyph />
                <span className="wk-name2">{s.label}</span>
              </button>
            ))}
            {Array.from({ length: Math.max(0, SLOTS - SECTIONS.length) }, (_, i) => (
              <div key={'s' + i} className="wk-tile soon" style={{ '--i': SECTIONS.length + i }} aria-hidden="true">
                <span className="wk-big">{String(SECTIONS.length + i + 1).padStart(2, '0')}</span>
                <div className="wk-soonbox">COMING SOON</div>
                <span className="wk-name2">準備中</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ---- 詳細 ----
  const detailSecKey = nav.section
  const detail = selected && (
    <div className="wk-detail" key={selected.id}>
      <div className="wk-hero">
        <Emblem seed={selected.id} color={selected.rarity ? RARITY[selected.rarity].color : '#d9d9de'} stops={selected.rarity ? RARITY[selected.rarity].stops : null} />
        <i className="wk-rar" style={{ background: selected.rarity ? RARITY[selected.rarity].bg || RARITY[selected.rarity].color : '#8d8d93' }} />
      </div>
      <div className="wk-info">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <h2>{selected.name}</h2>
          <RarityBadge rarity={selected.rarity} />
        </div>
        <div className="wk-meta">{detailSecKey === 'relics' ? '遺物' : `${selected.class} ・ ${selected.id}`}</div>
        {(detailSecKey === 'chars' || detailSecKey === 'amulets') && <CharDetail def={selected} onOpen={open} />}
        {detailSecKey === 'spells' && <SpellDetail def={selected} onOpen={open} />}
        {detailSecKey === 'relics' && <RelicDetail def={selected} onOpen={open} />}
      </div>
    </div>
  )

  const showSide = !!sec && sec.subs.length > 0 && !selected // 項目の中だけ、左に分類を出す(全体の検索結果では出さない)
  const subs = sec ? sec.subs : []
  const filters = (!sec || sec.rarity) && (
    <div className="wk-filters">
      <button type="button" className={`wk-fchip${rarity === 'all' ? ' on' : ''}`} onClick={() => { setBack(false); setRarity('all') }}>全レアリティ</button>
      {Object.entries(RARITY).sort((a, b) => a[1].order - b[1].order).map(([k, r]) => (
        <button key={k} type="button" className={`wk-fchip${rarity === k ? ' on' : ''}`} onClick={() => { setBack(false); setRarity(k) }}>{r.label}</button>
      ))}
    </div>
  )

  return (
    <div className="wk theme-light">
      <style>{CSS}</style>
      {topBar}
      <div className={`wk-body${closing ? ' closing' : ''}${back ? ' back' : ''}`} style={showSide ? undefined : { gridTemplateColumns: '1fr' }}>
        {showSide && (
          <nav className="wk-side" aria-label="分類">
            {subs.map((sb, si) => {
              const n = counts[sb] || 0
              return (
                <button key={sb} type="button" className={`wk-sub${nav.sub === sb ? ' on' : ''}${n === 0 ? ' zero' : ''}`} style={{ '--i': si }} onClick={() => { setBack(false); setNav({ ...nav, sub: sb, itemId: null }) }}>
                  <span>{sb}</span><span className="wk-n">{n}</span>
                </button>
              )
            })}
          </nav>
        )}
        <div className="wk-main">
          {selected ? detail : (
            <>
              {filters}
              {shown.length === 0
                ? <div className="wk-empty">見つかりませんでした。検索の言葉や、分類・レアリティの絞り込みを変えてみてください。</div>
                : <div className="wk-grid" key={`${nav.section}|${nav.sub}|${rarity}`}>{shown.map((x, i) => <Card key={x.sec + x.d.id} i={i} sec={x.sec} d={x.d} showTag={!sec} onOpen={open} />)}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
