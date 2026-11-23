// 【カウントダウン】の演出(参考動画の再現。60fps のコマを1つずつ見て合わせた)。transform と opacity だけで動かす(web/EFFECTS.md)
//  ・水色の球(半透明・縁が明るい)が、カードの1.5倍の大きさで出て、終わりに少し縮みながら薄い水色になって消える
//  ・白い光の筋: 長い10本・中くらい10本・短い10本(根元は細く、先は少しだけ細い)が、真上から時計回りに約0.1秒で出そろい、
//    にじむ虹色の小さな破片が混ざり、そのあと中心へ縮みながら消える。中心の光はごく小さく、桃色がかった白
//  複数あるときは、順に少しずつずらして出す(delay)
const BOX = { position: 'absolute', left: '50%', top: '50%', width: '150%', aspectRatio: '1', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 9 }
const FILL = { position: 'absolute', inset: 0, borderRadius: '50%', willChange: 'transform, opacity' }
const TAU = Math.PI * 2
const phaseOf = (a) => ((((a + Math.PI / 2) % TAU) + TAU) % TAU) / TAU // 真上(12時)から時計回りに 0〜1

// 光の筋: 長さがばらばら。根元はごく細く、先は少しだけ細い(外へ向かって太くはならない)
const RAYS = Array.from({ length: 30 }, (_, n) => {
  const a = (n / 30) * TAU + Math.sin(n * 12.9898) * 0.09
  const r = ((n * 7919) % 100) / 100
  const kind = n % 3
  const len = kind === 0 ? 38 + r * 10 : kind === 1 ? 22 + r * 9 : 9 + r * 7 // 長い・中くらい・短い
  const base = kind === 0 ? 0.34 : kind === 1 ? 0.26 : 0.2
  const tip = base * 0.3
  const nx = -Math.sin(a), ny = Math.cos(a), c = Math.cos(a), s = Math.sin(a)
  const p = (x, y) => `${x.toFixed(2)},${y.toFixed(2)}`
  return { pts: `${p(50 + nx * base, 50 + ny * base)} ${p(50 + c * len + nx * tip, 50 + s * len + ny * tip)} ${p(50 + c * len - nx * tip, 50 + s * len - ny * tip)} ${p(50 - nx * base, 50 - ny * base)}`, phase: phaseOf(a) }
})
// 虹色のにじみ(光の筋のそばの、小さな細長い破片)
const PRISMS = Array.from({ length: 10 }, (_, n) => {
  const a = n * 2.399963 + 0.6, r0 = 9 + ((n * 13) % 8) * 2.2, len = 4 + (n % 3) * 1.6
  const x1 = 50 + Math.cos(a) * r0, y1 = 50 + Math.sin(a) * r0, x2 = 50 + Math.cos(a) * (r0 + len), y2 = 50 + Math.sin(a) * (r0 + len)
  const nx = -Math.sin(a) * 0.45, ny = Math.cos(a) * 0.45
  return { pts: `${(x1 + nx).toFixed(2)},${(y1 + ny).toFixed(2)} ${(x2 + nx).toFixed(2)},${(y2 + ny).toFixed(2)} ${(x2 - nx).toFixed(2)},${(y2 - ny).toFixed(2)} ${(x1 - nx).toFixed(2)},${(y1 - ny).toFixed(2)}`, phase: phaseOf(a), gx: [x1, y1, x2, y2] }
})
// 球の縁の内側の、薄い放射状の短い線(12本。動画では、よく見ると分かる程度のごく薄いもの)
const TICKS = Array.from({ length: 12 }, (_, n) => {
  const a = (n / 12) * TAU - Math.PI / 2
  return { x1: 50 + Math.cos(a) * 38, y1: 50 + Math.sin(a) * 38, x2: 50 + Math.cos(a) * 45, y2: 50 + Math.sin(a) * 45 }
})

export function CountdownFx({ delay = 0 }) {
  const d = `${delay}s`
  return (
    <span aria-hidden="true" data-testid="fx-countdown" style={BOX}>
      <span style={{ ...FILL, background: 'radial-gradient(circle at 50% 50%, rgba(40,130,230,0.40) 0%, rgba(45,140,235,0.46) 68%, rgba(100,195,255,0.62) 90%, rgba(190,235,255,0.0) 100%)', boxShadow: 'inset 0 0 14px 2px rgba(170,228,255,0.5), 0 0 14px 1px rgba(90,170,255,0.4)', opacity: 0, animation: `feel-cd-dome 0.4s cubic-bezier(.2,.7,.3,1) ${d} both` }} />
      <span style={{ ...FILL, background: 'radial-gradient(circle, rgba(150,240,235,0.0) 40%, rgba(150,240,235,0.5) 100%)', opacity: 0, animation: `feel-cd-lite 0.4s linear ${d} both` }} />
      <svg viewBox="0 0 100 100" style={{ ...FILL, overflow: 'visible', opacity: 0, animation: `feel-cd-dome 0.4s cubic-bezier(.2,.7,.3,1) ${d} both` }}>
        <g stroke="rgba(170,228,255,0.17)" strokeWidth="3" strokeLinecap="butt">{TICKS.map((t, n) => <line key={n} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />)}</g>
      </svg>
      <svg viewBox="0 0 100 100" style={{ ...FILL, overflow: 'visible', animation: `feel-cd-rays 0.46s ease-in-out ${d} both` }}>
        <defs>
          {PRISMS.map((q, n) => (
            <linearGradient key={n} id={`cdp${n}`} gradientUnits="userSpaceOnUse" x1={q.gx[0]} y1={q.gx[1]} x2={q.gx[2]} y2={q.gx[3]}>
              <stop offset="0" stopColor="#ff6aa0" /><stop offset="0.25" stopColor="#ffe35a" /><stop offset="0.5" stopColor="#6dff9a" /><stop offset="0.75" stopColor="#5ad8ff" /><stop offset="1" stopColor="#9a7bff" />
            </linearGradient>
          ))}
        </defs>
        {[['#8fdcff', 0.5, -0.45, 0.25], ['#ffb8ec', 0.5, 0.45, -0.25], ['#fff', 1, 0, 0]].map(([c, op, dx, dy], k) => (
          <g key={k} fill={c} opacity={op} transform={`translate(${dx} ${dy})`}>
            {RAYS.map((r, n) => <polygon key={n} points={r.pts} style={{ opacity: 0, animation: `feel-cd-ray 0.3s linear ${(delay + 0.03 + r.phase * 0.1).toFixed(3)}s both` }} />)}
          </g>
        ))}
        <g opacity="0.5">{PRISMS.map((q, n) => <polygon key={n} points={q.pts} fill={`url(#cdp${n})`} style={{ opacity: 0, animation: `feel-cd-ray 0.26s linear ${(delay + 0.05 + q.phase * 0.1).toFixed(3)}s both` }} />)}</g>
      </svg>
      <span style={{ ...FILL, inset: '45%', background: 'radial-gradient(circle, #fff 0%, rgba(255,235,248,0.9) 35%, rgba(255,200,235,0) 72%)', opacity: 0, animation: `feel-cd-flash 0.4s ease-out ${d} both` }} />
    </span>
  )
}
