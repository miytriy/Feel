// 強化(ステータスが上がる)のエフェクト(参考動画 11/27 のスティールナイト・ルミナスナイトの強化を、1コマずつ見て作り直し)
// ①中央に、白い核と十字(縦横に細く長い光)の星が閃く ②水色のもやが立つ ③細い楕円の輪が3本、少しずつずれて広がる
// ④斜め(約15度)の細い光の筋が、立ち上がるように流れる ⑤小さな光の粒が昇る。約0.8秒で、すべて消える。
// 描くのはCSSの勾配だけ(画像なし)。動かすのは transform と opacity だけ(GPUで合成されるので、60fps以上でなめらか)。
const MS = 800
const ani = (name, delay = 0, ease = 'ease-out', ms = MS) => `${name} ${ms}ms ${ease} ${delay}ms both`
const SPARKS = [[24, 66, 40], [70, 70, 90], [46, 78, 150], [34, 52, 200], [62, 56, 120]]
const abs = { position: 'absolute', pointerEvents: 'none', willChange: 'transform, opacity' }

export default function BuffFx({ big = false }) {
  const ring = (inset, delay, a) => ({ ...abs, left: `${-inset}%`, right: `${-inset}%`, top: `${12 - inset / 2}%`, bottom: `${12 - inset / 2}%`, borderRadius: '50%', border: `1px solid rgba(214,244,255,${a})`, boxShadow: `0 0 4px rgba(120,210,255,${a * 0.6}), inset 0 0 4px rgba(120,210,255,${a * 0.4})`, opacity: 0, animation: ani('feel-buff-ring', delay, 'cubic-bezier(0.15, 0.7, 0.3, 1)') })
  const spike = (horizontal) => ({ ...abs, left: horizontal ? '-26%' : '47%', right: horizontal ? '-26%' : '47%', top: horizontal ? '49%' : '-8%', bottom: horizontal ? '49%' : '-8%', '--sx': 1, '--sy': 1, background: horizontal ? 'linear-gradient(to right, rgba(190,235,255,0), rgba(235,250,255,0.95) 50%, rgba(190,235,255,0))' : 'linear-gradient(to bottom, rgba(190,235,255,0), rgba(235,250,255,0.95) 50%, rgba(190,235,255,0))', opacity: 0, animation: ani('feel-buff-spike', 0, 'cubic-bezier(0.2, 0.8, 0.2, 1)', 620) })
  return (
    <span aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 7, overflow: 'visible' }}>
      {/* 水色のもや */}
      <span style={{ ...abs, left: '-30%', right: '-30%', top: '-6%', bottom: '-6%', background: 'radial-gradient(ellipse at center, rgba(150,225,255,0.75) 0%, rgba(90,170,240,0.4) 42%, rgba(60,120,220,0) 72%)', opacity: 0, animation: ani('feel-buff-haze', 0, 'ease-out') }} />
      {/* 斜めの細い光の筋 */}
      <span style={{ ...abs, left: '-30%', right: '-30%', top: '-14%', bottom: '-14%', background: 'repeating-linear-gradient(to right, rgba(236,250,255,0.9) 0 1px, rgba(236,250,255,0) 1px 6px)', WebkitMaskImage: 'radial-gradient(ellipse at center, #000 0%, transparent 70%)', maskImage: 'radial-gradient(ellipse at center, #000 0%, transparent 70%)', opacity: 0, animation: ani('feel-buff-streak', 40, 'ease-out') }} />
      <span style={ring(10, 0, 0.95)} />
      <span style={ring(26, 70, 0.75)} />
      <span style={ring(42, 140, 0.55)} />
      {/* 十字の星の閃光(核+縦横の光) */}
      <span style={spike(true)} />
      <span style={spike(false)} />
      <span style={{ ...abs, left: '50%', top: '50%', width: big ? '70%' : '62%', aspectRatio: '1', marginLeft: big ? '-35%' : '-31%', marginTop: big ? '-35%' : '-31%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(235,250,255,0.9) 12%, rgba(150,225,255,0.5) 32%, rgba(120,200,255,0) 62%)', opacity: 0, animation: ani('feel-buff-flare', 0, 'cubic-bezier(0.2, 0.8, 0.2, 1)', 620) }} />
      {SPARKS.map(([x, y, d], n) => (
        <span key={n} style={{ ...abs, left: `${x}%`, top: `${y}%`, width: big ? 4 : 3, height: big ? 4 : 3, borderRadius: '50%', background: '#f0fbff', boxShadow: '0 0 5px 1px rgba(150,225,255,0.9)', opacity: 0, animation: ani('feel-buff-spark', d) }} />
      ))}
    </span>
  )
}
