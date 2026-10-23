import { useEffect, useRef, useState } from 'react'
import { useIsDesktop, C, FONT, DISPLAY } from './ui.js'
import {
  MAX_SLOTS, MAX_AMULET_SLOTS, validateFormation, canPlace, placeChar, removeChar, swapSlots, quickFill,
  saveFormation, loadFormation, defaultFormation, MAX_SPELL_SLOTS, saveSpellSet, loadSpellSet, validateSpellSet, canUseSpell, spellClassOf, teamClassOf,
} from './battle/formation.js'
import { MAX_PARTIES, partyToSlots, partyToSpells, partyCount } from './battle/parties.js'
import { RARITY } from './CodexScreen.jsx'
import { artOf, ArtImg, useArtStatus } from './charArt.jsx'

// 編成画面。参考: エンドフィールドの「編成」
//   床の円(スロット)にキャラが立つ。順番は、行動値が同じときの優先順(1番目が最優先)
//   円をタップ → 左にキャラ一覧が出る → キャラをタップで、そのスロットに入る
//   「簡易編成」(旧: クイック編成) = 入れたい順にキャラをタップして、選んだ順に1番目から詰める
//   下のタブ(01〜05)で、パーティーを切り替える(アカウントのときだけ)
//   PC: 1920×1080(フルHD・16:9) / スマホ: 1080×1920(フルHD・9:16) の舞台を作り、画面に収まるように拡大・縮小する(PCかスマホかは useIsDesktop)
//
// props は、これまでの FormationScreen と同じ
//   parties: アカウントのパーティー(最大 MAX_PARTIES。なければ null)。partyIdxInit: 最初に開くパーティーの番号
//   onSaveParty(番号, スロット, スペル): 保存して、成功なら true
//   onStart がないときは「保存するだけの編成画面」(PARTY)になる

const pad = (n) => String(n).padStart(2, '0')

// 舞台の大きさと、床の円の位置(舞台の中の座標。円のまん中)。左から順に、スロット1〜5
//   d = PC(横長 1920×1080) / p = スマホ(縦長 1080×1920)
//   rw,rh: 円の大きさ / uw,uh: 立っているキャラの板 / pw: 名前の札の幅 / pt: 円から札までの距離
const LAYOUT = {
  d: {
    W: 1920, H: 1080, rw: 300, rh: 104, uw: 220, uh: 480, pw: 270, pt: 66,
    pos: [{ x: 520, y: 560 }, { x: 800, y: 640 }, { x: 1090, y: 680 }, { x: 1380, y: 640 }, { x: 1650, y: 560 }],
  },
  p: {
    W: 1080, H: 1920, rw: 220, rh: 76, uw: 180, uh: 400, pw: 204, pt: 50,
    pos: [{ x: 130, y: 640 }, { x: 335, y: 720 }, { x: 540, y: 760 }, { x: 745, y: 720 }, { x: 950, y: 640 }],
  },
}

const CSS = `
.fm { position: fixed; inset: 0; z-index: 20; background: #050506; color: ${C.ink}; font-family: ${FONT}; overflow: hidden; animation: fm-fade 0.25s ease-out backwards; }
.fm button { font-family: ${FONT}; }
@keyframes fm-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes fm-rise { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: none; } }
@keyframes fm-num { from { opacity: 0; transform: translateX(60px); } to { opacity: 1; transform: none; } }
@keyframes fm-panel { from { opacity: 0; transform: translateX(-60px); } to { opacity: 1; transform: none; } }
@keyframes fm-band { from { opacity: 0; transform: scaleY(0.05); } to { opacity: 1; transform: none; } }

.fm-stage { position: absolute; left: 50%; top: 50%; transform-origin: center center; overflow: hidden; }
.fm-ui { position: absolute; }

/* 背景: 暗い地に、床の等高線と、黄色の斜めの帯 */
.fm-bg { position: absolute; inset: 0; pointer-events: none;
  background:
    repeating-radial-gradient(ellipse 1500px 520px at 62% 125%, transparent 0 70px, rgba(255,255,255,0.045) 70px 73px),
    radial-gradient(ellipse at 62% 40%, #25272b 0%, #15161a 48%, #0a0a0c 80%); }
.fm-bg i { position: absolute; top: -10%; height: 130%; background: ${C.player}; transform: skewX(-24deg); }
.fm-bg i:nth-child(1) { right: 6%; width: 120px; opacity: 0.07; }
.fm-bg i:nth-child(2) { right: 15%; width: 26px; opacity: 0.22; }
.fm-no { position: absolute; right: 150px; top: 40px; font-family: ${DISPLAY}; font-weight: 700; font-style: italic; font-size: 380px; line-height: 1; letter-spacing: 0.02em; color: rgba(255,255,255,0.06); pointer-events: none; animation: fm-num 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }

.fm-top { position: absolute; left: 0; right: 0; top: 0; z-index: 12; display: flex; align-items: center; padding: 40px 56px; pointer-events: none; }
.fm-title { display: flex; align-items: center; gap: 14px; font-family: ${DISPLAY}; font-weight: 600; font-style: italic; font-size: 40px; letter-spacing: 0.08em; color: ${C.mute}; }
.fm-title b { color: ${C.ink}; font-style: normal; }
.fm-title svg { font-size: 56px; color: ${C.player}; }
.fm-x { pointer-events: auto; margin-left: auto; width: 84px; height: 84px; padding: 0; min-height: 0; border: 0; border-radius: 50%; background: #f2f2f3; color: #1c1c1f; font-size: 48px; display: grid; place-items: center; cursor: pointer; transition: background 0.15s, transform 0.15s; }
.fm-x:hover, .fm-x:focus-visible { background: ${C.player}; transform: rotate(90deg); outline: none; }

.fm-arrow { position: absolute; top: 400px; z-index: 6; width: 90px; height: 140px; padding: 0; min-height: 0; border: 0; background: none; color: rgba(255,255,255,0.7); font-size: 64px; display: grid; place-items: center; cursor: pointer; transition: color 0.15s, transform 0.15s; }
.fm-arrow.l { left: 20px; } .fm-arrow.r { right: 20px; }
.fm-arrow:hover, .fm-arrow:focus-visible { color: ${C.player}; outline: none; }
.fm-arrow.l:hover { transform: translateX(-6px); } .fm-arrow.r:hover { transform: translateX(6px); }
.fm.open .fm-arrow { display: none; }

/* 床と、立っているキャラ。左の一覧が開いているときは、右に寄せて小さくする */
.fm-floor { position: absolute; inset: 0; z-index: 3; pointer-events: none; transform-origin: 100% 0; transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1); }
.fm.open .fm-floor { transform: translate(0, 60px) scale(0.7); }
.fm-slot { position: absolute; z-index: 1; padding: 0; min-height: 0; border: 0; background: none; cursor: pointer; pointer-events: auto; }
.fm-slot .ring { position: absolute; inset: 0; border-radius: 50%; border: 3px solid rgba(255,255,255,0.4); transition: border-color 0.15s, box-shadow 0.15s; }
.fm-slot .ring.r2 { inset: 11px 27px; border-width: 1.5px; border-color: rgba(255,255,255,0.22); }
.fm-slot .no { position: absolute; left: -24px; bottom: -8px; font-family: ${DISPLAY}; font-weight: 700; font-style: italic; font-size: 34px; color: rgba(255,255,255,0.45); }
.fm-slot .plus { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -54%); font-family: ${DISPLAY}; font-weight: 500; font-size: 52px; color: rgba(255,255,255,0.55); }
.fm-slot:hover .ring, .fm-slot:focus-visible .ring { border-color: ${C.player}; }
.fm-slot:focus-visible { outline: none; }
.fm-slot.sel .ring { border-color: ${C.player}; box-shadow: 0 0 28px rgba(255,230,0,0.4); }

.fm-unit { position: absolute; pointer-events: none; animation: fm-rise 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; animation-delay: calc(var(--i) * 80ms); }
.fm-fig { position: absolute; inset: 0; clip-path: polygon(14% 0, 100% 0, 86% 100%, 0 100%); background: linear-gradient(170deg, color-mix(in srgb, var(--rc) 55%, #fff) 0%, var(--rc) 42%, #14141a 100%); filter: drop-shadow(0 20px 24px rgba(0,0,0,0.6)); }
.fm-fig::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 8px; background: var(--rbg); }
.fm-fig.leg { background: var(--rbg); }
.fm-fig.leg::before { content: ''; position: absolute; inset: 0; clip-path: polygon(calc(14% + 7px) 7px, calc(100% - 7px) 7px, calc(86% - 7px) calc(100% - 7px), 7px calc(100% - 7px)); background: linear-gradient(170deg, color-mix(in srgb, var(--rc) 55%, #fff) 0%, var(--rc) 42%, #14141a 100%); }
.fm-fig img.art { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.fm-fig.leg img.art { clip-path: polygon(calc(14% + 7px) 7px, calc(100% - 7px) 7px, calc(86% - 7px) calc(100% - 7px), 7px calc(100% - 7px)); }
.fm-card .th img.art { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.fm-fig svg.em { position: absolute; left: 50%; top: 8%; width: 70%; transform: translateX(-50%); opacity: 0.92; mix-blend-mode: multiply; }
.fm-fig svg.sil { position: absolute; left: 50%; bottom: 0; width: 86%; height: 44%; transform: translateX(-50%); fill: #000; opacity: 0.85; }
.fm-plate { position: absolute; text-align: center; pointer-events: auto; }
.fm-plate .nm { font-size: 30px; font-weight: 700; line-height: 1.3; text-shadow: 0 2px 8px rgba(0,0,0,0.8); }
.fm-plate .cl { display: inline-block; margin-top: 2px; padding: 0 12px; border-left: 5px solid var(--rc); background: rgba(0,0,0,0.6); font-size: 21px; font-weight: 700; }
.fm-plate .st { margin-top: 4px; font-size: 20px; color: #d6d6dc; text-shadow: 0 2px 6px rgba(0,0,0,0.8); }
.fm-ctl { display: flex; justify-content: center; gap: 8px; margin-top: 10px; }
.fm-ctl button { width: 64px; height: 46px; padding: 0; min-height: 0; border: 0; background: rgba(255,255,255,0.16); color: #fff; font-size: 24px; display: grid; place-items: center; cursor: pointer; transition: background 0.15s, color 0.15s; }
.fm-ctl button:hover:not(:disabled), .fm-ctl button:focus-visible { background: #f2f2f3; color: #111; outline: none; }
.fm-ctl button.rm:hover:not(:disabled), .fm-ctl button.rm:focus-visible { background: ${C.bad}; color: #fff; }
.fm-ctl button:disabled { opacity: 0.25; cursor: default; }

/* 左下: パーティーのタブ */
.fm-team { position: absolute; left: 56px; bottom: 74px; z-index: 12; }
.fm-chip { display: flex; align-items: center; margin-bottom: 14px; }
.fm-chip .ic { width: 78px; height: 52px; border-radius: 26px 0 0 26px; background: #f2f2f3; color: #1c1c1f; font-size: 28px; display: grid; place-items: center; }
.fm-chip .nm { min-width: 240px; height: 52px; padding: 0 20px; display: flex; align-items: center; background: rgba(0,0,0,0.55); border-left: 4px solid ${C.player}; font-size: 28px; font-weight: 700; letter-spacing: 0.04em; }
.fm-tabs { display: flex; gap: 6px; }
.fm-tabs button { width: 96px; height: 62px; padding: 0; min-height: 0; border: 0; background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.65); cursor: pointer; transition: background 0.15s; line-height: 1.15; }
.fm-tabs button b { display: block; font-family: ${DISPLAY}; font-weight: 700; font-size: 26px; letter-spacing: 0.06em; }
.fm-tabs button small { display: block; font-size: 17px; font-weight: 600; opacity: 0.85; }
.fm-tabs button:hover, .fm-tabs button:focus-visible { background: rgba(255,255,255,0.28); outline: none; }
.fm-tabs button.on { background: ${C.player}; color: ${C.onAccent}; }

/* 右下: ボタンと、状態の表示 */
.fm-status { position: absolute; right: 56px; bottom: 186px; z-index: 12; width: 960px; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; pointer-events: none; }
.fm-status > div { padding: 6px 18px; background: rgba(0,0,0,0.7); border-right: 5px solid ${C.warn}; font-size: 24px; font-weight: 700; color: ${C.warn}; }
.fm-btns { position: absolute; right: 56px; bottom: 74px; z-index: 12; display: flex; gap: 16px; }
.fm-btn { display: inline-flex; align-items: center; gap: 14px; min-width: 300px; height: 88px; padding: 0 0 0 30px; border: 0; background: #f2f2f3; color: #111; font-size: 30px; font-weight: 700; cursor: pointer; clip-path: polygon(24px 0, 100% 0, 100% 100%, 0 100%, 0 24px); transition: transform 0.15s, background 0.15s; }
.fm-btn .ic { margin-left: auto; align-self: stretch; width: 88px; display: grid; place-items: center; background: rgba(0,0,0,0.14); font-size: 36px; }
.fm-btn.hot { background: ${C.player}; }
.fm-btn:hover:not(:disabled), .fm-btn:focus-visible { transform: translateY(-4px); outline: none; }
.fm-btn:disabled { background: #3a3a3f; color: #77777e; cursor: default; }

/* 左: キャラ一覧 / スペルの一覧 / スペルセット */
.fm-panel { position: absolute; left: 56px; top: 140px; z-index: 11; width: 660px; height: 800px; display: flex; flex-direction: column; animation: fm-panel 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.fm-ph { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; font-size: 26px; font-weight: 700; letter-spacing: 0.04em; color: #e6e6ea; min-height: 54px; }
.fm-ph span { flex: 1; }
.fm-ph button { height: 54px; padding: 0 26px; min-height: 0; border: 0; background: #f2f2f3; color: #1c1c1f; font-size: 24px; font-weight: 700; cursor: pointer; }
.fm-ph button:hover, .fm-ph button:focus-visible { background: ${C.player}; outline: none; }
.fm-grid { flex: 1; min-height: 0; overflow-y: auto; display: grid; grid-template-columns: repeat(2, 1fr); grid-auto-rows: 132px; gap: 10px; align-content: start; padding: 8px; background: rgba(0,0,0,0.4); scrollbar-width: none; }
.fm-grid::-webkit-scrollbar { display: none; }
.fm-grid.one { grid-template-columns: 1fr; grid-auto-rows: auto; }
.fm-card { position: relative; display: flex; align-items: center; gap: 14px; padding: 0 16px 0 0; min-height: 0; overflow: hidden; border: 0; background: #1f2024; color: ${C.ink}; text-align: left; cursor: pointer; box-shadow: inset 0 0 0 2px rgba(255,255,255,0.12); transition: transform 0.12s, box-shadow 0.12s; }
.fm-card .th { position: relative; flex: none; width: 112px; align-self: stretch; border-bottom: 6px solid transparent; background: linear-gradient(165deg, color-mix(in srgb, var(--rc) 55%, #fff) 0%, var(--rc) 45%, #17171d 100%) padding-box, var(--rbg) border-box; }
.fm-card.leg .th { border: 4px solid transparent; }
.fm-card .th svg { position: absolute; left: 14%; top: 10%; width: 72%; mix-blend-mode: multiply; opacity: 0.92; }
.fm-card .tx { flex: 1; min-width: 0; }
.fm-card .nm { font-size: 27px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fm-card .cl { font-size: 20px; font-weight: 700; color: color-mix(in srgb, var(--rc) 62%, #fff); }
.fm-card .st { margin-top: 2px; font-size: 18px; color: ${C.mute}; }
.fm-card .tag { position: absolute; right: 10px; top: 8px; padding: 0 10px; background: rgba(255,255,255,0.14); font-size: 17px; font-weight: 700; }
.fm-card .tag.warn { background: rgba(0,0,0,0.6); color: ${C.warn}; }
.fm-card .bn { position: absolute; right: 8px; top: 8px; min-width: 38px; height: 38px; padding: 0 6px; display: grid; place-items: center; background: ${C.player}; color: ${C.onAccent}; font-family: ${DISPLAY}; font-weight: 700; font-size: 26px; }
.fm-card.sel { box-shadow: inset 0 0 0 5px ${C.player}; background: #2a2a1a; }
.fm-card:hover:not(:disabled), .fm-card:focus-visible { transform: translateX(4px); box-shadow: inset 0 0 0 4px #fff; outline: none; }
.fm-card.sel:hover:not(:disabled), .fm-card.sel:focus-visible { box-shadow: inset 0 0 0 5px ${C.player}; }
.fm-card:disabled { opacity: 0.4; cursor: default; }
.fm-card.sp { display: block; padding: 12px 16px; }
.fm-card.sp .nm { white-space: normal; }
.fm-card.sp .st { font-size: 20px; line-height: 1.5; }
.fm-quick { margin-bottom: 12px; padding: 12px 18px; background: rgba(255,255,255,0.1); font-size: 22px; line-height: 1.6; }
.fm-quick b { color: ${C.player}; }

.fm-amulets { position: absolute; left: 440px; top: 140px; z-index: 6; width: 300px; }
.fm-amulets .hd { margin-bottom: 10px; font-size: 24px; font-weight: 700; color: #e6e6ea; }
.fm-amulets .hd b { font-family: ${DISPLAY}; font-size: 30px; color: ${C.player}; }
.fm-am { display: flex; align-items: stretch; margin-bottom: 8px; background: rgba(0,0,0,0.55); border-left: 5px solid ${C.player}; }
.fm-am.on { border-left-color: var(--rc); }
.fm-am .pick { flex: 1; min-width: 0; min-height: 0; padding: 10px 14px; border: 0; background: none; color: ${C.ink}; text-align: left; cursor: pointer; display: flex; flex-direction: column; gap: 2px; }
.fm-am .pick:hover, .fm-am .pick:focus-visible { background: rgba(255,255,255,0.1); outline: none; }
.fm-am .nm { font-size: 22px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fm-am .nm.empty { color: rgba(255,255,255,0.6); }
.fm-am .cl { font-size: 17px; font-weight: 700; color: color-mix(in srgb, var(--rc) 62%, #fff); }
.fm-am .rm { flex: none; width: 46px; min-height: 0; padding: 0; border: 0; background: rgba(255,255,255,0.16); color: ${C.bad}; font-size: 22px; display: grid; place-items: center; cursor: pointer; }
.fm-am .rm:hover, .fm-am .rm:focus-visible { background: ${C.bad}; color: #fff; outline: none; }
.fm-spells { position: absolute; left: 56px; top: 140px; z-index: 6; width: 360px; }
.fm-spells .hd { margin-bottom: 12px; font-size: 26px; font-weight: 700; color: #e6e6ea; }
.fm-spells .hd b { font-family: ${DISPLAY}; font-size: 34px; color: ${C.player}; }
.fm-spell { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; padding: 10px 14px; background: rgba(0,0,0,0.55); border-left: 5px solid ${C.player}; }
.fm-spell.ng { border-left-color: ${C.warn}; }
.fm-spell .tx { flex: 1; min-width: 0; }
.fm-spell .nm { font-size: 24px; font-weight: 700; }
.fm-spell .ds { font-size: 17px; line-height: 1.45; color: ${C.mute}; }
.fm-spell .ng-t { font-size: 17px; color: ${C.warn}; }
.fm-spell button { flex: none; width: 46px; height: 46px; padding: 0; min-height: 0; border: 0; background: rgba(255,255,255,0.16); color: ${C.bad}; font-size: 22px; display: grid; place-items: center; cursor: pointer; }
.fm-spell button:hover, .fm-spell button:focus-visible { background: ${C.bad}; color: #fff; outline: none; }
.fm-add { width: 100%; height: 62px; padding: 0; min-height: 0; border: 3px dashed rgba(255,255,255,0.4); background: none; color: #e6e6ea; font-size: 24px; font-weight: 700; cursor: pointer; }
.fm-add:hover, .fm-add:focus-visible { border-color: ${C.player}; color: ${C.player}; outline: none; }
.fm-sinfo { flex: none; margin-top: 10px; padding: 14px 18px; background: rgba(0,0,0,0.72); border-left: 5px solid ${C.player}; display: flex; align-items: center; gap: 16px; min-height: 120px; }
.fm-sinfo .tx { flex: 1; min-width: 0; }
.fm-sinfo .nm { font-size: 24px; font-weight: 700; }
.fm-sinfo .ds { margin-top: 4px; font-size: 20px; line-height: 1.55; color: #e6e6ea; }
.fm-sinfo .ng-t { margin-top: 4px; font-size: 18px; color: ${C.warn}; }
.fm-sinfo .add { flex: none; height: 64px; min-height: 0; padding: 0 26px; border: 0; background: ${C.player}; color: ${C.onAccent}; font-size: 24px; font-weight: 700; cursor: pointer; }
.fm-sinfo .add:disabled { background: #3a3a3f; color: #77777e; cursor: default; }
.fm-sinfo.empty { color: ${C.mute}; font-size: 20px; border-left-color: rgba(255,255,255,0.2); }
.fm-note { margin-top: 12px; font-size: 17px; line-height: 1.55; color: ${C.mute}; }

/* 確認: 白い帯がまん中からひらく */
.fm-back { position: absolute; inset: 0; z-index: 30; display: grid; place-items: center; background: rgba(0,0,0,0.6); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); animation: fm-fade 0.2s ease-out backwards; }
.fm-band { width: 100%; padding: 56px 20px 60px; background: #f1f1f2; color: #1c1c1f; text-align: center; box-shadow: 0 0 0 1px rgba(0,0,0,0.2), 0 40px 100px rgba(0,0,0,0.5); animation: fm-band 0.28s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.fm-band .msg { font-size: 38px; font-weight: 700; line-height: 1.6; }
.fm-band .faces { display: flex; justify-content: center; gap: 12px; margin: 26px 0 34px; }
.fm-band .faces i { width: 84px; height: 84px; border: 4px solid transparent; border-bottom-width: 6px; background: linear-gradient(165deg, color-mix(in srgb, var(--rc) 55%, #fff), var(--rc) 50%, #17171d) padding-box, var(--rbg) border-box; }
.fm-band .faces i.no { background: #d4d4d9; border-color: transparent; border-bottom: 6px solid #bbb; }
.fm-band .row { display: flex; justify-content: center; gap: 30px; }
.fm-band .b { display: inline-flex; align-items: center; justify-content: center; gap: 16px; min-width: 380px; height: 80px; padding: 0 30px; border-radius: 999px; border: 3px solid #3a3a3e; background: #3a3a3e; color: #fff; font-size: 30px; font-weight: 700; cursor: pointer; min-height: 0; transition: transform 0.15s, filter 0.15s; }
.fm-band .b.ok { background: ${C.player}; border-color: #2a2a2e; color: #111; }
.fm-band .b:hover, .fm-band .b:focus-visible { transform: translateY(-3px); filter: brightness(1.12); outline: none; }
/* ---------- スマホ(縦 1080×1920)。上から: 床とキャラ → 状態 → スペル → パーティーのタブ → ボタン ---------- */
.fm.p .fm-top { padding: 48px 44px; }
.fm.p .fm-title { font-size: 40px; }
.fm.p .fm-title svg { font-size: 52px; }
.fm.p .fm-x { width: 88px; height: 88px; }
.fm.p .fm-no { right: 50px; top: 150px; font-size: 300px; }
.fm.p .fm-arrow { display: none; }
.fm.p .fm-floor { transform-origin: 50% 0; }
.fm.p.open .fm-floor { transform: translate(0, 110px) scale(0.62); }
.fm.p .fm-slot .no { left: -14px; bottom: -6px; font-size: 28px; }
.fm.p .fm-slot .plus { font-size: 44px; }
.fm.p .fm-plate .nm { font-size: 25px; }
.fm.p .fm-plate .cl { font-size: 18px; padding: 0 10px; }
.fm.p .fm-plate .st { font-size: 17px; line-height: 1.4; }
.fm.p .fm-ctl { gap: 6px; margin-top: 8px; }
.fm.p .fm-ctl button { width: 58px; height: 46px; font-size: 22px; }
.fm.p .fm-status { right: 48px; bottom: auto; top: 1010px; width: 984px; }
.fm.p.open .fm-status { top: 790px; }
.fm.p .fm-status > div { font-size: 22px; }
.fm.p .fm-amulets { left: 48px; right: 48px; top: 1130px; width: auto; display: flex; align-items: stretch; gap: 10px; flex-wrap: wrap; }
.fm.p .fm-amulets .hd { flex: none; width: 100%; margin: 0 0 4px; font-size: 24px; }
.fm.p .fm-am { flex: 1; min-width: 0; margin: 0; }
.fm.p .fm-am .nm { font-size: 22px; }
.fm.p .fm-spells { left: 48px; top: 1262px; width: 984px; }
.fm.p .fm-spells .fm-note { display: none; }
.fm.p .fm-spells .hd { margin-bottom: 8px; font-size: 24px; }
.fm.p .fm-spell { margin-bottom: 8px; padding: 8px 14px; }
.fm.p .fm-spell .nm { font-size: 24px; }
.fm.p .fm-spell .ds { font-size: 17px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fm.p .fm-spell .ng-t { font-size: 16px; }
.fm.p .fm-spell button { width: 52px; height: 52px; }
.fm.p .fm-add { height: 60px; font-size: 22px; }
.fm.p .fm-note { margin-top: 8px; font-size: 16px; line-height: 1.5; }
.fm.p .fm-panel { left: 48px; top: 940px; width: 984px; height: 600px; }
.fm.p .fm-ph { margin-bottom: 10px; min-height: 52px; font-size: 24px; }
.fm.p .fm-ph button { height: 52px; padding: 0 22px; font-size: 22px; }
.fm.p .fm-quick { margin-bottom: 8px; padding: 8px 14px; font-size: 19px; line-height: 1.5; }
.fm.p .fm-grid { grid-auto-rows: 124px; }
.fm.p .fm-grid.one { grid-auto-rows: auto; }
.fm.p .fm-card .th { width: 100px; }
.fm.p .fm-card .nm { font-size: 25px; }
.fm.p .fm-card .cl { font-size: 19px; }
.fm.p .fm-card .st { font-size: 16px; }
.fm.p .fm-card .tag { font-size: 16px; }
.fm.p .fm-card.sp .st { font-size: 18px; }
.fm.p .fm-sinfo { min-height: 110px; padding: 10px 14px; }
.fm.p .fm-sinfo .nm { font-size: 22px; }
.fm.p .fm-sinfo .ds { font-size: 18px; }
.fm.p .fm-sinfo .add { height: 60px; padding: 0 20px; font-size: 22px; }
.fm.p .fm-team { left: 48px; bottom: auto; top: 1566px; }
.fm.p .fm-chip { margin-bottom: 10px; }
.fm.p .fm-chip .nm { min-width: 220px; font-size: 26px; }
.fm.p .fm-tabs button { width: 122px; height: 64px; }
.fm.p .fm-btns { left: 48px; right: 48px; bottom: 64px; gap: 14px; }
.fm.p .fm-btn { flex: 1; min-width: 0; height: 100px; padding-left: 22px; font-size: 27px; gap: 8px; }
.fm.p .fm-btn .ic { width: 76px; font-size: 32px; }
.fm.p .fm-band { padding: 64px 20px 70px; }
.fm.p .fm-band .msg { font-size: 36px; }
.fm.p .fm-band .b { min-width: 0; flex: 1; font-size: 28px; padding: 0 16px; }
.fm.p .fm-band .row { gap: 20px; padding: 0 40px; }
/* 閉じる動き: 出てきたときの逆向き(キャラは沈む・数字は右へ・左の一覧は左へ・上の行は上へ・下のボタンは下へ)。
   translate プロパティを使うのは、もとの transform(位置あわせ)と、ぶつからないため */
@keyframes fm-out { to { opacity: 0; } }
@keyframes fm-sink { to { opacity: 0; translate: 0 40px; } }
@keyframes fm-num-out { to { opacity: 0; translate: 60px 0; } }
@keyframes fm-left-out { to { opacity: 0; translate: -60px 0; } }
@keyframes fm-up-out { to { opacity: 0; translate: 0 -36px; } }
@keyframes fm-down-out { to { opacity: 0; translate: 0 36px; } }
.fm.leaving { animation: fm-out 0.3s 0.06s ease-in forwards; pointer-events: none; }
.fm.leaving .fm-unit { animation: fm-sink 0.26s ease-in forwards; animation-delay: calc(var(--i) * 30ms); }
.fm.leaving .fm-no { animation: fm-num-out 0.26s ease-in forwards; }
.fm.leaving .fm-panel, .fm.leaving .fm-spells, .fm.leaving .fm-amulets { animation: fm-left-out 0.26s ease-in forwards; }
.fm.leaving .fm-top { animation: fm-up-out 0.26s ease-in forwards; }
.fm.leaving .fm-team, .fm.leaving .fm-status, .fm.leaving .fm-btns { animation: fm-down-out 0.26s ease-in forwards; }
@media (prefers-reduced-motion: reduce) { .fm-unit, .fm-no, .fm-panel, .fm-band, .fm-floor { animation: none !important; transition: none !important; } .fm.leaving, .fm.leaving * { animation: none !important; } }
`

// ---- 小さなアイコン ----
const Svg = (p) => <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p} />
const IconCheck = (p) => <Svg {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>
const IconX = (p) => <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>
const IconQuick = (p) => <Svg {...p}><path d="M13 3L5 14h6l-1 7 8-11h-6z" /></Svg>
const IconSave = (p) => <Svg {...p}><path d="M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6" /></Svg>
const IconSword = (p) => <Svg {...p}><path d="M5 19l9-9M14 10l5-5V3h-2l-5 5M7 15l2 2M4 20l2-2" /></Svg>
const Tri = ({ dir }) => <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d={dir === 'l' ? 'M17 4v16L5 12z' : 'M7 4v16l12-8z'} /></svg>
const IconFormation = (p) => <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true" {...p}><path d="M12 2l5 5-5 5-5-5zM5 12l4 4-4 4-4-4zM19 12l4 4-4 4-4-4z" /></svg>

// ---- キャラの絵(まだ画像がないので、名前から決まる左右対称のブロック模様)と、シルエット ----
function hash(str) {
  let h = 2166136261
  for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) }
  return h >>> 0
}
function Emblem({ seed, className }) {
  useArtStatus()
  if (artOf(seed)) return <ArtImg id={seed} />
  const h = hash(seed)
  const cells = []
  for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) {
    if ((h >> (y * 3 + x)) & 1) { cells.push([x, y]); if (x < 2) cells.push([4 - x, y]) }
  }
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 3l29 29-29 29L3 32z" fill="none" stroke="#111" strokeOpacity="0.35" strokeWidth="1" />
      {cells.map(([x, y]) => <rect key={x + '-' + y} x={9 + x * 9.2} y={9 + y * 9.2} width="8" height="8" fill="#111" opacity="0.85" />)}
    </svg>
  )
}
const FIGURES = [
  <path key="a" d="M20 5a8 8 0 1 1 0 16 8 8 0 0 1 0-16zM9 26h22l3 34h-7l-1 40h-7l-1-30-1 30h-7l-1-40h-7z" />,
  <path key="b" d="M20 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM3 24l17-5 17 5v8H3zM8 32h24l2 28h-6l-1 40h-6l-1-28-1 28h-6l-1-40h-6z" />,
  <path key="c" d="M20 3a10 9 0 1 1 0 18 10 9 0 0 1 0-18zM4 28h32l4 38-11 34H11L0 66z" />,
]
const Silhouette = ({ seed }) => <svg className="sil" viewBox="-2 0 44 100" preserveAspectRatio="xMidYMax meet" aria-hidden="true">{FIGURES[hash(seed) % FIGURES.length]}</svg>

// クラスごとの色(クラスの絵の色)
const CLASS_COLOR = { 'エルフ': '#439159', 'ロイヤル': '#797b1b', 'ニュートラル': '#858585', 'ウィッチ': '#535fa3', 'ネメシス': '#5bcce3', 'ビショップ': '#b0a98d', 'ナイトメア': '#8d1e41', 'ドラゴン': '#a05a12' }
const tone = (c) => (!c || !c.class ? '#858585' : CLASS_COLOR[c.class] || `hsl(${hash(c.class) % 360} 62% 54%)`)
// レジェンドの枠は虹色(カードの枠の、光る虹色)。それ以外は、レアリティの色の1色
const RAINBOW = 'linear-gradient(135deg, #c9a6ff 0%, #8fb4ff 20%, #7fe3ff 40%, #86f0d6 56%, #ff9fe0 78%, #c9a6ff 100%)'
const rarityBg = (c) => (c && c.rarity === 'legend' ? RAINBOW : `linear-gradient(${(c && RARITY[c.rarity]?.color) || '#cbd5e1'}, ${(c && RARITY[c.rarity]?.color) || '#cbd5e1'})`)
const isLeg = (c) => !!(c && c.rarity === 'legend')
const statLine = (c) => `HP ${c.stats.hp} ・ 攻 ${c.stats.atk} ・ 防 ${c.stats.def} ・ 速 ${c.stats.spd}`

// ---- 舞台(PC: 1920×1080 / スマホ: 1080×1920)を、画面に収まるように拡大・縮小する ----
function useStage(W, H) {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const f = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', f)
    return () => window.removeEventListener('resize', f)
  }, [])
  const scale = Math.min(size.w / W, size.h / H)
  return { scale, sw: size.w / scale, sh: size.h / scale } // 舞台は、画面いっぱいに広げる(左右・上下に隙間や切れ目ができない)
}

export default function FormationScreen({ allChars, allSpells = [], defaultIds = [], onStart, onExit, title = '編成', parties = null, partyIdxInit = null, onSaveParty = null, onPartyChange = null }) {
  useArtStatus() // 絵が読み込めないと分かったら、描き直す
  const desktop = useIsDesktop() // PCは横長(16:9)、スマホは縦長(9:16)の舞台
  // 閉じる: すぐ消さずに、閉じる動き(出てきたときの逆向き)を見せてから、onExit を呼ぶ
  const [leaving, setLeaving] = useState(false)
  const leaveTimer = useRef(null)
  useEffect(() => () => clearTimeout(leaveTimer.current), [])
  const close = () => {
    if (leaving || !onExit) return
    const calm = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (calm) { onExit(); return }
    setLeaving(true)
    leaveTimer.current = setTimeout(onExit, 320)
  }
  const L = desktop ? LAYOUT.d : LAYOUT.p
  const SLOT_POS = L.pos
  const { scale, sw, sh } = useStage(L.W, L.H)
  const [partyIdx, setPartyIdx] = useState(parties ? partyIdxInit : null)
  const startParty = parties && partyIdxInit != null ? parties[partyIdxInit] : null
  const [slots, setSlots] = useState(() => (startParty ? partyToSlots(startParty, allChars) : loadFormation(allChars) || defaultFormation(allChars, defaultIds)))
  const [savedIds, setSavedIds] = useState(() => JSON.stringify(slots.map((c) => c?.id ?? null)))
  const [activeSlot, setActiveSlot] = useState(null) // 選択中のスロット(キャラを選ぶ)
  const [quick, setQuick] = useState(false) // 簡易編成(旧: クイック編成): 選んだ順に1番目から詰める
  const [picks, setPicks] = useState([])
  const [message, setMessage] = useState('')
  // スペルセット: 最大 MAX_SPELL_SLOTS 回分。同じスペルを何回入れてもよい
  const [spellSet, setSpellSet] = useState(() => (startParty ? partyToSpells(startParty, allSpells) : loadSpellSet(allSpells)))
  const [savedSpellIds, setSavedSpellIds] = useState(() => JSON.stringify((startParty ? partyToSpells(startParty, allSpells) : loadSpellSet(allSpells)).map((sp) => sp.id)))
  const [spellPick, setSpellPick] = useState(false) // スペルの一覧を開いているか
  const [spellInfo, setSpellInfo] = useState(null) // 一覧でタップして、説明を出しているスペル
  const [confirm, setConfirm] = useState(false) // 「対戦へ」の確認

  const ids = JSON.stringify(slots.map((c) => c?.id ?? null))
  const spellIds = JSON.stringify(spellSet.map((sp) => sp.id))
  const dirty = ids !== savedIds || spellIds !== savedSpellIds
  const filled = slots.filter(Boolean)
  const checkChars = validateFormation(slots)
  const checkSpells = validateSpellSet(spellSet, filled)
  const check = checkChars.ok ? checkSpells : checkChars

  const apply = (next) => { setSlots(next); setMessage('') }

  const handleSlot = (i) => {
    if (quick) return
    setSpellPick(false)
    setActiveSlot(activeSlot === i ? null : i)
  }
  const handlePick = (c) => {
    if (quick) {
      const next = picks.some((p) => p.id === c.id) ? picks.filter((p) => p.id !== c.id) : [...picks, c]
      if (!validateFormation(next).ok && !picks.some((p) => p.id === c.id)) {
        setMessage(`${c.name}は、いまの選び方とは同じクラスで組めません`)
        return
      }
      setMessage('')
      setPicks(next.slice(0, MAX_SLOTS))
      return
    }
    // スロットを選んでいなければ、先頭の空きスロットに入れる
    const target = activeSlot !== null ? activeSlot : slots.slice(0, MAX_SLOTS).findIndex((x) => !x)
    if (target === -1) { setMessage('スロットが満員です。入れ替えたいスロットをタップしてから、キャラを選んでください'); return }
    const r = canPlace(slots, target, c)
    if (!r.ok) { setMessage(r.reason); return }
    apply(placeChar(slots, target, c))
    setActiveSlot(null)
  }
  const finishQuick = () => {
    if (picks.length) apply(quickFill(picks, slots.slice(MAX_SLOTS))) // アミュレットは、クラスが合えばそのまま残る
    setQuick(false)
    setPicks([])
    setActiveSlot(null)
  }
  const toggleQuick = () => {
    if (quick) { setQuick(false); setPicks([]); return }
    setQuick(true); setPicks([]); setActiveSlot(null); setSpellPick(false); setMessage('')
  }
  const handleSave = () => {
    if (partyIdx != null && onSaveParty) { // パーティーに保存する
      if (onSaveParty(partyIdx, slots, spellSet)) { setSavedIds(ids); setSavedSpellIds(spellIds); setMessage(`パーティー${partyIdx + 1}に保存しました`) }
      else setMessage('この端末では保存できませんでした')
      return
    }
    if (saveFormation(slots) && saveSpellSet(spellSet)) { setSavedIds(ids); setSavedSpellIds(spellIds) }
    else setMessage('この端末では保存できませんでした(戦闘は始められます)')
  }
  // パーティーを切り替える(未保存の変更があるときは、確認する)
  const loadParty = (i) => {
    if (i === partyIdx || !parties) return
    if (dirty && !window.confirm('未保存の変更があります。破棄してパーティーを切り替えますか?')) return
    const p = parties[i]
    const nextSlots = partyToSlots(p, allChars)
    const nextSpells = partyToSpells(p, allSpells)
    setSlots(nextSlots)
    setSpellSet(nextSpells)
    setSavedIds(JSON.stringify(nextSlots.map((c) => c?.id ?? null)))
    setSavedSpellIds(JSON.stringify(nextSpells.map((sp) => sp.id)))
    setPartyIdx(i)
    setActiveSlot(null); setQuick(false); setPicks([]); setSpellPick(false)
    setMessage('')
    if (onPartyChange) onPartyChange(i)
  }
  const stepParty = (d) => loadParty(partyIdx == null ? 0 : (partyIdx + d + MAX_PARTIES) % MAX_PARTIES)

  const targetSlot = activeSlot !== null ? activeSlot : slots.slice(0, MAX_SLOTS).findIndex((x) => !x)
  const amuletPick = activeSlot !== null && activeSlot >= MAX_SLOTS // アミュレットの枠を選んでいる(一覧には、アミュレットだけ出る)
  const mainCount = slots.slice(0, MAX_SLOTS).filter(Boolean).length
  const panel = quick || activeSlot !== null ? 'chars' : spellPick ? 'spells' : null

  useEffect(() => {
    const h = (e) => {
      if (e.key !== 'Escape') return
      if (confirm) setConfirm(false)
      else if (spellPick) setSpellPick(false)
      else if (quick) { setQuick(false); setPicks([]) }
      else if (activeSlot !== null) setActiveSlot(null)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [confirm, spellPick, quick, activeSlot])

  const saveDisabled = !dirty || (partyIdx != null && !check.ok)
  const savedMsg = message && message.endsWith('に保存しました')

  return (
    <div className={`fm theme-dark${desktop ? '' : ' p'}${panel ? ' open' : ''}${leaving ? ' leaving' : ''}`} data-testid="formation" role="dialog" aria-label={title}>
      <style>{CSS}</style>
      <div className="fm-stage" style={{ width: sw, height: sh, transform: `translate(-50%, -50%) scale(${scale})` }}>
        <div className="fm-bg" aria-hidden="true"><i /><i /></div>
        {/* 部品の置き場: PCは左右いっぱい(端に寄せる部品は、画面の端に付く)。スマホは、まん中に決まった幅で置く */}
        <div className="fm-ui" style={{ left: desktop ? 0 : (sw - L.W) / 2, top: (sh - L.H) / 2, width: desktop ? sw : L.W, height: L.H }}>
        {parties && partyIdx != null && <div className="fm-no" key={partyIdx} aria-hidden="true">{pad(partyIdx + 1)}</div>}

        <div className="fm-top">
          <div className="fm-title"><IconFormation /><span>//<b>{title}</b></span></div>
          <button type="button" className="fm-x" onClick={close} aria-label="戻る"><IconX /></button>
        </div>

        {parties && <button type="button" className="fm-arrow l" onClick={() => stepParty(-1)} aria-label="前のパーティー"><Tri dir="l" /></button>}
        {parties && <button type="button" className="fm-arrow r" onClick={() => stepParty(1)} aria-label="次のパーティー"><Tri dir="r" /></button>}

        {/* 床の円とキャラ: スロットは、左から順に1〜5(1番目が、行動値が同じときの最優先) */}
        <div className="fm-floor" style={desktop ? { left: (sw - L.W) / 2, width: L.W, right: 'auto' } : undefined}>
          {slots.slice(0, SLOT_POS.length).map((c, i) => {
            const p = SLOT_POS[i]
            return (
              <button key={`s${i}`} type="button" className={`fm-slot${activeSlot === i ? ' sel' : ''}`} style={{ left: p.x - L.rw / 2, top: p.y - L.rh / 2, width: L.rw, height: L.rh }} onClick={() => handleSlot(i)} aria-label={`スロット${i + 1}`} aria-pressed={activeSlot === i}>
                <i className="ring" /><i className="ring r2" /><span className="no">{pad(i + 1)}</span>
                {!c && <b className="plus">+</b>}
              </button>
            )
          })}
          {slots.slice(0, SLOT_POS.length).map((c, i) => c && (
            <div key={`u${c.id}`} className="fm-unit" style={{ left: SLOT_POS[i].x - L.uw / 2, top: SLOT_POS[i].y - (L.uh - 20), width: L.uw, height: L.uh, zIndex: 5 + i, '--rc': tone(c), '--rbg': rarityBg(c), '--i': i }}>
              <div className={`fm-fig${isLeg(c) ? ' leg' : ''}`}><Emblem className="em" seed={c.id} />{!artOf(c.id) && <Silhouette seed={c.id + i} />}</div>
            </div>
          ))}
          {slots.slice(0, SLOT_POS.length).map((c, i) => c && (
            <div key={`p${c.id}`} className="fm-plate" style={{ left: SLOT_POS[i].x - L.pw / 2, top: SLOT_POS[i].y + L.pt, width: L.pw, zIndex: 20, '--rc': tone(c) }}>
              <div className="nm">{c.name}</div>
              <div className="cl">{c.class}</div>
              <div className="st">{desktop ? statLine(c) : <>{`HP ${c.stats.hp} ・ 攻 ${c.stats.atk}`}<br />{`防 ${c.stats.def} ・ 速 ${c.stats.spd}`}</>}</div>
              <div className="fm-ctl">
                <button type="button" aria-label="前へ" disabled={i === 0} onClick={() => apply(swapSlots(slots, i, i - 1))}><Tri dir="l" /></button>
                <button type="button" className="rm" aria-label="外す" onClick={() => { apply(removeChar(slots, i)); if (activeSlot === i) setActiveSlot(null) }}><IconX /></button>
                <button type="button" aria-label="後ろへ" disabled={i === MAX_SLOTS - 1} onClick={() => apply(swapSlots(slots, i, i + 1))}><Tri dir="r" /></button>
              </div>
            </div>
          ))}
        </div>

        {/* 左: スペルセット(一覧が開いていないとき) */}
        {!panel && allSpells.length > 0 && (
          <div className="fm-spells">
            <div className="hd">スペルセット <b>{spellSet.length}</b> / {MAX_SPELL_SLOTS}回</div>
            {spellSet.map((sp, i) => {
              const ok = canUseSpell(filled, sp)
              return (
                <div key={i} className={`fm-spell${ok ? '' : ' ng'}`}>
                  <div className="tx">
                    <div className="nm">✦{sp.name}(MP{sp.cost})</div>
                    <div className="ds">{sp.class} ・ {sp.desc}</div>
                    {!ok && <div className="ng-t">この編成では使えません</div>}
                  </div>
                  <button type="button" aria-label="外す" onClick={() => setSpellSet(spellSet.filter((_, k) => k !== i))}><IconX /></button>
                </div>
              )
            })}
            {spellSet.length < MAX_SPELL_SLOTS && <button type="button" className="fm-add" onClick={() => { setSpellPick(true); setSpellInfo(null); setActiveSlot(null) }}>＋ スペルを追加</button>}
            <div className="fm-note">スペルにもクラス制限があります(編成と同じクラス、またはニュートラルのスペルだけ入れられます)。戦闘中、自分のキャラのターンならいつでも使えます(キャラの行動は消えません)。使うたびにコスト(MP)を払います。同じスペルを複数回入れられます。</div>
          </div>
        )}
        {!panel && allSpells.length === 0 && (
          <div className="fm-spells"><div className="fm-note" style={{ marginTop: 0 }}>{mainCount}/{MAX_SLOTS}体 編成済み。同じクラスだけで編成できます。ニュートラルはどのクラスとも組めます。</div></div>
        )}

        {/* 左: アミュレットの枠(キャラとは別の専用枠。タップすると、アミュレットの一覧が開く) */}
        {!panel && (
          <div className="fm-amulets" data-testid="fm-amulets">
            <div className="hd">アミュレット <b>{slots.slice(MAX_SLOTS).filter(Boolean).length}</b> / {MAX_AMULET_SLOTS}</div>
            {Array.from({ length: MAX_AMULET_SLOTS }, (_, k) => {
              const i = MAX_SLOTS + k
              const a = slots[i]
              return (
                <div key={i} className={`fm-am${a ? ' on' : ''}`} style={a ? { '--rc': tone(a) } : undefined}>
                  <button type="button" className="pick" data-testid={`fm-am-${k + 1}`} onClick={() => handleSlot(i)}>
                    {a ? <><span className="nm">◆{a.name}</span><span className="cl">{a.class}</span></> : <span className="nm empty">＋ アミュレットを選ぶ</span>}
                  </button>
                  {a && <button type="button" className="rm" aria-label="外す" onClick={() => apply(removeChar(slots, i))}><IconX /></button>}
                </div>
              )
            })}
          </div>
        )}

        {/* 左: キャラ一覧 */}
        {panel === 'chars' && (
          <div className="fm-panel" data-testid="fm-chars">
            <div className="fm-ph">
              <span>{quick ? '簡易編成: 入れたい順にタップ' : amuletPick ? `アミュレット枠${activeSlot - MAX_SLOTS + 1}に入れるアミュレットを選んでください` : `スロット${activeSlot + 1}に入れるキャラを選んでください`}</span>
              <button type="button" onClick={() => (quick ? toggleQuick() : setActiveSlot(null))}>閉じる</button>
            </div>
            {quick && (
              <div className="fm-quick">
                入れたい順にキャラをタップしてください(最大{MAX_SLOTS}体)。選んだ順に1番目のスロットから入ります。<br />
                選択中: <b>{picks.length ? picks.map((p, i) => `${i + 1}.${p.name}`).join(' → ') : 'まだありません'}</b>
              </div>
            )}
            <div className="fm-grid">
              {allChars.filter((c) => !String(c.type || '').startsWith('トークン') && (quick ? !c.amulet : amuletPick ? c.amulet : !c.amulet)).map((c) => {
                const inSlot = slots.findIndex((x) => x && x.id === c.id)
                const pickIdx = picks.findIndex((p) => p.id === c.id)
                const ok = quick ? true : targetSlot === -1 ? true : canPlace(slots, targetSlot, c).ok
                const selected = quick ? pickIdx !== -1 : activeSlot !== null && inSlot === activeSlot
                return (
                  <button key={c.id} type="button" className={`fm-card${selected ? ' sel' : ''}${isLeg(c) ? ' leg' : ''}`} style={{ '--rc': tone(c), '--rbg': rarityBg(c) }} disabled={!ok} onClick={() => handlePick(c)} aria-label={c.name}>
                    <span className="th"><Emblem seed={c.id} /></span>
                    <span className="tx">
                      <div className="nm">{c.name}</div>
                      <div className="cl">{c.class}</div>
                      <div className="st">{statLine(c)}</div>
                    </span>
                    {quick && pickIdx !== -1 && <b className="bn">{pickIdx + 1}</b>}
                    {!quick && inSlot !== -1 && inSlot !== activeSlot && <span className="tag">{inSlot >= MAX_SLOTS ? 'アミュレット枠' : 'スロット'}{inSlot >= MAX_SLOTS ? inSlot - MAX_SLOTS + 1 : inSlot + 1}</span>}
                    {!quick && !ok && <span className="tag warn">クラス違い</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* 左: スペルの一覧 */}
        {panel === 'spells' && (
          <div className="fm-panel" data-testid="fm-spells">
            <div className="fm-ph">
              <span>追加するスペルを選んでください</span>
              <button type="button" onClick={() => setSpellPick(false)}>閉じる</button>
            </div>
            <div className="fm-grid one">
              {allSpells.map((sp) => {
                const ok = canUseSpell(filled, sp)
                return (
                  <button
                    key={sp.id}
                    type="button"
                    className={`fm-card sp${spellInfo && spellInfo.id === sp.id ? ' sel' : ''}`}
                    data-testid={`fm-spell-${sp.id}`}
                    style={{ opacity: ok ? 1 : 0.4 }}
                    onClick={() => { setSpellInfo(sp); setMessage('') }}
                  >
                    <div className="nm">✦{sp.name}(MP{sp.cost}){!ok && <span style={{ fontSize: 20, color: C.warn }}> クラス違い</span>}</div>
                    <div className="st">{sp.class}</div>
                  </button>
                )
              })}
            </div>
            {/* 説明: タップしたスペルの説明を、ここに出す */}
            {spellInfo ? (() => {
              const ok = canUseSpell(filled, spellInfo)
              return (
                <div className="fm-sinfo" data-testid="fm-spell-info">
                  <div className="tx">
                    <div className="nm">✦{spellInfo.name}(MP{spellInfo.cost}) ・ {spellInfo.class}</div>
                    <div className="ds">{spellInfo.desc}</div>
                    {!ok && <div className="ng-t">{spellClassOf(spellInfo)}のスペルなので、いまの編成({teamClassOf(filled) || 'ニュートラルのみ'})では入れられません</div>}
                  </div>
                  <button type="button" className="add" data-testid="fm-spell-add" disabled={!ok} onClick={() => { setMessage(''); setSpellSet([...spellSet, spellInfo]); setSpellInfo(null); setSpellPick(false) }}>追加</button>
                </div>
              )
            })() : <div className="fm-sinfo empty">スペルをタップすると、説明が出ます</div>}
          </div>
        )}

        {/* 左下: パーティーのタブ(アカウントのときだけ) */}
        {parties && (
          <div className="fm-team">
            <div className="fm-chip">
              <span className="ic"><IconFormation /></span>
              <span className="nm">{partyIdx != null ? `パーティー${partyIdx + 1}` : title}</span>
            </div>
            <div className="fm-tabs" role="tablist" aria-label="パーティー">
              {Array.from({ length: MAX_PARTIES }, (_, i) => {
                const n = partyCount(parties[i])
                return (
                  <button key={i} type="button" role="tab" aria-selected={partyIdx === i} className={partyIdx === i ? 'on' : ''} onClick={() => loadParty(i)}>
                    <b>{pad(i + 1)}</b><small>{n ? `${n}体` : '空き'}</small>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="fm-status">
          {dirty && <div>● 未保存の変更があります</div>}
          {!check.ok && <div>{check.reason}</div>}
          {message && <div style={savedMsg ? { borderRightColor: C.ok, color: C.ok } : undefined}>{message}</div>}
        </div>

        <div className="fm-btns">
          {quick ? (
            <>
              <button type="button" className="fm-btn" onClick={toggleQuick}>簡易編成をやめる<span className="ic"><IconX /></span></button>
              <button type="button" className="fm-btn hot" data-testid="fm-quick-ok" onClick={finishQuick} disabled={!picks.length}>この順で編成する<span className="ic"><IconCheck /></span></button>
            </>
          ) : (
            <>
              <button type="button" className="fm-btn" data-testid="fm-quick" onClick={toggleQuick}>簡易編成<span className="ic"><IconQuick /></span></button>
              <button type="button" className={`fm-btn${onStart ? '' : ' hot'}`} data-testid="fm-save" onClick={handleSave} disabled={saveDisabled}>保存<span className="ic"><IconSave /></span></button>
              {onStart && <button type="button" className="fm-btn hot" data-testid="fm-start" onClick={() => setConfirm(true)} disabled={!check.ok}>対戦へ<span className="ic"><IconSword /></span></button>}
            </>
          )}
        </div>

        </div>

        {confirm && (
          <div className="fm-back" onClick={() => setConfirm(false)}>
            <div className="fm-band" role="dialog" aria-label="対戦の確認" onClick={(e) => e.stopPropagation()}>
              <div className="msg">この編成で対戦へ進みます</div>
              <div className="faces">
                {slots.slice(0, MAX_SLOTS).map((c, i) => (c ? <i key={i} style={{ '--rc': tone(c), '--rbg': rarityBg(c) }} title={c.name} /> : <i key={i} className="no" />))}
              </div>
              <div className="row">
                <button type="button" className="b" onClick={() => setConfirm(false)}>キャンセル<IconX /></button>
                <button type="button" className="b ok" data-testid="fm-ok" onClick={() => { setConfirm(false); onStart(filled, spellSet) }}>確定<IconCheck /></button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
