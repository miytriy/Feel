import { artOf, ArtImg, useArtStatus } from './charArt.jsx'

// Feel - キャラの絵(まだ画像がないので、名前から決まる左右対称のブロック模様)。戦闘の顔ぶれなどで使う
export function hash(str) {
  let h = 2166136261
  for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) }
  return h >>> 0
}
export function Emblem({ seed, color = '#111', zoom = 0 }) {
  useArtStatus() // 絵が読み込めないと分かったら、ブロック模様に描き直す
  if (artOf(seed)) return <ArtImg id={seed} zoom={zoom} />
  const h = hash(seed)
  const cells = []
  for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) {
    if ((h >> (y * 3 + x)) & 1) { cells.push([x, y]); if (x < 2) cells.push([4 - x, y]) }
  }
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 3l29 29-29 29L3 32z" fill="none" stroke={color} strokeOpacity="0.35" strokeWidth="1" />
      {cells.map(([x, y]) => <rect key={x + '-' + y} x={9 + x * 9.2} y={9 + y * 9.2} width="8" height="8" fill={color} opacity="0.85" />)}
    </svg>
  )
}
