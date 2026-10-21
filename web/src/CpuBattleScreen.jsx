import { useEffect, useRef, useState } from 'react'
import { useIsDesktop, C, FONT, DISPLAY } from './ui.js'
import { IconClose, IconGem } from './icons.jsx'

// CPU戦のレベル選択画面。参考: エンドフィールドの「協約空間」(案内所 → 周回)
//   左: レベルの一覧(Lv.1〜)。選ぶと、右に詳細(ステージ名・推奨・説明・ステージ説明・敵情報・報酬)が出る
//   右下: 挑戦の消費と「挑戦」ボタン → 押すと onChallenge(level)。そのあと編成画面へ進む想定
//   PC: 1920×1080(16:9) / スマホ: 1080×1920(9:16) の舞台を作り、画面に収まるように拡大・縮小する(PCかスマホかは useIsDesktop)
//
// props
//   levels: [{
//     id, name,                 // name は「Lv.1」など。一覧に出る
//     title?, area?,            // 右に大きく出る名前 / その下の場所・種類
//     recommended?,             // 推奨(数字なら「LV.85」の形で出る。文字ならそのまま)
//     desc?, rule?,             // 説明 / 「ステージ説明」(CPUの特徴など)
//     enemies?: [{ id, name, class?, hp? }],
//     rewards?: [{ id?, label, amount?, type?('gem' でジェムの印), first?(初回報酬) }],
//     cost?,                    // 挑戦に必要なジェム(なければ、消費なし)
//     cleared?, locked?,        // クリア済み / まだ挑戦できない
//   }]
//   title: 画面の名前(既定 'CPU戦')   gems: 所持ジェム(あれば、右上に出して、足りるかを判定)
//   levelIdInit: 最初に選ぶレベルの id(なければ、挑戦できる先頭の未クリア)
//   onChallenge(level) / onSelect(level)(任意) / onExit

const pad = (n) => String(n).padStart(2, '0')

const CSS = `
.cb { position: fixed; inset: 0; z-index: 20; background: #050506; color: ${C.ink}; font-family: ${FONT}; overflow: hidden; animation: cb-fade 0.25s ease-out backwards; }
.cb button { font-family: ${FONT}; }
@keyframes cb-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes cb-in { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: none; } }
@keyframes cb-left { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: none; } }
@keyframes cb-up { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }

.cb-stage { position: absolute; left: 50%; top: 50%; transform-origin: center center; overflow: hidden; }

/* 背景: 暗い地に、黄色の斜めの帯 */
.cb-bg { position: absolute; inset: 0; pointer-events: none;
  background:
    repeating-linear-gradient(115deg, transparent 0 120px, rgba(255,255,255,0.025) 120px 122px),
    radial-gradient(ellipse at 70% 35%, #2a2c22 0%, #15161a 50%, #09090b 82%); }
.cb-bg i { position: absolute; top: -10%; height: 130%; background: ${C.player}; transform: skewX(-24deg); }
.cb-bg i:nth-child(1) { right: 5%; width: 120px; opacity: 0.06; }
.cb-bg i:nth-child(2) { right: 14%; width: 24px; opacity: 0.2; }

.cb-top { position: absolute; left: 0; right: 0; top: 0; z-index: 12; display: flex; align-items: center; gap: 20px; padding: 40px 56px; }
.cb-title { display: flex; align-items: center; gap: 14px; font-family: ${DISPLAY}; font-weight: 600; font-style: italic; font-size: 40px; letter-spacing: 0.08em; color: ${C.mute}; }
.cb-title b { color: ${C.ink}; font-style: normal; }
.cb-title svg { font-size: 52px; color: ${C.player}; }
.cb-top .sp { flex: 1; }
.cb-gems { display: inline-flex; align-items: center; gap: 12px; padding: 8px 28px; background: rgba(255,255,255,0.1); font-family: ${DISPLAY}; font-weight: 600; font-size: 34px; }
.cb-gems svg { color: ${C.player}; }
.cb-x { width: 84px; height: 84px; padding: 0; min-height: 0; border: 0; border-radius: 50%; background: #f2f2f3; color: #1c1c1f; font-size: 48px; display: grid; place-items: center; cursor: pointer; transition: background 0.15s, transform 0.15s; }
.cb-x:hover, .cb-x:focus-visible { background: ${C.player}; transform: rotate(90deg); outline: none; }

/* 左: レベルの一覧 */
.cb-levels { position: absolute; left: 56px; top: 180px; bottom: 300px; z-index: 6; width: 560px; overflow-y: auto; scrollbar-width: none; animation: cb-left 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.cb-levels::-webkit-scrollbar { display: none; }
.cb-lv { position: relative; display: flex; align-items: center; gap: 18px; width: 100%; height: 96px; margin-bottom: 10px; padding: 0 24px 0 22px; min-height: 0; border: 0; border-left: 10px solid var(--bar); background: linear-gradient(90deg, rgba(26,26,30,0.95), rgba(26,26,30,0.55)); color: ${C.ink}; text-align: left; cursor: pointer; transition: transform 0.12s, background 0.12s; }
.cb-lv .st { flex: none; width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; background: rgba(255,255,255,0.12); color: var(--bar); font-size: 28px; }
.cb-lv .nm { flex: 1; min-width: 0; font-family: ${DISPLAY}; font-weight: 700; font-size: 38px; letter-spacing: 0.04em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cb-lv .tri { flex: none; font-size: 44px; color: rgba(255,255,255,0.28); }
.cb-lv:hover:not(:disabled), .cb-lv:focus-visible { transform: translateX(6px); background: linear-gradient(90deg, rgba(60,60,66,0.95), rgba(40,40,44,0.6)); outline: none; }
.cb-lv.sel { background: #f1ead6; color: #1c1c1f; transform: translateX(10px); }
.cb-lv.sel .st { background: rgba(0,0,0,0.1); }
.cb-lv.sel .tri { color: ${C.player}; filter: drop-shadow(0 0 2px rgba(0,0,0,0.5)); }
.cb-lv:disabled { cursor: default; opacity: 0.55; }

/* 右: 詳細 */
.cb-detail { position: absolute; left: 720px; right: 56px; top: 180px; bottom: 300px; z-index: 6; max-width: 1500px; overflow-y: auto; scrollbar-width: none; animation: cb-in 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.cb-detail::-webkit-scrollbar { display: none; }
.cb-name { display: flex; align-items: center; gap: 16px; margin: 0; padding-bottom: 12px; border-bottom: 3px solid rgba(255,255,255,0.3); font-family: ${DISPLAY}; font-weight: 700; font-size: 64px; letter-spacing: 0.05em; line-height: 1.15; }
.cb-name::before { content: ''; flex: none; width: 16px; height: 56px; background: ${C.ink}; }
.cb-area { margin-top: 12px; font-size: 26px; font-weight: 700; color: ${C.player}; }
.cb-hint { display: flex; align-items: center; gap: 14px; margin-top: 18px; font-size: 26px; font-weight: 700; }
.cb-hint b { padding: 0 14px; background: #e23b3b; color: #fff; font-family: ${DISPLAY}; font-size: 26px; letter-spacing: 0.04em; }
.cb-desc { margin: 12px 0 0; font-size: 26px; line-height: 1.75; color: #d6d6dc; }
.cb-sec { margin-top: 24px; }
.cb-sec h3 { display: flex; align-items: center; gap: 10px; margin: 0 0 10px; padding: 6px 16px; background: rgba(255,255,255,0.12); border-left: 6px solid ${C.player}; font-size: 26px; font-weight: 700; letter-spacing: 0.06em; }
.cb-sec p { margin: 0; padding: 14px 18px; background: rgba(0,0,0,0.45); font-size: 26px; line-height: 1.75; color: #e6e6ea; white-space: pre-line; }
.cb-enemies { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; }
.cb-en { position: relative; display: flex; align-items: center; gap: 14px; padding: 0 16px 0 0; height: 108px; overflow: hidden; background: #1f2024; box-shadow: inset 0 0 0 2px rgba(255,255,255,0.1); }
.cb-en .th { position: relative; flex: none; width: 98px; align-self: stretch; background: linear-gradient(165deg, color-mix(in srgb, var(--rc) 55%, #fff) 0%, var(--rc) 45%, #17171d 100%); border-bottom: 6px solid var(--rc); }
.cb-en .th svg { position: absolute; left: 14%; top: 10%; width: 72%; mix-blend-mode: multiply; opacity: 0.92; }
.cb-en .tx { min-width: 0; }
.cb-en .nm { font-size: 26px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cb-en .cl { font-size: 20px; font-weight: 700; color: var(--rc); }
.cb-en .hp { font-size: 20px; color: ${C.mute}; }
.cb-rewards { display: flex; flex-wrap: wrap; gap: 10px; }
.cb-rw { position: relative; display: flex; align-items: center; gap: 12px; min-width: 200px; height: 84px; padding: 0 22px; background: linear-gradient(165deg, #3b3a2a, #1f2024); border-bottom: 5px solid ${C.player}; font-size: 26px; font-weight: 700; }
.cb-rw svg { font-size: 34px; color: ${C.player}; }
.cb-rw b { margin-left: auto; padding-left: 16px; font-family: ${DISPLAY}; font-size: 30px; color: ${C.player}; }
.cb-rw .tag { position: absolute; left: 0; top: -14px; padding: 0 10px; background: ${C.player}; color: ${C.onAccent}; font-size: 18px; font-weight: 700; }
.cb-none { margin: 80px 0; text-align: center; font-size: 30px; color: ${C.mute}; }

/* 右下: 消費と挑戦 */
.cb-foot { position: absolute; right: 56px; bottom: 64px; z-index: 12; display: flex; flex-direction: column; align-items: flex-end; gap: 12px; animation: cb-up 0.4s 0.15s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.cb-note { padding: 6px 18px; background: rgba(0,0,0,0.7); border-right: 5px solid ${C.warn}; font-size: 24px; font-weight: 700; color: ${C.warn}; }
.cb-cost { display: flex; align-items: center; gap: 12px; font-size: 26px; font-weight: 700; color: #d6d6dc; }
.cb-cost b { display: inline-flex; align-items: center; gap: 8px; font-family: ${DISPLAY}; font-size: 34px; color: ${C.ink}; }
.cb-cost b svg { color: ${C.player}; }
.cb-cost.ng b { color: ${C.warn}; }
.cb-go { display: inline-flex; align-items: center; gap: 18px; min-width: 460px; height: 96px; padding: 0 0 0 40px; border: 0; background: ${C.player}; color: ${C.onAccent}; font-size: 38px; font-weight: 700; letter-spacing: 0.1em; cursor: pointer; clip-path: polygon(26px 0, 100% 0, 100% 100%, 0 100%, 0 26px); transition: transform 0.15s; }
.cb-go .ic { margin-left: auto; align-self: stretch; width: 96px; display: grid; place-items: center; background: rgba(0,0,0,0.14); font-size: 40px; }
.cb-go:hover:not(:disabled), .cb-go:focus-visible { transform: translateY(-4px); outline: none; }
.cb-go:disabled { background: #3a3a3f; color: #77777e; cursor: default; }

/* ---------- スマホ(縦 1080×1920)。上から: レベルのタブ → 詳細(スクロール) → 消費と挑戦 ---------- */
.cb.p .cb-top { padding: 48px 44px; }
.cb.p .cb-title { font-size: 46px; }
.cb.p .cb-title svg { font-size: 58px; }
.cb.p .cb-gems { font-size: 38px; padding: 8px 26px; }
.cb.p .cb-x { width: 96px; height: 96px; }
.cb.p .cb-levels { bottom: auto; max-height: none; left: 48px; right: 48px; top: 190px; width: auto; max-height: none; display: flex; gap: 10px; overflow-x: auto; overflow-y: hidden; }
.cb.p .cb-lv { flex: none; width: 190px; height: 150px; margin: 0; padding: 0 8px; flex-direction: column; justify-content: center; gap: 8px; border-left: 0; border-top: 10px solid var(--bar); }
.cb.p .cb-lv .st { width: 48px; height: 48px; font-size: 30px; }
.cb.p .cb-lv .nm { flex: none; font-size: 40px; text-align: center; }
.cb.p .cb-lv .tri { display: none; }
.cb.p .cb-lv:hover:not(:disabled), .cb.p .cb-lv:focus-visible, .cb.p .cb-lv.sel { transform: translateY(-6px); }
.cb.p .cb-detail { left: 48px; right: 48px; top: 380px; bottom: 360px; max-width: none; }
.cb.p .cb-name { font-size: 62px; }
.cb.p .cb-name::before { height: 54px; }
.cb.p .cb-area, .cb.p .cb-hint, .cb.p .cb-hint b { font-size: 32px; }
.cb.p .cb-desc, .cb.p .cb-sec p { font-size: 32px; line-height: 1.7; }
.cb.p .cb-sec h3 { font-size: 32px; }
.cb.p .cb-enemies { grid-template-columns: repeat(2, 1fr); }
.cb.p .cb-en { height: 132px; }
.cb.p .cb-en .th { width: 112px; }
.cb.p .cb-en .nm { font-size: 32px; }
.cb.p .cb-en .cl, .cb.p .cb-en .hp { font-size: 25px; }
.cb.p .cb-rw { height: 100px; font-size: 32px; min-width: 300px; }
.cb.p .cb-rw b { font-size: 36px; }
.cb.p .cb-rw .tag { font-size: 22px; }
.cb.p .cb-foot { left: 48px; right: 48px; bottom: 64px; align-items: stretch; gap: 14px; }
.cb.p .cb-note { font-size: 30px; }
.cb.p .cb-cost { justify-content: flex-end; font-size: 32px; }
.cb.p .cb-cost b { font-size: 42px; }
.cb.p .cb-go { width: 100%; min-width: 0; height: 120px; font-size: 46px; }
.cb.p .cb-go .ic { width: 120px; font-size: 50px; }
/* 閉じる動き: 出てきたときの逆向き(一覧は左へ・詳細は右へ・上の行は上へ・下のボタンは下へ)。translate は、もとの transform と、ぶつからないため */
@keyframes cb-out { to { opacity: 0; } }
@keyframes cb-left-out { to { opacity: 0; translate: -50px 0; } }
@keyframes cb-right-out { to { opacity: 0; translate: 50px 0; } }
@keyframes cb-up-out { to { opacity: 0; translate: 0 -30px; } }
@keyframes cb-down-out { to { opacity: 0; translate: 0 30px; } }
.cb.leaving { animation: cb-out 0.3s 0.06s ease-in forwards; pointer-events: none; }
.cb.leaving .cb-levels { animation: cb-left-out 0.26s ease-in forwards; }
.cb.leaving .cb-detail { animation: cb-right-out 0.26s ease-in forwards; }
.cb.leaving .cb-top { animation: cb-up-out 0.26s ease-in forwards; }
.cb.leaving .cb-foot { animation: cb-down-out 0.26s ease-in forwards; }
@media (prefers-reduced-motion: reduce) { .cb-levels, .cb-detail, .cb-foot { animation: none !important; } .cb.leaving, .cb.leaving * { animation: none !important; } }
`

// ---- 小さなアイコン ----
const Svg = (p) => <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p} />
const IconCheck = (p) => <Svg {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>
const IconLock = (p) => <Svg {...p}><path d="M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3" /></Svg>
const IconDot = (p) => <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true" {...p}><path d="M12 5l7 7-7 7-7-7z" /></svg>
const IconSword = (p) => <Svg {...p}><path d="M5 19l9-9M14 10l5-5V3h-2l-5 5M7 15l2 2M4 20l2-2" /></Svg>
const Tri = () => <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" aria-hidden="true"><path d="M5 4v16l15-8z" /></svg>
const IconCpu = (p) => <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true" {...p}><path d="M12 2l5 5-5 5-5-5zM5 12l4 4-4 4-4-4zM19 12l4 4-4 4-4-4z" /></svg>

// ---- 敵の絵(まだ画像がないので、名前から決まる左右対称のブロック模様) ----
function hash(str) {
  let h = 2166136261
  for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) }
  return h >>> 0
}
function Emblem({ seed }) {
  const h = hash(seed)
  const cells = []
  for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) {
    if ((h >> (y * 3 + x)) & 1) { cells.push([x, y]); if (x < 2) cells.push([4 - x, y]) }
  }
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 3l29 29-29 29L3 32z" fill="none" stroke="#111" strokeOpacity="0.35" strokeWidth="1" />
      {cells.map(([x, y]) => <rect key={x + '-' + y} x={9 + x * 9.2} y={9 + y * 9.2} width="8" height="8" fill="#111" opacity="0.85" />)}
    </svg>
  )
}
// クラスごとの色(クラス名から決まる。クラスなし・ニュートラルは灰色)
const tone = (c) => (!c || !c.class || c.class === 'ニュートラル' ? '#8a8a92' : `hsl(${hash(c.class) % 360} 62% 54%)`)

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

const firstOpen = (levels) => levels.find((l) => !l.locked && !l.cleared) || [...levels].reverse().find((l) => !l.locked) || levels[0]

export default function CpuBattleScreen({ levels = [], title = 'CPU戦', gems = null, levelIdInit = null, onChallenge, onSelect = null, onExit }) {
  const desktop = useIsDesktop() // PCは横長(16:9)、スマホは縦長(9:16)の舞台
  const W = desktop ? 2560 : 1440 // 舞台の基本の大きさ(部品が小さく見えるよう、大きめの舞台を縮めて映す)
  const H = desktop ? 1440 : 2560
  const { scale, sw, sh } = useStage(W, H)
  const [selId, setSelId] = useState(() => {
    const init = levels.find((l) => l.id === levelIdInit && !l.locked)
    const l = init || firstOpen(levels)
    return l ? l.id : null
  })
  const level = levels.find((l) => l.id === selId) || levels[0] || null

  const cost = level && level.cost != null ? level.cost : null
  const lack = cost != null && gems != null && gems < cost
  const can = !!level && !level.locked && !lack
  const note = !level ? '' : level.locked ? '前のレベルをクリアすると、挑戦できます' : lack ? 'ジェムが足りません' : ''

  const choose = (l) => {
    if (l.locked) return
    setSelId(l.id)
    if (onSelect) onSelect(l)
  }
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
  const challenge = () => { if (can && onChallenge && !leaving) onChallenge(level) }

  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') { close(); return }
      if (e.key === 'Enter') { challenge(); return }
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      const d = e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 1
      const i = levels.findIndex((l) => l.id === selId)
      for (let k = i + d; k >= 0 && k < levels.length; k += d) {
        if (!levels[k].locked) { choose(levels[k]); break }
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  const bar = (l) => (l.locked ? '#5f5f66' : l.cleared ? C.ok : C.player)

  return (
    <div className={`cb theme-dark${desktop ? '' : ' p'}${leaving ? ' leaving' : ''}`} data-testid="cpu-battle" role="dialog" aria-label={title}>
      <style>{CSS}</style>
      <div className="cb-stage" style={{ width: sw, height: sh, transform: `translate(-50%, -50%) scale(${scale})` }}>
        <div className="cb-bg" aria-hidden="true"><i /><i /></div>

        <div className="cb-top">
          <div className="cb-title"><IconCpu /><span>//<b>{title}</b></span></div>
          <div className="sp" />
          {gems != null && <div className="cb-gems"><IconGem />{gems}</div>}
          <button type="button" className="cb-x" onClick={close} aria-label="戻る"><IconClose /></button>
        </div>

        {/* 左(スマホは上): レベルの一覧 */}
        <div className="cb-levels" role="listbox" aria-label="レベル">
          {levels.map((l) => (
            <button key={l.id} type="button" role="option" aria-selected={level && l.id === level.id} className={`cb-lv${level && l.id === level.id ? ' sel' : ''}`} style={{ '--bar': bar(l) }} disabled={l.locked} onClick={() => choose(l)}>
              <span className="st">{l.locked ? <IconLock /> : l.cleared ? <IconCheck /> : <IconDot />}</span>
              <span className="nm">{l.name}</span>
              <span className="tri"><Tri /></span>
            </button>
          ))}
        </div>

        {/* 右(スマホは下): 詳細 */}
        <div className="cb-detail" key={level ? level.id : 'none'} data-testid="cb-detail">
          {!level && <div className="cb-none">挑戦できるレベルがありません</div>}
          {level && (
            <>
              <h2 className="cb-name">{level.title || `${title} ${level.name}`}</h2>
              {level.area && <div className="cb-area">▶ {level.area}</div>}
              {level.recommended != null && (
                <div className="cb-hint">/推奨レベル <b>{typeof level.recommended === 'number' ? `LV.${level.recommended}` : level.recommended}</b></div>
              )}
              {level.desc && <p className="cb-desc">{level.desc}</p>}
              {level.rule && <div className="cb-sec"><h3>/ステージ説明</h3><p>{level.rule}</p></div>}
              {level.enemies && level.enemies.length > 0 && (
                <div className="cb-sec">
                  <h3>/敵情報</h3>
                  <div className="cb-enemies">
                    {level.enemies.map((e, i) => (
                      <div key={e.id != null ? e.id : i} className="cb-en" style={{ '--rc': tone(e) }}>
                        <span className="th"><Emblem seed={e.id != null ? e.id : e.name} /></span>
                        <span className="tx">
                          <div className="nm">{e.name}</div>
                          {e.class && <div className="cl">{e.class}</div>}
                          {e.hp != null && <div className="hp">HP {e.hp}</div>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {level.rewards && level.rewards.length > 0 && (
                <div className="cb-sec">
                  <h3>/報酬</h3>
                  <div className="cb-rewards">
                    {level.rewards.map((r, i) => (
                      <div key={r.id != null ? r.id : i} className="cb-rw">
                        {r.first && <span className="tag">初回</span>}
                        {r.type === 'gem' && <IconGem />}
                        <span>{r.label}</span>
                        {r.amount != null && <b>×{r.amount}</b>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* 右下: 消費と挑戦 */}
        <div className="cb-foot">
          {note && <div className="cb-note">{note}</div>}
          {cost != null && <div className={`cb-cost${lack ? ' ng' : ''}`}>挑戦の消費 <b><IconGem />{cost}</b></div>}
          <button type="button" className="cb-go" data-testid="cb-go" onClick={challenge} disabled={!can}>挑戦<span className="ic"><IconSword /></span></button>
        </div>
      </div>
    </div>
  )
}
