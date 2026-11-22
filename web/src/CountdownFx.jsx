// 【カウントダウン】の演出(参考動画の再現)。カウントダウンを持つもの(アミュレットなど)が進むたびに、
//  カードを中心に、半透明の水色の球が広がる + 白い光の筋が放射状に走る(中心が一瞬強く光る)。約0.42秒。
//  複数あるときは、順に少しずつずらして出す(delay)。transform と opacity だけで動かす(web/EFFECTS.md)
const BOX = { position: 'absolute', left: '50%', top: '50%', width: '150%', aspectRatio: '1', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 9 }
const FILL = { position: 'absolute', inset: 0, borderRadius: '50%', willChange: 'transform, opacity' }

// 光の筋: 中心から外へ、長さと太さがばらばらの細い線(決まった並び。毎回同じ見た目)
const RAYS = Array.from({ length: 34 }, (_, n) => {
  const a = (n / 34) * Math.PI * 2 + Math.sin(n * 12.9898) * 0.05
  const len = 22 + ((n * 37) % 29) * 0.95 // 22〜50
  const w = 0.28 + ((n * 17) % 5) * 0.12
  return { x2: 50 + Math.cos(a) * len, y2: 50 + Math.sin(a) * len, w }
})

export function CountdownFx({ delay = 0 }) {
  const d = `${delay}s`
  return (
    <span aria-hidden="true" data-testid="fx-countdown" style={BOX}>
      <span style={{ ...FILL, background: 'radial-gradient(circle at 50% 50%, rgba(120,200,255,0.10) 0%, rgba(90,175,255,0.30) 62%, rgba(150,225,255,0.65) 88%, rgba(210,245,255,0.0) 100%)', boxShadow: '0 0 24px 2px rgba(110,190,255,0.55), inset 0 0 22px 2px rgba(190,235,255,0.55)', opacity: 0, animation: `feel-cd-dome 0.42s cubic-bezier(.2,.7,.3,1) ${d} both` }} />
      <svg viewBox="0 0 100 100" style={{ ...FILL, overflow: 'visible', opacity: 0, animation: `feel-cd-rays 0.42s ease-out ${d} both` }}>
        <g stroke="#9fe8ff" strokeLinecap="round" opacity="0.55" transform="translate(-0.7 0.4)">{RAYS.map((r, n) => <line key={n} x1="50" y1="50" x2={r.x2} y2={r.y2} strokeWidth={r.w} />)}</g>
        <g stroke="#ffc4f0" strokeLinecap="round" opacity="0.5" transform="translate(0.7 -0.4)">{RAYS.map((r, n) => <line key={n} x1="50" y1="50" x2={r.x2} y2={r.y2} strokeWidth={r.w} />)}</g>
        <g stroke="#fff" strokeLinecap="round">{RAYS.map((r, n) => <line key={n} x1="50" y1="50" x2={r.x2} y2={r.y2} strokeWidth={r.w} />)}</g>
      </svg>
      <span style={{ ...FILL, inset: '40%', background: 'radial-gradient(circle, #fff 0%, rgba(255,255,255,0.85) 30%, rgba(190,235,255,0) 70%)', opacity: 0, animation: `feel-cd-flash 0.42s ease-out ${d} both` }} />
    </span>
  )
}
