import { useState } from 'react'
import {
  MAX_SLOTS, validateFormation, canPlace, placeChar, removeChar, swapSlots, quickFill,
  saveFormation, loadFormation, defaultFormation,
} from './battle/formation.js'

// 編成画面: スロット(最大5)にキャラを入れる。順番は、行動値が同じときの優先順(1番目が最優先)
const C = {
  ink: '#1f2a44', paper: '#eef1f6', card: '#ffffff', line: '#cdd3df', mute: '#6b7488',
  player: '#2f5bea', active: '#e0a100', warn: '#c2570c',
}
const FONT = '"Hiragino Sans","Noto Sans JP",system-ui,sans-serif'

const btn = (primary, disabled) => ({
  padding: '10px 14px', borderRadius: 8, fontFamily: FONT, fontSize: 14, fontWeight: 700,
  border: `1.5px solid ${disabled ? C.line : C.player}`,
  background: disabled ? '#f3f4f7' : primary ? C.player : '#fff',
  color: disabled ? '#9aa1b2' : primary ? '#fff' : C.player,
  cursor: disabled ? 'default' : 'pointer',
})
const mini = (disabled) => ({
  width: 34, height: 34, borderRadius: 8, fontSize: 15, fontFamily: FONT, lineHeight: 1,
  border: `1px solid ${C.line}`, background: disabled ? '#f3f4f7' : '#fff',
  color: disabled ? '#c0c5d2' : C.ink, cursor: disabled ? 'default' : 'pointer',
})

function CharLine({ c }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
      <div style={{ fontSize: 11, color: C.mute }}>
        {c.class} ・ HP {c.stats.hp} ・ 攻撃 {c.stats.atk} ・ 防御 {c.stats.def} ・ 速度 {c.stats.spd}
      </div>
    </div>
  )
}

export default function FormationScreen({ allChars, defaultIds = [], onStart, onExit }) {
  const [slots, setSlots] = useState(() => loadFormation(allChars) || defaultFormation(allChars, defaultIds))
  const [savedIds, setSavedIds] = useState(() => JSON.stringify(slots.map((c) => c?.id ?? null)))
  const [activeSlot, setActiveSlot] = useState(null) // 選択中のスロット(キャラを選ぶ)
  const [quick, setQuick] = useState(false) // クイック編成: 選んだ順に1番目から詰める
  const [picks, setPicks] = useState([])
  const [message, setMessage] = useState('')

  const ids = JSON.stringify(slots.map((c) => c?.id ?? null))
  const dirty = ids !== savedIds
  const filled = slots.filter(Boolean)
  const check = validateFormation(slots)

  const apply = (next) => { setSlots(next); setMessage('') }

  const handleSlot = (i) => {
    if (quick) return
    setActiveSlot(activeSlot === i ? null : i)
  }
  const handlePick = (c) => {
    if (quick) {
      const next = picks.some((p) => p.id === c.id) ? picks.filter((p) => p.id !== c.id) : [...picks, c]
      if (!validateFormation(next).ok && !picks.some((p) => p.id === c.id)) {
        setMessage(`${c.name}は、いまの選び方とは同じクラスで組めません`)
        return
      }
      setMessage('')
      setPicks(next.slice(0, MAX_SLOTS))
      return
    }
    if (activeSlot === null) return
    const r = canPlace(slots, activeSlot, c)
    if (!r.ok) { setMessage(r.reason); return }
    apply(placeChar(slots, activeSlot, c))
    setActiveSlot(null)
  }
  const finishQuick = () => {
    if (picks.length) apply(quickFill(picks))
    setQuick(false)
    setPicks([])
    setActiveSlot(null)
  }
  const toggleQuick = () => {
    if (quick) { setQuick(false); setPicks([]); return }
    setQuick(true); setPicks([]); setActiveSlot(null); setMessage('')
  }
  const handleSave = () => {
    if (saveFormation(slots)) setSavedIds(ids)
    else setMessage('この端末では保存できませんでした(戦闘は始められます)')
  }

  const showList = quick || activeSlot !== null

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: 12, minHeight: '100vh', boxSizing: 'border-box', background: C.paper, color: C.ink, fontFamily: FONT }}>
      <h2 style={{ margin: '4px 0 6px' }}>編成</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 12, color: C.mute }}>
        <span>{filled.length}/{MAX_SLOTS}体 編成済み</span>
        <button onClick={toggleQuick} style={{ ...mini(false), width: 'auto', padding: '0 10px', marginLeft: 'auto', fontSize: 12, borderColor: quick ? C.player : C.line, color: quick ? C.player : C.ink }}>
          {quick ? 'クイック編成をやめる' : 'クイック編成'}
        </button>
      </div>

      {quick && (
        <div style={{ padding: 8, borderRadius: 8, background: '#e6ecff', fontSize: 12, marginBottom: 8 }}>
          入れたい順にキャラをタップしてください(最大{MAX_SLOTS}体)。選んだ順に1番目のスロットから入ります。
          <div style={{ marginTop: 6 }}>
            選択中: {picks.length ? picks.map((p, i) => `${i + 1}.${p.name}`).join(' → ') : 'まだありません'}
          </div>
          <button onClick={finishQuick} disabled={!picks.length} style={{ ...btn(true, !picks.length), marginTop: 6, padding: '6px 12px', fontSize: 13 }}>この順で編成する</button>
        </div>
      )}

      {/* スロット(縦に5つ)。上のスロットほど、行動値が同じときに先に動く */}
      {slots.map((c, i) => {
        const active = activeSlot === i
        return (
          <div
            key={i}
            onClick={() => handleSlot(i)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', marginBottom: 6, borderRadius: 10,
              background: C.card, cursor: quick ? 'default' : 'pointer',
              border: `2px solid ${active ? C.active : C.line}`,
              boxShadow: active ? `0 0 0 3px ${C.active}44` : 'none',
            }}
          >
            <div style={{ width: 22, fontWeight: 700, color: C.mute, textAlign: 'center' }}>{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {c ? <CharLine c={c} /> : <div style={{ color: '#9aa1b2', fontSize: 13 }}>＋ 空き(タップしてキャラを選ぶ)</div>}
            </div>
            {c && (
              <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                <button aria-label="上へ" disabled={i === 0} onClick={() => apply(swapSlots(slots, i, i - 1))} style={mini(i === 0)}>▲</button>
                <button aria-label="下へ" disabled={i === MAX_SLOTS - 1} onClick={() => apply(swapSlots(slots, i, i + 1))} style={mini(i === MAX_SLOTS - 1)}>▼</button>
                <button aria-label="外す" onClick={() => { apply(removeChar(slots, i)); if (activeSlot === i) setActiveSlot(null) }} style={{ ...mini(false), color: '#c0392b' }}>✕</button>
              </div>
            )}
          </div>
        )
      })}
      <div style={{ fontSize: 11, color: C.mute, margin: '2px 2px 8px' }}>
        {filled.length > 1
          ? `行動値が同じときは、上のスロットから先に行動します(${filled.map((c, i) => `${i + 1}.${c.name}`).join(' → ')})`
          : '同じクラスだけで編成できます。ニュートラルはどのクラスとも組めます。'}
      </div>

      {message && <div style={{ padding: 8, borderRadius: 8, background: '#fff3e6', color: C.warn, fontSize: 12, marginBottom: 8 }}>{message}</div>}

      {showList && (
        <div style={{ padding: 8, borderRadius: 10, background: C.card, border: `1px solid ${C.line}`, marginBottom: 10, maxHeight: 320, overflowY: 'auto' }}>
          <div style={{ fontSize: 11, color: C.mute, marginBottom: 6 }}>
            {quick ? 'キャラ選択(クイック)' : `スロット${activeSlot + 1}に入れるキャラを選んでください`}
          </div>
          {allChars.map((c) => {
            const inSlot = slots.findIndex((x) => x && x.id === c.id)
            const pickIdx = picks.findIndex((p) => p.id === c.id)
            const ok = quick ? true : canPlace(slots, activeSlot, c).ok
            const selected = quick ? pickIdx !== -1 : inSlot === activeSlot
            return (
              <div
                key={c.id}
                onClick={() => ok && handlePick(c)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', marginBottom: 4, borderRadius: 8,
                  border: `1.5px solid ${selected ? C.player : C.line}`, background: selected ? '#e6ecff' : '#fff',
                  opacity: ok ? 1 : 0.4, cursor: ok ? 'pointer' : 'default',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}><CharLine c={c} /></div>
                {quick && pickIdx !== -1 && <b style={{ color: C.player }}>{pickIdx + 1}</b>}
                {!quick && inSlot !== -1 && inSlot !== activeSlot && <span style={{ fontSize: 11, color: C.mute }}>スロット{inSlot + 1}</span>}
                {!quick && !ok && <span style={{ fontSize: 11, color: C.warn }}>クラス違い</span>}
              </div>
            )
          })}
        </div>
      )}

      {dirty && <div style={{ fontSize: 12, color: C.warn, marginBottom: 6 }}>● 未保存の変更があります</div>}
      {!check.ok && <div style={{ fontSize: 12, color: C.warn, marginBottom: 6 }}>{check.reason}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSave} disabled={!dirty} style={{ ...btn(false, !dirty), flex: 1 }}>保存</button>
        <button onClick={() => check.ok && onStart(filled)} disabled={!check.ok} style={{ ...btn(true, !check.ok), flex: 2 }}>この編成で対戦へ</button>
      </div>
      <div style={{ marginTop: 10 }}>
        <button onClick={onExit} style={btn(false, false)}>戻る</button>
      </div>
    </div>
  )
}
