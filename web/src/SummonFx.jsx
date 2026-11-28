// 出場・召喚の演出(参考動画 11/28 の原作の出場演出を、30コマ/秒で1コマずつ見て作成)
// ①0〜0.07秒: 出る場所に小さな金色の光の点。灰色の衝撃の円盤が一瞬ふくらむ。
// ②0.07〜0.15秒: 細い衝撃の輪が、カードの1.6倍ほどまで広がる。灰白色の破片が外へ飛んで落ちる。
// ③0.1〜0.45秒: カードを琥珀色の半透明の円盤(カードより少し大きい)が包み、金の輪が何重にも渦を巻く。カードは、琥珀色の光ごしに現れる。
// ④0.4〜0.7秒: 輪が白金の弧になって外へ渦を巻きながら大きくなって消える(カードの2〜2.4倍)。小さな金の粒がきらめく。
// 描くのはCSSの勾配・枠線だけ。動かすのは transform と opacity だけ(GPUで合成されるので、60fps以上でなめらか)。
const abs = { position: 'absolute', pointerEvents: 'none', willChange: 'transform, opacity' }
const ani = (name, ms, delay = 0, ease = 'ease-out') => `${name} ${ms}ms ${ease} ${delay}ms both`
const GOLD = '255,214,110'
// 金の輪(円盤の中): [幅%, つぶし率, 傾き°, 遅れms, 回る向き]
const RINGS = [[92, 0.96, 0, 90, 1], [78, 0.9, 14, 120, -1], [64, 0.84, -18, 150, 1], [104, 0.94, 8, 110, -1]]
// 外へ渦を巻く白金の弧: [幅%, つぶし率, 傾き°, 遅れms, 回る向き, 弧°]
const SWIRLS = [[130, 0.8, -12, 260, 1, 250], [160, 0.7, 16, 290, -1, 220], [190, 0.78, -6, 320, 1, 200], [215, 0.72, 22, 350, -1, 180]]
// 破片: [角度°, 距離%, 大きさ, 遅れms]
const SHARDS = [[10, 78, 7, 70], [48, 92, 5, 80], [88, 70, 6, 75], [128, 96, 8, 70], [168, 74, 5, 85], [205, 90, 7, 70], [246, 72, 6, 80], [286, 94, 5, 75], [326, 80, 8, 70], [28, 60, 4, 90], [150, 64, 4, 90], [262, 58, 4, 90]]
const SPARKS = [[18, 26, 200, 3], [36, 16, 240, 2], [58, 30, 280, 3], [78, 20, 220, 2], [88, 40, 300, 2], [24, 52, 260, 2], [46, 60, 230, 3], [68, 50, 320, 2], [82, 70, 250, 2], [14, 74, 290, 2], [38, 84, 340, 2], [60, 78, 270, 3], [74, 88, 310, 2]]

export default function SummonFx({ big = false }) {
  const bw = big ? 2 : 1.5
  return (
    <span aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 8, overflow: 'visible' }}>
      {/* ①金の光の点 + 灰色の衝撃の円盤 */}
      <span style={{ ...abs, left: '50%', top: '50%', width: '70%', aspectRatio: '1', marginLeft: '-35%', marginTop: '-35%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(120,112,128,0.5) 0%, rgba(120,112,128,0.32) 60%, rgba(120,112,128,0) 74%)', opacity: 0, animation: ani('feel-sm-haze', 260, 0, 'ease-out') }} />
      <span style={{ ...abs, left: '50%', top: '50%', width: '34%', aspectRatio: '1', marginLeft: '-17%', marginTop: '-17%', borderRadius: '50%', background: `radial-gradient(circle, rgba(255,246,200,0.95) 0%, rgba(${GOLD},0.6) 40%, rgba(${GOLD},0) 72%)`, opacity: 0, animation: ani('feel-sm-dot', 180, 0, 'ease-out') }} />
      {/* ②衝撃の輪 */}
      <span style={{ ...abs, left: '50%', top: '50%', width: '110%', aspectRatio: '1', marginLeft: '-55%', marginTop: '-55%', borderRadius: '50%', border: `${bw}px solid rgba(235,235,240,0.7)`, boxShadow: '0 0 6px rgba(255,255,255,0.4)', opacity: 0, animation: ani('feel-sm-shock', 300, 60, 'cubic-bezier(0.2, 0.7, 0.3, 1)') }} />
      {/* 破片 */}
      {SHARDS.map(([a, r, z, d], n) => {
        const rad = (a * Math.PI) / 180
        const zz = z + (big ? 2 : 0)
        return (
          <span key={n} style={{ ...abs, inset: 0, ['--sx']: `${Math.cos(rad) * r * 0.5}%`, ['--sy']: `${Math.sin(rad) * r * 0.62}%`, opacity: 0, animation: ani('feel-sm-shard', 460, d, 'cubic-bezier(0.2, 0.6, 0.4, 1)') }}>
            <span style={{ position: 'absolute', left: '50%', top: '50%', width: zz, height: zz * 0.7, marginLeft: -zz / 2, marginTop: -zz / 3, background: 'rgba(214,214,222,0.92)', clipPath: 'polygon(10% 0, 100% 30%, 70% 100%, 0 70%)', transform: `rotate(${a * 2}deg)` }} />
          </span>
        )
      })}
      {/* ③琥珀色の円盤 */}
      <span style={{ ...abs, left: '50%', top: '50%', width: '108%', aspectRatio: '1', marginLeft: '-54%', marginTop: '-54%', borderRadius: '50%', background: `radial-gradient(circle, rgba(${GOLD},0.4) 0%, rgba(${GOLD},0.5) 62%, rgba(${GOLD},0.3) 86%, rgba(${GOLD},0.12) 100%)`, border: `${bw}px solid rgba(255,230,150,0.8)`, boxShadow: `0 0 16px 3px rgba(${GOLD},0.5), inset 0 0 14px rgba(${GOLD},0.5)`, opacity: 0, animation: ani('feel-sm-disc', 520, 90, 'ease-out') }} />
      {RINGS.map(([w, k, tilt, d, dir], n) => (
        <span key={n} style={{ ...abs, left: '50%', top: '50%', width: `${w}%`, aspectRatio: '1', marginLeft: `${-w / 2}%`, marginTop: `${-w / 2}%`, transform: `rotate(${tilt}deg) scaleY(${k})` }}>
          <span style={{ ...abs, inset: 0, borderRadius: '50%', border: `${bw}px solid rgba(255,236,170,0.95)`, boxShadow: `0 0 9px 1px rgba(${GOLD},0.7), inset 0 0 9px rgba(${GOLD},0.5)`, opacity: 0, ['--dir']: dir, animation: ani('feel-sm-ring', 420, d, 'cubic-bezier(0.25, 0.55, 0.3, 1)') }} />
        </span>
      ))}
      {/* ④外へ渦を巻く白金の弧 */}
      {SWIRLS.map(([w, k, tilt, d, dir, arc], n) => (
        <span key={n} style={{ ...abs, left: '50%', top: '50%', width: `${w}%`, aspectRatio: '1', marginLeft: `${-w / 2}%`, marginTop: `${-w / 2}%`, transform: `rotate(${tilt}deg) scaleY(${k})` }}>
          <span style={{ ...abs, inset: 0, borderRadius: '50%', border: `${bw}px solid rgba(255,248,214,0.85)`, boxShadow: `0 0 8px rgba(${GOLD},0.5)`, WebkitMaskImage: `conic-gradient(from 0deg, transparent 0deg, #000 ${arc}deg, transparent ${arc + 1}deg)`, maskImage: `conic-gradient(from 0deg, transparent 0deg, #000 ${arc}deg, transparent ${arc + 1}deg)`, opacity: 0, ['--dir']: dir, animation: ani('feel-sm-swirl', 460, d, 'cubic-bezier(0.25, 0.55, 0.3, 1)') }} />
        </span>
      ))}
      {SPARKS.map(([x, y, d, z], n) => (
        <span key={n} style={{ ...abs, left: `${x}%`, top: `${y}%`, width: z + (big ? 1 : 0), height: z + (big ? 1 : 0), borderRadius: '50%', background: '#fff3c0', boxShadow: `0 0 5px 1px rgba(${GOLD},0.95)`, opacity: 0, animation: ani('feel-sm-spark', 380, d) }} />
      ))}
    </span>
  )
}
