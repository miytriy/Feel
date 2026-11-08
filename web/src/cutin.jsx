import { useEffect, useMemo, useRef } from 'react'

// カットイン演出(全画面)。前半の全画面アニメは動画(web/public/fx/albion/fanfare-1.mp4)をそのまま再生する
// (端末のハードウェアでデコードされるので軽い)。白い閃光が溶けたところで終わる。動画が終わって盤面が見えてから、ユニットの消滅エフェクトが始まる(等倍)。
// 画像の動きは transform と opacity だけ(web/EFFECTS.md)。盤面に出ていた青い小さな円は「消滅」の演出なので、ここでは描かない。

export const CUTINS = {
  'アルビオンバハムート|ファンファーレ': { id: 'albion', ms: 3300 },
}
// モードが決まったあと(エンジンが 'cutin' を出す)に流す。選ぶ前には流さない
export const cutinOf = (ev) => (ev && ev.type === 'cutin' ? CUTINS[`${ev.owner}|${ev.kind}`] || null : null)

const BASE = `${import.meta.env?.BASE_URL || '/'}fx/albion/`
if (typeof window !== 'undefined') { // 先に読み込んでおく(初回でも途中で絵が出遅れない)
  const go = () => { for (const f of ['fanfare-1']) { const v = document.createElement('video'); v.preload = 'auto'; v.muted = true; v.src = `${BASE}${f}.mp4` } }
  ;(window.requestIdleCallback || ((fn) => setTimeout(fn, 600)))(go)
}

const T_V1 = 2662 // 動画1の長さ
const T_W = 2500 // 白い閃光が始まる(動画1の終わりに向けて白くなり、そのあと白が溶けて盤面が現れる)
const T_END = 3300

const CSS = `
@keyframes cf-v1 { 0% { opacity: 0 } 1% { opacity: 1 } 99% { opacity: 1 } 100% { opacity: 0 } }
@keyframes cf-w { 0% { opacity: 0 } 15% { opacity: 1 } 30% { opacity: 1 } 100% { opacity: 0 } }
.cf-l { position: absolute; pointer-events: none; user-select: none; -webkit-user-drag: none; opacity: 0; animation-fill-mode: both; animation-timing-function: linear }
.cf-v { inset: 0; width: 100%; height: 100%; object-fit: cover }
`

// 動画: 指定した時刻(ms)に頭から再生する。透明度は CSS アニメで出し入れする
function Clip({ name, at, dur, anim }) {
  const ref = useRef(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    const t = setTimeout(() => { try { v.currentTime = 0; const p = v.play(); if (p && p.catch) p.catch(() => {}) } catch { /* 再生できなくても、ほかの演出は続く */ } }, at)
    v.load()
    return () => clearTimeout(t)
  }, [at])
  return <video ref={ref} className="cf-l cf-v" src={`${BASE}${name}.mp4`} muted playsInline preload="auto" style={{ animationName: anim, animationDuration: `${dur}ms`, animationDelay: `${at}ms` }} />
}

// ms: 全体の長さ。onSkip: タップで飛ばす
export function CutIn({ ms = T_END, onSkip }) {
  return (
    <div data-testid="cutin" onPointerDown={onSkip} style={{ position: 'fixed', inset: 0, zIndex: 9000, touchAction: 'manipulation', cursor: 'pointer', overflow: 'hidden' }}>
      <style>{CSS}</style>
      {/* ① 全画面アニメ(動画1) */}
      <Clip name="fanfare-1" at={0} dur={T_V1} anim="cf-v1" />
      {/* 閃光: 動画1の最後で真っ白になり、そのあと白が溶けて盤面が見える */}
      <div className="cf-l" style={{ inset: 0, background: '#f4f9ff', animationName: 'cf-w', animationDuration: '800ms', animationDelay: `${T_W}ms`, animationFillMode: 'forwards' }} />
      <div style={{ position: 'absolute', right: 12, bottom: 10, fontSize: 11, color: 'rgba(255,255,255,.7)', textShadow: '0 0 4px #000' }}>タップでスキップ</div>
    </div>
  )
}
