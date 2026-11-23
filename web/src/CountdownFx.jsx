// 【カウントダウン】の演出(参考動画の再現)。カウントダウンを持つもの(アミュレットなど)が進むたびに、
//  カードを中心に、半透明の水色の球が広がる + 白い光の筋が放射状に走る(中心が一瞬強く光る)。球と中心の光は約0.42秒。光の筋は、真上から時計回りに0.1秒で出そろい、しばらく残って、外側から中心へ縮みながら消える。
//  複数あるときは、順に少しずつずらして出す(delay)。transform と opacity だけで動かす(web/EFFECTS.md)
const BOX = { position: 'absolute', left: '50%', top: '50%', width: '150%', aspectRatio: '1', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 9 }
const FILL = { position: 'absolute', inset: 0, borderRadius: '50%', willChange: 'transform, opacity' }

// 光の筋: 中心から外へ、先へいくほど細く尖る三角形(中心がいちばん太い)。長さはばらばら(長いものと短いものが混ざる)。決まった並びで、毎回同じ見た目
const RAYS = Array.from({ length: 30 }, (_, n) => {
  const a = (n / 30) * Math.PI * 2 + Math.sin(n * 12.9898) * 0.08
  const r = ((n * 7919) % 100) / 100
  const len = n % 3 === 0 ? 40 + r * 14 : n % 3 === 1 ? 24 + r * 14 : 11 + r * 12 // 長い・中くらい・短い
  const base = 0.22 + ((n * 17) % 5) * 0.05 // 根元の太さ(細い)
  const nx = -Math.sin(a), ny = Math.cos(a)
  const phase = (((a + Math.PI / 2) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2) // 真上(12時)から時計回りに 0〜1
  const p = (x, y) => `${x.toFixed(2)},${y.toFixed(2)}`
  return { pts: `${p(50 + nx * base, 50 + ny * base)} ${p(50 + Math.cos(a) * len, 50 + Math.sin(a) * len)} ${p(50 - nx * base, 50 - ny * base)}`, phase }
})

export function CountdownFx({ delay = 0 }) {
  const d = `${delay}s`
  return (
    <span aria-hidden="true" data-testid="fx-countdown" style={BOX}>
      <span style={{ ...FILL, background: 'radial-gradient(circle at 50% 50%, rgba(70,150,255,0.10) 0%, rgba(70,160,255,0.22) 66%, rgba(120,215,255,0.55) 90%, rgba(190,240,255,0.0) 100%)', boxShadow: '0 0 18px 1px rgba(110,190,255,0.45), inset 0 0 16px 1px rgba(170,230,255,0.5)', opacity: 0, animation: `feel-cd-dome 0.42s cubic-bezier(.2,.7,.3,1) ${d} both` }} />
      <span style={{ ...FILL, border: '1.5px solid rgba(215,245,255,0.75)', boxSizing: 'border-box', opacity: 0, animation: `feel-cd-rim 0.42s ease-out ${d} both` }} />
      <svg viewBox="0 0 100 100" style={{ ...FILL, overflow: 'visible', animation: `feel-cd-rays 0.46s ease-in-out ${d} both` }}>
        {[['#9fe8ff', 0.55, -0.5, 0.3], ['#ffc4f0', 0.5, 0.5, -0.3], ['#fff', 1, 0, 0]].map(([c, op, dx, dy], k) => (
          <g key={k} fill={c} opacity={op} transform={`translate(${dx} ${dy})`}>
            {RAYS.map((r, n) => <polygon key={n} points={r.pts} style={{ opacity: 0, animation: `feel-cd-ray 0.3s linear ${(delay + 0.03 + r.phase * 0.1).toFixed(3)}s both` }} />)}
          </g>
        ))}
      </svg>
      <span style={{ ...FILL, inset: '40%', background: 'radial-gradient(circle, #fff 0%, rgba(255,255,255,0.85) 30%, rgba(190,235,255,0) 70%)', opacity: 0, animation: `feel-cd-flash 0.42s ease-out ${d} both` }} />
    </span>
  )
}
