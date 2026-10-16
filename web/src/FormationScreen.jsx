import { useState } from 'react'
import { useIsDesktop } from './ui.js'
import {
  MAX_SLOTS, validateFormation, canPlace, placeChar, removeChar, swapSlots, quickFill,
  saveFormation, loadFormation, defaultFormation, MAX_SPELL_SLOTS, saveSpellSet, loadSpellSet, validateSpellSet, canUseSpell, spellClassOf, teamClassOf,
} from './battle/formation.js'
import { MAX_PARTIES, partyToSlots, partyToSpells, partyCount } from './battle/parties.js'

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

// parties: アカウントのパーティー(最大5つ。なければ null)。partyIdxInit: 最初に開くパーティーの番号。onSaveParty(番号, スロット, スペル): 保存して、成功なら true
// onStart がないときは「保存するだけの編成画面」(PARTY)になる
export default function FormationScreen({ allChars, allSpells = [], defaultIds = [], onStart, onExit, title = '編成', parties = null, partyIdxInit = null, onSaveParty = null, onPartyChange = null }) {
  const [partyIdx, setPartyIdx] = useState(parties ? partyIdxInit : null)
  const startParty = parties && partyIdxInit != null ? parties[partyIdxInit] : null
  const [slots, setSlots] = useState(() => (startParty ? partyToSlots(startParty, allChars) : loadFormation(allChars) || defaultFormation(allChars, defaultIds)))
  const [savedIds, setSavedIds] = useState(() => JSON.stringify(slots.map((c) => c?.id ?? null)))
  const [activeSlot, setActiveSlot] = useState(null) // 選択中のスロット(キャラを選ぶ)
  const [quick, setQuick] = useState(false) // クイック編成: 選んだ順に1番目から詰める
  const [picks, setPicks] = useState([])
  const [message, setMessage] = useState('')
  // スペルセット: 最大 MAX_SPELL_SLOTS 回分。同じスペルを何回入れてもよい
  const [spellSet, setSpellSet] = useState(() => (startParty ? partyToSpells(startParty, allSpells) : loadSpellSet(allSpells)))
  const [savedSpellIds, setSavedSpellIds] = useState(() => JSON.stringify((startParty ? partyToSpells(startParty, allSpells) : loadSpellSet(allSpells)).map((sp) => sp.id)))
  const [spellPick, setSpellPick] = useState(false) // スペルの一覧を開いているか
  const desktop = useIsDesktop() // PCでは、キャラの一覧を右に出しっぱなしにして、画面全体を使う

  const ids = JSON.stringify(slots.map((c) => c?.id ?? null))
  const spellIds = JSON.stringify(spellSet.map((sp) => sp.id))
  const dirty = ids !== savedIds || spellIds !== savedSpellIds
  const filled = slots.filter(Boolean)
  const checkChars = validateFormation(slots)
  const checkSpells = validateSpellSet(spellSet, filled)
  const check = checkChars.ok ? checkSpells : checkChars

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
    // スロットを選んでいなければ、先頭の空きスロットに入れる(PCで一覧が出しっぱなしのとき用)
    const target = activeSlot !== null ? activeSlot : slots.findIndex((x) => !x)
    if (target === -1) { setMessage('スロットが満員です。入れ替えたいスロットをタップしてから、キャラを選んでください'); return }
    const r = canPlace(slots, target, c)
    if (!r.ok) { setMessage(r.reason); return }
    apply(placeChar(slots, target, c))
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
    if (partyIdx != null && onSaveParty) { // パーティーに保存する
      if (onSaveParty(partyIdx, slots, spellSet)) { setSavedIds(ids); setSavedSpellIds(spellIds); setMessage(`パーティー${partyIdx + 1}に保存しました`) }
      else setMessage('この端末では保存できませんでした')
      return
    }
    if (saveFormation(slots) && saveSpellSet(spellSet)) { setSavedIds(ids); setSavedSpellIds(spellIds) }
    else setMessage('この端末では保存できませんでした(戦闘は始められます)')
  }
  // パーティーを切り替える(未保存の変更があるときは、確認する)
  const loadParty = (i) => {
    if (i === partyIdx || !parties) return
    if (dirty && !window.confirm('未保存の変更があります。破棄してパーティーを切り替えますか?')) return
    const p = parties[i]
    const nextSlots = partyToSlots(p, allChars)
    const nextSpells = partyToSpells(p, allSpells)
    setSlots(nextSlots)
    setSpellSet(nextSpells)
    setSavedIds(JSON.stringify(nextSlots.map((c) => c?.id ?? null)))
    setSavedSpellIds(JSON.stringify(nextSpells.map((sp) => sp.id)))
    setPartyIdx(i)
    setActiveSlot(null); setQuick(false); setPicks([]); setSpellPick(false)
    setMessage('')
    if (onPartyChange) onPartyChange(i)
  }

  const showList = desktop || quick || activeSlot !== null
  const targetSlot = activeSlot !== null ? activeSlot : slots.findIndex((x) => !x)

  // ---- 部品 ----
  // パーティーの切り替え(アカウントのときだけ)。番号の下は編成済みの体数
  const partyBar = parties && (
    <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
      {Array.from({ length: MAX_PARTIES }, (_, i) => {
        const on = partyIdx === i
        const n = partyCount(parties[i])
        return (
          <button
            key={i}
            onClick={() => loadParty(i)}
            style={{ flex: 1, padding: '6px 2px', borderRadius: 8, fontFamily: FONT, fontWeight: 800, fontSize: 14, cursor: 'pointer', border: `2px solid ${on ? C.player : C.line}`, background: on ? C.player : '#fff', color: on ? '#fff' : C.ink }}
          >
            {i + 1}
            <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.85 }}>{n ? `${n}体` : '空き'}</div>
          </button>
        )
      })}
    </div>
  )

  const titleRow = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: desktop ? 14 : 12, color: C.mute }}>
      <span>{filled.length}/{MAX_SLOTS}体 編成済み</span>
      <button onClick={toggleQuick} style={{ ...mini(false), width: 'auto', padding: '0 10px', marginLeft: 'auto', fontSize: 12, borderColor: quick ? C.player : C.line, color: quick ? C.player : C.ink }}>
        {quick ? 'クイック編成をやめる' : 'クイック編成'}
      </button>
    </div>
  )

  const quickBox = quick && (
    <div style={{ padding: 8, borderRadius: 8, background: '#e6ecff', fontSize: 12, marginBottom: 8 }}>
      入れたい順にキャラをタップしてください(最大{MAX_SLOTS}体)。選んだ順に1番目のスロットから入ります。
      <div style={{ marginTop: 6 }}>
        選択中: {picks.length ? picks.map((p, i) => `${i + 1}.${p.name}`).join(' → ') : 'まだありません'}
      </div>
      <button onClick={finishQuick} disabled={!picks.length} style={{ ...btn(true, !picks.length), marginTop: 6, padding: '6px 12px', fontSize: 13 }}>この順で編成する</button>
    </div>
  )

  // スロット(縦に5つ)。上のスロットほど、行動値が同じときに先に動く
  const slotList = slots.map((c, i) => {
    const active = activeSlot === i
    return (
      <div
        key={i}
        onClick={() => handleSlot(i)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: desktop ? '12px 14px' : '8px 10px', marginBottom: 6, borderRadius: 10,
          background: C.card, cursor: quick ? 'default' : 'pointer',
          border: `2px solid ${active ? C.active : C.line}`,
          boxShadow: active ? `0 0 0 3px ${C.active}44` : 'none',
        }}
      >
        <div style={{ width: 22, fontWeight: 700, color: C.mute, textAlign: 'center' }}>{i + 1}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {c ? <CharLine c={c} /> : <div style={{ color: '#9aa1b2', fontSize: 13 }}>＋ 空き{desktop ? '(クリックで選択。右の一覧のキャラをクリックすると、先頭の空きに入ります)' : '(タップしてキャラを選ぶ)'}</div>}
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
  })
  const slotNote = (
    <div style={{ fontSize: 11, color: C.mute, margin: '2px 2px 8px' }}>
      {filled.length > 1
        ? `行動値が同じときは、上のスロットから先に行動します(${filled.map((c, i) => `${i + 1}.${c.name}`).join(' → ')})`
        : '同じクラスだけで編成できます。ニュートラルはどのクラスとも組めます。'}
    </div>
  )

  // スペルセット(キャラ編成とは別)。最大3回分。同じスペルを何回入れてもよい
  const spellBox = allSpells.length > 0 && (
    <div style={{ padding: 10, borderRadius: 10, background: C.card, border: `1px solid ${C.line}`, marginBottom: 10 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>スペルセット({spellSet.length}/{MAX_SPELL_SLOTS}回)</div>
      <div style={{ fontSize: 11, color: C.mute, marginBottom: 6 }}>スペルにもクラス制限があります(編成のクラスと同じスペル、またはニュートラルのスペルだけ入れられます)。戦闘中に、自分のキャラのターンならいつでも使えます(キャラの行動は消えません)。使うたびにコスト(MP)を払います。同じスペルを複数回入れられます。</div>
      {spellSet.map((sp, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', marginBottom: 4, borderRadius: 8, border: `1px solid ${canUseSpell(filled, sp) ? C.line : C.warn}` }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>✦{sp.name}(MP{sp.cost}){!canUseSpell(filled, sp) && <span style={{ fontSize: 11, color: C.warn }}> この編成では使えません</span>}</div>
            <div style={{ fontSize: 11, color: C.mute }}>{sp.class} ・ {sp.desc}</div>
          </div>
          <button aria-label="外す" onClick={() => setSpellSet(spellSet.filter((_, k) => k !== i))} style={{ ...mini(false), color: '#c0392b' }}>✕</button>
        </div>
      ))}
      {spellSet.length < MAX_SPELL_SLOTS && (
        <button onClick={() => setSpellPick(!spellPick)} style={{ ...btn(false, false), padding: '6px 12px', fontSize: 13 }}>{spellPick ? '閉じる' : '＋ スペルを追加'}</button>
      )}
      {spellPick && spellSet.length < MAX_SPELL_SLOTS && (
        <div style={{ marginTop: 6 }}>
          {allSpells.map((sp) => {
            const ok = canUseSpell(filled, sp)
            return (
              <div
                key={sp.id}
                onClick={() => { if (!ok) { setMessage(`「${sp.name}」は${spellClassOf(sp)}のスペルなので、いまの編成(${teamClassOf(filled) || 'ニュートラルのみ'})では入れられません`); return } setMessage(''); setSpellSet([...spellSet, sp]); setSpellPick(false) }}
                style={{ padding: '6px 8px', marginBottom: 4, borderRadius: 8, border: `1.5px solid ${C.line}`, cursor: ok ? 'pointer' : 'default', opacity: ok ? 1 : 0.4 }}
              >
                <div style={{ fontWeight: 700, fontSize: 13 }}>✦{sp.name}(MP{sp.cost}){!ok && <span style={{ fontSize: 11, color: C.warn }}> クラス違い</span>}</div>
                <div style={{ fontSize: 11, color: C.mute }}>{sp.class} ・ {sp.desc}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  const messageBox = message && <div style={{ padding: 8, borderRadius: 8, background: '#fff3e6', color: C.warn, fontSize: 12, marginBottom: 8 }}>{message}</div>

  // キャラの一覧(PC=右に出しっぱなし / スマホ=スロットをタップすると下から出る)
  const listBox = (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <div style={{ fontSize: 12, color: C.mute, marginBottom: 6, display: 'flex', alignItems: 'center' }}>
        <span style={{ flex: 1 }}>
          {quick ? 'キャラ選択(クイック)' : activeSlot !== null ? `スロット${activeSlot + 1}に入れるキャラを選んでください` : 'キャラ一覧(クリックすると、先頭の空きスロットに入ります)'}
        </span>
        {!desktop && !quick && <button onClick={() => setActiveSlot(null)} style={{ ...mini(false), width: 'auto', padding: '0 12px' }}>閉じる</button>}
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'grid', gridTemplateColumns: desktop ? 'repeat(auto-fill, minmax(260px, 1fr))' : '1fr', gap: 6, alignContent: 'start' }}>
        {allChars.map((c) => {
          const inSlot = slots.findIndex((x) => x && x.id === c.id)
          const pickIdx = picks.findIndex((p) => p.id === c.id)
          const ok = quick ? true : targetSlot === -1 ? true : canPlace(slots, targetSlot, c).ok
          const selected = quick ? pickIdx !== -1 : activeSlot !== null && inSlot === activeSlot
          return (
            <div
              key={c.id}
              onClick={() => ok && handlePick(c)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8,
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
    </div>
  )

  const statusLines = (
    <>
      {dirty && <div style={{ fontSize: 12, color: C.warn, marginBottom: 6 }}>● 未保存の変更があります</div>}
      {!check.ok && <div style={{ fontSize: 12, color: C.warn, marginBottom: 6 }}>{check.reason}</div>}
    </>
  )
  const buttons = (
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={handleSave} disabled={!dirty || (partyIdx != null && !check.ok)} style={{ ...btn(!onStart, !dirty || (partyIdx != null && !check.ok)), flex: 1 }}>保存</button>
      {onStart && <button onClick={() => check.ok && onStart(filled, spellSet)} disabled={!check.ok} style={{ ...btn(true, !check.ok), flex: 2 }}>この編成で対戦へ</button>}
    </div>
  )

  // ---- PC: 画面全体を使う(左=スロットとスペル、右=キャラ一覧) ----
  if (desktop) {
    return (
      <div style={{ height: '100vh', boxSizing: 'border-box', padding: '20px 32px', background: C.paper, color: C.ink, fontFamily: FONT, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontSize: 28 }}>{title}</h2>
          <div style={{ flex: 1 }} />
          <button onClick={onExit} style={btn(false, false)}>戻る</button>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(420px, 5fr) minmax(0, 7fr)', gap: 24 }}>
          <div style={{ minHeight: 0, overflowY: 'auto', paddingRight: 6 }}>
            {partyBar}
            {titleRow}
            {quickBox}
            {slotList}
            {slotNote}
            {spellBox}
            {messageBox}
          </div>
          <div style={{ minHeight: 0, display: 'flex', flexDirection: 'column', padding: 12, borderRadius: 12, background: C.card, border: `1px solid ${C.line}` }}>
            {listBox}
          </div>
        </div>
        <div style={{ marginTop: 12, maxWidth: 520 }}>
          {statusLines}
          {buttons}
        </div>
      </div>
    )
  }

  // ---- スマホ: 1列。キャラ一覧は、スロットをタップすると下から出る。保存・対戦ボタンは下に固定 ----
  const sheetOpen = quick || activeSlot !== null
  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: 12, paddingBottom: 150, minHeight: '100vh', background: C.paper, color: C.ink, fontFamily: FONT }}>
      <h2 style={{ margin: '4px 0 6px' }}>{title}</h2>
      {partyBar}
      {titleRow}
      {quickBox}
      {slotList}
      {slotNote}
      {spellBox}
      {messageBox}
      <div style={{ marginTop: 10 }}>
        <button onClick={onExit} style={btn(false, false)}>戻る</button>
      </div>

      {sheetOpen ? (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 20, height: '62vh', maxWidth: 520, margin: '0 auto', padding: '10px 12px calc(10px + env(safe-area-inset-bottom))', background: C.card, borderTop: `2px solid ${C.line}`, borderRadius: '14px 14px 0 0', boxShadow: '0 -6px 18px rgba(31,42,68,0.2)' }}>
          {listBox}
        </div>
      ) : (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 10, maxWidth: 520, margin: '0 auto', padding: '8px 12px calc(10px + env(safe-area-inset-bottom))', background: C.paper, borderTop: `1px solid ${C.line}` }}>
          {statusLines}
          {buttons}
        </div>
      )}
    </div>
  )
}
