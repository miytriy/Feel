// 強化(ステータスが上がる)のエフェクト(参考動画 11/27 のルミナスナイトのとおり)
// カードを細い白い弧が回り、キラキラが昇り、細い縦の光の筋のカーテンが上から下へ落ちて消える(約0.9秒)。
// 描くのはCSSだけ(画像なし)。動かすのは transform と opacity だけ。
const MS = 900
const ani = (name, delay = 0, ease = 'ease-out') => `${name} ${MS}ms ${ease} ${delay}ms both`
const SPARKS = [[18, 70, 0], [38, 82, 90], [58, 66, 40], [76, 78, 140], [30, 58, 190], [66, 60, 120]]

export default function BuffFx({ big = false }) {
  const arc = (top, rot, delay, a) => ({ position: 'absolute', left: '-14%', right: '-14%', top, height: '40%', borderRadius: '50%', border: '1.5px solid transparent', borderTopColor: `rgba(255,255,255,${a})`, borderRightColor: `rgba(255,255,255,${a * 0.35})`, '--r': `${rot}deg`, opacity: 0, willChange: 'transform, opacity', animation: ani('feel-buff-arc', delay, 'cubic-bezier(0.2, 0.7, 0.2, 1)') })
  return (
    <span aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 7 }}>
      <span style={arc('36%', -14, 0, 0.9)} />
      <span style={arc('48%', 11, 90, 0.75)} />
      {/* 上から下へ落ちる、細い縦の光の筋 */}
      <span style={{ position: 'absolute', left: '-2%', right: '-2%', top: '28%', height: '78%', background: 'repeating-linear-gradient(to right, rgba(236,255,236,0.85) 0 1px, rgba(236,255,236,0) 1px 5px)', WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, transparent 100%)', maskImage: 'linear-gradient(to bottom, #000 0%, transparent 100%)', opacity: 0, willChange: 'transform, opacity', animation: ani('feel-buff-curtain', 120, 'linear') }} />
      {SPARKS.map(([x, y, d], n) => (
        <span key={n} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: big ? 4 : 3, height: big ? 4 : 3, borderRadius: '50%', background: '#f4ffd8', boxShadow: '0 0 5px 1px rgba(220,255,150,0.9)', opacity: 0, willChange: 'transform, opacity', animation: ani('feel-buff-spark', d) }} />
      ))}
    </span>
  )
}
