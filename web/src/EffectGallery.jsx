import { useEffect, useMemo, useRef, useState } from 'react'
import { C, FONT } from './ui.js'
import { UnitCard } from './BattleScreen.jsx'
import { createBattle } from './battle/engine.js'
import { CutIn, AlbionBlast } from './cutin.jsx'

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
  ['ダメージ(物理)', '白い数字。', 900, (p) => ({ unit: { ...baseUnit, hp: p ? 70 : 100 }, fx: p ? dmg('-30', 'physical') : null })],
  ['ダメージ(魔法)', '青い数字。', 900, (p) => ({ unit: { ...baseUnit, hp: p ? 70 : 100 }, fx: p ? dmg('-30', 'magic') : null })],
  ['ダメージ(確定)', '虹色の数字。', 900, (p) => ({ unit: { ...baseUnit, hp: p ? 70 : 100 }, fx: p ? dmg('-30', 'true') : null })],
  ['クリティカル', '数字の前に CRIT が付く。', 900, (p) => ({ unit: { ...baseUnit, hp: p ? 40 : 100 }, fx: p ? dmg('CRIT -60', 'physical', true) : null })],
  ['回復', 'HPが戻る。', 800, (p) => ({ unit: { ...baseUnit, hp: 100 }, fx: p ? { kind: 'heal', text: '+30' } : null })],
  ['強化', '攻撃力などが上がる。', 900, (p) => ({ unit: baseUnit, fx: p ? { kind: 'buff', text: '攻撃力+30↑' } : null })],
  ['能力付与', '【守護】などの能力を得る。', 900, (p) => ({ unit: baseUnit, fx: p ? { kind: 'keyword', text: '【守護】獲得' } : null })],
  ['召喚', 'ユニットが場に出る。', 800, (p) => ({ unit: baseUnit, fx: p ? { kind: 'summon', text: '登場!' } : null })],
  ['攻撃を防ぐ', 'バリアや回避で、ダメージが入らない。', 800, (p) => ({ unit: baseUnit, fx: p ? { kind: 'block', text: '' } : null })],
  ['進化', '光の柱と光の輪。', 1500, (p) => ({ unit: baseUnit, fx: p ? { kind: 'evolve', text: '' } : null })],
  ['破壊(ラストワードなし)', '金白の閃光から、金色の粒になって散る。', 800, (p) => ({ unit: p ? { ...baseUnit, hp: 0, alive: false } : baseUnit, fx: p ? { kind: 'none', text: '', die: 'destroy', lw: false } : null })],
  ['破壊(ラストワードあり)', '赤い円とドクロ。そのあと、ラストワードが発動する。', 800, (p) => ({ unit: p ? { ...baseUnit, hp: 0, alive: false } : baseUnit, fx: p ? { kind: 'none', text: '', die: 'destroy', lw: true } : null })],
  ['消滅', '電気の輪が広がって縮み、光の粒になる。', 950, (p) => ({ unit: p ? { ...baseUnit, hp: 0, alive: false } : baseUnit, fx: p ? { kind: 'none', text: '', die: 'vanish' } : null })],
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

function Demo({ title, note, ms, make, index = 0 }) {
  const [phase, setPhase] = useState(false) // 再生中か
  const [n, setN] = useState(0)
  const box = useRef(null)
  const visible = useInView(box)
  useEffect(() => {
    if (!visible) return undefined
    // 止まる → 再生 → 止まる を繰り返す。最初は、1個ずつ少しずつずらして始める
    const wait = phase ? ms + 150 : n === 0 ? 700 + (index % 4) * 450 : 1100
    const t = setTimeout(() => { setPhase((p) => !p); setN((k) => k + 1) }, wait)
    return () => clearTimeout(t)
  }, [phase, ms, visible, n, index])
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

// アルビオンバハムートのファンファーレ: 全画面の動画 → 白い閃光 → 消滅に爆発の動画が重なる
function AlbionDemo() {
  const [st, setSt] = useState('idle') // idle | cut | blast
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const toBlast = () => { clearTimeout(timer.current); setSt('blast'); timer.current = setTimeout(() => setSt('idle'), 1100) }
  const play = () => { if (st !== 'idle') return; setSt('cut'); timer.current = setTimeout(toBlast, 3250) }
  const dead = st === 'blast'
  const us = useMemo(() => [0, 1, 2].map((i) => ({ ...baseUnit, uid: `alb${i}`, field: 'summon', name: `召喚物${i + 1}` })), [])
  return (
    <div style={{ padding: 10, background: C.paper, borderRadius: 8 }}>
      <div style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 8 }}><b>アルビオンバハムート【ファンファーレ】</b><div style={{ color: C.mute, fontSize: 12 }}>モードを選ぶと、全画面アニメ → 白い閃光 → 爆発の下で、対象が消滅します。</div></div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
        {us.map((u) => (
          <div key={u.uid} style={{ width: 104 }}>
            <UnitCard key={dead ? 'd' : 'a'} unit={dead ? { ...u, hp: 0, alive: false } : u} fx={dead ? { kind: 'none', text: '', die: 'vanish' } : null} tick={dead ? 1 : 0} />
          </div>
        ))}
      </div>
      <button onClick={play} disabled={st !== 'idle'} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: C.player, color: C.onAccent, fontFamily: FONT, fontWeight: 700, fontSize: 14, cursor: st === 'idle' ? 'pointer' : 'default', opacity: st === 'idle' ? 1 : 0.5 }}>▶ 再生する</button>
      {st === 'cut' && <CutIn ms={3100} onSkip={toBlast} />}
      {st === 'blast' && <AlbionBlast />}
    </div>
  )
}

export default function EffectGallery() {
  return (
    <div>
      <p style={{ fontSize: 13, color: C.mute, lineHeight: 1.7, margin: '4px 0 10px' }}>戦闘画面と同じエフェクトを、繰り返し再生しています。【守護】【潜伏】などの能力の盤面エフェクトは、7-2 の動画を見てください。</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
        {LIST.map(([title, note, ms, make], i) => <Demo key={title} title={title} note={note} ms={ms} make={make} index={i} />)}
      </div>
      <h3 style={{ margin: '16px 0 8px', fontSize: 15, borderLeft: `4px solid ${C.player}`, paddingLeft: 8 }}>カットイン(必殺級の演出)</h3>
      <AlbionDemo />
    </div>
  )
}
