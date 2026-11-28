// 強化(ステータスが上がる)のエフェクト(参考動画 11/27 のルミナスナイトの白い強化を、30コマ/秒で1コマずつ見て作り直し)
// ①数字が変わる瞬間に、カード全体が白っぽく光る(下のほうは青白い)
// ②ガラスの帯のような、半透明の白い輪が2本。カードを囲んで、下から上へ昇りながらふくらんで消える
// ③極細の縦の光の筋が、カードの上へはみ出して長く立ち、すっと消える
// ④小さな白い光の粒が、たくさん(20個)きらめきながら少し昇る。約0.55秒。色は白(ごくわずかに青白い)だけ。
// 描くのはCSSの勾配だけ(画像なし)。動かすのは transform と opacity だけ(GPUで合成されるので、60fps以上でなめらか)。
const abs = { position: 'absolute', pointerEvents: 'none', willChange: 'transform, opacity' }
const ani = (name, ms, delay = 0, ease = 'ease-out') => `${name} ${ms}ms ${ease} ${delay}ms both`
// 光の粒: [横%, 縦%, 遅れms, 大きさ]。ばらつきは決め打ち(再生のたびに同じ見た目にする)
const SPARKS = [[18, 22, 70, 3], [34, 14, 110, 2], [52, 26, 150, 3], [70, 18, 90, 2], [84, 30, 190, 2], [26, 40, 130, 2], [44, 46, 60, 3], [62, 38, 170, 2], [78, 48, 120, 3], [14, 56, 210, 2],
  [36, 62, 100, 2], [56, 58, 160, 3], [74, 66, 80, 2], [88, 60, 200, 2], [22, 74, 140, 2], [46, 78, 180, 3], [66, 82, 110, 2], [32, 30, 230, 2], [58, 12, 220, 2], [82, 40, 60, 2]]

export default function BuffFx({ big = false }) {
  const band = (top, delay, tilt) => (
    <span style={{ ...abs, left: '-20%', right: '-20%', top: `${top}%`, height: '24%', borderRadius: '50%', rotate: `${tilt}deg`, border: `${big ? 2 : 1.5}px solid rgba(255,255,255,0.92)`, background: 'linear-gradient(to bottom, rgba(255,255,255,0.14), rgba(235,248,255,0.02) 55%, rgba(255,255,255,0.1))', boxShadow: 'inset 0 -4px 8px -2px rgba(255,255,255,0.4)', opacity: 0, animation: ani('feel-buff-ring', 400, delay, 'cubic-bezier(0.2, 0.7, 0.25, 1)') }} />
  )
  return (
    <span aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 7, overflow: 'visible' }}>
      {/* カード全体の白い光(下は青白い) */}
      <span style={{ ...abs, inset: 0, borderRadius: '40% 40% 8% 8%', background: 'linear-gradient(to bottom, rgba(255,255,255,0.5) 0%, rgba(240,250,255,0.4) 55%, rgba(190,225,255,0.5) 100%)', opacity: 0, animation: ani('feel-buff-veil', 520, 0, 'ease-out') }} />
      {band(46, 20, -6)}
      {band(58, 80, 5)}
      {/* 極細の縦の光の筋(カードの上へはみ出す) */}
      <span style={{ ...abs, left: '-2%', right: '-2%', top: '-14%', height: '80%', transformOrigin: '50% 0%', background: 'repeating-linear-gradient(to right, rgba(255,255,255,0.65) 0 1px, rgba(255,255,255,0) 1px 4px)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 25%, #000 45%, transparent 95%)', maskImage: 'linear-gradient(to bottom, transparent 0%, #000 25%, #000 45%, transparent 95%)', opacity: 0, animation: ani('feel-buff-lines', 520, 50, 'ease-out') }} />
      {SPARKS.map(([x, y, d, z], n) => (
        <span key={n} style={{ ...abs, left: `${x}%`, top: `${y}%`, width: z + (big ? 1 : 0), height: z + (big ? 1 : 0), borderRadius: '50%', background: '#fff', boxShadow: '0 0 5px 1px rgba(255,255,255,0.95)', opacity: 0, animation: ani('feel-buff-spark', 380, d) }} />
      ))}
    </span>
  )
}
