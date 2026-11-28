// 強化(ステータスが上がる)のエフェクト(参考動画 11/27 のルミナスナイトの白い強化を、1コマずつ見て作り直し)
// ①カードをうっすら白い光が包む ②細い白い楕円の輪が2本、カードを囲んで少しずつ上へ昇って消える
// ③極細の縦の光の筋が、上から下へ流れる ④小さな白い光の粒がきらめく。約0.75秒。色は白だけ(青・水色は使わない)。
// 描くのはCSSの勾配だけ(画像なし)。動かすのは transform と opacity だけ(GPUで合成されるので、60fps以上でなめらか)。
const MS = 750
const ani = (name, delay = 0, ease = 'ease-out', ms = MS) => `${name} ${ms}ms ${ease} ${delay}ms both`
const SPARKS = [[22, 62, 60], [70, 48, 110], [44, 74, 160], [30, 34, 90], [62, 66, 210], [80, 74, 40], [14, 50, 190], [52, 28, 140]]
const abs = { position: 'absolute', pointerEvents: 'none', willChange: 'transform, opacity' }

export default function BuffFx({ big = false }) {
  const ring = (top, h, delay, a, tilt) => ({ ...abs, left: '-14%', right: '-14%', top: `${top}%`, height: `${h}%`, borderRadius: '50%', border: `${big ? 2 : 1.5}px solid rgba(255,255,255,${a})`, borderBottomColor: `rgba(255,255,255,${a * 0.35})`, transformOrigin: '50% 50%', rotate: `${tilt}deg`, opacity: 0, animation: ani('feel-buff-ring', delay, 'cubic-bezier(0.2, 0.7, 0.25, 1)', 600) })
  return (
    <span aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 7, overflow: 'visible' }}>
      {/* うっすら白い光 */}
      <span style={{ ...abs, inset: '-4%', borderRadius: '30% 30% 8% 8%', background: 'radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.25) 55%, rgba(255,255,255,0) 80%)', opacity: 0, animation: ani('feel-buff-veil', 0, 'ease-out', 520) }} />
      {/* 細い白い楕円の輪(2本) */}
      <span style={ring(16, 30, 60, 0.95, -4)} />
      <span style={ring(34, 30, 130, 0.8, 3)} />
      {/* 極細の縦の光の筋 */}
      <span style={{ ...abs, left: '-2%', right: '-2%', top: '4%', bottom: '-6%', background: 'repeating-linear-gradient(to right, rgba(255,255,255,0.75) 0 1px, rgba(255,255,255,0) 1px 4px)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 22%, #000 55%, transparent 100%)', maskImage: 'linear-gradient(to bottom, transparent 0%, #000 22%, #000 55%, transparent 100%)', opacity: 0, animation: ani('feel-buff-lines', 90, 'ease-out', 600) }} />
      {SPARKS.map(([x, y, d], n) => (
        <span key={n} style={{ ...abs, left: `${x}%`, top: `${y}%`, width: big ? 3 : 2, height: big ? 3 : 2, borderRadius: '50%', background: '#fff', boxShadow: '0 0 4px 1px rgba(255,255,255,0.9)', opacity: 0, animation: ani('feel-buff-spark', d, 'ease-out', 520) }} />
      ))}
    </span>
  )
}
