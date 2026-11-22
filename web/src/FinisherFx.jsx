// 【必殺】の演出(参考動画の再現。約1.0秒 / 60fps)。transform と opacity だけで動かす(web/EFFECTS.md)
//  前半 FinisherA(0〜0.5秒): 対象に、鎌のマーク入りの黒紫の球が広がる → 鎌が回る → 球が暗くなる → 白い雲に変わる
//  後半 FinisherB(0.5〜1.0秒): 白い閃光 → 輪と光の筋 → ガラスのような破片が飛び散る → 暗い紫のもやと星 → 斜めの白い光の筋が走る
// どちらも、カードの中心を基準に、カード幅の1.4倍の「球の箱」の中に置く(カードの大きさが違っても、同じ見た目になる)
const BOX = { position: 'absolute', left: '50%', top: '50%', width: '140%', aspectRatio: '1', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 9 }
const FILL = { position: 'absolute', inset: 0, borderRadius: '50%', willChange: 'transform, opacity' }

// 鎌のマーク(うすい紫)
function Scythe({ style }) {
  return (
    <svg viewBox="0 0 100 100" style={{ position: 'absolute', left: '27%', top: '27%', width: '46%', height: '46%', overflow: 'visible', willChange: 'transform, opacity', ...style }}>
      <defs><linearGradient id="fin-sc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#d7bcff" /><stop offset="1" stopColor="#9a6cf0" /></linearGradient></defs>
      <path d="M22 30 C40 6 78 10 90 40 C74 22 48 22 36 40 L44 46 L20 92 L9 86 L28 44 Z" fill="url(#fin-sc)" stroke="#efe2ff" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M16 70 L26 76 M12 78 L22 84 M20 62 L30 68" stroke="#efe2ff" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  )
}

const STARS_A = Array.from({ length: 16 }, (_, n) => { const a = n * 2.39996; const r = 8 + (n % 5) * 8; return { x: 50 + Math.cos(a) * r, y: 50 + Math.sin(a) * r, s: 1.5 + (n % 3), d: (n % 7) * 0.03 } })

export function FinisherA() {
  return (
    <span aria-hidden="true" data-testid="fx-finisher-a" style={BOX}>
      <span style={{ ...FILL, background: 'radial-gradient(circle, rgba(6,0,16,0.98) 0%, rgba(10,0,26,0.97) 46%, rgba(58,12,108,0.9) 66%, rgba(150,40,190,0.55) 82%, rgba(60,10,100,0) 100%)', opacity: 0, animation: 'feel-fin-sphere 0.5s cubic-bezier(.2,.8,.3,1) both' }} />
      <span style={{ ...FILL, background: 'radial-gradient(circle, rgba(255,255,255,0) 62%, rgba(255,150,246,0.95) 82%, rgba(255,255,255,0.95) 90%, rgba(255,110,240,0) 100%)', boxShadow: '0 0 22px 6px rgba(236,90,255,0.75)', opacity: 0, animation: 'feel-fin-rim 0.34s ease-out both' }} />
      {STARS_A.map((q, n) => <span key={n} style={{ position: 'absolute', left: `${q.x}%`, top: `${q.y}%`, width: q.s, height: q.s, borderRadius: '50%', background: '#e8d8ff', opacity: 0, animation: `feel-fin-star 0.36s ease-in-out ${0.1 + q.d}s both` }} />)}
      <Scythe style={{ opacity: 0, animation: 'feel-fin-scythe 0.5s cubic-bezier(.15,.7,.25,1) both' }} />
      <span style={{ position: 'absolute', left: '12%', top: '14%', width: '76%', height: '72%', borderRadius: '38% 44% 40% 46% / 42% 38% 46% 40%', background: 'radial-gradient(ellipse at 50% 45%, rgba(255,250,255,0.98) 0%, rgba(226,208,252,0.96) 55%, rgba(176,150,226,0.7) 85%, rgba(176,150,226,0) 100%)', boxShadow: '0 0 14px 4px rgba(214,190,255,0.7)', opacity: 0, animation: 'feel-fin-cloud 0.5s ease-in both', willChange: 'transform, opacity' }} />
    </span>
  )
}

// 破片: ガラスのようなかけら(白・桃・水色・薄紫・薄黄の淡いグラデーション)
const SHARD_CLIP = ['polygon(50% 0, 100% 80%, 0 100%)', 'polygon(0 20%, 100% 0, 80% 100%)', 'polygon(10% 0, 100% 30%, 60% 100%, 0 70%)', 'polygon(30% 0, 100% 50%, 40% 100%)', 'polygon(0 0, 100% 40%, 50% 100%)']
const SHARD_BG = [
  'linear-gradient(135deg, #ffffff, #ffd2f0)', 'linear-gradient(135deg, #ffffff, #bfeaff)', 'linear-gradient(135deg, #f4eaff, #c9b4ff)',
  'linear-gradient(135deg, #ffffff, #fff1b8)', 'linear-gradient(135deg, #d8f6ff, #ffc6e8)',
]
const SHARDS = Array.from({ length: 34 }, (_, n) => {
  const a = n * 2.39996 + (n % 3) * 0.3; const far = 0.9 + ((n * 37) % 11) / 11 * 0.9
  return { n, w: 4.5 + ((n * 13) % 9) * 1.0, ar: 0.8 + ((n * 7) % 5) * 0.2, dx: Math.round(Math.cos(a) * far * 100), dy: Math.round(Math.sin(a) * far * 92), r: ((n * 53) % 9 - 4) * 60, d: ((n * 5) % 6) * 0.012, dur: 0.34 + ((n * 3) % 5) * 0.05, clip: SHARD_CLIP[n % 5], bg: SHARD_BG[(n * 3) % 5], x0: 50 + Math.cos(a) * 12, y0: 50 + Math.sin(a) * 12 }
})
const DUST = Array.from({ length: 18 }, (_, n) => { const a = n * 2.39996; const r = 10 + (n % 6) * 9; return { x: 50 + Math.cos(a) * r, y: 50 + Math.sin(a) * r, s: 1.5 + (n % 3) * 1.1, d: 0.04 + (n % 8) * 0.03, c: n % 3 === 0 ? '#ffffff' : n % 3 === 1 ? '#cdb6ff' : '#9fd8ff' } })

export function FinisherB() {
  return (
    <span aria-hidden="true" data-testid="fx-finisher-b" style={BOX}>
      <span style={{ ...FILL, inset: '-4%', background: 'radial-gradient(circle, #fff 0%, rgba(255,246,255,0.96) 55%, rgba(236,214,255,0.6) 82%, rgba(236,214,255,0) 100%)', opacity: 0, animation: 'feel-fin-burst 0.2s ease-out both' }} />
      <span style={{ ...FILL, inset: '-2%', background: 'radial-gradient(circle, rgba(70,30,130,0.0) 0%, rgba(54,24,110,0.62) 55%, rgba(30,10,70,0) 100%)', opacity: 0, animation: 'feel-fin-dust 0.5s ease-out 0.03s both' }} />
      <span style={{ ...FILL, border: '4px solid #fff', boxShadow: '0 0 14px 3px rgba(255,255,255,0.95), inset 0 0 12px 2px rgba(255,255,255,0.7)', opacity: 0, animation: 'feel-fin-ring 0.26s ease-out both' }} />
      <span style={{ position: 'absolute', left: '-35%', top: '-35%', width: '170%', height: '170%', backgroundImage: `url(${import.meta.env?.BASE_URL || '/'}fx/evolve/rays.webp)`, backgroundSize: '100% 100%', opacity: 0, animation: 'feel-fin-rays 0.34s ease-out both', willChange: 'transform, opacity' }} />
      <Scythe style={{ opacity: 0, animation: 'feel-fin-ghost 0.3s ease-out both', filter: 'saturate(0.8)' }} />
      {DUST.map((q, n) => <span key={`d${n}`} style={{ position: 'absolute', left: `${q.x}%`, top: `${q.y}%`, width: q.s, height: q.s, borderRadius: '50%', background: q.c, boxShadow: `0 0 4px 1px ${q.c}`, opacity: 0, animation: `feel-fin-star 0.4s ease-in-out ${q.d}s both` }} />)}
      {SHARDS.map((s) => (
        <span key={s.n} style={{ position: 'absolute', left: `${s.x0}%`, top: `${s.y0}%`, width: `${s.w}%`, aspectRatio: String(s.ar), marginLeft: `${-s.w / 2}%`, clipPath: s.clip, background: s.bg, opacity: 0, willChange: 'transform, opacity', '--dx': `${s.dx}%`, '--dy': `${s.dy}%`, '--r': `${s.r}deg`, animation: `feel-fin-shard ${s.dur}s cubic-bezier(.1,.7,.3,1) ${s.d}s both` }} />
      ))}
      {/* 斜めに走る白い光の筋(先端に虹色のにじみ) */}
      <span style={{ position: 'absolute', left: '-60%', top: '44%', width: '220%', height: '5%', transform: 'rotate(-34deg)', transformOrigin: '50% 50%', opacity: 0, background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.95) 55%, #fff 80%, rgba(255,255,255,0) 100%)', boxShadow: '0 0 14px 3px rgba(255,255,255,0.8)', animation: 'feel-fin-streak 0.34s cubic-bezier(.4,0,.6,1) 0.12s both', willChange: 'transform, opacity' }}>
        <span style={{ position: 'absolute', right: '4%', top: '50%', width: '9%', aspectRatio: '1', marginTop: '-4.5%', borderRadius: '50%', background: 'conic-gradient(#ff9ad0, #ffe08a, #9affc8, #8ad4ff, #c79bff, #ff9ad0)', opacity: 0.85 }} />
      </span>
    </span>
  )
}
