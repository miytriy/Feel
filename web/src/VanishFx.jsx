// 消滅エフェクト。60fps の連番画像(スプライトシート)を、1コマずつ見せるだけ(動かすのは transform だけ)。
// 画像は tools/bake-vanish.cjs で焼き込む(8列×7行 = 56コマ。0.9秒 = 約62fps)。設計・タイミングは web/EFFECTS.md「消滅」
const SHEET = `${import.meta.env?.BASE_URL || '/'}fx/vanish/sheet.webp`
export const VANISH_BASE_MS = 900
const COLS = 8, ROWS = 7

if (typeof Image !== 'undefined') { // 先に読み込んで、デコードもしておく(演出の最中に読み込むと、1コマ目が欠ける)
  const im = new Image(); im.src = SHEET; im.decode && im.decode().catch(() => {})
}

// 端末で実際に何msかかったかを測る(テスト戦の検証用に、画面の上へ出す)
const probeStart = (e) => { e.currentTarget.__t0 = e.timeStamp }
const probeEnd = (e) => { const t0 = e.currentTarget.__t0; if (t0 != null && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('feel-fxprobe', { detail: `消滅 ${Math.round(e.timeStamp - t0)}ms` })) }

// 親(カード)の中央に、カード高さの約2.75倍の四角(1コマ = 召喚物カードの250% + にじみ)を置く
// ※シート全体を transform で動かすと、スマホでは巨大なレイヤー(約2300×2000px を3倍の解像度で)になって、何も出なくなる。
//   そのため、1コマ分の小さな四角の中で、背景の位置だけを steps() でずらす
export function VanishFx({ ms = VANISH_BASE_MS }) {
  return (
    <span aria-hidden="true" data-testid="fx-vanish" onAnimationStart={probeStart} onAnimationEnd={probeEnd} style={{ position: 'absolute', left: '50%', top: '50%', height: '275.5%', aspectRatio: '1', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 9, backgroundImage: `url(${SHEET})`, backgroundRepeat: 'no-repeat', backgroundSize: `${COLS * 100}% ${ROWS * 100}%`, animation: `vx-y ${ms}ms steps(${ROWS}, end) both, vx-x ${ms / ROWS}ms steps(${COLS}, end) ${ROWS} both` }} />
  )
}
