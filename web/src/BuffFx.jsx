// 強化(ステータスが上がる)のエフェクト(参考動画 11/27 のルミナスナイトの白い強化を、30コマ/秒で1コマずつ見て作り直し)
// ①数字が変わる瞬間に、カードの上のほうがうっすら白く光る(白いアーチの形はださない)
// ②先の尖った白い帯(ガラスのような三日月。焼き込み画像 fx/buff/ribbon.webp)が4本、カードの上半分を渦(竜巻)のように回る。手前の帯は左から右へ、奥の帯は右から左へ。上下にはほとんど昇らない
// ③髪の毛ほど細い縦線が、隙間なくびっしり。カードの上端から下へ、カードの高さの1.5倍ほどまで落ちる(長さ・太さ・濃さはばらばら。焼き込み画像 fx/buff/streaks.webp を2枚重ねる)
// ④小さな白い光の粒が、たくさん(20個)きらめきながら少し昇る。約0.55秒。色は白(ごくわずかに青白い)だけ。
// 描くのは焼き込み画像(帯・縦線)とCSSの勾配。動かすのは transform と opacity だけ(GPUで合成されるので、60fps以上でなめらか)。
const abs = { position: 'absolute', pointerEvents: 'none', willChange: 'transform, opacity' }
const ani = (name, ms, delay = 0, ease = 'ease-out') => `${name} ${ms}ms ${ease} ${delay}ms both`
// 光の粒: [横%, 縦%, 遅れms, 大きさ]。ばらつきは決め打ち(再生のたびに同じ見た目にする)
const SPARKS = [[18, 22, 70, 3], [34, 14, 110, 2], [52, 26, 150, 3], [70, 18, 90, 2], [84, 30, 190, 2], [26, 40, 130, 2], [44, 46, 60, 3], [62, 38, 170, 2], [78, 48, 120, 3], [14, 56, 210, 2],
  [36, 62, 100, 2], [56, 58, 160, 3], [74, 66, 80, 2], [88, 60, 200, 2], [22, 74, 140, 2], [46, 78, 180, 3], [66, 82, 110, 2], [32, 30, 230, 2], [58, 12, 220, 2], [82, 40, 60, 2]]

const FXB = `${import.meta.env?.BASE_URL || '/'}fx/buff/`
// 渦の帯: [縦の位置%, 傾き°, 遅れms, 向き(1=手前で左→右, -1=奥で右→左), 濃さ, 幅%]
const RINGS = [[150, 78, -8, 0, 1], [128, 64, 10, 40, 0.85], [172, 92, 4, 80, 0.7], [112, 52, -16, 120, 0.8], [190, 100, -3, 150, 0.5]]

export default function BuffFx({ big = false }) {
  return (
    <span aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 7, overflow: 'visible' }}>
      {/* カードの上のほうの、うっすらした白い光 */}
      <span style={{ ...abs, left: '-6%', right: '-6%', top: '-6%', height: '70%', borderRadius: '50%', background: 'radial-gradient(ellipse at 50% 35%, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 55%, rgba(255,255,255,0) 78%)', opacity: 0, animation: ani('feel-buff-veil', 460, 0, 'ease-out') }} />
      {/* 輪: 髪の毛ほど細い楕円の輪がカードを囲んで、重なりながら外へふくらんで消える(動画 11/28 再々確認) */}
      {RINGS.map(([w, h, rot, d, o], n) => (
        <span key={n} style={{ ...abs, left: `${50 - w / 2}%`, top: `${48 - h / 2}%`, width: `${w}%`, height: `${h}%`, rotate: `${rot}deg`, border: `${big ? 1.5 : 1}px solid rgba(235,250,255,0.9)`, borderRadius: '50%', boxShadow: '0 0 3px rgba(190,235,255,0.7)', opacity: 0, ['--o']: o, animation: ani('feel-buff-ring2', 520, d, 'cubic-bezier(0.2, 0.6, 0.3, 1)') }} />
      ))}
      {/* 斜めの縦線: 下から上へ流れ上がる。2枚重ね */}
      {[[0, 1, 0.8, 0], [50, -1, 0.55, 2]].map(([d, flip, o, ang], n) => (
        <span key={n} style={{ ...abs, left: "-8%", width: "116%", top: "-30%", height: '150%', rotate: `${ang}deg`, backgroundImage: `url(${FXB}streaks.webp)`, backgroundSize: '100% 100%', scale: `${flip} 1`, opacity: 0, ['--o']: o, animation: ani('feel-buff-rise', 500, d, 'ease-out') }} />
      ))}
      {SPARKS.map(([x, y, d, z], n) => (
        <span key={n} style={{ ...abs, left: `${x}%`, top: `${y}%`, width: z + (big ? 1 : 0), height: z + (big ? 1 : 0), borderRadius: '50%', background: '#fff', boxShadow: '0 0 5px 1px rgba(255,255,255,0.95)', opacity: 0, animation: ani('feel-buff-spark', 380, d) }} />
      ))}
    </span>
  )
}
