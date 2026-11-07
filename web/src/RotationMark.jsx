// 「ローテーション」のマーク: 六角形の枠(ななめに光る青銀)と、6つの丸。Feel 用に描いた図形(画像ではなく SVG なので、どの大きさでもくっきり)
// size: 一辺の大きさ(px)
const dotAt = (i) => { const a = (-90 + i * 60) * (Math.PI / 180); return [50 + Math.cos(a) * 25, 50 + Math.sin(a) * 25] }

export default function RotationMark({ size = 28, title = 'ローテーション' }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={title} style={{ display: 'block', flex: '0 0 auto' }}>
      <defs>
        <linearGradient id="rm-frame" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#eaf2ff" /><stop offset="0.45" stopColor="#8fb2ee" /><stop offset="1" stopColor="#3f68b8" />
        </linearGradient>
        <linearGradient id="rm-in" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b4e9c" /><stop offset="1" stopColor="#16306e" />
        </linearGradient>
        <radialGradient id="rm-dot" cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#ffffff" /><stop offset="0.55" stopColor="#bcd3f7" /><stop offset="1" stopColor="#6f96d8" />
        </radialGradient>
      </defs>
      <polygon points="50,4 90,27 90,73 50,96 10,73 10,27" fill="url(#rm-frame)" stroke="#1c3a7c" strokeOpacity=".55" strokeWidth="1.5" strokeLinejoin="round" />
      <polygon points="50,15 80,32.5 80,67.5 50,85 20,67.5 20,32.5" fill="url(#rm-in)" stroke="#0f2250" strokeOpacity=".7" strokeWidth="1.5" strokeLinejoin="round" />
      {Array.from({ length: 6 }).map((_, i) => { const [x, y] = dotAt(i); return <circle key={i} cx={x} cy={y} r="7" fill="url(#rm-dot)" /> })}
    </svg>
  )
}
