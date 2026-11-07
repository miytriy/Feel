// 「インフィニティ」のマーク: 金色の丸い枠と、2重線の無限大(∞)。Feel 用に描いた図形(SVG なので、どの大きさでもくっきり)
// アンリミテッド(銅色・ベタ塗りの ∞)と見分けがつくよう、金色で、∞ は輪郭だけの線にしている
// size: 直径(px)
export default function InfinityMark({ size = 28, title = 'インフィニティ' }) {
  const inf = 'M50 50 C58 40 65 33 73 33 C81 33 87 40 87 50 C87 60 81 67 73 67 C65 67 58 60 50 50 C42 40 35 33 27 33 C19 33 13 40 13 50 C13 60 19 67 27 67 C35 67 42 60 50 50 Z'
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={title} style={{ display: 'block', flex: '0 0 auto' }}>
      <defs>
        <linearGradient id="im-frame" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#fff3b8" /><stop offset="0.5" stopColor="#e6bf3a" /><stop offset="1" stopColor="#8f6b0e" />
        </linearGradient>
        <radialGradient id="im-in" cx="0.5" cy="0.4" r="0.75">
          <stop offset="0" stopColor="#4a3d12" /><stop offset="1" stopColor="#241c06" />
        </radialGradient>
        <linearGradient id="im-sym" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff6c8" /><stop offset="0.55" stopColor="#f0cd55" /><stop offset="1" stopColor="#b98c1a" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill="url(#im-frame)" stroke="#4a3608" strokeOpacity=".6" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="39" fill="url(#im-in)" stroke="#fff3b8" strokeOpacity=".5" strokeWidth="1.2" />
      <g transform="translate(50 50) scale(0.82) translate(-50 -50)">
        <path d={inf} fill="none" stroke="url(#im-sym)" strokeWidth="10" strokeLinejoin="round" />
        <path d={inf} fill="none" stroke="#241c06" strokeWidth="4.2" strokeLinejoin="round" />
      </g>
    </svg>
  )
}
