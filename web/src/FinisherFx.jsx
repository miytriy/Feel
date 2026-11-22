// 必殺の演出(約1秒): 紫の球が広がる → 球の中で、鎌のマークが回って現れる → 白く光って砕け、破片が飛ぶ
// 規約(EFFECTS.md): 動かすのは transform と opacity だけ。層の見た目(グラデーション)は動かさない。
const SHARDS = Array.from({ length: 14 }, (_, n) => {
  const a = (n / 14) * Math.PI * 2 + (n % 3) * 0.21
  const r = 58 + ((n * 37) % 46)
  return { dx: Math.cos(a) * r, dy: Math.sin(a) * r, rot: ((n * 83) % 240) - 120, s: 7 + ((n * 5) % 9), hue: [270, 300, 210, 330][n % 4], d: (n % 4) * 0.015 }
})
const L = { position: 'absolute', left: '50%', top: '50%', aspectRatio: '1', borderRadius: '50%', pointerEvents: 'none' }

export function FinisherFx() {
  return (
    <span aria-hidden="true" data-testid="fx-finisher" style={{ position: 'absolute', inset: 0, zIndex: 8, pointerEvents: 'none', overflow: 'visible' }}>
      {/* 予兆: 小さな桃色の光 */}
      <span style={{ ...L, height: '90%', marginLeft: '-45%' , marginTop: '-45%', background: 'radial-gradient(circle, rgba(255,170,255,0.95) 0%, rgba(230,90,255,0.55) 35%, rgba(200,60,255,0) 70%)', opacity: 0, animation: 'feel-fin-glow 0.34s ease-out both', willChange: 'transform, opacity' }} />
      {/* 紫の球(外側は明るい桃紫、中は黒に近い紫) */}
      <span style={{ ...L, height: '136%', marginLeft: '-68%', marginTop: '-68%', background: 'radial-gradient(circle, #05010d 0%, #12042a 34%, rgba(60,14,120,0.92) 58%, rgba(176,60,240,0.95) 80%, rgba(255,120,255,0.95) 91%, rgba(255,160,255,0) 100%)', opacity: 0, animation: 'feel-fin-orb 0.7s cubic-bezier(.2,.8,.3,1) 0.06s both', willChange: 'transform, opacity' }} />
      {/* 鎌のマーク(自作の形。球の中で回りながら現れる) */}
      <span style={{ ...L, height: '78%', marginLeft: '-39%', marginTop: '-39%', opacity: 0, animation: 'feel-fin-scythe 0.62s cubic-bezier(.2,.7,.3,1) 0.14s both', willChange: 'transform, opacity' }}>
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          <path d="M66 10 C32 8 12 30 14 58 C24 38 42 26 66 26 L84 30 L76 18 Z" fill="#b184ff" />
          <rect x="44" y="30" width="9" height="66" rx="3" fill="#b184ff" transform="rotate(24 48 63)" />
        </svg>
      </span>
      {/* 白い光(砕ける瞬間) */}
      <span style={{ ...L, height: '120%', marginLeft: '-60%', marginTop: '-60%', background: 'radial-gradient(circle, #fff 0%, #fff 42%, rgba(240,225,255,0.85) 66%, rgba(220,190,255,0) 100%)', opacity: 0, animation: 'feel-fin-flash 0.42s ease-out 0.56s both', willChange: 'transform, opacity' }} />
      {/* 放射状の光の筋 */}
      <span style={{ ...L, height: '190%', marginLeft: '-95%', marginTop: '-95%', background: 'repeating-conic-gradient(from 4deg, rgba(255,255,255,0.95) 0deg 1.4deg, rgba(255,255,255,0) 1.4deg 15deg)', WebkitMaskImage: 'radial-gradient(circle, #000 0%, #000 30%, transparent 70%)', maskImage: 'radial-gradient(circle, #000 0%, #000 30%, transparent 70%)', opacity: 0, animation: 'feel-fin-rays 0.4s ease-out 0.58s both', willChange: 'transform, opacity' }} />
      {/* 破片 */}
      {SHARDS.map((q, n) => (
        <span key={n} style={{ position: 'absolute', left: '50%', top: '50%', width: q.s, height: q.s * 1.25, marginLeft: -q.s / 2, marginTop: -q.s * 0.62, clipPath: 'polygon(50% 0, 100% 70%, 20% 100%)', background: `linear-gradient(135deg, #fff, hsl(${q.hue} 90% 72%))`, '--dx': `${q.dx}px`, '--dy': `${q.dy}px`, '--rot': `${q.rot}deg`, opacity: 0, animation: `feel-fin-shard 0.42s ease-out ${0.58 + q.d}s both`, willChange: 'transform, opacity' }} />
      ))}
    </span>
  )
}
