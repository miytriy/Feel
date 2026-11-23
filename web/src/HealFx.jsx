// 回復の演出(約1.35秒)。参考動画を24fpsで読み取った段階に合わせる:
//  ①0〜0.15秒 上から緑の光が差し、大きな緑の数字が出る → ②0.1〜0.5秒 カードが白黄色に光り、白い球が広がる(放射状の筋・白い輪・きらめき)
//  ③0.3〜1.1秒 球が黄緑〜緑の半透明になり、細い輪が外へ広がる → ④1.0〜1.35秒 球が消え、数字もきえる
// 規約(EFFECTS.md): 動かすのは transform と opacity だけ。層の見た目(グラデーション)は動かさない。
const L = { position: 'absolute', left: '50%', top: '50%', aspectRatio: '1', pointerEvents: 'none', willChange: 'transform, opacity' }
const C = (size) => ({ ...L, height: `${size}%`, marginLeft: `-${size / 2}%`, marginTop: `-${size / 2}%`, borderRadius: '50%', opacity: 0 })
const SPARK = Array.from({ length: 18 }, (_, n) => ({ x: 8 + ((n * 41) % 84), y: 10 + ((n * 59) % 80), s: 2 + (n % 3), d: (n % 7) * 0.05 }))

export function HealFx({ text, big }) {
  const num = String(text ?? '').replace(/^\+/, '')
  const size = big ? 58 : 42
  return (
    <span aria-hidden="true" data-testid="fx-heal" style={{ position: 'absolute', inset: 0, zIndex: 8, pointerEvents: 'none', overflow: 'visible' }}>
      {/* ① 上から差す緑の光 */}
      <span style={{ position: 'absolute', left: '8%', top: '-6%', width: '44%', height: '62%', borderRadius: '50%', background: 'linear-gradient(180deg, rgba(120,255,170,0.85), rgba(120,255,170,0))', opacity: 0, animation: 'feel-hl-beam 0.3s ease-out both', willChange: 'transform, opacity' }} />
      {/* ② カードの白い光(あとで緑がかる) */}
      <span style={{ position: 'absolute', inset: 0, borderRadius: 8, background: 'radial-gradient(circle at 50% 45%, #fffff0 0%, rgba(240,255,200,0.9) 60%, rgba(200,255,170,0.7) 100%)', opacity: 0, animation: 'feel-hl-wash 0.8s ease-out 0.05s both', willChange: 'opacity' }} />
      <span style={{ position: 'absolute', inset: 0, borderRadius: 8, background: 'rgba(110,230,140,0.55)', opacity: 0, animation: 'feel-hl-tint 0.95s ease-in-out 0.3s both', willChange: 'opacity' }} />
      {/* 白い球 → 黄緑の球 → 緑の球 */}
      <span style={{ ...C(130), background: 'radial-gradient(circle, #fff 0%, #fffff0 45%, rgba(236,255,190,0.95) 68%, rgba(200,255,150,0.6) 86%, rgba(190,255,150,0) 100%)', animation: 'feel-hl-orb1 0.55s cubic-bezier(.2,.8,.3,1) 0.08s both' }} />
      <span style={{ ...C(136), background: 'radial-gradient(circle, rgba(190,255,170,0.18) 0%, rgba(170,255,130,0.3) 62%, rgba(110,235,110,0.75) 86%, rgba(190,255,190,0.95) 94%, rgba(190,255,190,0) 100%)', animation: 'feel-hl-orb2 0.85s ease-out 0.3s both' }} />
      {/* 放射状の筋・白い輪 */}
      <span style={{ ...C(170), background: 'repeating-conic-gradient(from 3deg, rgba(255,255,255,0.95) 0deg 1.1deg, rgba(255,255,255,0) 1.1deg 12deg)', WebkitMaskImage: 'radial-gradient(circle, #000 0%, #000 36%, transparent 72%)', maskImage: 'radial-gradient(circle, #000 0%, #000 36%, transparent 72%)', animation: 'feel-hl-rays 0.45s ease-out 0.12s both' }} />
      <span style={{ ...C(112), border: '4px solid rgba(255,255,235,0.95)', boxSizing: 'border-box', animation: 'feel-hl-ring 0.6s ease-out 0.18s both' }} />
      {/* 外へ広がる細い輪 */}
      {[0.3, 0.45, 0.6].map((d, n) => <span key={n} style={{ ...C(120), border: '1.5px solid rgba(190,255,210,0.85)', boxSizing: 'border-box', animation: `feel-hl-thin 0.7s ease-out ${d}s both` }} />)}
      {/* きらめき */}
      {SPARK.map((q, n) => <span key={n} style={{ position: 'absolute', left: `${q.x}%`, top: `${q.y}%`, width: q.s, height: q.s, borderRadius: '50%', background: '#fff', boxShadow: '0 0 4px 1px rgba(255,255,255,0.9)', opacity: 0, animation: `feel-hl-spark 0.5s ease-in-out ${0.2 + q.d}s both`, willChange: 'opacity' }} />)}
      {/* 緑の大きな数字(カードの左上。最後まで残る) */}
      <span style={{ position: 'absolute', left: '-4%', top: '-26%', opacity: 0, fontWeight: 900, fontStyle: 'italic', fontSize: size, lineHeight: 1, fontFamily: '"Chakra Petch","Rajdhani","Segoe UI","Hiragino Sans",sans-serif', color: '#22c46a', backgroundImage: 'linear-gradient(180deg, #7dffae 0%, #22c46a 55%, #0e8a4a 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', WebkitTextStroke: '0px', filter: 'drop-shadow(0 0 1.5px #064d2a) drop-shadow(0 0 1.5px #064d2a) drop-shadow(0 2px 1px rgba(0,60,30,0.6))', animation: 'feel-hl-num 1.3s ease-out 0.06s both', willChange: 'transform, opacity' }}>{num}</span>
    </span>
  )
}
