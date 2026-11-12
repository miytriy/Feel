import { useEffect, useMemo, useRef, useState } from 'react'
import { C, FONT } from './ui.js'
import { UnitCard, VANISH_SLOW } from './BattleScreen.jsx'
import { createBattle } from './battle/engine.js'

// ルール画面の「エフェクト一覧」: 戦闘画面と同じエフェクトのコード(UnitCard)を、そのまま繰り返し再生する。
// 動画ではなくコードで動くので、エフェクトを直したら、ここも自動で同じに変わる(新しいエフェクトは、ここにも足すこと)。

const SK = { name: '攻撃', stat: 'atk', type: 'physical', mult: 1 }
const DEF = (id, name) => ({ id, name, class: 'ニュートラル', rarity: 'bronze', stats: { hp: 100, atk: 30, def: 0, spd: 50 }, skill: SK, passives: [] })

// 戦闘で使う本物のユニット(カードが読む項目がそろっている)を、エンジンから作る
const baseUnit = (() => {
  const s = createBattle([DEF('fx_demo', 'デモ')], [DEF('fx_demo_b', '相手')], {})
  return s.units.find((u) => u.team === 'A')
})()

const dmg = (text, dmgType, crit = false) => ({ kind: 'damage', text, crit, parts: [{ text, dmgType }] })

// [題, 説明, 演出の長さ(ms), (再生中か) => { unit, fx }]
const LIST = [
  ['ダメージ(物理)', '白い数字。', 900, (p) => ({ unit: { ...baseUnit, hp: p ? 70 : 100 }, fx: p ? dmg('30', 'physical') : null })],
  ['ダメージ(魔法)', '青い数字。', 900, (p) => ({ unit: { ...baseUnit, hp: p ? 70 : 100 }, fx: p ? dmg('30', 'magic') : null })],
  ['ダメージ(確定)', '虹色の数字。', 900, (p) => ({ unit: { ...baseUnit, hp: p ? 70 : 100 }, fx: p ? dmg('30', 'true') : null })],
  ['クリティカル', '数字の後ろに「!!」が付く。', 900, (p) => ({ unit: { ...baseUnit, hp: p ? 40 : 100 }, fx: p ? dmg('60!!', 'physical', true) : null })],
  ['名前のスクロール', '名前が枠に入り切らないときは、2行にせず、電光掲示板のように左へ流れ続ける。', 3000, () => ({ unit: { ...baseUnit, name: 'アドベンチャーエルフ・メイのとても長い名前' }, fx: null })],
  ['回復', 'HPが戻る。', 800, (p) => ({ unit: { ...baseUnit, hp: 100 }, fx: p ? { kind: 'heal', text: '+30' } : null })],
  ['強化', '攻撃力などが上がる。', 900, (p) => ({ unit: baseUnit, fx: p ? { kind: 'buff', text: '攻撃力+30↑', buffs: [{ stat: 'atk', label: '攻撃力', val: '+30' }] } : null })],
  ['能力付与', '【守護】などの能力を得る。', 900, (p) => ({ unit: baseUnit, fx: p ? { kind: 'keyword', text: '【守護】獲得' } : null })],
  ['召喚', 'ユニットが場に出る。', 800, (p) => ({ unit: baseUnit, fx: p ? { kind: 'summon', text: '登場!' } : null })],
  ['攻撃を防ぐ', 'バリアや回避で、ダメージが入らない。', 800, (p) => ({ unit: baseUnit, fx: p ? { kind: 'block', text: '' } : null })],
  ['進化', '虹色の波紋と光の筋、白い光の球、鎖状の輪(参考動画の再現。ユニットは回転しない)。', 1500, (p) => ({ unit: baseUnit, fx: p ? { kind: 'evolve', text: '' } : null })],
  ['破壊(ラストワードなし)', '金白の閃光から、金色の粒になって散る。', 800, (p) => ({ unit: p ? { ...baseUnit, hp: 0, alive: false } : baseUnit, fx: p ? { kind: 'none', text: '', die: 'destroy', lw: false } : null })],
  ['破壊(ラストワードあり)', '赤い円とドクロ。そのあと、ラストワードが発動する。', 800, (p) => ({ unit: p ? { ...baseUnit, hp: 0, alive: false } : baseUnit, fx: p ? { kind: 'none', text: '', die: 'destroy', lw: true } : null })],
  ['消滅', '電気の輪が広がって縮み、光の粒になる。', Math.round(950 * VANISH_SLOW), (p) => ({ unit: p ? { ...baseUnit, hp: 0, alive: false } : baseUnit, fx: p ? { kind: 'none', text: '', die: 'vanish' } : null })],
]

// 画面に見えているときだけ動かす(13個が同時に動いて重くならないように)
function useInView(ref) {
  const [on, setOn] = useState(true)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { rootMargin: '80px' })
    io.observe(el)
    return () => io.disconnect()
  }, [ref])
  return on
}

const CYCLE = 3000 // 全部のデモが、同じ時計で同時に再生を始める(ずらさない)

function Demo({ title, note, ms, make, tick }) {
  const [phase, setPhase] = useState(false) // 再生中か
  const box = useRef(null)
  const visible = useInView(box)
  useEffect(() => {
    // 見えていないときは再生しない(スクロールで外れたまま「再生中」で止まって、消えたままになるのを防ぐ)
    if (!visible) { setPhase(false); return undefined }
    setPhase(true)
    const t = setTimeout(() => setPhase(false), ms + 150)
    return () => clearTimeout(t)
  }, [tick, visible, ms])
  const n = tick
  const { unit, fx } = make(phase)
  return (
    <div ref={box} style={{ display: 'flex', gap: 12, padding: 10, background: C.paper, borderRadius: 8, alignItems: 'center' }}>
      <div style={{ width: 104, flex: '0 0 auto', position: 'relative' }}>
        <UnitCard key={phase ? `p${n}` : `i${n}`} unit={unit} fx={fx} tick={n} />
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.7 }}><b>{title}</b><div style={{ color: C.mute, fontSize: 12 }}>{note}</div></div>
    </div>
  )
}

export default function EffectGallery() {
  const [tick, setTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setTick((k) => k + 1), CYCLE); return () => clearInterval(t) }, [])
  return (
    <div>
      <p style={{ fontSize: 13, color: C.mute, lineHeight: 1.7, margin: '4px 0 10px' }}>戦闘画面と同じエフェクトを、繰り返し再生しています。【守護】【潜伏】などの能力の盤面エフェクトは、7-2 の動画を見てください。</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
        {LIST.map(([title, note, ms, make]) => <Demo key={title} title={title} note={note} ms={ms} make={make} tick={tick} />)}
      </div>
    </div>
  )
}
