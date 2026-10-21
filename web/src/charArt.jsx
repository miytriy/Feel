// Feel - キャラの絵: キャラの id → 絵のファイル。絵があるキャラは、四角いブロック模様のかわりに、この絵が出る
// 絵のファイルは web/public/art/ に置く(縦横は、ほぼ正方形がおすすめ。顔が真ん中より少し上だと、丸いアイコンもきれいに切れる)
// ★絵のファイルは、なくてもよい: ファイルが読み込めなかったキャラは、自動で、四角いブロック模様にもどる
//   (絵をGitHubに上げないときも、そのまま動く)
// fx / fy = 顔の中心の位置(絵の左上からの%)。丸いアイコンで、顔をアップにするときに使う
import { useSyncExternalStore } from 'react'

const base = (import.meta.env && import.meta.env.BASE_URL) || '/'

export const CHAR_ART = {
  elf_01: { src: `${base}art/elf_01.webp`, fx: 56, fy: 27 }, // 純粋なるウォーターフェアリー
}

// 読み込めなかった絵(ファイルがない など)
const missing = new Set()
const listeners = new Set()
function markMissing(id) {
  if (missing.has(id)) return
  missing.add(id)
  listeners.forEach((f) => f())
}
// 絵があるキャラか(読み込めなかったものは「ない」)
export const artOf = (id) => (CHAR_ART[id] && !missing.has(id) ? CHAR_ART[id] : null)
// 絵の有無を、画面が見ていられるようにする(読み込めないと分かったとき、画面を描き直す)
export function useArtStatus() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb) },
    () => missing.size,
  )
}

// 絵(枠いっぱいに広げる)。zoom を入れると、顔を真ん中にして、その倍率でアップにする
export function ArtImg({ id, zoom = 0 }) {
  const a = artOf(id)
  if (!a) return null
  const style = { objectPosition: `${a.fx}% ${a.fy}%` }
  if (zoom) {
    style.transformOrigin = `${a.fx}% ${a.fy}%`
    style.transform = `translate(${50 - a.fx}%, ${50 - a.fy}%) scale(${zoom})`
  }
  return <img className="art" src={a.src} alt="" draggable={false} decoding="async" style={style} onError={() => markMissing(id)} />
}
