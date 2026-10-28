import { useEffect, useMemo, useRef, useState } from 'react'
import { useIsDesktop, C, FONT, DISPLAY } from './ui.js'
import { ALL_CHARACTERS } from './battle/characters/index.js'
import { CLASS_ORDER } from './battle/characters/validate.js'
import { KEYWORDS, TRIGGER_LABELS, RELICS } from './battle/engine.js'
import { RARITY, fold, collectRelated } from './CodexScreen.jsx'
import { Emblem, hash } from './emblem.jsx'
import { artOf, useArtStatus } from './charArt.jsx'
import { IconClose, IconAgents, StatIcon } from './icons.jsx'
import { classElf, classRoyal, classNeutral, classWitch, classNemesis, classBishop, classNightmare, classDragon } from './classIcons.js'

// 人事(所持キャラクター)。参考: エンドフィールドの「オペレーター」画面
//   左: 持っているキャラの丸い顔の縦の列(選ぶと黄色の印) / まん中: キャラ / 右: 黄色い斜めの面に、所持数・レアリティ・遺物
//   右端の縦のタブ(4つ)で、見る内容を切り替える: 一覧(能力値とスキル) / パッシブ / 特性・遺物 / 関連
//   開くとき・閉じるときは、四角いブロックが散らばって切り替わる。キャラを変えると、絵がノイズのように入れ替わる
//   PC: 2560×1440 以上(横長) / スマホ: 1440×2560 以上(縦長) の舞台を、画面いっぱいに拡大・縮小して出す
//
// props: ownedMap = { キャラid: 持っている数 }(持っているキャラだけを出す) / onExit = 閉じたあとに呼ぶ

const LAYOUT = { d: { W: 2560, H: 1440 }, p: { W: 1440, H: 2560 } } // これより画面が細長いときは、舞台を横(縦)に広げる(左右・上下に隙間ができない)

const STAT_LABEL = { hp: 'HP', atk: '攻撃力', def: '防御力', spd: '速度', mag: '魔力', critRate: 'クリティカルレート', critDmg: 'クリティカルダメージ', dmgResist: 'ダメージ耐性' }
const STAT_DEFAULT = { critRate: 5, critDmg: 50 }
const DMG_TYPE = { physical: '物理', magic: '魔法', true: '確定' }
const PIPS = { legend: 4, gold: 3, silver: 2, bronze: 1 }
// クラスの絵(名前の左の四角)。絵のないクラスは、頭文字を出す
const CLASS_ICON = { 'エルフ': classElf, 'ロイヤル': classRoyal, 'ニュートラル': classNeutral, 'ウィッチ': classWitch, 'ネメシス': classNemesis, 'ビショップ': classBishop, 'ナイトメア': classNightmare, 'ドラゴン': classDragon }

const TABS = [
  { k: 'ov', label: '一覧', glyph: '≡' },
  { k: 'ab', label: 'パッシブ', glyph: '✦' },
  { k: 'tr', label: '特性・遺物', glyph: '◆' },
  { k: 'rl', label: '関連', glyph: '⛓' },
]

const passiveLabel = (p) => (typeof p === 'string' ? (KEYWORDS[p]?.label || (/^stealth_(\d+)$/.test(p) ? `潜伏_${p.split('_')[1]}` : p)) : p.name)
const passiveDesc = (p) => {
  if (typeof p !== 'string') return p.desc || ''
  const m = /^stealth_(\d+)$/.exec(p)
  if (m) return `${m[1]}ターンごとに【潜伏】が戻る。${KEYWORDS.stealth.desc}`
  return KEYWORDS[p]?.desc || ''
}
const triggerLabel = (p) => (typeof p === 'object' && p.trigger ? TRIGGER_LABELS[p.trigger] || p.trigger : 'キーワード')

// クラスごとの色(クラス名から決まる。ニュートラルは灰色)
const CLASS_COLOR = { 'エルフ': '#439159', 'ロイヤル': '#797b1b', 'ニュートラル': '#858585', 'ウィッチ': '#535fa3', 'ネメシス': '#5bcce3', 'ビショップ': '#b0a98d', 'ナイトメア': '#8d1e41', 'ドラゴン': '#a05a12' } // クラスの絵の色
const tone = (c) => (!c || !c.class ? '#858585' : CLASS_COLOR[c.class] || `hsl(${hash(c.class) % 360} 62% 54%)`)
const rarityColor = (c) => RARITY[c.rarity]?.color || '#cbd5e1'
// レジェンドの枠は、虹色(カードの枠の、光る虹色に合わせる)。それ以外は、レアリティの色の1色
const RAINBOW = 'linear-gradient(135deg, #c9a6ff 0%, #8fb4ff 20%, #7fe3ff 40%, #86f0d6 56%, #ff9fe0 78%, #c9a6ff 100%)'
const rarityBg = (c) => (c.rarity === 'legend' ? RAINBOW : `linear-gradient(${rarityColor(c)}, ${rarityColor(c)})`)

const CSS = `
.jp { position: fixed; inset: 0; z-index: 20; overflow: hidden; color: #1d1d20; font-family: ${FONT}; background: linear-gradient(180deg, #cfcfd2 0%, #ececee 38%, #d6d6d9 70%, #b4b4ba 100%); animation: jp-fade 0.25s ease-out backwards; user-select: none; -webkit-user-select: none; }
.jp button { font-family: ${FONT}; }
@keyframes jp-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes jp-fadeout { from { opacity: 1; } to { opacity: 0; } }
@keyframes jp-left { from { opacity: 0; transform: translateX(-70px); } to { opacity: 1; transform: none; } }
@keyframes jp-left-out { to { opacity: 0; transform: translateX(-70px); } }
@keyframes jp-right { from { opacity: 0; transform: translateX(110px); } to { opacity: 1; transform: none; } }
@keyframes jp-right-out { to { opacity: 0; transform: translateX(110px); } }
@keyframes jp-down { from { opacity: 0; transform: translateY(-36px); } to { opacity: 1; transform: none; } }
@keyframes jp-down-out { to { opacity: 0; transform: translateY(-36px); } }
@keyframes jp-up-out { to { opacity: 0; transform: translateY(36px); } }
@keyframes jp-up { from { opacity: 0; transform: translateY(36px); } to { opacity: 1; transform: none; } }
@keyframes jp-sweep { from { transform: translateX(-30%) skewX(-24deg); opacity: 0.95; } to { transform: translateX(260%) skewX(-24deg); opacity: 0; } }
@keyframes jp-glitch {
  0% { opacity: 0; clip-path: inset(0 -60% 100% -60%); transform: translateX(8px); }
  35% { opacity: 1; clip-path: inset(0 -60% 45% -60%); transform: translateX(-3px); }
  70% { clip-path: inset(0 -60% 10% -60%); transform: translateX(1px); }
  100% { opacity: 1; clip-path: inset(-120px -60% -120px -60%); transform: none; }
}
@keyframes jp-glitch-out { 0% { opacity: 1; clip-path: inset(-120px -60% -120px -60%); } 100% { opacity: 0; clip-path: inset(0 -60% 100% -60%); transform: translateX(-6px); } }
@keyframes jp-tile-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes jp-tile-out { from { opacity: 1; } to { opacity: 0; } }
@keyframes jp-text { from { opacity: 0; transform: translateX(-22px); } to { opacity: 1; transform: none; } }

.jp-stage { position: absolute; left: 50%; top: 50%; transform-origin: center center; overflow: hidden; }
.jp-bg { position: absolute; inset: 0; pointer-events: none; background:
  repeating-linear-gradient(90deg, rgba(0,0,0,0.035) 0 2px, transparent 2px 120px); }
.jp-bg::after { content: ''; position: absolute; left: -10%; right: -10%; bottom: 0; height: 28%; background: linear-gradient(180deg, transparent, rgba(0,0,0,0.22)); }
.jp-dark { position: absolute; inset: 0; pointer-events: none; opacity: 0; background: radial-gradient(ellipse at 55% 40%, #4a4a50 0%, #1c1c20 55%, #0a0a0c 100%); transition: opacity 0.55s ease; }
.jp.dk .jp-dark { opacity: 1; }
.jp-sweepbar { position: absolute; top: -10%; bottom: -10%; left: 0; width: 220px; background: ${C.player}; pointer-events: none; z-index: 14; animation: jp-sweep 0.55s cubic-bezier(0.5, 0, 0.3, 1) forwards; }
.jp-sweepbar.b { width: 60px; margin-left: 260px; opacity: 0.8; }

/* 上: 場所の表示と、閉じる */
.jp-top { position: absolute; left: 0; right: 0; top: 0; z-index: 12; display: flex; align-items: center; gap: 18px; padding: 36px 56px 0 190px; pointer-events: none; animation: jp-down 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) 0.2s backwards; }
.jp-crumb { display: flex; align-items: center; gap: 14px; font-family: ${DISPLAY}; font-weight: 600; font-size: 34px; letter-spacing: 0.06em; color: #3a3a3f; }
.jp-crumb svg { font-size: 54px; color: #1d1d20; }
.jp-crumb small { font-size: 22px; color: #77777e; margin-left: 6px; }
.jp.dk .jp-crumb { color: #e8e8ea; } .jp.dk .jp-crumb svg { color: #e8e8ea; }
.jp-pill { pointer-events: auto; margin-left: auto; display: inline-flex; align-items: center; gap: 12px; height: 62px; padding: 0 26px 0 16px; border: 0; border-radius: 31px; background: #3a3a3f; color: #f1f1f2; font-size: 26px; font-weight: 600; cursor: pointer; min-height: 0; transition: background 0.15s; }
.jp-pill:hover, .jp-pill:focus-visible { background: #55555c; outline: none; }
.jp-x { pointer-events: auto; width: 84px; height: 84px; padding: 0; min-height: 0; border: 0; border-radius: 50%; background: #f2f2f3; color: #1c1c1f; font-size: 48px; display: grid; place-items: center; cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,0.25); transition: background 0.15s, transform 0.15s; }
.jp-x:hover, .jp-x:focus-visible { background: ${C.player}; transform: rotate(90deg); outline: none; }

/* 左: キャラの列 */
.jp-list { position: absolute; left: 0; top: 130px; bottom: 150px; width: 170px; z-index: 11; overflow-y: auto; overflow-x: hidden; scrollbar-width: none; padding: 6px 0 40px; background: linear-gradient(90deg, rgba(0,0,0,0.12), transparent); animation: jp-left 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) 0.15s backwards; }
.jp-list::-webkit-scrollbar { display: none; }
.jp-av { position: relative; display: block; width: 170px; height: 150px; padding: 0; min-height: 0; border: 0; background: none; cursor: pointer; animation: jp-left 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; animation-delay: calc(0.25s + var(--i) * 45ms); }
.jp-av .ring { position: absolute; left: 36px; top: 19px; width: 112px; height: 112px; border-radius: 50%; overflow: hidden; border: 4px solid transparent; background: linear-gradient(160deg, color-mix(in srgb, var(--tc) 60%, #fff), var(--tc) 55%, #1a1a20) padding-box, var(--rbg) border-box; box-shadow: 0 6px 14px rgba(0,0,0,0.35); transition: transform 0.15s, box-shadow 0.15s; }
.jp-av .ring svg { position: absolute; left: 50%; top: 50%; width: 76%; transform: translate(-50%, -50%); mix-blend-mode: multiply; opacity: 0.9; }
.jp-av .tag { position: absolute; left: 22px; top: 14px; min-width: 30px; height: 30px; padding: 0 6px; border-radius: 6px; background: #3b7fe0; color: #fff; font-size: 16px; font-weight: 700; display: grid; place-items: center; z-index: 2; box-shadow: 0 2px 6px rgba(0,0,0,0.3); }
.jp-av:hover .ring, .jp-av:focus-visible .ring { transform: scale(1.06); outline: none; }
.jp-av.on::before { content: ''; position: absolute; inset: 4px 0 4px 0; background: linear-gradient(90deg, transparent 20%, rgba(255,230,0,0.55)); }
.jp-av.on::after { content: ''; position: absolute; right: 0; top: 4px; bottom: 4px; width: 7px; background: ${C.player}; }
.jp-av.on .ring { box-shadow: 0 0 22px rgba(255,230,0,0.8); }
.jp-none { position: absolute; left: 260px; top: 400px; font-size: 40px; font-weight: 700; color: #55555c; line-height: 1.6; }

/* 左下: 道具 */
.jp-tools { position: absolute; left: 0; bottom: 0; z-index: 12; display: flex; align-items: center; gap: 14px; padding: 0 0 52px 56px; animation: jp-up 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) 0.3s backwards; }
.jp-tool { width: 84px; height: 84px; padding: 0; min-height: 0; border: 0; background: rgba(0,0,0,0.5); color: #fff; font-size: 40px; display: grid; place-items: center; cursor: pointer; clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); transition: background 0.15s; }
.jp-tool:hover, .jp-tool:focus-visible, .jp-tool.on { background: ${C.player}; color: #111; outline: none; }
.jp-pct { height: 62px; padding: 0 22px; display: flex; align-items: center; gap: 10px; border-radius: 31px; background: rgba(0,0,0,0.45); color: #fff; font-family: ${DISPLAY}; font-weight: 700; font-size: 26px; }
.jp-search { height: 84px; width: 380px; padding: 0 20px; border: 0; background: #f2f2f3; color: #111; font-size: 28px; outline: none; }

/* まん中: キャラ */
.jp-fig { position: absolute; z-index: 3; pointer-events: none; transition: left 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), top 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1); }
.jp-fig-in { position: absolute; inset: 0; animation: jp-glitch 0.45s ease-out backwards; }
.jp-fig-in.out { animation: jp-glitch-out 0.16s ease-in forwards; }
.jp-fig .plate { position: absolute; inset: 0; clip-path: polygon(14% 0, 100% 0, 86% 100%, 0 100%); background: linear-gradient(170deg, color-mix(in srgb, var(--tc) 55%, #fff) 0%, var(--tc) 40%, #15151b 100%); filter: drop-shadow(0 30px 34px rgba(0,0,0,0.55)); }
.jp-fig .plate.leg { background: var(--rbg); }
.jp-fig .plate.leg::before { content: ''; position: absolute; inset: 0; clip-path: polygon(calc(14% + 9px) 9px, calc(100% - 9px) 9px, calc(86% - 9px) calc(100% - 9px), 9px calc(100% - 9px)); background: linear-gradient(170deg, color-mix(in srgb, var(--tc) 55%, #fff) 0%, var(--tc) 40%, #15151b 100%); }
.jp-fig .plate img.art { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.jp-fig .plate.leg img.art { clip-path: polygon(calc(14% + 9px) 9px, calc(100% - 9px) 9px, calc(86% - 9px) calc(100% - 9px), 9px calc(100% - 9px)); }
.jp-fig .plate.has-art::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, transparent 60%, color-mix(in srgb, var(--tc) 50%, #000) 100%); opacity: 0.75; pointer-events: none; }
.jp-fig .plate.leg.has-art::after { clip-path: polygon(calc(14% + 9px) 9px, calc(100% - 9px) 9px, calc(86% - 9px) calc(100% - 9px), 9px calc(100% - 9px)); }
.jp-fig .plate.has-art i { z-index: 2; }
.jp-av .ring img.art, .jp-rc .pl img.art, .jp-gcard .pl img.art { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.jp-fig .plate svg { position: absolute; left: 50%; top: 9%; width: 66%; transform: translateX(-50%); mix-blend-mode: multiply; opacity: 0.92; }
.jp-fig .plate i { position: absolute; left: 0; right: 0; bottom: 0; height: 10px; background: var(--rbg); }
.jp-fig .slab { position: absolute; width: 36px; height: 62%; background: var(--tc); opacity: 0.55; transform: skewX(-18deg); filter: blur(1px); }
.jp-fig .slab.a { left: -9%; top: 24%; } .jp-fig .slab.b { right: -12%; top: 10%; height: 70%; opacity: 0.4; } .jp-fig .slab.c { right: 6%; top: 50%; height: 40%; opacity: 0.3; width: 22px; }
.jp-fig .floor { position: absolute; left: -34%; right: -20%; bottom: -74px; height: 148px; border-radius: 50%; background: rgba(255,255,255,0.5); } /* 板の底辺の中心(43%)を中心に、上半分は板のうしろに隠れる */
.jp-fig .floor::before { content: ''; position: absolute; left: 14%; right: 14%; top: 22%; bottom: 22%; border-radius: 50%; background: radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0) 72%); filter: blur(5px); } /* 底影 */
.jp-fig .floor::after { content: ''; position: absolute; inset: 14% 6%; border-radius: 50%; border: 3px solid rgba(255,255,255,0.75); } /* 輪 */
.jp.dk .jp-fig .floor { background: rgba(255,255,255,0.12); }
.jp.dk .jp-fig .floor::after { border-color: rgba(255,255,255,0.35); }

/* 左の情報(一覧タブ) */
.jp-info { position: absolute; z-index: 6; width: 560px; animation: jp-left 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) 0.2s backwards; }
.jp-info.sw { animation: jp-text 0.16s ease-out backwards; } /* キャラを切り替えたとき: 待たずにすぐ出す(空白を見せない) */
.jp-info.gone { animation: jp-left-out 0.22s ease-in forwards; pointer-events: none; }
.jp-info .row1 { display: flex; align-items: center; gap: 16px; }
.jp-cls { flex: none; width: 80px; height: 80px; display: grid; place-items: center; background: #34343a; color: #fff; font-size: 38px; font-weight: 700; border-left: 6px solid var(--tc); }
.jp-cls img { width: 54px; height: 54px; object-fit: contain; pointer-events: none; }
.jp-nm { min-width: 0; }
.jp-nm b { display: block; font-size: 48px; line-height: 1.1; font-weight: 700; color: #1d1d20; overflow-wrap: anywhere; }
.jp-pips { display: flex; gap: 6px; margin-top: 8px; color: var(--rc); font-size: 26px; }
.jp-pips i { font-style: normal; opacity: 0.25; color: #333; } .jp-pips i.on { opacity: 1; background: var(--rbg); -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-text-stroke: 1.5px rgba(0,0,0,0.55); }
.jp-tags { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0 12px; }
.jp-tags span { padding: 4px 22px; background: rgba(0,0,0,0.38); color: #fff; font-size: 24px; }
.jp-bar { display: flex; align-items: center; height: 56px; padding: 0 20px; background: rgba(0,0,0,0.5); color: #fff; font-size: 28px; font-weight: 600; margin-top: 14px; }
.jp-bar em { margin-left: auto; font-style: normal; letter-spacing: 4px; }
.jp-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 14px; }
.jp-stats div { text-align: center; }
.jp-stats .ic { width: 62px; height: 62px; margin: 0 auto 4px; background: #3d3d44; color: #fff; display: grid; place-items: center; font-size: 30px; }
.jp-stats small { display: block; font-size: 21px; color: #66666d; }
.jp-stats b { font-size: 40px; font-family: ${DISPLAY}; color: #2a2a2e; }
.jp-mini { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 14px; padding-top: 10px; border-top: 1px solid rgba(0,0,0,0.18); font-size: 23px; }
.jp-mini span { color: #66666d; display: block; font-size: 19px; } .jp-mini b { font-family: ${DISPLAY}; font-size: 30px; }
.jp-skills { display: flex; gap: 14px; margin-top: 12px; }
.jp-sk { width: 104px; text-align: center; }
.jp-sk .c { width: 104px; height: 104px; border-radius: 50%; background: radial-gradient(circle at 40% 30%, #fff, color-mix(in srgb, var(--tc) 40%, #e8e8e8)); border: 5px solid var(--tc); display: grid; place-items: center; font-size: 46px; font-weight: 700; color: #1d1d20; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
.jp-sk small { display: block; margin-top: 6px; font-size: 18px; color: #55555c; line-height: 1.25; overflow-wrap: anywhere; }
.jp-skpills { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
.jp-skpills span { display: inline-flex; align-items: center; height: 56px; padding: 0 26px; border-radius: 28px; background: #3a3a3f; color: #fff; font-size: 26px; font-weight: 600; }

/* 右: 黄色い斜めの面(一覧タブ) */
.jp-yel { position: absolute; z-index: 5; right: 160px; top: 0; width: 380px; height: 780px; animation: jp-right 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) 0.2s backwards; }
.jp-yel.gone { animation: jp-right-out 0.22s ease-in forwards; pointer-events: none; }
.jp-yel .shape { position: absolute; inset: 0; background: ${C.player}; clip-path: polygon(52% 0, 100% 0, 100% 100%, 0 100%, 0 26%); filter: drop-shadow(0 8px 18px rgba(0,0,0,0.25)); }
.jp-yel .big { position: absolute; left: 34px; top: 150px; font-family: ${DISPLAY}; font-weight: 700; font-size: 116px; line-height: 1; color: #1d1d20; }
.jp-yel .big small { font-size: 48px; margin-right: 4px; }
.jp-yel .cap { position: absolute; left: 38px; top: 274px; font-size: 22px; font-weight: 700; color: #3a3a3f; letter-spacing: 0.1em; }
.jp-yel .rar { position: absolute; left: 30px; right: 0; top: 320px; height: 72px; padding: 6px 18px; background: rgba(0,0,0,0.78); color: #fff; font-size: 25px; font-weight: 700; display: flex; flex-direction: column; justify-content: center; }
.jp-yel .rar .pp { background: var(--rbg); -webkit-background-clip: text; background-clip: text; color: transparent; font-size: 22px; letter-spacing: 4px; }
.jp-yel .relic { position: absolute; left: 30px; right: 0; top: 408px; padding: 12px 18px; background: rgba(0,0,0,0.78); color: #fff; font-size: 22px; line-height: 1.4; }
.jp-yel .relic small { display: block; color: ${C.player}; font-size: 19px; font-weight: 700; letter-spacing: 0.08em; }
.jp-yel .relic b { font-size: 28px; }
.jp-yel .sigbox { position: absolute; left: 30px; right: 0; top: 690px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: rgba(0,0,0,0.78); color: #fff; padding: 8px 14px; font-size: 22px; }
.jp-yel .sigbox > div { flex: 1; } .jp-yel .sigbox b { font-family: ${DISPLAY}; font-size: 30px; margin: 0 8px; } .jp-yel .sigbox small { font-size: 17px; color: #c9c9ce; }
.jp-yel .sigbox button { border: 0; padding: 8px 14px; background: ${C.player}; color: #1d1d20; font-size: 20px; font-weight: 700; cursor: pointer; }
.jp-yel .sigbox button:disabled { opacity: 0.4; cursor: default; } .jp-yel .sigbox .m { width: 100%; }
.jp-yel .tiles { position: absolute; left: 30px; right: 0; top: 590px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.jp-yel .tiles div { background: rgba(0,0,0,0.78); color: #fff; text-align: center; padding: 10px 0; }
.jp-yel .tiles small { display: block; font-size: 18px; color: #c9c9ce; } .jp-yel .tiles b { font-family: ${DISPLAY}; font-size: 36px; }

/* 右端: 縦のタブ */
.jp-tabs { position: absolute; z-index: 12; right: 56px; top: 170px; width: 100px; display: flex; flex-direction: column; gap: 14px; }
.jp-tab { position: relative; width: 100px; height: 148px; padding: 0; min-height: 0; border: 0; background: #2b2b2f; color: #cfcfd4; cursor: pointer; display: grid; place-items: center; font-size: 46px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); transition: background 0.15s, color 0.15s, transform 0.15s; animation: jp-right 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; animation-delay: calc(0.3s + var(--i) * 60ms); }
.jp-tab small { position: absolute; left: 0; right: 0; bottom: 8px; font-size: 17px; font-weight: 700; }
.jp-tab:hover:not(.on), .jp-tab:focus-visible { background: #4a4a50; color: #fff; outline: none; }
.jp-tab.on { background: #fff; color: #111; transform: translateX(-10px); }
.jp-tab.on::after { content: ''; position: absolute; right: 0; top: 0; bottom: 0; width: 6px; background: ${C.player}; }

/* 右: 内容のパネル(パッシブ / 特性・遺物 / 関連) */
.jp-pane { position: absolute; z-index: 6; right: 190px; top: 130px; width: 520px; max-height: 790px; overflow-y: auto; scrollbar-width: none; color: #1d1d20; animation: jp-right 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) 0.15s backwards; }
.jp-pane::-webkit-scrollbar { display: none; }
.jp-pane.gone { animation: jp-right-out 0.22s ease-in forwards; pointer-events: none; }
.jp.dk .jp-pane { color: #f1f1f2; }
.jp-ph { display: flex; align-items: center; gap: 12px; padding: 12px 20px; background: rgba(0,0,0,0.5); color: #fff; font-size: 34px; font-weight: 700; border-left: 8px solid ${C.player}; }
.jp-ph em { margin-left: auto; font-style: normal; font-size: 24px; color: #d6d6da; font-weight: 500; }
.jp-sec { margin: 22px 0 6px; padding: 4px 16px; background: rgba(0,0,0,0.28); font-size: 26px; font-weight: 700; letter-spacing: 0.06em; color: inherit; }
.jp-row { padding: 12px 6px; border-bottom: 1px dotted rgba(0,0,0,0.3); }
.jp.dk .jp-row { border-bottom-color: rgba(255,255,255,0.25); }
.jp-row .hd { display: flex; align-items: center; gap: 10px; font-size: 30px; font-weight: 700; }
.jp-row .hd i { font-style: normal; font-size: 18px; color: #77777e; }
.jp-row .tg { margin-left: auto; padding: 0 12px; background: ${C.player}; color: #111; font-size: 20px; font-weight: 700; }
.jp-row p { margin: 6px 0 0; font-size: 24px; line-height: 1.55; color: #3a3a3f; }
.jp.dk .jp-row p { color: #d6d6da; }
.jp-hi { display: flex; align-items: center; padding: 8px 16px; background: rgba(255,255,255,0.7); font-size: 30px; font-weight: 700; margin-top: 8px; }
.jp-hi b { margin-left: auto; font-family: ${DISPLAY}; font-size: 36px; }
.jp-rl { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-top: 16px; }
.jp-rc { background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.3); padding: 12px; }
.jp-rc .pl { position: relative; aspect-ratio: 1.3; clip-path: polygon(8% 0, 100% 0, 92% 100%, 0 100%); background: linear-gradient(170deg, color-mix(in srgb, var(--tc) 55%, #fff), var(--tc) 45%, #15151b); }
.jp-rc .pl svg { position: absolute; left: 50%; top: 50%; width: 52%; transform: translate(-50%, -50%); mix-blend-mode: multiply; opacity: 0.9; }
.jp-rc b { display: block; margin-top: 8px; font-size: 26px; } .jp-rc small { color: #c9c9ce; font-size: 20px; }
.jp-empty { margin-top: 24px; padding: 28px; background: rgba(0,0,0,0.35); color: #fff; font-size: 28px; line-height: 1.6; }

/* 所持一覧(全体の表) */
.jp-grid { position: absolute; inset: 0; z-index: 30; padding: 130px 90px 60px; overflow-y: auto; background: rgba(20,20,24,0.82); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); animation: jp-fade 0.25s ease-out backwards; }
.jp-grid.out { animation: jp-fadeout 0.2s ease-in forwards; }
.jp-grid h3 { margin: 0 0 24px; color: #fff; font-family: ${DISPLAY}; font-size: 44px; letter-spacing: 0.08em; }
.jp-gc { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 18px; }
.jp-gcard { position: relative; align-self: start; padding: 0; min-height: 0; border: 0; background: none; cursor: pointer; color: #fff; text-align: center; animation: jp-up 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; animation-delay: calc(min(var(--i), 20) * 25ms); }
.jp-gcard .pl { position: relative; aspect-ratio: 1; border: 3px solid transparent; background: linear-gradient(165deg, color-mix(in srgb, var(--tc) 55%, #fff), var(--tc) 45%, #15151b) padding-box, var(--rbg) border-box; transition: transform 0.15s; }
.jp-gcard .pl svg { position: absolute; inset: 12%; width: 76%; height: 76%; mix-blend-mode: multiply; opacity: 0.9; }
.jp-gcard .ct { position: absolute; right: 6px; bottom: 6px; padding: 0 10px; background: rgba(0,0,0,0.75); font-family: ${DISPLAY}; font-weight: 700; font-size: 26px; }
.jp-gcard span { display: block; margin-top: 8px; font-size: 24px; }
.jp-gcard:hover .pl, .jp-gcard:focus-visible .pl { transform: translateY(-6px); outline: none; }
.jp-gcard.on .pl { box-shadow: inset 0 0 0 6px ${C.player}; }

/* 開く・閉じるのブロック */
.jp-tiles { position: absolute; inset: 0; z-index: 40; display: grid; pointer-events: none; }
.jp-tiles i { background: #0d0d10; animation: jp-tile-out 0.2s linear var(--d) forwards; }
.jp-tiles.close i { animation: jp-tile-in 0.2s linear var(--d) forwards; opacity: 0; }
.jp-tiles.close { pointer-events: auto; }

/* 閉じる(出てきたときの逆向き) */
.jp.leaving .jp-list, .jp.leaving .jp-info, .jp.leaving .jp-pane { animation: jp-left-out 0.26s ease-in forwards; }
.jp.leaving .jp-yel, .jp.leaving .jp-tab { animation: jp-right-out 0.26s ease-in forwards; }
.jp.leaving .jp-top { animation: jp-down-out 0.26s ease-in forwards; }
.jp.leaving .jp-tools { animation: jp-up-out 0.26s ease-in forwards; }
.jp.leaving .jp-fig-in { animation: jp-glitch-out 0.3s ease-in forwards; }

/* ---- スマホ(縦長 1440×2560 以上) ---- */
.jp.p .jp-top { padding: 54px 64px 0 64px; }
.jp.p .jp-pill { display: none; }
.jp.p .jp-crumb { font-size: 38px; }
.jp.p .jp-list { left: 0; right: 0; top: 190px; bottom: auto; width: auto; height: 150px; display: flex; flex-direction: row; overflow-x: auto; overflow-y: hidden; padding: 0 30px; background: rgba(0,0,0,0.1); }
.jp.p .jp-av { flex: none; width: 140px; height: 150px; animation-name: jp-down; }
.jp.p .jp-av .ring { left: 20px; top: 22px; width: 100px; height: 100px; }
.jp.p .jp-av .tag { left: 8px; top: 16px; }
.jp.p .jp-av.on::before { inset: 0; background: linear-gradient(0deg, rgba(255,230,0,0.55), transparent 80%); }
.jp.p .jp-av.on::after { left: 0; right: 0; top: auto; bottom: 0; width: auto; height: 7px; }
.jp.p .jp-none { left: 64px; top: 900px; font-size: 44px; }
.jp.p .jp-tools { padding: 0 0 60px 64px; }
.jp.p .jp-tabs { left: 64px; right: 64px; top: 1280px; width: auto; flex-direction: row; gap: 10px; }
.jp.p .jp-tab { flex: 1; width: auto; height: 104px; animation-name: jp-up; }
.jp.p .jp-tab.on { transform: translateY(-8px); }
.jp.p .jp-tab.on::after { right: 0; left: 0; top: auto; bottom: 0; width: auto; height: 6px; }
.jp.p .jp-info { left: 64px !important; top: 1440px !important; width: calc(100% - 64px - 64px - 440px); }
.jp.p .jp-info .row1 { position: absolute; left: 0; top: -1070px; width: 1000px; }
.jp.p .jp-tags { position: absolute; left: 0; top: -940px; margin: 0; width: 1000px; }
.jp.p .jp-bar { margin-top: 0; }
.jp.p .jp-skills { margin-top: 10px; } .jp.p .jp-sk, .jp.p .jp-sk .c { width: 92px; } .jp.p .jp-sk .c { height: 92px; font-size: 40px; }
.jp.p .jp-skpills { display: none; }
.jp.p .jp-mini { font-size: 20px; } .jp.p .jp-mini b { font-size: 26px; }
.jp.p .jp-stats .ic { width: 52px; height: 52px; font-size: 26px; } .jp.p .jp-stats b { font-size: 34px; }
.jp.p .jp-yel { right: 64px; left: auto; top: 1440px; width: 420px; height: 640px; }
.jp.p .jp-yel .shape { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
.jp.p .jp-yel .big { left: 26px; top: 8px; font-size: 96px; } .jp.p .jp-yel .cap { left: 30px; top: 116px; font-size: 20px; }
.jp.p .jp-yel .rar { left: 20px; right: 20px; top: 160px; } .jp.p .jp-yel .relic { left: 20px; right: 20px; top: 252px; padding: 10px 14px; font-size: 20px; }
.jp.p .jp-yel .sigbox { left: 20px; right: 20px; top: 530px; } .jp.p .jp-yel .relic b { font-size: 24px; } .jp.p .jp-yel .tiles { left: 20px; right: 20px; top: 430px; } .jp.p .jp-yel .tiles b { font-size: 30px; }
.jp.p .jp-pane { left: 64px; right: 64px; top: 1440px; width: auto; max-height: 840px; }
.jp.p .jp-grid { padding: 160px 64px 60px; } .jp.p .jp-gc { grid-template-columns: repeat(4, 1fr); }
@media (prefers-reduced-motion: reduce) { .jp, .jp * { animation: none !important; transition: none !important; } }
`

// ---- 舞台を、画面に合わせる: 拡大・縮小して、足りない方向は舞台を広げて、画面いっぱいにする ----
function useStage(W, H) {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const f = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', f)
    return () => window.removeEventListener('resize', f)
  }, [])
  const scale = Math.min(size.w / W, size.h / H)
  return { scale, sw: size.w / scale, sh: size.h / scale }
}

const Pips = ({ rarity }) => (
  <div className="jp-pips">{[0, 1, 2, 3].map((i) => <i key={i} className={i < (PIPS[rarity] || 0) ? 'on' : ''}>◆</i>)}</div>
)

// 開く・閉じるときの、ブロック(散らばって出る/消える)
function Tiles({ cols, rows, close }) {
  const cells = useMemo(() => Array.from({ length: cols * rows }, () => (Math.random() * 0.32).toFixed(3)), [cols, rows])
  return (
    <div className={`jp-tiles${close ? ' close' : ''}`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }} aria-hidden="true">
      {cells.map((d, i) => <i key={i} style={{ '--d': `${d}s` }} />)}
    </div>
  )
}

export default function JinjiScreen({ ownedMap = {}, sigMap = {}, enhMap = {}, onEnhance = null, onExit }) {
  useArtStatus() // 絵が読み込めないと分かったら、描き直す
  const desktop = useIsDesktop()
  const L = desktop ? LAYOUT.d : LAYOUT.p
  const { scale, sw, sh } = useStage(L.W, L.H)
  const calm = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // 持っているキャラ。クラスの順番(編成と同じ)に並べる。同じクラスの中は、もとの順番
  const owned = useMemo(() => {
    const ord = (d) => { const i = CLASS_ORDER.indexOf(d.class); return i === -1 ? CLASS_ORDER.length : i }
    return ALL_CHARACTERS.filter((d) => ownedMap[d.id] > 0).map((d, i) => [d, i]).sort((a, b) => ord(a[0]) - ord(b[0]) || a[1] - b[1]).map((x) => x[0])
  }, [ownedMap])
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const list = useMemo(() => {
    const q = fold(query).split(/\s+/).filter(Boolean)
    return q.length ? owned.filter((d) => q.every((w) => fold(`${d.name} ${d.class} ${d.id}`).includes(w))) : owned
  }, [owned, query])

  const [selId, setSelId] = useState(() => (owned[0] ? owned[0].id : null))
  const sel = list.find((d) => d.id === selId) || list[0] || null
  const [tab, setTab] = useState('ov')
  const [tabGone, setTabGone] = useState(false) // タブを切り替えるとき、いまの内容が先に出ていく
  const [sweep, setSweep] = useState(0) // タブを切り替えるたびに増やす(黄色い帯を走らせる)
  const [figOut, setFigOut] = useState(false)
  const [figKey, setFigKey] = useState(0)
  const [textKey, setTextKey] = useState(0)
  const [swapped, setSwapped] = useState(false) // キャラを切り替えた直後(左の情報をすぐ出す)
  const [gridOpen, setGridOpen] = useState(false)
  const [gridOut, setGridOut] = useState(false)
  const [opening, setOpening] = useState(!calm)
  const [leaving, setLeaving] = useState(false)
  const timers = useRef([])
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.current.push(t); return t }
  useEffect(() => { const ts = timers.current; return () => ts.forEach(clearTimeout) }, [])
  useEffect(() => { if (opening) later(() => setOpening(false), 600) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => {
    if (leaving) return
    if (calm) { onExit(); return }
    setLeaving(true)
    later(onExit, 620)
  }
  const pick = (id) => {
    if (!sel || id === sel.id || leaving) return
    if (calm) { setSelId(id); return }
    setFigOut(true)
    later(() => { setSelId(id); setFigOut(false); setFigKey((k) => k + 1); setTextKey((k) => k + 1); setSwapped(true) }, 160)
  }
  const goTab = (k) => {
    if (k === tab || tabGone || leaving) return
    if (calm) { setTab(k); return }
    setTabGone(true)
    setSwapped(false)
    setSweep((s) => s + 1)
    later(() => { setTab(k); setTabGone(false) }, 230)
  }
  const step = (d) => {
    if (!sel || !list.length) return
    const i = list.findIndex((x) => x.id === sel.id)
    const n = list[(i + d + list.length) % list.length]
    if (n) pick(n.id)
  }
  useEffect(() => {
    const h = (e) => {
      if (gridOpen) { if (e.key === 'Escape') closeGrid(); return }
      if (searchOpen && e.target && e.target.tagName === 'INPUT') { if (e.key === 'Escape') setSearchOpen(false); return }
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowDown') { e.preventDefault(); step(1) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); step(-1) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }) // eslint-disable-line react-hooks/exhaustive-deps
  const closeGrid = () => { setGridOut(true); later(() => { setGridOpen(false); setGridOut(false) }, 200) }

  // 選んだキャラが見えるように、列を動かす
  const listRef = useRef(null)
  useEffect(() => {
    const el = listRef.current && sel ? listRef.current.querySelector(`[data-id="${sel.id}"]`) : null
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [sel && sel.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const c = sel
  const count = c ? ownedMap[c.id] || 0 : 0
  const sigN = c ? sigMap[c.id] || 0 : 0
  const enhLv = c ? enhMap[c.id] || 0 : 0
  const [enhBusy, setEnhBusy] = useState(false)
  const [enhMsg, setEnhMsg] = useState('')
  const doEnhance = async () => {
    if (!c || enhBusy || !onEnhance) return
    setEnhBusy(true); setEnhMsg('')
    try { await onEnhance(c.id) } catch (e) { setEnhMsg(e.message || '強化できませんでした') } finally { setEnhBusy(false) }
  }
  const tabDef = TABS.find((t) => t.k === tab) || TABS[0]
  const dark = tab === 'rl'
  const relic = c && c.relic ? RELICS[c.relic] : null
  const rel = c ? collectRelated(c) : { units: [], spells: [] }
  const relCount = rel.units.length + rel.spells.length
  const vars = c ? { '--rc': rarityColor(c), '--rbg': rarityBg(c), '--tc': tone(c) } : {}
  const figPos = desktop
    ? (tab === 'ov' ? { left: 'calc(56% - 330px)', top: 170, width: 660, height: 980 } : { left: 'calc(36% - 310px)', top: 190, width: 620, height: 940 })
    : { left: 'calc(50% - 260px)', top: 560, width: 520, height: 660 }
  const infoPos = desktop ? { left: 215, top: 125 } : {}

  const showStat = (k) => {
    const v = c.stats[k]
    return v ?? STAT_DEFAULT[k] ?? null
  }

  const infoBlock = c && (
    <div className={`jp-info${tabGone ? ' gone' : ''}${swapped ? ' sw' : ''}`} style={{ ...infoPos, ...vars }} key={`i${textKey}`}>
      <div className="row1">
        <div className="jp-cls" aria-label={c.class}>{CLASS_ICON[c.class] ? <img src={CLASS_ICON[c.class]} alt="" draggable={false} /> : c.class.slice(0, 1)}</div>
        <div className="jp-nm"><b>{c.name}</b><Pips rarity={c.rarity} /></div>
      </div>
      <div className="jp-tags">
        {(c.passives || []).filter((p) => typeof p === 'string').slice(0, 3).map((p) => <span key={p}>{passiveLabel(p)}</span>)}
        <span>{c.class}</span>
        {RARITY[c.rarity] && <span>{RARITY[c.rarity].label}</span>}
      </div>
      <div className="jp-bar">能力値<em>•••</em></div>
      <div className="jp-stats">
        {['hp', 'atk', 'def', 'spd'].map((k) => (
          <div key={k}><div className="ic"><StatIcon stat={k} /></div><small>{STAT_LABEL[k]}</small><b>{c.stats[k]}</b></div>
        ))}
      </div>
      <div className="jp-mini">
        {['mag', 'critRate', 'critDmg', 'dmgResist'].map((k) => {
          const v = k === 'mag' && c.stats.mag == null && c.skill?.stat === 'mag' ? 0 : showStat(k)
          return <div key={k}><span><StatIcon stat={k} style={{ fontSize: '1em', verticalAlign: '-0.14em', marginRight: 4 }} />{STAT_LABEL[k]}</span><b>{v == null ? '-' : v}{v != null && (k === 'critRate' || k === 'critDmg') ? '%' : ''}</b></div>
        })}
      </div>
      <div className="jp-bar" style={{ marginTop: 18 }}>スキル</div>
      <div className="jp-skills">
        <div className="jp-sk"><div className="c">⚔</div><small>{c.skill.name}</small></div>
        {(c.passives || []).slice(0, 3).map((p, i) => (
          <div className="jp-sk" key={i}><div className="c">✦</div><small>{passiveLabel(p)}</small></div>
        ))}
      </div>
      <div className="jp-skpills">
        <span>{c.skill.name}</span>
        {c.traits && c.traits[0] && <span>{c.traits[0].name}</span>}
        {c.accelerate && <span>{c.accelerate.name || 'アクセラレート'}</span>}
      </div>
    </div>
  )

  const yel = c && (
    <div className={`jp-yel${tabGone ? ' gone' : ''}`} style={vars}>
      <div className="shape" />
      <div className="big"><small>×</small>{sigN}</div>
      <div className="cap">{c.name}の署名 / SIGNATURE</div>
      <div className="rar"><span>{RARITY[c.rarity]?.label || c.rarity}</span><span className="pp">{'◆'.repeat(PIPS[c.rarity] || 0)}</span></div>
      <div className="relic">{relic ? <><small>遺物</small><b>{c.relic}</b><div>{relic.desc}</div></> : <><small>遺物</small><b>なし</b></>}</div>
      <div className="tiles">
        <div><small>パッシブ</small><b>{(c.passives || []).length}</b></div>
        <div><small>特性</small><b>{(c.traits || []).length + (c.accelerate ? 1 : 0)}</b></div>
        <div><small>関連</small><b>{relCount}</b></div>
      </div>
      <div className="sigbox">
        <div>強化 <b>Lv.{enhLv}</b><small>全ステータス +{enhLv * 10}</small></div>
        <button type="button" data-testid="jp-enhance" disabled={enhBusy || !onEnhance || sigN < 100} onClick={doEnhance}>強化する(署名100)</button>
        {(enhMsg || sigN < 100) && <small className="m">{enhMsg || `あと${100 - sigN}個`}</small>}
      </div>
    </div>
  )

  const AbilityRow = ({ head, tag, desc }) => (
    <div className="jp-row"><div className="hd"><i>○</i>{head}{tag && <span className="tg">{tag}</span>}</div>{desc && <p>{desc}</p>}</div>
  )
  const modText = (m) => `${STAT_LABEL[m.stat] || m.stat}  ${m.pct != null ? `+${m.pct}%` : `+${m.flat}`}`

  let pane = null
  if (c && tab === 'ab') {
    pane = (
      <div className={`jp-pane${tabGone ? ' gone' : ''}`}>
        <div className="jp-ph">{c.name}<em>パッシブ {(c.passives || []).length}</em></div>
        <div className="jp-hi">{c.skill.name}<b>×{c.skill.mult}</b></div>
        <div className="jp-row"><p>{DMG_TYPE[c.skill.type] || c.skill.type}ダメージ(参照: {c.skill.stat === 'mag' ? '魔力' : '攻撃力'} ×{c.skill.mult}{c.skill.add ? ` +${c.skill.add}` : ''})</p></div>
        {(c.passives || []).length === 0 && <div className="jp-empty">パッシブはありません。</div>}
        {(c.passives || []).map((p, i) => <AbilityRow key={i} head={passiveLabel(p)} tag={triggerLabel(p)} desc={passiveDesc(p)} />)}
      </div>
    )
  } else if (c && tab === 'tr') {
    pane = (
      <div className={`jp-pane${tabGone ? ' gone' : ''}`}>
        <div className="jp-ph">遺物ボーナス<em>{c.relic || 'なし'}</em></div>
        {relic ? (
          <>
            {relic.mods.map((m, i) => <div className="jp-hi" key={i} style={i ? { background: 'transparent', fontSize: 26 } : undefined}>{STAT_LABEL[m.stat] || m.stat}<b>{m.pct != null ? `+${m.pct}%` : `+${m.flat}`}</b></div>)}
            <div className="jp-row"><p>{relic.desc}</p></div>
          </>
        ) : <div className="jp-empty">遺物は持っていません。</div>}
        <div className="jp-sec">特性</div>
        {(c.traits || []).length === 0 && <div className="jp-row"><p>特性はありません。</p></div>}
        {(c.traits || []).map((t) => <AbilityRow key={t.id} head={t.name} tag={`MP${t.cost}`} desc={`${t.desc || ''}${t.repeatable ? ' ※1ターンに複数回使える' : ''}`} />)}
        {c.accelerate && (
          <>
            <div className="jp-sec">アクセラレート</div>
            <AbilityRow head={`${c.accelerate.name || 'アクセラレート'}_${c.accelerate.speed}`} tag={`MP${c.accelerate.cost}`} desc={`${c.accelerate.desc || ''}(速度 ${c.accelerate.speed})`} />
          </>
        )}
        <div className="jp-sec">その他</div>
        <div className="jp-row"><p>{c.type ? `タイプ: ${c.type} ・ ` : ''}進化: {c.evolvable === false ? 'できない' : 'できる'}{c.countdown != null ? ` ・ カウントダウン: ${c.countdown}` : ''}{c.amulet ? ' ・ アミュレット' : ''}</p></div>
      </div>
    )
  } else if (c && tab === 'rl') {
    pane = (
      <div className={`jp-pane${tabGone ? ' gone' : ''}`}>
        <div className="jp-ph">関連<em>{relCount}</em></div>
        {relCount === 0 && <div className="jp-empty">このキャラに関連する、召喚キャラ・スペルはありません。</div>}
        {rel.units.length > 0 && <div className="jp-sec" style={{ color: '#fff' }}>召喚・変身するキャラ</div>}
        <div className="jp-rl">
          {rel.units.map((u) => (
            <div className="jp-rc" key={u.id} style={{ '--tc': tone(u) }}>
              <div className="pl"><Emblem seed={u.id} /></div>
              <b>{u.name}</b><small>{u.class}{u.stats ? ` ・ 攻${u.stats.atk}` : ''}</small>
            </div>
          ))}
        </div>
        {rel.spells.length > 0 && <div className="jp-sec" style={{ color: '#fff' }}>使えるようになるスペル</div>}
        {rel.spells.map((s) => <AbilityRow key={s.id} head={`✦${s.name}`} tag={`MP${s.cost}`} desc={s.desc} />)}
      </div>
    )
  }

  const pct = ALL_CHARACTERS.length ? Math.round((owned.length / ALL_CHARACTERS.length) * 100) : 0
  const cols = desktop ? 16 : 9
  const rows = desktop ? 9 : 16

  return (
    <div className={`jp theme-light${desktop ? '' : ' p'}${dark ? ' dk' : ''}${leaving ? ' leaving' : ''}`} data-testid="jinji" role="dialog" aria-label="人事">
      <style>{CSS}</style>
      <div className="jp-stage" style={{ width: sw, height: sh, transform: `translate(-50%, -50%) scale(${scale})` }}>
        <div className="jp-bg" />
        <div className="jp-dark" />

        <div className="jp-top">
          <div className="jp-crumb"><IconAgents />{c ? c.name : '人事'}<small>/ {tabDef.label === '一覧' ? '一覧' : tabDef.label}</small></div>
          <button type="button" className="jp-pill" onClick={() => setGridOpen(true)} data-testid="jp-grid-open">▦ 所持一覧</button>
          <button type="button" className="jp-x" style={desktop ? undefined : { marginLeft: 'auto' }} onClick={close} aria-label="閉じる" data-testid="jp-close"><IconClose /></button>
        </div>

        <div className="jp-list" ref={listRef}>
          {list.map((d, i) => (
            <button key={d.id} type="button" data-id={d.id} data-testid={`jp-av-${d.id}`} className={`jp-av${c && d.id === c.id ? ' on' : ''}`} style={{ '--i': Math.min(i, 8), '--rc': rarityColor(d), '--rbg': rarityBg(d), '--tc': tone(d) }} onClick={() => pick(d.id)} aria-label={d.name}>
              <span className="ring"><Emblem seed={d.id} zoom={2.2} /></span>
              {enhMap[d.id] > 0 && <span className="tag">Lv.{enhMap[d.id]}</span>}
            </button>
          ))}
        </div>

        {!c && <div className="jp-none">{owned.length === 0 ? <>所持しているキャラがいません。<br />ガチャで仲間を迎えましょう。</> : '見つかりませんでした。'}</div>}

        {c && (
          <div className="jp-fig" style={{ ...figPos, ...vars }}>
            <div className={`jp-fig-in${figOut ? ' out' : ''}`} key={`f${figKey}`}>
              <i className="slab a" /><i className="slab b" /><i className="slab c" />
              <div className="floor" />
              <div className={`plate${c.rarity === 'legend' ? ' leg' : ''}${artOf(c.id) ? ' has-art' : ''}`}><Emblem seed={c.id} /><i /></div>
            </div>
          </div>
        )}

        {c && tab === 'ov' && infoBlock}
        {c && tab === 'ov' && yel}
        {pane}

        {c && (
          <div className="jp-tabs">
            {TABS.map((t, i) => (
              <button key={t.k} type="button" className={`jp-tab${t.k === tab ? ' on' : ''}`} style={{ '--i': i }} onClick={() => goTab(t.k)} aria-label={t.label} aria-pressed={t.k === tab} data-testid={`jp-tab-${t.k}`}>
                <span aria-hidden="true">{t.glyph}</span><small>{t.label}</small>
              </button>
            ))}
          </div>
        )}
        {sweep > 0 && <><i className="jp-sweepbar" key={`s${sweep}`} /><i className="jp-sweepbar b" key={`t${sweep}`} /></>}

        <div className="jp-tools">
          <button type="button" className="jp-tool" onClick={() => setGridOpen(true)} aria-label="所持一覧">▦</button>
          <button type="button" className={`jp-tool${searchOpen ? ' on' : ''}`} onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setQuery('') }} aria-label="さがす">⌕</button>
          {searchOpen && <input className="jp-search" autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="名前・クラス" aria-label="さがす" />}
          <div className="jp-pct" title="所持キャラ / 全キャラ">◔ {pct}%</div>
        </div>

        {gridOpen && (
          <div className={`jp-grid${gridOut ? ' out' : ''}`} data-testid="jp-grid" role="dialog" aria-label="所持一覧">
            <h3>所持一覧 {owned.length} / {ALL_CHARACTERS.length}</h3>
            <div className="jp-gc">
              {owned.map((d, i) => (
                <button key={d.id} type="button" className={`jp-gcard${c && d.id === c.id ? ' on' : ''}`} style={{ '--i': i, '--rc': rarityColor(d), '--rbg': rarityBg(d), '--tc': tone(d) }} onClick={() => { pick(d.id); closeGrid() }}>
                  <div className="pl"><Emblem seed={d.id} />{enhMap[d.id] > 0 && <span className="ct">Lv.{enhMap[d.id]}</span>}</div>
                  <span>{d.name}</span>
                </button>
              ))}
            </div>
            <button type="button" className="jp-x" style={{ position: 'absolute', right: 56, top: 36 }} onClick={closeGrid} aria-label="一覧を閉じる"><IconClose /></button>
          </div>
        )}
      </div>
      {(opening || leaving) && !calm && <Tiles key={leaving ? 'c' : 'o'} cols={cols} rows={rows} close={leaving} />}
    </div>
  )
}
