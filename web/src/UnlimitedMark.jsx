// 「アンリミテッド」のマーク: 銅色の丸い枠と、無限大(∞)。Feel 用に描いた図形(SVG なので、どの大きさでもくっきり)
// size: 直径(px)
export default function UnlimitedMark({ size = 28, title = 'アンリミテッド' }) {
  // ∞ のかたち(ベジェ曲線): 中心(50,50)で交差する、左右の輪
  const inf = 'M50 50 C58 40 65 33 73 33 C81 33 87 40 87 50 C87 60 81 67 73 67 C65 67 58 60 50 50 C42 40 35 33 27 33 C19 33 13 40 13 50 C13 60 19 67 27 67 C35 67 42 60 50 50 Z'
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={title} style={{ display: 'block', flex: '0 0 auto' }}>
      <defs>
        <linearGradient id="um-frame" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#ffd9b0" /><stop offset="0.5" stopColor="#d98d54" /><stop offset="1" stopColor="#8f4f25" />
        </linearGradient>
        <linearGradient id="um-in" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a4e2c" /><stop offset="1" stopColor="#5a2f17" />
        </linearGradient>
        <linearGradient id="um-sym" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe2c2" /><stop offset="0.6" stopColor="#e9a76e" /><stop offset="1" stopColor="#c27a43" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill="url(#um-frame)" stroke="#5a2f17" strokeOpacity=".55" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="37" fill="url(#um-in)" stroke="#3a1c0b" strokeOpacity=".6" strokeWidth="1.5" />
      <g transform="translate(50 50) scale(0.84) translate(-50 -50)">
      <path d={inf} fill="none" stroke="#3a1c0b" strokeOpacity=".45" strokeWidth="9.5" strokeLinejoin="round" transform="translate(0 1.6)" />
      <path d={inf} fill="none" stroke="url(#um-sym)" strokeWidth="8" strokeLinejoin="round" />
      </g>
    </svg>
  )
}
