import { useEffect, useRef } from 'react'
// 消滅エフェクト。60fps の連番画像(スプライトシート)を、1コマずつ見せるだけ。
// 画像は tools/bake-vanish.cjs で焼き込む(8列×7行 = 56コマ。0.9秒 = 約62fps)。設計・タイミングは web/EFFECTS.md「消滅」
// 表示は <canvas>: 起動時に1回だけデコードした画像(ImageBitmap)を、全員で使い回す。1コマ分(400px)だけを描くので、
// 「大きな画像を毎回デコードして固まる」「背景位置のアニメで再描画が走る」がなく、時計は経過時間で決める(重いときは、コマが飛ぶだけで、速さは変わらない)
const SHEET = `${import.meta.env?.BASE_URL || '/'}fx/vanish/sheet.webp`
export const VANISH_BASE_MS = 900
const COLS = 8, ROWS = 7, FRAME = 400

let source = null // デコード済みの画像(ImageBitmap。使えない環境では HTMLImageElement)
let loading = null
const loadSheet = () => {
  if (source || typeof window === 'undefined') return Promise.resolve(source)
  if (!loading) {
    loading = (async () => {
      try {
        if (typeof createImageBitmap === 'function') {
          const blob = await (await fetch(SHEET)).blob()
          source = await createImageBitmap(blob)
        } else throw new Error('no bitmap')
      } catch {
        await new Promise((res) => { const im = new Image(); im.onload = () => { source = im; res() }; im.onerror = res; im.src = SHEET })
      }
      return source
    })()
  }
  return loading
}
loadSheet() // 先に読み込んで、デコードもしておく

// 親(カード)の中央に、カード高さの約2.2倍の四角を置く
export function VanishFx({ ms = VANISH_BASE_MS }) {
  const cv = useRef(null)
  useEffect(() => {
    const el = cv.current
    if (!el) return undefined
    const ctx = el.getContext('2d')
    const mount = performance.now()
    let raf = 0, t0 = null, last = -1, dead = false
    const n = COLS * ROWS
    const tick = (now) => {
      if (dead) return
      if (!source) { raf = requestAnimationFrame(tick); return } // 読み込みが終わるまで待つ(終わってから、時計を始める)
      if (t0 == null) t0 = now
      const k = Math.floor(((now - t0) / ms) * n)
      if (k >= n) {
        ctx.clearRect(0, 0, FRAME, FRAME)
        window.dispatchEvent(new CustomEvent('feel-fxprobe', { detail: `消滅 ${Math.round(performance.now() - mount)}ms` })) // テスト戦の検証用
        return
      }
      if (k !== last) { // 飛ばされたコマがあっても、いまの時刻のコマを出す
        last = k
        ctx.clearRect(0, 0, FRAME, FRAME)
        ctx.drawImage(source, (k % COLS) * FRAME, Math.floor(k / COLS) * FRAME, FRAME, FRAME, 0, 0, FRAME, FRAME)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { dead = true; cancelAnimationFrame(raf) }
  }, [ms])
  return <canvas ref={cv} width={FRAME} height={FRAME} aria-hidden="true" data-testid="fx-vanish" style={{ position: 'absolute', left: '50%', top: '50%', height: '220%', aspectRatio: '1', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 9 }} />
}
