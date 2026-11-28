// 強化(ステータスが上がる)のエフェクト(参考動画 11/27 のルミナスナイトの白い強化を、30コマ/秒で1コマずつ見て作り直し)
// ①数字が変わる瞬間に、カードの上のほうがうっすら白く光る(白いアーチの形はださない)
// ②髪の毛ほど細い白い輪が2本(中はほぼ透明で、縁だけ光る)。カードを囲んで、下から上へ昇りながらふくらんで消える
// ③極細の縦の光の線が、カードの上端から下へ、カードの高さの1.5倍ほどまで落ちる(長さ・太さ・濃さはばらばら。均一なくしではない。動画 11/28 の再確認)
// ④小さな白い光の粒が、たくさん(20個)きらめきながら少し昇る。約0.55秒。色は白(ごくわずかに青白い)だけ。
// 描くのはCSSの勾配だけ(画像なし)。動かすのは transform と opacity だけ(GPUで合成されるので、60fps以上でなめらか)。
const abs = { position: 'absolute', pointerEvents: 'none', willChange: 'transform, opacity' }
const ani = (name, ms, delay = 0, ease = 'ease-out') => `${name} ${ms}ms ${ease} ${delay}ms both`
// 光の粒: [横%, 縦%, 遅れms, 大きさ]。ばらつきは決め打ち(再生のたびに同じ見た目にする)
const SPARKS = [[18, 22, 70, 3], [34, 14, 110, 2], [52, 26, 150, 3], [70, 18, 90, 2], [84, 30, 190, 2], [26, 40, 130, 2], [44, 46, 60, 3], [62, 38, 170, 2], [78, 48, 120, 3], [14, 56, 210, 2],
  [36, 62, 100, 2], [56, 58, 160, 3], [74, 66, 80, 2], [88, 60, 200, 2], [22, 74, 140, 2], [46, 78, 180, 3], [66, 82, 110, 2], [32, 30, 230, 2], [58, 12, 220, 2], [82, 40, 60, 2]]

// 縦の光の線: [横%, 上端%, 長さ%, 遅れms, 濃さ]。ばらつきは決め打ち(再生のたびに同じ見た目にする)
const LINES = [[4, -6, 90, 40, 0.5], [9, 0, 140, 10, 0.8], [13, -4, 70, 60, 0.45], [18, 2, 120, 20, 0.7], [23, -8, 160, 0, 0.9], [27, 4, 80, 50, 0.5], [32, 0, 150, 30, 0.85], [36, -2, 100, 70, 0.55],
  [41, -6, 170, 10, 0.95], [45, 2, 90, 40, 0.5], [49, 0, 130, 0, 0.8], [53, -4, 160, 60, 0.9], [57, 4, 70, 20, 0.45], [61, -2, 140, 30, 0.85], [66, 0, 110, 50, 0.6], [70, -8, 150, 10, 0.9],
  [74, 2, 80, 70, 0.5], [78, -4, 130, 0, 0.75], [83, 0, 100, 40, 0.55], [87, -6, 120, 20, 0.7], [92, 2, 70, 60, 0.45], [96, -2, 90, 30, 0.5]]

export default function BuffFx({ big = false }) {
  const band = (top, delay, tilt) => (
    <span style={{ ...abs, left: '-22%', right: '-22%', top: `${top}%`, height: '26%', borderRadius: '50%', rotate: `${tilt}deg`, border: `${big ? 1.5 : 1}px solid rgba(255,255,255,0.95)`, background: 'linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(255,255,255,0.01) 55%, rgba(255,255,255,0.06))', boxShadow: '0 0 5px 0 rgba(255,255,255,0.65), inset 0 -3px 6px -2px rgba(255,255,255,0.3)', opacity: 0, animation: ani('feel-buff-ring', 420, delay, 'cubic-bezier(0.2, 0.7, 0.25, 1)') }} />
  )
  return (
    <span aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 7, overflow: 'visible' }}>
      {/* カードの上のほうの、うっすらした白い光 */}
      <span style={{ ...abs, left: '-6%', right: '-6%', top: '-6%', height: '70%', borderRadius: '50%', background: 'radial-gradient(ellipse at 50% 35%, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.12) 55%, rgba(255,255,255,0) 78%)', opacity: 0, animation: ani('feel-buff-veil', 460, 0, 'ease-out') }} />
      {band(34, 10, -18)}
      {band(50, 70, 14)}
      {/* 縦の光の線(上端から下へ、カードの下のほうまで落ちる。先ほど上端と下端がすっとぼける) */}
      {LINES.map(([x, t, h, d, o], n) => (
        <span key={n} style={{ ...abs, left: `${x}%`, top: `${t}%`, width: big ? 2 : 1, height: `${h}%`, transformOrigin: '50% 0%', background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.85) 14%, rgba(255,255,255,0.6) 55%, rgba(255,255,255,0) 100%)', opacity: 0, ['--o']: o, animation: ani('feel-buff-line', 430, d, 'ease-out') }} />
      ))}
      {SPARKS.map(([x, y, d, z], n) => (
        <span key={n} style={{ ...abs, left: `${x}%`, top: `${y}%`, width: z + (big ? 1 : 0), height: z + (big ? 1 : 0), borderRadius: '50%', background: '#fff', boxShadow: '0 0 5px 1px rgba(255,255,255,0.95)', opacity: 0, animation: ani('feel-buff-spark', 380, d) }} />
      ))}
    </span>
  )
}
