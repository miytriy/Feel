import { useRef, useState } from 'react'

// 汎用のヒント: 文中の語にカーソルを合わせる(キーボードならフォーカス)と、そのすぐ近くに小さなダイアログが出る。
//   <Tip title="使用禁止" text="「ローテーション」「アンリミテッド」での使用を禁止する効果。">『使用禁止』</Tip>
//   title … ダイアログの見出し(省略可) / text … 説明(文字列でも要素でも) / children … 文中に出る語
// 画面の端に近いときは、右寄せ・上向きに自動で切り替える。動かすのは opacity と transform だけ(EFFECTS.md)。
// 見た目の CSS は ui.js(.tip / .tip-box)。どの画面でも、そのまま使える。
export default function Tip({ title, text, children, testId, className = '' }) {
  const ref = useRef(null)
  const [pos, setPos] = useState('')
  const place = () => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const right = r.left + 320 > window.innerWidth // 右にはみ出す → 右そろえ
    const up = r.bottom + 160 > window.innerHeight && r.top > 160 // 下にはみ出す → 上に出す
    setPos(`${right ? ' r' : ''}${up ? ' up' : ''}`)
  }
  return (
    <span ref={ref} className={`tip${className ? ` ${className}` : ''}`} tabIndex={0} data-testid={testId} onMouseEnter={place} onFocus={place}>
      {children}
      <span className={`tip-box${pos}`} role="tooltip">
        {title && <b>{title}</b>}
        {text}
      </span>
    </span>
  )
}
