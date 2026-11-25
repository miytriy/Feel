// 回復の演出(約1.35秒)。参考動画を24fpsで読み取った段階に合わせる:
//  ①0〜0.15秒 大きな緑の数字が出る → ②0.1〜0.5秒 カードが白黄色に光り、白い光の球(縁がけばだつ)が広がる
//  ③0.3〜1.1秒 球が黄緑〜緑の半透明の泡になり、細い輪が外へ広がる。きらめきが瞬く → ④1.0〜1.35秒 泡と数字が消える
// 質感は web/tools/bake-heal.py で web/public/fx/heal/{core,bubble,rings,sparkle}.webp に焼き込み(768px・透過)。
// 規約(EFFECTS.md): ゲーム中に動かすのは transform と opacity だけ。
// 円の層は、カードの高さの○%の正円。中央には、flex の中央ぞろえで置く(以前の margin の%は「幅」基準で、幅と高さがちがうパソコンのカードでずれていた)
const IMG = (n) => `url(${import.meta.env?.BASE_URL || '/'}fx/heal/${n}.webp)`
const L = { position: 'absolute', aspectRatio: '1', pointerEvents: 'none', opacity: 0, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', willChange: 'transform, opacity' }
const C = (size, img, extra) => ({ ...L, height: `${size}%`, backgroundImage: IMG(img), ...extra })

export function HealFx({ children }) {
  return (
    <span aria-hidden="true" data-testid="fx-heal" style={{ position: 'absolute', inset: 0, zIndex: 8, pointerEvents: 'none', overflow: 'visible', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* ② カードの白い光(あとで緑がかる) */}
      <span style={{ position: 'absolute', inset: '-10%', borderRadius: '50%', background: 'radial-gradient(closest-side at 50% 50%, #fffff2 0%, rgba(244,255,214,0.92) 45%, rgba(226,255,190,0.5) 72%, rgba(214,255,180,0) 100%)', opacity: 0, animation: 'feel-hl-wash 0.8s ease-out 0.05s both', willChange: 'opacity' }} />
      <span style={{ position: 'absolute', inset: '-10%', borderRadius: '50%', background: 'radial-gradient(closest-side at 50% 50%, rgba(120,230,150,0.55) 0%, rgba(120,230,150,0.4) 60%, rgba(120,230,150,0) 100%)', opacity: 0, animation: 'feel-hl-tint 0.95s ease-in-out 0.3s both', willChange: 'opacity' }} />
      {/* 白い光の球 → 緑の泡 */}
      <span style={C(190, 'core', { animation: 'feel-hl-orb1 0.6s cubic-bezier(.2,.8,.3,1) 0.08s both' })} />
      <span style={C(142, 'bubble', { animation: 'feel-hl-orb2 0.9s ease-out 0.28s both' })} />
      {/* 細い輪(2枚を逆向きに少し回す) */}
      <span style={C(150, 'rings', { animation: 'feel-hl-thin 0.9s ease-out 0.3s both' })} />
      <span style={C(150, 'rings', { transform: 'scaleX(-1)', animation: 'feel-hl-thin2 0.9s ease-out 0.42s both' })} />
      {/* きらめき(2枚を順に瞬かせる) */}
      <span style={C(150, 'sparkle', { animation: 'feel-hl-spark 0.55s ease-in-out 0.22s both' })} />
      <span style={C(150, 'sparkle', { transform: 'rotate(37deg) scale(0.92)', animation: 'feel-hl-spark2 0.6s ease-in-out 0.5s both' })} />
      {/* 緑の数字(ダメージ数字と同じ字。最後まで残る) */}
      <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 2 }}>
        <span style={{ display: 'block', opacity: 0, animation: 'feel-hl-num 1.3s ease-out 0.06s both', willChange: 'transform, opacity' }}>{children}</span>
      </span>
    </span>
  )
}
