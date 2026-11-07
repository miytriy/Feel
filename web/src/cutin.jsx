import { useEffect, useMemo, useRef } from 'react'

// カットイン演出(全画面)。前半の全画面アニメは動画(web/public/fx/albion/fanfare-1.mp4)をそのまま再生する
// (端末のハードウェアでデコードされるので軽い)。後半は、盤面に隕石(画像)が落ちて、爆発の動画(fanfare-2.mp4、岩つき)が重なる。
// 画像の動きは transform と opacity だけ(web/EFFECTS.md)。盤面に出ていた青い小さな円は「消滅」の演出なので、ここでは描かない。

export const CUTINS = {
  'アルビオンバハムート|ファンファーレ': { id: 'albion', ms: 3700 },
}
// モードが決まったあと(エンジンが 'cutin' を出す)に流す。選ぶ前には流さない
export const cutinOf = (ev) => (ev && ev.type === 'cutin' ? CUTINS[`${ev.owner}|${ev.kind}`] || null : null)

const BASE = `${import.meta.env?.BASE_URL || '/'}fx/albion/`
const IMGS = ['meteor']
const VIDS = ['fanfare-1', 'fanfare-2']
if (typeof window !== 'undefined') { // 先に読み込んでおく(初回でも途中で絵が出遅れない)
  const go = () => {
    IMGS.forEach((f) => { const i = new Image(); i.decoding = 'async'; i.src = `${BASE}${f}.webp` })
    VIDS.forEach((f) => { const v = document.createElement('video'); v.preload = 'auto'; v.muted = true; v.src = `${BASE}${f}.mp4` })
  }
  ;(window.requestIdleCallback || ((fn) => setTimeout(fn, 600)))(go)
}

const T_V1 = 2450 // 動画1の長さ
const T_W = 2300 // 白い閃光が始まる(動画1の終わりに向けて白くなり、そのあと白が溶けて盤面が現れる)
const T_MET = 2600 // 隕石が落ち始める(白が溶けていく途中から)
const T_V2 = 3050 // 爆発の動画
const T_END = 3700

const CSS = `
@keyframes cf-a { 0% { opacity: 0; transform: translate(-50%,-50%) translate(var(--x0,0),var(--y0,0)) rotate(var(--r0,0deg)) scale(var(--s0,1)) }
  10% { opacity: var(--o,1) } 80% { opacity: var(--o,1) }
  100% { opacity: 0; transform: translate(-50%,-50%) translate(var(--x1,0),var(--y1,0)) rotate(var(--r1,0deg)) scale(var(--s1,1)) } }
@keyframes cf-v1 { 0% { opacity: 0 } 1% { opacity: 1 } 99% { opacity: 1 } 100% { opacity: 0 } }
@keyframes cf-w { 0% { opacity: 0 } 15% { opacity: 1 } 30% { opacity: 1 } 100% { opacity: 0 } }
@keyframes cf-v2 { 0% { opacity: 0 } 12% { opacity: 1 } 62% { opacity: 1 } 100% { opacity: 0 } }
@keyframes cf-shake { 0%,100% { transform: translate(0,0) } 10% { transform: translate(-1.4%,.8%) } 20% { transform: translate(1.2%,-1%) } 30% { transform: translate(-.9%,-.6%) } 45% { transform: translate(.7%,.7%) } 60% { transform: translate(-.4%,.3%) } 80% { transform: translate(.2%,-.2%) } }
.cf-l { position: absolute; pointer-events: none; user-select: none; -webkit-user-drag: none; opacity: 0; animation-fill-mode: both; animation-timing-function: linear }
.cf-c { left: 50%; top: 50%; animation-name: cf-a; will-change: transform, opacity }
.cf-v { inset: 0; width: 100%; height: 100%; object-fit: cover }
`

// 隕石の落ち方・岩の飛び方は、毎回同じ(乱数は固定の種から)
const rnd = (() => { let s = 20261107; return () => { s = (s * 16807) % 2147483647; return s / 2147483647 } })()
const METEORS = Array.from({ length: 7 }, (_, i) => ({ tx: (rnd() - .5) * 42, ty: (rnd() - .5) * 26, at: T_MET + i * 70 + rnd() * 40, w: 60 + rnd() * 30 }))
const DIR = (() => { const a = (116 * Math.PI) / 180; return { x: Math.cos(a), y: Math.sin(a), deg: 116 } })()

// 動画: 指定した時刻(ms)に頭から再生する。透明度は CSS アニメで出し入れする
// mask: 動画に焼き込まれている撮影元のゲーム画面(ボタンやログ)を隠すための、固定のマスク(動かさない)
function Clip({ name, at, dur, anim, mask }) {
  const ref = useRef(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    const t = setTimeout(() => { try { v.currentTime = 0; const p = v.play(); if (p && p.catch) p.catch(() => {}) } catch { /* 再生できなくても、ほかの演出は続く */ } }, at)
    v.load()
    return () => clearTimeout(t)
  }, [at])
  return <video ref={ref} className="cf-l cf-v" src={`${BASE}${name}.mp4`} muted playsInline preload="auto" style={{ animationName: anim, animationDuration: `${dur}ms`, animationDelay: `${at}ms`, ...(mask ? { WebkitMaskImage: mask, maskImage: mask } : null) }} />
}

// ms: 全体の長さ。onSkip: タップで飛ばす
export function CutIn({ ms = T_END, onSkip }) {
  const meteors = useMemo(() => METEORS.map((m, i) => {
    const D = 120 // 画面の外から落ちてくる距離
    return <img key={`m${i}`} className="cf-l cf-c" alt="" draggable={false} src={`${BASE}meteor.webp`} style={{
      width: `${m.w}vmax`, transformOrigin: '93% 50%', animationDuration: '420ms', animationDelay: `${m.at}ms`, animationTimingFunction: 'cubic-bezier(.5,0,.9,.6)',
      '--r0': `${DIR.deg}deg`, '--r1': `${DIR.deg}deg`, '--s0': 1, '--s1': 1, '--in': '20%', '--o': 1,
      '--x0': `${m.tx - DIR.x * D}vmax`, '--y0': `${m.ty - DIR.y * D}vmax`, '--x1': `${m.tx}vmax`, '--y1': `${m.ty}vmax`,
    }} />
  }), [])
  return (
    <div data-testid="cutin" onPointerDown={onSkip} style={{ position: 'fixed', inset: 0, zIndex: 9000, touchAction: 'manipulation', cursor: 'pointer', overflow: 'hidden' }}>
      <style>{CSS}</style>
      {/* ① 全画面アニメ(動画1)。最後の閃光のところで、すっと消える */}
      <Clip name="fanfare-1" at={0} dur={T_V1} anim="cf-v1" />
      {/* 閃光: 動画1の最後で真っ白になり、そのあと白が溶けて盤面が見える */}
      <div className="cf-l" style={{ inset: 0, background: '#f4f9ff', animationName: 'cf-w', animationDuration: '800ms', animationDelay: `${T_W}ms`, animationFillMode: 'forwards' }} />
      {/* ② 盤面に隕石が落ちて、爆発(背景は透明で、盤面が見える) */}
      <div style={{ position: 'absolute', inset: 0, animation: `cf-shake 520ms linear ${T_V2}ms both`, willChange: 'transform' }}>
        {meteors}
        <Clip name="fanfare-2" at={T_V2} dur={T_END - T_V2} anim="cf-v2" />
      </div>
      <div style={{ position: 'absolute', right: 12, bottom: 10, fontSize: 11, color: 'rgba(255,255,255,.7)', textShadow: '0 0 4px #000' }}>タップでスキップ</div>
    </div>
  )
}
