// 「進化可能」の演出(参考動画の再現)。EPが配られたあと、そのチームの最初のターンの頭に1回出る(味方は味方のターン、敵は敵のターンの頭)。
// ①中央に金の波打つ輪と光が小さく現れ、文字が拡大しながら入る → ②横に細い光の筋が伸びる → ③少し保つ → ④ゆっくり消える。全体 1.35 秒。
// 動かすのは transform と opacity だけ(60fps以上)。
export const EVOLVE_READY_MS = 1350

const CSS = `
@keyframes er-text { 0% { opacity: 0; transform: scale(0.62); } 14% { opacity: 1; transform: scale(1.06); } 24% { transform: scale(1); } 70% { opacity: 1; } 100% { opacity: 0; transform: scale(1.04); } }
@keyframes er-streak { 0% { opacity: 0; transform: scaleX(0.1); } 16% { opacity: 1; transform: scaleX(1); } 70% { opacity: 0.9; transform: scaleX(1.04); } 100% { opacity: 0; transform: scaleX(1.1); } }
@keyframes er-halo { 0% { opacity: 0; transform: scale(0.55); } 18% { opacity: 1; transform: scale(1); } 70% { opacity: 0.9; transform: scale(1.06); } 100% { opacity: 0; transform: scale(1.14); } }
@keyframes er-spin { from { transform: rotate(0deg); } to { transform: rotate(18deg); } }
@keyframes er-glow { 0% { opacity: 0; } 20% { opacity: 0.85; } 70% { opacity: 0.6; } 100% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .er * { animation-duration: 0.01ms !important; } }
`
// 金の波打つ輪(縁がうねる炎のような輪郭)
const wavy = (rx, ry, amp, n) => {
  let d = ''
  for (let i = 0; i <= 120; i++) {
    const a = (i / 120) * Math.PI * 2
    const k = 1 + amp * Math.sin(a * n)
    d += `${i ? 'L' : 'M'}${(Math.cos(a) * rx * k).toFixed(1)} ${(Math.sin(a) * ry * k).toFixed(1)}`
  }
  return d + 'Z'
}
export default function EvolveReadyFx() {
  return (
    <div className="er" data-testid="fx-evolve-ready" aria-hidden="true" style={{ position: 'fixed', left: 0, right: 0, top: '40%', height: 0, zIndex: 2600, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{CSS}</style>
      <span style={{ position: 'absolute', width: 'min(92vw, 640px)', height: 150, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(255,214,90,0.55), rgba(255,190,40,0.22) 55%, transparent 80%)', animation: `er-glow ${EVOLVE_READY_MS}ms linear both`, willChange: 'opacity' }} />
      <svg viewBox="-200 -100 400 200" style={{ position: 'absolute', width: 'min(80vw, 420px)', height: 'auto', overflow: 'visible', animation: `er-halo ${EVOLVE_READY_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1) both`, willChange: 'transform, opacity' }}>
        <g style={{ animation: `er-spin ${EVOLVE_READY_MS}ms linear both`, transformOrigin: '0 0' }}>
          <path d={wavy(150, 60, 0.05, 12)} fill="none" stroke="#ffd34a" strokeWidth="3.2" opacity="0.9" />
          <path d={wavy(134, 52, 0.06, 10)} fill="none" stroke="#fff0a8" strokeWidth="2" opacity="0.8" />
        </g>
      </svg>
      <span style={{ position: 'absolute', width: 'min(98vw, 720px)', height: 10, clipPath: 'polygon(0 50%, 12% 38%, 50% 0, 88% 38%, 100% 50%, 88% 62%, 50% 100%, 12% 62%)', background: 'linear-gradient(90deg, rgba(255,200,60,0) 0%, #ffd34a 22%, #fffbe8 50%, #ffd34a 78%, rgba(255,200,60,0) 100%)', filter: 'drop-shadow(0 0 6px rgba(255,200,60,0.9))', animation: `er-streak ${EVOLVE_READY_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1) both`, willChange: 'transform, opacity' }} />
      <span style={{ position: 'relative', fontFamily: "'Noto Serif JP', 'Hiragino Mincho ProN', 'Yu Mincho', serif", fontWeight: 700, fontSize: 'clamp(30px, 9vw, 62px)', letterSpacing: '0.14em', paddingLeft: '0.14em', color: '#fff9de', textShadow: '0 0 6px #ffd34a, 0 0 18px rgba(255,190,40,0.95), 0 0 34px rgba(255,170,20,0.7), 0 2px 0 rgba(120,70,0,0.55)', animation: `er-text ${EVOLVE_READY_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1) both`, willChange: 'transform, opacity' }}>進化可能</span>
    </div>
  )
}
