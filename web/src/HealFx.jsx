// 回復の演出(約1.35秒)。参考動画を24fpsで読み取った段階に合わせる:
//  ①0〜0.15秒 上から緑の光が差し、大きな緑の数字が出る → ②0.1〜0.5秒 カードが白黄色に光り、白い光の球(縁がけばだつ)が広がる
//  ③0.3〜1.1秒 球が黄緑〜緑の半透明の泡になり、細い輪が外へ広がる。きらめきが瞬く → ④1.0〜1.35秒 泡と数字が消える
// 質感は web/tools/bake-heal.py で web/public/fx/heal/{core,bubble,rings,sparkle}.webp に焼き込み(768px・透過)。
// 規約(EFFECTS.md): ゲーム中に動かすのは transform と opacity だけ。
const IMG = (n) => `url(${import.meta.env?.BASE_URL || '/'}fx/heal/${n}.webp)`
const L = { position: 'absolute', left: '50%', top: '50%', aspectRatio: '1', pointerEvents: 'none', opacity: 0, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', willChange: 'transform, opacity' }
const C = (size, img, extra) => ({ ...L, height: `${size}%`, marginLeft: `-${size / 2}%`, marginTop: `-${size / 2}%`, backgroundImage: IMG(img), ...extra })

export function HealFx({ text, big }) {
  const num = String(text ?? '').replace(/^\+/, '')
  const w = (big ? 46 : 34) * Math.max(1, num.length * 0.78)
  return (
    <span aria-hidden="true" data-testid="fx-heal" style={{ position: 'absolute', inset: 0, zIndex: 8, pointerEvents: 'none', overflow: 'visible' }}>
      {/* ① 上から差す緑の光 */}
      <span style={{ position: 'absolute', left: '8%', top: '-8%', width: '46%', height: '64%', borderRadius: '50%', background: 'linear-gradient(180deg, rgba(120,255,170,0.8), rgba(120,255,170,0))', opacity: 0, animation: 'feel-hl-beam 0.3s ease-out both', willChange: 'transform, opacity' }} />
      {/* ② カードの白い光(あとで緑がかる) */}
      <span style={{ position: 'absolute', inset: 0, borderRadius: 8, background: 'radial-gradient(circle at 50% 45%, #fffff2 0%, rgba(244,255,214,0.92) 58%, rgba(214,255,180,0.7) 100%)', opacity: 0, animation: 'feel-hl-wash 0.8s ease-out 0.05s both', willChange: 'opacity' }} />
      <span style={{ position: 'absolute', inset: 0, borderRadius: 8, background: 'rgba(120,230,150,0.5)', opacity: 0, animation: 'feel-hl-tint 0.95s ease-in-out 0.3s both', willChange: 'opacity' }} />
      {/* 白い光の球 → 緑の泡 */}
      <span style={C(190, 'core', { animation: 'feel-hl-orb1 0.6s cubic-bezier(.2,.8,.3,1) 0.08s both' })} />
      <span style={C(142, 'bubble', { animation: 'feel-hl-orb2 0.9s ease-out 0.28s both' })} />
      {/* 細い輪(2枚を逆向きに少し回す) */}
      <span style={C(150, 'rings', { animation: 'feel-hl-thin 0.9s ease-out 0.3s both' })} />
      <span style={C(150, 'rings', { transform: 'scaleX(-1)', animation: 'feel-hl-thin2 0.9s ease-out 0.42s both' })} />
      {/* きらめき(2枚を順に瞬かせる) */}
      <span style={C(150, 'sparkle', { animation: 'feel-hl-spark 0.55s ease-in-out 0.22s both' })} />
      <span style={C(150, 'sparkle', { transform: 'rotate(37deg) scale(0.92)', animation: 'feel-hl-spark2 0.6s ease-in-out 0.5s both' })} />
      {/* 緑の大きな数字(最後まで残る) */}
      <span style={{ position: 'absolute', left: '50%', top: '-34%', marginLeft: -w / 2, width: w, height: (big ? 66 : 50), opacity: 0, animation: 'feel-hl-num 1.3s ease-out 0.06s both', willChange: 'transform, opacity' }}>
        <svg viewBox={`0 0 ${w} ${big ? 66 : 50}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          <defs>
            <linearGradient id="hlg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8af5b4" /><stop offset="0.5" stopColor="#2fd37c" /><stop offset="1" stopColor="#0f9a55" /></linearGradient>
          </defs>
          <text x={w / 2} y={big ? 56 : 43} textAnchor="middle" fontSize={big ? 66 : 50} fontWeight="900" fontStyle="italic" fontFamily='"Chakra Petch","Rajdhani","Segoe UI","Hiragino Sans",sans-serif' fill="none" stroke="#05503a" strokeWidth={big ? 7 : 5.5} strokeLinejoin="round">{num}</text>
          <text x={w / 2} y={big ? 56 : 43} textAnchor="middle" fontSize={big ? 66 : 50} fontWeight="900" fontStyle="italic" fontFamily='"Chakra Petch","Rajdhani","Segoe UI","Hiragino Sans",sans-serif' fill="url(#hlg)" stroke="#d6ffe6" strokeWidth="1" strokeLinejoin="round">{num}</text>
        </svg>
      </span>
    </span>
  )
}
