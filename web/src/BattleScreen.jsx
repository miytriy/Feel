import { useEffect, useState } from 'react'
import { createBattle, applyAction, getActiveUnit, legalActions, getUnit, gaugeOf, KEYWORDS, TRIGGER_LABELS } from './battle/engine.js'
import { chooseAction, CPU_LEVELS } from './battle/ai.js'
import { TEAM_PLAYER, TEAM_CPU, ALL_TEST_CHARACTERS } from './battle/teams.js'
import FormationScreen from './FormationScreen.jsx'

// 色: 自分=青、相手=赤紫、行動中=琥珀
const C = {
  ink: '#1f2a44', paper: '#eef1f6', card: '#ffffff', line: '#cdd3df', mute: '#6b7488',
  player: '#2f5bea', enemy: '#b83a6b', active: '#e0a100',
  hp: '#2f9e6b', hpMid: '#d9a400', hpLow: '#d1403f',
}
const FONT = '"Hiragino Sans","Noto Sans JP",system-ui,sans-serif'
const TEAM_COLOR = { A: C.player, B: C.enemy }
const TYPE_LABEL = { physical: '物理', magic: '魔法', true: '確定' }

// これから行動する順番(アクションバー)。ラウンドの区切りも入れる
function buildTimeline(state, count = 12) {
  const items = []
  for (const u of state.units) {
    if (!u.alive) continue
    for (let k = 0; k < count; k++) items.push({ time: u.curAV + u.baseAV * k, unit: u })
    if (u.accel) for (let k = 0; k < count; k++) items.push({ time: u.accel.curAV + u.accel.baseAV * k, unit: u, accel: true })
  }
  const toNext = state.round * 100 - state.totalAV
  for (let k = 0; k < count; k++) items.push({ time: toNext + 100 * k, round: state.round + 1 + k })
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
            key={`${it.unit.uid}${it.accel ? 'a' : ''}-${i}`}
            style={{
              flex: '0 0 auto', width: i === 0 ? 66 : 54, height: 38, boxSizing: 'border-box', padding: '3px 4px',
              borderRadius: 6, fontSize: 10, lineHeight: 1.25, overflow: 'hidden',
              color: it.accel ? TEAM_COLOR[it.unit.team] : '#fff',
              background: it.accel ? C.card : TEAM_COLOR[it.unit.team],
              border: i === 0 ? `2px solid ${C.active}` : it.accel ? `2px dashed ${TEAM_COLOR[it.unit.team]}` : '2px solid transparent',
              fontWeight: i === 0 ? 700 : 400,
            }}
          >
            {it.accel ? '⚡' : ''}{it.unit.name}
          </div>
        )
      )}
    </div>
  )
}

function badgesOf(unit) {
  const badges = []
  for (const k of unit.keywords) {
    if (k === 'stealth' && !unit.stealth) continue
    if (k === 'barrier' && unit.barrier <= 0) continue
    badges.push(KEYWORDS[k]?.label ?? k)
  }
  if (unit.relic) badges.push(`遺物:${unit.relic}`)
  if (unit.isAmulet) badges.push('アミュレット')
  else if (unit.field === 'summon') badges.push('召喚物')
  if (unit.accel) badges.push(`アクセ${unit.accel.speed}`)
  if (unit.evolved) badges.push('進化済')
  if (unit.countdown != null) badges.push(`CD ${unit.countdown}`)
  if (unit.comboCount > 0) badges.push(`コンボ${unit.comboCount}`)
  if (unit.buffs.some((b) => b.turns != null)) badges.push('強化')
  return badges
}

function UnitCard({ unit, active, selected, selectable, inspected, onClick }) {
  const ratio = Math.max(0, unit.hp / unit.maxHp)
  const hpColor = ratio > 0.5 ? C.hp : ratio > 0.25 ? C.hpMid : C.hpLow
  const badges = unit.alive ? badgesOf(unit) : []
  return (
    <div
      data-uid={unit.uid}
      data-alive={unit.alive ? 'true' : 'false'}
      data-selectable={selectable ? 'true' : 'false'}
      onClick={onClick}
      style={{
        minWidth: 0, boxSizing: 'border-box', padding: 4, borderRadius: 8, fontSize: 10, lineHeight: 1.3,
        background: unit.alive ? C.card : '#dfe3ea',
        opacity: unit.alive ? 1 : 0.5,
        border: `2px solid ${selected ? C.active : selectable ? C.ink : active ? TEAM_COLOR[unit.team] : inspected ? C.mute : C.line}`,
        boxShadow: selected ? `0 0 0 3px ${C.active}55` : active ? `0 0 0 3px ${TEAM_COLOR[unit.team]}33` : 'none',
        cursor: 'pointer',
      }}
    >
      <div style={{ height: 26, overflow: 'hidden' }}>{unit.name}</div>
      <div style={{ background: '#e3e7ef', height: 6, borderRadius: 3, marginTop: 3 }}>
        <div style={{ width: `${ratio * 100}%`, height: '100%', borderRadius: 3, background: hpColor, transition: 'width 0.3s' }} />
      </div>
      <div style={{ marginTop: 2, color: C.mute }}>{unit.alive ? `${Math.ceil(unit.hp)}/${unit.maxHp}` : '戦闘不能'}</div>
      {unit.armor > 0 && <div style={{ color: C.player }}>アーマー {Math.ceil(unit.armor)}{unit.armorRate < 1 ? `(${Math.round(unit.armorRate * 100)}%)` : ''}</div>}
      {badges.length > 0 && (
        <div style={{ marginTop: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {badges.map((b) => (
            <span key={b} style={{ fontSize: 9, padding: '0 3px', borderRadius: 3, background: '#e6ecff', color: C.player }}>{b}</span>
          ))}
        </div>
      )}
    </div>
  )
}

// 奥義ゲージの段階(10以上で奥義、15以上で解放奥義)
const tierOf = (g) => (g >= 15 ? '【解放奥義】' : g >= 10 ? '【奥義】' : '')

// チームの資源(MP・EP・信仰値・連携・奥義ゲージ)と、置かれているクレスト
function TeamStatus({ state, team }) {
  const crests = state.crests[team]
  return (
    <div style={{ fontSize: 11, marginTop: 3, color: TEAM_COLOR[team] }}>
      <b>{team === 'A' ? '自分' : '相手'}</b>
      <span> MP {state.mp[team]}/{state.mpMax[team]}</span>
      <span> ・ EP {state.ep[team]}</span>
      <span> ・ 信仰 {state.faith[team]}</span>
      <span> ・ 墓場 {state.graveyard[team]}</span>
      <span> ・ 連携 {state.link[team]}</span>
      <span> ・ 奥義ゲージ {gaugeOf(state, team)}{tierOf(gaugeOf(state, team))}</span>
      {crests.length > 0 && (
        <span>
          {' ・ クレスト '}
          {crests.map((c) => (
            <span key={c.name} title={c.desc} style={{ marginRight: 4, padding: '0 4px', borderRadius: 3, background: '#fff3d1', color: '#7a5a00' }}>
              {c.name}{c.countdown != null ? `(${c.countdown})` : ''}
            </span>
          ))}
        </span>
      )}
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

// 奥義・解放奥義の条件がついた能力には、頭に【奥義】【解放奥義】を付ける
const tierPrefix = (cond) => (cond?.liberation ? '【解放奥義】' : cond?.ultimate ? '【奥義】' : '')

function passiveLine(p) {
  const label = (TRIGGER_LABELS[p.trigger] ?? p.trigger) + (p.min != null && p.trigger !== 'combo' ? `_${p.min}` : '')
  const name = p.name && p.name !== label ? `${p.name}: ` : ''
  return `${tierPrefix(p.condition)}【${label}】${name}${p.desc ?? ''}`
}

// キャラの詳細(能力の説明)
function InspectBox({ unit }) {
  const lines = []
  for (const k of unit.keywords) lines.push(`【${KEYWORDS[k]?.label ?? k}】${KEYWORDS[k]?.desc ?? ''}`)
  for (const p of unit.passiveObjs) lines.push(passiveLine(p))
  for (const t of unit.traits) lines.push(`${tierPrefix(t.condition)}【特性 MP${t.cost}${t.repeatable ? ' 連続使用可' : ''}】${t.name}: ${t.desc ?? ''}`)
  if (unit.accel) lines.push(`【アクセラレート_${unit.accel.speed}】${unit.accel.name}(MP${unit.accel.cost ?? 0}): ${unit.accel.desc ?? ''}`)
  if (unit.countdown != null) lines.push(`【カウントダウン】あと${unit.countdown}回自分のターンが始まると破壊される`)
  return (
    <div data-testid="inspect" style={{ marginTop: 8, padding: 8, borderRadius: 8, background: C.card, border: `1px solid ${C.line}`, fontSize: 11, lineHeight: 1.6 }}>
      <b>{unit.name}</b>
      <span style={{ color: C.mute }}>
        {' '}{unit.evolved ? '(進化済) ' : ''}攻撃 {Math.round(unit.atk)} / 防御 {Math.round(unit.def)} / 速度 {Math.round(unit.spd)} / スキル「{unit.skill.name}」({TYPE_LABEL[unit.skill.type]})
      </span>
      {lines.length === 0 ? <div style={{ color: C.mute }}>能力なし</div> : lines.map((l, i) => <div key={i}>{l}</div>)}
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
  const [team, setTeam] = useState(null) // 編成画面で決めた自分のチーム(キャラ定義の配列)。nullなら編成画面を出す
  const [level, setLevel] = useState(2)
  const [state, setState] = useState(null)
  const [selected, setSelected] = useState(null)
  const [mode, setMode] = useState(null) // 選択中の特性のid(nullならスキル攻撃)
  const [inspect, setInspect] = useState(null)
  const [cpuError, setCpuError] = useState('') // CPUの思考でエラーが起きたときの表示

  const actor = state ? getActiveUnit(state) : null
  const cpuTurn = !!actor && actor.team === 'B' && !state.winner
  const playerTurn = !!actor && actor.team === 'A' && !state.winner
  const legal = playerTurn ? legalActions(state) : []
  const skillTargets = legal.filter((a) => a.type === 'skill').map((a) => a.target)
  const traitActions = (id) => legal.filter((a) => a.type === 'trait' && a.trait === id)
  const canEnd = legal.some((a) => a.type === 'endTurn')
  const canEvolve = legal.some((a) => a.type === 'evolve')
  const isAccel = !!state && state.activeKind === 'accel'
  const accelActs = legal.filter((a) => a.type === 'accelerate')
  const selectableSet = isAccel
    ? accelActs.map((a) => a.target).filter(Boolean)
    : mode ? traitActions(mode).map((a) => a.target).filter(Boolean) : skillTargets

  // CPUの番になったら少し待ってから行動する(特性を使ったあとも番が続くので、何度か動く)
  useEffect(() => {
    if (!state || state.winner) return
    const current = getActiveUnit(state)
    if (!current || current.team !== 'B') return
    const timer = setTimeout(() => {
      let action
      try {
        action = chooseAction(state, level)
      } catch (e) {
        // CPUの思考でエラーが起きても、ゲームが止まらないようにする(かんたんな行動に切り替え、原因を画面に出す)
        console.error(e)
        setCpuError(`CPUの思考でエラー: ${e.message}`)
        const acts = legalActions(state)
        action = acts.find((a) => a.type === 'skill') || acts.find((a) => a.type === 'endTurn') || acts[0]
      }
      try {
        setState(applyAction(state, action))
      } catch (e) {
        console.error(e)
        setCpuError(`CPUの行動でエラー: ${e.message}`)
        setState(applyAction(state, { type: 'endTurn' }))
      }
    }, cpuDelay)
    return () => clearTimeout(timer)
  }, [state, level, cpuDelay])

  const reset = () => {
    setSelected(null)
    setMode(null)
  }
  const startBattle = () => {
    reset()
    setInspect(null)
    setCpuError('')
    setState(createBattle(team, TEAM_CPU))
  }
  const act = (action) => {
    reset()
    setState(applyAction(state, action))
  }
  const handleTrait = (trait) => {
    const acts = traitActions(trait.id)
    if (!acts.length) return
    if (acts.every((a) => a.target == null)) return act(acts[0]) // 対象を選ばない特性はすぐ使う
    setSelected(null)
    setMode(mode === trait.id ? null : trait.id)
  }
  const handleConfirm = () => {
    if (!selected) return
    act(mode ? { type: 'trait', trait: mode, target: selected } : { type: 'skill', target: selected })
  }
  const handleAccel = () => {
    if (!accelActs.length) return
    if (accelActs.every((a) => a.target == null)) return act(accelActs[0])
    if (selected) act({ type: 'accelerate', trait: actor.accel.id, target: selected })
  }
  const handleCard = (u) => {
    if (playerTurn && selectableSet.includes(u.uid)) {
      setSelected(u.uid)
      setInspect(u.uid)
    } else {
      setInspect(inspect === u.uid ? null : u.uid)
    }
  }

  const wrap = { maxWidth: 520, margin: '0 auto', padding: 12, minHeight: '100vh', boxSizing: 'border-box', background: C.paper, color: C.ink, fontFamily: FONT }

  // ---- 編成画面 ----
  if (!team) {
    return (
      <FormationScreen
        allChars={ALL_TEST_CHARACTERS}
        defaultIds={TEAM_PLAYER.map((c) => c.id)}
        onStart={(chars) => setTeam(chars)}
        onExit={onExit}
      />
    )
  }

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
        <p style={{ fontSize: 12, color: C.mute, margin: '8px 0 4px' }}>編成: {team.map((c, i) => `${i + 1}.${c.name}`).join(' → ')}</p>
        <p style={{ fontSize: 11, color: C.mute, margin: '0 0 12px' }}>いまはテスト用の仮キャラで対戦します。</p>
        <button onClick={startBattle} style={buttonStyle(true, false)}>バトル開始</button>{' '}
        <button onClick={() => setTeam(null)} style={buttonStyle(false, false)}>編成を変える</button>{' '}
        <button onClick={onExit} style={buttonStyle(false, false)}>戻る</button>
      </div>
    )
  }

  // ---- バトル中 ----
  const levelInfo = CPU_LEVELS.find((l) => l.level === level)
  const enemies = state.units.filter((u) => u.team === 'B' && u.field === 'main')
  const players = state.units.filter((u) => u.team === 'A' && u.field === 'main')
  const enemySummons = state.units.filter((u) => u.team === 'B' && u.field === 'summon' && u.alive)
  const playerSummons = state.units.filter((u) => u.team === 'A' && u.field === 'summon' && u.alive)
  const resultText = state.winner === 'A' ? '勝利!' : state.winner === 'B' ? '敗北…' : '引き分け'
  const inspected = inspect ? getUnit(state, inspect) : null
  const modeTrait = mode ? actor.traits.find((t) => t.id === mode) : null

  const card = (u) => (
    <UnitCard
      key={u.uid}
      unit={u}
      active={u.uid === state.active}
      selected={u.uid === selected}
      selectable={playerTurn && selectableSet.includes(u.uid)}
      inspected={u.uid === inspect}
      onClick={() => handleCard(u)}
    />
  )

  return (
    <div style={wrap}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 13 }}>
          <b>ラウンド {state.round}</b>
          <span style={{ color: C.mute }}> / CPU Lv{level} {levelInfo?.name}</span>
        </div>
        <button onClick={() => setState(null)} style={{ ...buttonStyle(false, false), padding: '4px 10px', fontSize: 12 }}>やめる</button>
      </div>
      <TeamStatus state={state} team="A" />
      <TeamStatus state={state} team="B" />

      {cpuError && <div style={{ marginTop: 6, padding: 6, borderRadius: 6, background: '#fde8e8', color: C.hpLow, fontSize: 12 }}>{cpuError}</div>}

      <ActionBar state={state} />

      <Row title="相手" color={C.enemy}>{enemies.map(card)}</Row>
      {enemySummons.length > 0 && <Row title="相手の召喚物" color={C.enemy}>{enemySummons.map(card)}</Row>}

      <div style={{ margin: '12px 0 0', padding: 8, borderRadius: 8, background: C.card, border: `1px solid ${C.line}`, fontSize: 12, lineHeight: 1.6, minHeight: 120 }}>
        {state.log.slice(-8).map((line, i, arr) => (
          <div key={state.log.length - arr.length + i} style={{ fontWeight: i === arr.length - 1 ? 700 : 400, color: i === arr.length - 1 ? C.ink : C.mute }}>
            {line}
          </div>
        ))}
      </div>

      {playerSummons.length > 0 && <Row title="自分の召喚物" color={C.player}>{playerSummons.map(card)}</Row>}
      <Row title="自分" color={C.player}>{players.map(card)}</Row>

      {inspected && <InspectBox unit={inspected} />}

      <div style={{ marginTop: 14, padding: 10, borderRadius: 8, background: C.card, border: `1px solid ${C.line}` }}>
        {state.winner ? (
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{resultText}</div>
            <button onClick={startBattle} style={buttonStyle(true, false)}>もう一度</button>{' '}
            <button onClick={() => setState(null)} style={buttonStyle(false, false)}>強さを選び直す</button>
          </div>
        ) : cpuTurn ? (
          <div style={{ fontSize: 13, color: C.mute }}>{actor.name}(相手)が考えています…</div>
        ) : isAccel ? (
          <div>
            <div style={{ fontSize: 13, marginBottom: 6 }}>
              <b>{actor.name}</b> の【アクセラレート_{actor.accel.speed}】の番です
            </div>
            <div style={{ fontSize: 12, color: C.mute, marginBottom: 6 }}>
              {actor.accel.name}(MP{actor.accel.cost ?? 0}): {actor.accel.desc} 実行すると本体の番を消費します。見送ると、本体の番はそのままです。
            </div>
            <div style={{ fontSize: 12, color: C.mute, marginBottom: 8 }}>
              {accelActs.length === 0
                ? 'MPが足りないなど、いまは実行できません'
                : accelActs.every((a) => a.target == null)
                  ? ''
                  : selected
                    ? `対象: ${getUnit(state, selected)?.name}`
                    : '対象をタップ(光っているキャラ)'}
            </div>
            {accelActs.length > 0 && (
              <button
                onClick={handleAccel}
                disabled={!accelActs.every((a) => a.target == null) && !selected}
                style={buttonStyle(true, !accelActs.every((a) => a.target == null) && !selected)}
              >
                実行する
              </button>
            )}{' '}
            <button onClick={() => act({ type: 'endTurn' })} style={buttonStyle(false, false)}>見送る</button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 13, marginBottom: 6 }}>
              <b>{actor.name}</b> の番: スキル「{actor.skill.name}」({TYPE_LABEL[actor.skill.type]})
            </div>

            {actor.traits.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: C.mute, marginBottom: 4 }}>特性(MPを使う。使ってもターンは続きます)</div>
                {actor.traits.map((t) => {
                  const usable = traitActions(t.id).length > 0
                  const why = !t.repeatable && actor.usedTraits.includes(t.id) ? '使用済み' : state.mp.A < t.cost ? 'MP不足' : t.condition ? '条件未達' : '対象なし'
                  return (
                    <div key={t.id} style={{ marginBottom: 4 }}>
                      <button
                        onClick={() => handleTrait(t)}
                        disabled={!usable}
                        style={{ ...buttonStyle(mode === t.id, !usable), padding: '6px 10px', fontSize: 13 }}
                      >
                        {t.name}(MP{t.cost}){!usable ? ` ${why}` : ''}
                      </button>
                      <span style={{ fontSize: 11, color: C.mute }}> {t.desc}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {(actor.evolvable || actor.evolved) && (
              <div style={{ marginBottom: 8 }}>
                <button
                  onClick={() => act({ type: 'evolve' })}
                  disabled={!canEvolve}
                  style={{ ...buttonStyle(false, !canEvolve), padding: '6px 10px', fontSize: 13 }}
                >
                  進化(EP1){!canEvolve ? ` ${actor.evolved ? '進化済み' : state.ep.A < 1 ? 'EPなし' : ''}` : ''}
                </button>
                <span style={{ fontSize: 11, color: C.mute }}> 体力と攻撃力が2倍。進化したターンからスキルを使える</span>
              </div>
            )}

            <div style={{ fontSize: 12, color: C.mute, marginBottom: 8 }}>
              {mode
                ? selected
                  ? `対象: ${getUnit(state, selected)?.name}`
                  : `【${modeTrait?.name}】の対象をタップ(光っているキャラ)`
                : skillTargets.length === 0
                  ? '入場直後など、いまはスキルを使えません'
                  : selected
                    ? `対象: ${getUnit(state, selected)?.name}`
                    : '上の「相手」から攻撃する相手をタップ'}
            </div>

            {(mode || skillTargets.length > 0) && (
              <button onClick={handleConfirm} disabled={!selected} style={buttonStyle(true, !selected)}>
                {mode ? `${modeTrait?.name}を使う` : '攻撃する'}
              </button>
            )}{' '}
            {mode && <button onClick={() => { setMode(null); setSelected(null) }} style={buttonStyle(false, false)}>やめる</button>}{' '}
            {canEnd && !mode && <button onClick={() => act({ type: 'endTurn' })} style={buttonStyle(skillTargets.length === 0, false)}>ターン終了</button>}
          </div>
        )}
      </div>
    </div>
  )
}
