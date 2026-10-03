import { useEffect, useState } from 'react'
import { createBattle, applyAction, getActiveUnit } from './battle/engine.js'
import { chooseAction, CPU_LEVELS } from './battle/ai.js'
import { TEAM_SAMPLE } from './battle/testData.js'

// 色: 自分=青、相手=赤紫、行動中=琥珀
const C = {
  ink: '#1f2a44',
  paper: '#eef1f6',
  card: '#ffffff',
  line: '#cdd3df',
  mute: '#6b7488',
  player: '#2f5bea',
  enemy: '#b83a6b',
  active: '#e0a100',
  hp: '#2f9e6b',
  hpMid: '#d9a400',
  hpLow: '#d1403f',
}
const FONT = '"Hiragino Sans","Noto Sans JP",system-ui,sans-serif'
const TEAM_COLOR = { A: C.player, B: C.enemy }
const TYPE_LABEL = { physical: '物理', magic: '魔法', true: '確定' }

// これから行動する順番(アクションバー)。100ごとにラウンドの区切りを入れる
function buildTimeline(state, count = 12) {
  const items = []
  for (const u of state.units) {
    if (!u.alive) continue
    for (let k = 0; k < count; k++) {
      items.push({ time: u.curAV + u.baseAV * k, unit: u })
    }
  }
  const toNext = 100 - (state.totalAV % 100)
  const nextRound = Math.floor(state.totalAV / 100) + 2
  for (let k = 0; k < count; k++) {
    items.push({ time: toNext + 100 * k, round: nextRound + k })
  }
  items.sort((a, b) => a.time - b.time || (a.round ? 1 : 0) - (b.round ? 1 : 0) || (b.unit?.spd ?? 0) - (a.unit?.spd ?? 0))
  return items.slice(0, count)
}

function ActionBar({ state }) {
  const items = buildTimeline(state)
  return (
    <div style={{ display: 'flex', gap: 4, overflowX: 'auto', padding: '6px 2px', alignItems: 'stretch' }}>
      {items.map((it, i) =>
        it.round ? (
          <div
            key={`r${it.round}`}
            style={{
              flex: '0 0 auto', width: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, color: C.mute, borderLeft: `2px dashed ${C.line}`, borderRight: `2px dashed ${C.line}`,
            }}
          >
            R{it.round}
          </div>
        ) : (
          <div
            key={`${it.unit.uid}-${i}`}
            style={{
              flex: '0 0 auto', width: i === 0 ? 66 : 54, height: 38, boxSizing: 'border-box', padding: '3px 4px',
              borderRadius: 6, fontSize: 10, lineHeight: 1.25, overflow: 'hidden', color: '#fff',
              background: TEAM_COLOR[it.unit.team],
              border: i === 0 ? `2px solid ${C.active}` : '2px solid transparent',
              fontWeight: i === 0 ? 700 : 400,
            }}
          >
            {it.unit.name}
          </div>
        )
      )}
    </div>
  )
}

function UnitCard({ unit, active, selected, selectable, onClick }) {
  const ratio = Math.max(0, unit.hp / unit.maxHp)
  const hpColor = ratio > 0.5 ? C.hp : ratio > 0.25 ? C.hpMid : C.hpLow
  return (
    <div
      data-uid={unit.uid}
      data-alive={unit.alive ? 'true' : 'false'}
      onClick={selectable ? onClick : undefined}
      style={{
        minWidth: 0, boxSizing: 'border-box', padding: 4, borderRadius: 8, fontSize: 10, lineHeight: 1.3,
        background: unit.alive ? C.card : '#dfe3ea',
        opacity: unit.alive ? 1 : 0.5,
        border: `2px solid ${selected ? C.active : active ? TEAM_COLOR[unit.team] : C.line}`,
        boxShadow: selected ? `0 0 0 3px ${C.active}55` : active ? `0 0 0 3px ${TEAM_COLOR[unit.team]}33` : 'none',
        cursor: selectable ? 'pointer' : 'default',
      }}
    >
      <div style={{ height: 26, overflow: 'hidden' }}>{unit.name}</div>
      <div style={{ background: '#e3e7ef', height: 6, borderRadius: 3, marginTop: 3 }}>
        <div style={{ width: `${ratio * 100}%`, height: '100%', borderRadius: 3, background: hpColor, transition: 'width 0.3s' }} />
      </div>
      <div style={{ marginTop: 2, color: C.mute }}>{unit.alive ? `${Math.ceil(unit.hp)}/${unit.maxHp}` : '戦闘不能'}</div>
      {unit.shield > 0 && <div style={{ color: C.player }}>盾 {Math.ceil(unit.shield)}</div>}
    </div>
  )
}

function Row({ title, color, children }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 11, color, fontWeight: 700, marginBottom: 4 }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 4 }}>{children}</div>
    </div>
  )
}

const buttonStyle = (primary, disabled) => ({
  padding: '10px 14px', borderRadius: 8, fontSize: 14, fontFamily: FONT, cursor: disabled ? 'default' : 'pointer',
  border: `1px solid ${primary ? C.ink : C.line}`,
  background: disabled ? '#d7dce6' : primary ? C.ink : C.card,
  color: disabled ? '#8a93a6' : primary ? '#fff' : C.ink,
})

export default function BattleScreen({ onExit, cpuDelay = 700 }) {
  const [level, setLevel] = useState(2)
  const [state, setState] = useState(null)
  const [selected, setSelected] = useState(null)

  const actor = state ? getActiveUnit(state) : null
  const cpuTurn = !!actor && actor.team === 'B' && !state.winner
  const playerTurn = !!actor && actor.team === 'A' && !state.winner

  // CPUの番になったら少し待ってから行動する
  useEffect(() => {
    if (!state || state.winner) return
    const current = getActiveUnit(state)
    if (!current || current.team !== 'B') return
    const timer = setTimeout(() => {
      setState(applyAction(state, chooseAction(state, level)))
    }, cpuDelay)
    return () => clearTimeout(timer)
  }, [state, level, cpuDelay])

  const startBattle = () => {
    setSelected(null)
    setState(createBattle(TEAM_SAMPLE, TEAM_SAMPLE))
  }

  const handleAttack = () => {
    if (!selected || !playerTurn) return
    setState(applyAction(state, { type: 'skill', target: selected }))
    setSelected(null)
  }

  const wrap = { maxWidth: 520, margin: '0 auto', padding: 12, minHeight: '100vh', boxSizing: 'border-box', background: C.paper, color: C.ink, fontFamily: FONT }

  // ---- 開始前: CPUの強さを選ぶ ----
  if (!state) {
    return (
      <div style={wrap}>
        <h2 style={{ margin: '4px 0 12px' }}>CPU対戦</h2>
        <p style={{ margin: '0 0 8px', fontSize: 13 }}>CPUの強さを選んでください</p>
        {CPU_LEVELS.map((l) => (
          <button
            key={l.level}
            onClick={() => setLevel(l.level)}
            style={{
              display: 'block', width: '100%', textAlign: 'left', marginBottom: 6, padding: '10px 12px', borderRadius: 8,
              fontFamily: FONT, cursor: 'pointer', color: C.ink,
              border: `2px solid ${level === l.level ? C.player : C.line}`,
              background: level === l.level ? '#e6ecff' : C.card,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 14 }}>Lv{l.level} {l.name}</div>
            <div style={{ fontSize: 12, color: C.mute }}>{l.description}</div>
          </button>
        ))}
        <p style={{ fontSize: 11, color: C.mute, margin: '8px 0 12px' }}>いまはテスト用の仮キャラで対戦します。</p>
        <button onClick={startBattle} style={buttonStyle(true, false)}>バトル開始</button>{' '}
        <button onClick={onExit} style={buttonStyle(false, false)}>戻る</button>
      </div>
    )
  }

  // ---- バトル中 ----
  const levelInfo = CPU_LEVELS.find((l) => l.level === level)
  const enemies = state.units.filter((u) => u.team === 'B')
  const players = state.units.filter((u) => u.team === 'A')
  const resultText = state.winner === 'A' ? '勝利!' : state.winner === 'B' ? '敗北…' : '引き分け'

  return (
    <div style={wrap}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 13 }}>
          <b>ラウンド {state.round}</b>
          <span style={{ color: C.mute }}> / CPU Lv{level} {levelInfo?.name}</span>
        </div>
        <button onClick={() => setState(null)} style={{ ...buttonStyle(false, false), padding: '4px 10px', fontSize: 12 }}>やめる</button>
      </div>

      <ActionBar state={state} />

      <Row title="相手" color={C.enemy}>
        {enemies.map((u) => (
          <UnitCard
            key={u.uid}
            unit={u}
            active={u.uid === state.active}
            selected={u.uid === selected}
            selectable={playerTurn && u.alive}
            onClick={() => setSelected(u.uid)}
          />
        ))}
      </Row>

      <div style={{ margin: '12px 0', padding: 8, borderRadius: 8, background: C.card, border: `1px solid ${C.line}`, fontSize: 12, lineHeight: 1.6, minHeight: 96 }}>
        {state.log.slice(-6).map((line, i, arr) => (
          <div key={state.log.length - arr.length + i} style={{ fontWeight: i === arr.length - 1 ? 700 : 400, color: i === arr.length - 1 ? C.ink : C.mute }}>
            {line}
          </div>
        ))}
      </div>

      <Row title="自分" color={C.player}>
        {players.map((u) => (
          <UnitCard key={u.uid} unit={u} active={u.uid === state.active} selected={false} selectable={false} />
        ))}
      </Row>

      <div style={{ marginTop: 14, padding: 10, borderRadius: 8, background: C.card, border: `1px solid ${C.line}` }}>
        {state.winner ? (
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{resultText}</div>
            <button onClick={startBattle} style={buttonStyle(true, false)}>もう一度</button>{' '}
            <button onClick={() => setState(null)} style={buttonStyle(false, false)}>強さを選び直す</button>
          </div>
        ) : cpuTurn ? (
          <div style={{ fontSize: 13, color: C.mute }}>{actor.name}(相手)が考えています…</div>
        ) : (
          <div>
            <div style={{ fontSize: 13, marginBottom: 6 }}>
              <b>{actor.name}</b> の番: 「{actor.skill.name}」({TYPE_LABEL[actor.skill.type]})
            </div>
            <div style={{ fontSize: 12, color: C.mute, marginBottom: 8 }}>
              {selected ? `対象: ${state.units.find((u) => u.uid === selected)?.name}` : '上の「相手」から攻撃する相手をタップ'}
            </div>
            <button onClick={handleAttack} disabled={!selected} style={buttonStyle(true, !selected)}>攻撃する</button>
          </div>
        )}
      </div>
    </div>
  )
}
