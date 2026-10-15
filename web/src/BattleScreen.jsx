import { useEffect, useState } from 'react'
import { createBattle, applyAction, getActiveUnit, legalActions, getUnit, gaugeOf, calcDamage, KEYWORDS, TRIGGER_LABELS } from './battle/engine.js'
import { chooseAction, CPU_LEVELS } from './battle/ai.js'
import { DEFAULT_PLAYER_IDS, buildCpuTeam, loadCpuCharSetting, saveCpuCharSetting, isTestChar, loadComboMode, saveComboMode } from './battle/teams.js'
import { ALL_CHARACTERS, charById } from './battle/characters/index.js'
import { ALL_SPELLS } from './battle/spells/index.js'
import FormationScreen from './FormationScreen.jsx'
import { useIsDesktop } from './ui.js'

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
  for (const team of ['A', 'B']) {
    const cr = state.comboReset?.[team]
    if (cr) for (let k = 0; k < count; k++) items.push({ time: cr.curAV + cr.baseAV * k, sys: team })
    // 持ち主のいないクレストのカウントダウン(残りの回数ぶんだけ並ぶ)
    for (const c of state.crests?.[team] || []) {
      if (c.slot) for (let k = 0; k < Math.min(count, c.countdown); k++) items.push({ time: c.slot.curAV + c.slot.baseAV * k, crestTeam: team, crest: c, left: c.countdown - k })
    }
  }
  const toNext = state.round * 100 - state.totalAV
  for (let k = 0; k < count; k++) items.push({ time: toNext + 100 * k, round: state.round + 1 + k })
  items.sort((a, b) => a.time - b.time || (a.round ? 1 : 0) - (b.round ? 1 : 0) || (b.unit?.spd ?? -1) - (a.unit?.spd ?? -1))
  return items.slice(0, count)
}

function ActionBar({ state, big = false }) {
  const items = buildTimeline(state, big ? 18 : 12)
  const W = big ? 84 : 54 // 1つ分の幅
  const H = big ? 50 : 38
  const F = big ? 12 : 10
  return (
    <div style={{ display: 'flex', gap: big ? 6 : 4, overflowX: 'auto', padding: '6px 2px', alignItems: 'stretch' }}>
      {items.map((it, i) =>
        it.round ? (
          <div
            key={`r${it.round}`}
            style={{
              flex: '0 0 auto', width: big ? 36 : 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: big ? 11 : 10, color: C.mute, borderLeft: `2px dashed ${C.line}`, borderRight: `2px dashed ${C.line}`,
            }}
          >
            R{it.round}
          </div>
        ) : it.crest ? (
          <div
            key={`crest-${it.crest.name}-${i}`}
            title={`クレスト【${it.crest.name}】のカウントダウン(持ち主の速度で進む)`}
            style={{
              flex: '0 0 auto', width: W, height: H, boxSizing: 'border-box', padding: '3px 4px', borderRadius: 6, fontSize: big ? 11 : 9, lineHeight: 1.25,
              overflow: 'hidden', background: '#e8e1ff', color: '#3d2b8f', border: `2px dotted ${TEAM_COLOR[it.crestTeam]}`,
            }}
          >
            CD{it.left} {it.crest.name}
          </div>
        ) : it.sys ? (
          <div
            key={`sys${it.sys}-${i}`}
            title="コンボリセット(システムターン): 味方のコンボ数が0に戻ります"
            style={{
              flex: '0 0 auto', width: W, height: H, boxSizing: 'border-box', padding: '3px 4px', borderRadius: 6, fontSize: big ? 11 : 9, lineHeight: 1.25,
              overflow: 'hidden', background: '#fff3d1', color: '#7a5a00', border: `2px dotted ${TEAM_COLOR[it.sys]}`,
            }}
          >
            コンボリセット
          </div>
        ) : (
          <div
            key={`${it.unit.uid}${it.accel ? 'a' : ''}-${i}`}
            style={{
              flex: '0 0 auto', width: i === 0 ? W + (big ? 20 : 12) : W, height: H, boxSizing: 'border-box', padding: '3px 4px',
              borderRadius: 6, fontSize: F, lineHeight: 1.25, overflow: 'hidden',
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

// 予想ダメージを受けたとき、体力がいくつ減るか(アーマーが先に受け持つ分と、バリアで防がれる分を考える)
function hpLossOf(unit, dmg, isTrue) {
  if (dmg == null || unit.barrier > 0 || unit.isAmulet) return 0
  const mult = isTrue ? 0.5 : 1
  const covered = Math.min(dmg * unit.armorRate, unit.armor / mult)
  return Math.max(0, Math.min(unit.hp, dmg - covered))
}
// 体力バーの上で点滅して、「どこまで削れるか」を見せる部分
function LossBlink({ unit, loss, radius = 3 }) {
  if (!loss || loss <= 0) return null
  const left = Math.max(0, (unit.hp - loss) / unit.maxHp) * 100
  const width = Math.min(100 - left, (loss / unit.maxHp) * 100)
  return <div data-testid="loss-blink" style={{ position: 'absolute', top: 0, bottom: 0, left: `${left}%`, width: `${width}%`, borderRadius: radius, background: '#ff2d2d', animation: 'feel-blink 0.7s ease-in-out infinite' }} />
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

function UnitCard({ unit, active, selected, selectable, inspected, onClick, big = false, fx = null, hl = false, tick = 0, loss = 0 }) {
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
        minWidth: 0, boxSizing: 'border-box', padding: big ? 10 : 4, borderRadius: big ? 10 : 8, fontSize: big ? 13 : 10, lineHeight: 1.3,
        background: unit.alive ? C.card : '#dfe3ea',
        opacity: unit.alive ? 1 : 0.5,
        border: `2px solid ${selected ? C.active : selectable ? C.ink : active ? TEAM_COLOR[unit.team] : inspected ? C.mute : C.line}`,
        boxShadow: selected ? `0 0 0 3px ${C.active}55` : active ? `0 0 0 3px ${TEAM_COLOR[unit.team]}33` : 'none',
        cursor: 'pointer', position: 'relative',
        ...(hl ? { boxShadow: `0 0 0 4px ${C.active}`, transform: 'scale(1.03)', zIndex: 2 } : {}),
        ...(fx && fx.kind === 'damage' ? { animation: `${tick % 2 ? 'feel-shake' : 'feel-shake2'} 0.4s` } : {}),
      }}
    >
      {fx && (
        <span key={tick} style={{ position: 'absolute', left: '50%', top: '30%', zIndex: 5, pointerEvents: 'none', fontWeight: 800, fontSize: fx.crit ? (big ? 26 : 20) : (big ? 22 : 17), color: fx.kind === 'heal' ? '#1a9b55' : fx.kind === 'damage' ? '#d12a2a' : C.player, textShadow: '0 0 3px #fff, 0 0 3px #fff, 0 0 3px #fff', whiteSpace: 'nowrap', animation: 'feel-float 1.2s ease-out forwards' }}>
          {fx.text}
        </span>
      )}
      <div style={{ height: big ? 36 : 26, overflow: 'hidden', fontWeight: big ? 700 : 400 }}>{unit.name}</div>
      {!unit.isAmulet && (
        <div style={{ background: '#e3e7ef', height: big ? 9 : 6, borderRadius: 3, marginTop: 3, position: 'relative' }}>
          <div style={{ width: `${ratio * 100}%`, height: '100%', borderRadius: 3, background: hpColor, transition: 'width 0.3s' }} />
          <LossBlink unit={unit} loss={loss} />
        </div>
      )}
      <div style={{ marginTop: 2, color: C.mute }}>{unit.isAmulet ? (unit.alive ? '体力なし' : '消えた') : unit.alive ? `${Math.ceil(unit.hp)}/${unit.maxHp}` : '戦闘不能'}</div>
      {unit.armor > 0 && <div style={{ color: C.player }}>アーマー {Math.ceil(unit.armor)}{unit.armorRate < 1 ? `(${Math.round(unit.armorRate * 100)}%)` : ''}</div>}
      {badges.length > 0 && (
        <div style={{ marginTop: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {badges.map((b) => (
            <span key={b} style={{ fontSize: big ? 11 : 9, padding: '0 3px', borderRadius: 3, background: '#e6ecff', color: C.player }}>{b}</span>
          ))}
        </div>
      )}
    </div>
  )
}

// 奥義ゲージの段階(10以上で奥義、15以上で解放奥義)
const tierOf = (g) => (g >= 15 ? '【解放奥義】' : g >= 10 ? '【奥義】' : '')

// チームの資源(MP・EP・信仰値・連携・奥義ゲージ)と、置かれているクレスト
function TeamStatus({ state, team, big = false }) {
  const crests = state.crests[team]
  return (
    <div style={{ fontSize: big ? 13 : 11, marginTop: 3, color: TEAM_COLOR[team], lineHeight: 1.5 }}>
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

function Row({ title, color, children, big = false }) {
  return (
    <div style={{ marginTop: big ? 0 : 10 }}>
      <div style={{ fontSize: big ? 13 : 11, color, fontWeight: 700, marginBottom: 4 }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: big ? 10 : 4 }}>{children}</div>
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
function InspectBox({ unit, big = false }) {
  const lines = []
  for (const k of unit.keywords) lines.push(`【${KEYWORDS[k]?.label ?? k}】${KEYWORDS[k]?.desc ?? ''}`)
  for (const p of unit.passiveObjs) lines.push(passiveLine(p))
  for (const t of unit.traits) lines.push(`${tierPrefix(t.condition)}【特性 MP${t.cost}${t.repeatable ? ' 連続使用可' : ''}】${t.name}: ${t.desc ?? ''}`)
  if (unit.accel) lines.push(`【アクセラレート_${unit.accel.speed}】${unit.accel.name}(MP${unit.accel.cost ?? 0}): ${unit.accel.desc ?? ''}`)
  if (unit.countdown != null) lines.push(`【カウントダウン】あと${unit.countdown}回自分のターンが始まると破壊される`)
  return (
    <div data-testid="inspect" style={{ marginTop: 8, padding: 8, borderRadius: 8, background: C.card, border: `1px solid ${C.line}`, fontSize: big ? 13 : 11, lineHeight: 1.6 }}>
      <b>{unit.name}</b>
      <span style={{ color: C.mute }}>
        {' '}{unit.evolved ? '(進化済) ' : ''}攻撃 {Math.round(unit.atk)} / 防御 {Math.round(unit.def)} / 速度 {Math.round(unit.spd)} / スキル「{unit.skill.name}」({TYPE_LABEL[unit.skill.type]})
      </span>
      {lines.length === 0 ? <div style={{ color: C.mute }}>能力なし</div> : lines.map((l, i) => <div key={i}>{l}</div>)}
    </div>
  )
}

// 直近に発動した能力の説明(ファンファーレ・特性・スペル・進化など)。何が起きたかを、説明つきで見せる
function AbilityBanner({ ability, now = '', big = false }) {
  if (!ability && !now) return null
  const color = ability && ability.team === 'B' ? C.enemy : C.player
  return (
    <div data-testid="ability" style={{ padding: big ? '10px 14px' : '8px 10px', borderRadius: 10, background: C.card, borderLeft: `6px solid ${color}`, border: `1px solid ${C.line}`, borderLeftWidth: 6, borderLeftColor: color, fontSize: big ? 14 : 12, lineHeight: 1.5 }}>
      {now && <div data-testid="now" style={{ fontWeight: 800, marginBottom: 4, color: C.ink }}>{now}</div>}
      {ability && (
        <>
          <div style={{ color, fontWeight: 700 }}>
            <span style={{ color: C.mute, fontWeight: 400, fontSize: big ? 11 : 10 }}>直近の能力 </span>【{ability.kind}】{ability.owner}{ability.name ? ` ― ${ability.name}` : ''}
          </div>
          {ability.desc && <div>{ability.desc}</div>}
        </>
      )}
    </div>
  )
}

// 選択中の相手(攻撃・特性の対象)の情報。予想ダメージつき
function TargetInfo({ unit, expected, loss = 0, big = false }) {
  const ratio = Math.max(0, unit.hp / unit.maxHp)
  const lines = []
  for (const k of unit.keywords) {
    if (k === 'stealth' && !unit.stealth) continue
    if (k === 'barrier' && unit.barrier <= 0) continue
    lines.push(`【${KEYWORDS[k]?.label ?? k}】${KEYWORDS[k]?.desc ?? ''}`)
  }
  for (const p of unit.passiveObjs) lines.push(passiveLine(p))
  for (const t of unit.traits) lines.push(`【特性 MP${t.cost}】${t.name}: ${t.desc ?? ''}`)
  return (
    <div data-testid="target-info" style={{ marginBottom: 8, padding: big ? 12 : 8, borderRadius: 10, background: '#fffaf0', border: `2px solid ${C.active}`, fontSize: big ? 13 : 12, lineHeight: 1.5 }}>
      <div style={{ fontSize: big ? 11 : 10, color: C.mute }}>選択中の{unit.team === 'B' ? '相手' : '味方'}</div>
      <div style={{ fontWeight: 700, fontSize: big ? 15 : 13 }}>{unit.name}{unit.evolved ? '(進化済)' : ''}{unit.field === 'summon' ? '(召喚物)' : ''}</div>
      {!unit.isAmulet && (
        <>
          <div style={{ background: '#e3e7ef', height: 10, borderRadius: 4, margin: '4px 0', position: 'relative' }}>
            <div style={{ width: `${ratio * 100}%`, height: '100%', borderRadius: 4, background: ratio > 0.5 ? C.hp : ratio > 0.25 ? C.hpMid : C.hpLow }} />
            <LossBlink unit={unit} loss={loss} radius={4} />
          </div>
          <div>HP {Math.ceil(unit.hp)}/{unit.maxHp}{unit.armor > 0 ? ` ・ アーマー ${Math.ceil(unit.armor)}` : ''}{unit.barrier > 0 ? ' ・ バリア' : ''}</div>
          <div style={{ color: C.mute }}>攻撃 {Math.round(unit.atk)} / 防御 {Math.round(unit.def)} / 速度 {Math.round(unit.spd)}</div>
        </>
      )}
      {expected != null && (
        <div style={{ fontWeight: 700, color: C.player }}>
          予想ダメージ 約{Math.round(expected)}{expected >= unit.hp + unit.armor ? '(倒せる!)' : ''}
          {unit.barrier > 0 ? '(バリアで防がれる)' : !unit.isAmulet && <span style={{ color: C.mute, fontWeight: 400 }}> → HP {Math.ceil(unit.hp - loss)}/{unit.maxHp}</span>}
        </div>
      )}
      {lines.map((l, i) => <div key={i} style={{ fontSize: big ? 12 : 11, color: C.ink }}>{l}</div>)}
    </div>
  )
}

const buttonStyle = (primary, disabled) => ({
  padding: '10px 14px', borderRadius: 8, fontSize: 14, fontFamily: FONT, cursor: disabled ? 'default' : 'pointer',
  border: `1px solid ${primary ? C.ink : C.line}`,
  background: disabled ? '#d7dce6' : primary ? C.ink : C.card,
  color: disabled ? '#8a93a6' : primary ? '#fff' : C.ink,
})

// rewardApi: ログイン中だけ渡される。{ start(level) → { ticketId }, finish(ticketId, 'win'|'lose') → { reward, reason } }
// ---- 再生(起きたことを、1つずつ順番に見せる) ----
const SPEEDS = [
  { id: 'slow', label: 'ゆっくり', mult: 1.6 },
  { id: 'normal', label: 'ふつう', mult: 1 },
  { id: 'fast', label: 'はやい', mult: 0.5 },
  { id: 'skip', label: 'とばす', mult: 0 },
]
const EVENT_MS = { turn: 700, ability: 2200, attack: 900, damage: 900, heal: 800, summon: 800, block: 800, sync: 300 }
const loadSpeed = () => { try { const v = localStorage.getItem('feel-play-speed'); return SPEEDS.some((x) => x.id === v) ? v : 'normal' } catch { return 'normal' } }

export default function BattleScreen({ onExit, cpuDelay = 700, rewardApi = null }) {
  const [spellSet, setSpellSet] = useState([]) // 編成画面で決めたスペルセット(スペル定義の配列。同じスペルを複数入れてよい)
  const [team, setTeam] = useState(null) // 編成画面で決めた自分のチーム(キャラ定義の配列)。nullなら編成画面を出す
  const [level, setLevel] = useState(2)
  const [comboMode, setComboMode] = useState(() => loadComboMode()) // 開発者設定: コンボのシステム(old = 従来 / reset = β: コンボリセット)
  const [cpuChars, setCpuChars] = useState(() => loadCpuCharSetting()) // 開発者設定: CPUが使うキャラ(test / real)
  const [state, setState] = useState(null)
  const [selected, setSelected] = useState(null)
  const [mode, setMode] = useState(null) // 選択中の特性のid(nullならスキル攻撃)
  const [inspect, setInspect] = useState(null)
  const [cpuError, setCpuError] = useState('') // CPUの思考でエラーが起きたときの表示
  const [ticketId, setTicketId] = useState(null) // 対戦の報酬用の「対戦券」(サーバーが発行)
  const [rewardMsg, setRewardMsg] = useState('') // 報酬の結果の表示
  const [speed, setSpeed] = useState(loadSpeed) // 再生の速さ
  const [play, setPlay] = useState(null) // 再生中の記録 { events, i, prevActive, prevAbility }。null なら再生していない
  const playing = !!play
  const desktop = useIsDesktop() // 画面の幅が広い(PC)ときは、画面全体を使うレイアウトにする

  const actor = state ? getActiveUnit(state) : null
  const cpuTurn = !!actor && actor.team === 'B' && !state.winner
  const playerTurn = !!actor && actor.team === 'A' && !state.winner && !playing
  const legal = playerTurn ? legalActions(state) : []
  const skillTargets = legal.filter((a) => a.type === 'skill').map((a) => a.target)
  const traitActions = (id) => legal.filter((a) => a.type === 'trait' && a.trait === id)
  const spellActs = legal.filter((a) => a.type === 'spell')
  const canEnd = legal.some((a) => a.type === 'endTurn')
  const canEvolve = legal.some((a) => a.type === 'evolve')
  const isAccel = !!state && state.activeKind === 'accel'
  const accelActs = legal.filter((a) => a.type === 'accelerate')
  const chooseActs = legal.filter((a) => a.type === 'choose') // 効果の対象を選ぶ場面(ファンファーレなど)
  const choosing = chooseActs.length > 0
  const confirming = !!(state && state.pending && state.pending.confirm) // 「使う/使わない」を選ぶ場面
  const selectableSet = choosing
    ? chooseActs.map((a) => a.target)
    : isAccel
    ? accelActs.map((a) => a.target).filter(Boolean)
    : mode ? traitActions(mode).map((a) => a.target).filter(Boolean) : skillTargets

  // CPUの番になったら少し待ってから行動する(特性を使ったあとも番が続くので、何度か動く)
  useEffect(() => {
    if (!state || state.winner || play) return // 再生が終わってから動く
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
        commit(applyAction(state, action))
      } catch (e) {
        console.error(e)
        setCpuError(`CPUの行動でエラー: ${e.message}`)
        commit(applyAction(state, { type: 'endTurn' }))
      }
    }, cpuDelay)
    return () => clearTimeout(timer)
  }, [state, level, cpuDelay, play])

  // 再生を1つずつ進める
  useEffect(() => {
    if (!play) return
    const mult = SPEEDS.find((x) => x.id === speed)?.mult ?? 1
    if (mult === 0 || play.i >= play.events.length) { setPlay(null); return }
    const t = setTimeout(() => setPlay((p) => (p ? { ...p, i: p.i + 1 } : p)), (EVENT_MS[play.events[play.i].type] ?? 500) * mult)
    return () => clearTimeout(t)
  }, [play, speed])

  // 対戦が終わったら、サーバーに結果を送って報酬をもらう(1つの対戦券につき1回だけ)
  useEffect(() => {
    if (!state || !state.winner || !rewardApi || !ticketId) return
    const id = ticketId
    setTicketId(null)
    setRewardMsg('報酬を確認しています…')
    rewardApi
      .finish(id, state.winner === 'A' ? 'win' : 'lose')
      .then((r) => setRewardMsg(r.reward > 0 ? `報酬 +${r.reward} ジェム` : r.reason || '報酬はありません'))
      .catch((e) => setRewardMsg(`報酬を受け取れませんでした: ${e.message}`))
  }, [state, rewardApi, ticketId])

  // 新しい状態にする。起きたことの記録があれば、1つずつ再生する
  const commit = (next) => {
    const evs = next.events || []
    const mult = SPEEDS.find((x) => x.id === speed)?.mult ?? 1
    setPlay(evs.length && mult > 0 ? { events: evs, i: 0, prevActive: state?.active ?? null, prevAbility: state?.lastAbility ?? null } : null)
    setState(next)
  }
  const changeSpeed = (id) => { setSpeed(id); try { localStorage.setItem('feel-play-speed', id) } catch { /* 保存できなくても動く */ } if (id === 'skip') setPlay(null) }
  const reset = () => {
    setSelected(null)
    setMode(null)
  }
  // 所持キャラクター(「所持キャラから召喚する」能力の候補)。いまはガチャの所持データとはつないでいないので、実装済みの本実装キャラ全員を所持とみなす
  const ownedPool = (cpuMode) => {
    const real = ALL_CHARACTERS.filter((c) => !isTestChar(c))
    return { A: real, B: cpuMode === 'real' ? real : ALL_CHARACTERS.filter(isTestChar) }
  }
  const startBattle = () => {
    reset()
    setInspect(null)
    setCpuError('')
    setRewardMsg('')
    setTicketId(null)
    if (rewardApi) {
      rewardApi
        .start(level)
        .then((r) => setTicketId(r.ticketId))
        .catch((e) => setRewardMsg(`この対戦では報酬がもらえません: ${e.message}`))
    }
    setPlay(null)
    setState(createBattle(team, buildCpuTeam(ALL_CHARACTERS, cpuChars), { comboMode, pool: ownedPool(cpuChars), spells: { A: spellSet, B: [] } }))
  }
  const act = (action) => {
    reset()
    commit(applyAction(state, action))
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
    if (playerTurn && choosing && selectableSet.includes(u.uid)) {
      act({ type: 'choose', target: u.uid }) // 選んだらすぐに効果が働く
      return
    }
    if (playerTurn && selectableSet.includes(u.uid)) {
      setSelected(u.uid)
      setInspect(u.uid)
    } else {
      setInspect(inspect === u.uid ? null : u.uid)
    }
  }

  const wrap = desktop
    ? { maxWidth: 1100, margin: '0 auto', padding: '28px 32px', minHeight: '100vh', boxSizing: 'border-box', background: C.paper, color: C.ink, fontFamily: FONT }
    : { maxWidth: 520, margin: '0 auto', padding: 12, paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', minHeight: '100vh', boxSizing: 'border-box', background: C.paper, color: C.ink, fontFamily: FONT }

  // ---- 編成画面 ----
  if (!team) {
    return (
      <FormationScreen
        allChars={ALL_CHARACTERS}
        defaultIds={DEFAULT_PLAYER_IDS}
        allSpells={ALL_SPELLS.filter((sp) => sp.type !== 'トークン')}
        onStart={(chars, spells) => { setTeam(chars); setSpellSet(spells || []) }}
        onExit={onExit}
      />
    )
  }

  // ---- 開始前: CPUの強さを選ぶ ----
  if (!state) {
    return (
      <div style={wrap}>
        <h2 style={{ margin: '4px 0 12px', fontSize: desktop ? 28 : 22 }}>CPU対戦</h2>
        <p style={{ margin: '0 0 8px', fontSize: desktop ? 15 : 13 }}>CPUの強さを選んでください</p>
        <div style={desktop ? { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginBottom: 6 } : undefined}>
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
        </div>
        <p style={{ fontSize: 12, color: C.mute, margin: '8px 0 4px' }}>編成: {team.map((c, i) => `${i + 1}.${c.name}`).join(' → ')}</p>
        <p style={{ fontSize: 12, color: C.mute, margin: '0 0 4px' }}>スペル: {spellSet.length ? spellSet.map((sp) => sp.name).join(' / ') : 'なし'}</p>
        <p style={{ fontSize: 11, color: C.mute, margin: '0 0 4px' }}>
          {cpuChars === 'real' ? 'CPUは本実装キャラ(クラスは毎回ランダム)で対戦します。' : 'CPUはテスト用の仮キャラで対戦します。'}
        </p>
        <details style={{ margin: '0 0 8px', fontSize: 12 }}>
          <summary style={{ cursor: 'pointer', color: C.mute }}>開発者設定</summary>
          <div style={{ marginTop: 6 }}>
            <div style={{ marginBottom: 4 }}>CPUが使うキャラ</div>
            {[['test', 'テストキャラ'], ['real', '本実装キャラ']].map(([v, label]) => (
              <button
                key={v}
                onClick={() => { setCpuChars(v); saveCpuCharSetting(v) }}
                style={{ ...buttonStyle(cpuChars === v, false), marginRight: 6 }}
              >
                {label}
              </button>
            ))}
            <div style={{ margin: '8px 0 4px' }}>コンボのシステム</div>
            {[['old', '従来'], ['reset', 'β(コンボリセット)']].map(([v, label]) => (
              <button
                key={v}
                onClick={() => { setComboMode(v); saveComboMode(v) }}
                style={{ ...buttonStyle(comboMode === v, false), marginRight: 6 }}
              >
                {label}
              </button>
            ))}
            <div style={{ marginTop: 4, color: C.mute, fontSize: 11 }}>
              {comboMode === 'reset'
                ? 'β: 【コンボ_◯】を持つキャラが味方にいると、アクションバーに「コンボリセット」が並び(行動値=150×人数)、そこでコンボ数が0に戻ります。'
                : '従来: コンボ持ち自身のターンが終わると、コンボ数が0に戻ります。'}
            </div>
          </div>
        </details>
        <p style={{ fontSize: 11, color: C.mute, margin: '0 0 12px' }}>
          {rewardApi ? '勝利すると報酬(ジェム)がもらえます。' : 'ログインして対戦すると、勝利で報酬がもらえます。'}
        </p>
        <button onClick={startBattle} style={buttonStyle(true, false)}>バトル開始</button>{' '}
        <button onClick={() => setTeam(null)} style={buttonStyle(false, false)}>編成を変える</button>{' '}
        <button onClick={onExit} style={buttonStyle(false, false)}>戻る</button>
      </div>
    )
  }

  // ---- バトル中 ----
  // 再生中は、その時点の盤面(体力・状態)と、その時点までのログを見せる
  let view = state
  let ev = null
  if (play) {
    ev = play.events[Math.min(play.i, play.events.length - 1)]
    let active = play.prevActive
    let lastAbility = play.prevAbility
    for (let k = 0; k <= play.i && k < play.events.length; k++) {
      const e = play.events[k]
      if (e.type === 'turn') active = e.uid
      if (e.type === 'ability') lastAbility = { seq: k, kind: e.kind, owner: e.owner, name: e.name, desc: e.desc, team: e.team }
    }
    view = {
      ...state,
      units: state.units.filter((u) => ev.units[u.uid]).map((u) => ({ ...u, ...ev.units[u.uid] })),
      log: state.log.slice(0, ev.logLen),
      mp: { ...state.mp, ...ev.mp }, ep: { ...state.ep, ...ev.ep },
      winner: null, active, lastAbility,
    }
  }
  const fxFor = (uid) => {
    if (!ev || ev.target !== uid) return null
    if (ev.type === 'damage') return { kind: 'damage', text: `${ev.crit ? '会心 ' : ''}-${ev.amount}`, crit: !!ev.crit }
    if (ev.type === 'heal') return { kind: 'heal', text: `+${ev.amount}` }
    if (ev.type === 'summon') return { kind: 'summon', text: '登場!' }
    if (ev.type === 'block') return { kind: 'block', text: 'ガード!' }
    return null
  }
  const hlFor = (uid) => !!ev && ev.type === 'attack' && (ev.src === uid || ev.target === uid)
  const levelInfo = CPU_LEVELS.find((l) => l.level === level)
  const enemies = view.units.filter((u) => u.team === 'B' && u.field === 'main')
  const players = view.units.filter((u) => u.team === 'A' && u.field === 'main')
  const enemySummons = view.units.filter((u) => u.team === 'B' && u.field === 'summon' && u.alive)
  const playerSummons = view.units.filter((u) => u.team === 'A' && u.field === 'summon' && u.alive)
  const resultText = state.winner === 'A' ? '勝利!' : state.winner === 'B' ? '敗北…' : '引き分け'
  const inspected = inspect && inspect !== selected ? getUnit(state, inspect) : null // 選択中の相手は、操作パネルに詳しく出すので、ここでは重ねて出さない
  const modeTrait = mode ? actor.traits.find((t) => t.id === mode) : null
  const selectedUnit = playerTurn && selected ? getUnit(state, selected) : null
  let expectedDmg = null
  if (selectedUnit && !mode && !isAccel && skillTargets.includes(selected)) {
    try { expectedDmg = calcDamage(actor, selectedUnit, actor.skill, { expected: true }).damage } catch { expectedDmg = null }
  }

  const lossShown = selectedUnit && expectedDmg != null ? hpLossOf(selectedUnit, expectedDmg, actor.skill.type === 'true') : 0

  const card = (u) => (
    <UnitCard
      key={u.uid}
      unit={u}
      active={u.uid === view.active}
      fx={fxFor(u.uid)}
      hl={hlFor(u.uid)}
      tick={play ? play.i : 0}
      loss={u.uid === selected ? lossShown : 0}
      selected={u.uid === selected}
      selectable={playerTurn && selectableSet.includes(u.uid)}
      inspected={u.uid === inspect}
      onClick={() => handleCard(u)}
      big={desktop}
    />
  )

  // 操作パネル(スキル・特性・スペル・進化・ターン終了など)。PCは右側、スマホは画面の下に固定
  const panelInner = (
    <>
      {selectedUnit && <TargetInfo unit={selectedUnit} expected={expectedDmg} loss={lossShown} big={desktop} />}
        {state.winner && !playing ? (
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{resultText}</div>
            {rewardMsg && <div style={{ fontSize: 13, color: C.player, marginBottom: 8 }}>{rewardMsg}</div>}
            <button onClick={startBattle} style={buttonStyle(true, false)}>もう一度</button>{' '}
            <button onClick={() => setState(null)} style={buttonStyle(false, false)}>強さを選び直す</button>
          </div>
        ) : playing ? (
          <div style={{ fontSize: 13, color: C.mute }}>動きを再生中… (スキップもできます)</div>
        ) : cpuTurn ? (
          <div style={{ fontSize: 13, color: C.mute }}>{actor.name}(相手)が考えています…</div>
        ) : choosing && confirming ? (
          <div>
            <div style={{ fontSize: 13, marginBottom: 6 }}>
              <b>{actor.name}</b> の効果: {state.pending.prompt}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => act({ type: 'choose', target: 'yes' })} style={buttonStyle(true, false)}>使う</button>
              <button onClick={() => act({ type: 'choose', target: 'no' })} style={buttonStyle(false, false)}>使わない</button>
            </div>
          </div>
        ) : choosing ? (
          <div>
            <div style={{ fontSize: 13, marginBottom: 6 }}>
              <b>{actor.name}</b> の効果: 対象を選んでください
            </div>
            <div style={{ fontSize: 12, color: C.mute }}>
              {state.pending && state.pending.effects.some((e) => e.type === 'reenter')
                ? '選んだ味方が入場し直します(次のターンの開始時にファンファーレがもう一度働き、そのターンはスキル攻撃ができません)。'
                : '光っている枠のキャラをタップしてください。'}
            </div>
          </div>
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
              <b>{actor.name}</b> の番: スキル「{actor.skill.name}」({TYPE_LABEL[actor.skill.type]}){actor.doubleSkill ? ` ・1ターンに2回(2回目はMP${actor.doubleSkill.mpCost})${(actor.skillsThisTurn || 0) >= 1 ? ' ・1回目は済み' : ''}` : ''}
            </div>

            {state.spells.A.length > 0 && !choosing && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: C.mute, marginBottom: 4 }}>スペル(MPを使う・1枠につき1回・行動は消えません)</div>
                {state.spells.A.map((sp) => {
                  const usable = spellActs.some((a) => a.spell === sp.slot)
                  const why = sp.used ? '使用済み' : state.mp.A < sp.cost ? 'MP不足' : '使えません'
                  return (
                    <div key={sp.slot} style={{ marginBottom: 4 }}>
                      <button
                        onClick={() => act({ type: 'spell', spell: sp.slot })}
                        disabled={!usable}
                        style={{ ...buttonStyle(false, !usable), padding: '6px 10px', fontSize: 13 }}
                      >
                        ✦{sp.name}(MP{sp.cost}){!usable ? ` ${why}` : ''}
                      </button>
                      <span style={{ fontSize: 11, color: C.mute, ...(desktop ? null : { display: 'block', marginTop: 2 }) }}> {sp.desc}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {actor.traits.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: C.mute, marginBottom: 4 }}>特性(MPを使う。使ってもターンは続きます)</div>
                {actor.traits.map((t) => {
                  const usable = traitActions(t.id).length > 0
                  const why = t.charges != null && t.charges <= 0 ? '回数切れ' : !t.repeatable && actor.usedTraits.includes(t.id) ? '使用済み' : state.mp.A < t.cost ? 'MP不足' : t.condition ? '条件未達' : '対象なし'
                  return (
                    <div key={t.id} style={{ marginBottom: 4 }}>
                      <button
                        onClick={() => handleTrait(t)}
                        disabled={!usable}
                        style={{ ...buttonStyle(mode === t.id, !usable), padding: '6px 10px', fontSize: 13 }}
                      >
                        {t.name}(MP{t.cost}{t.charges != null ? `・残り${t.charges}回` : ''}){!usable ? ` ${why}` : ''}
                      </button>
                      <span style={{ fontSize: 11, color: C.mute, ...(desktop ? null : { display: 'block', marginTop: 2 }) }}> {t.desc}</span>
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
                <span style={{ fontSize: 11, color: C.mute, ...(desktop ? null : { display: 'block', marginTop: 2 }) }}> 体力と攻撃力が2倍。進化したターンからスキルを使える</span>
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

            <div style={desktop ? undefined : { position: 'sticky', bottom: -10, background: C.card, padding: '6px 0 2px', marginTop: 4 }}>
            {(mode || skillTargets.length > 0) && (
              <button onClick={handleConfirm} disabled={!selected} style={buttonStyle(true, !selected)}>
                {mode ? `${modeTrait?.name}を使う` : '攻撃する'}
              </button>
            )}{' '}
            {mode && <button onClick={() => { setMode(null); setSelected(null) }} style={buttonStyle(false, false)}>やめる</button>}{' '}
            {canEnd && !mode && <button onClick={() => act({ type: 'endTurn' })} style={buttonStyle(skillTargets.length === 0, false)}>ターン終了</button>}
            </div>
          </div>
        )}
    </>
  )
  const logLines = view.log.slice(desktop ? -40 : -6)
  const logBox = (
    <div style={{ padding: desktop ? 12 : 8, borderRadius: 8, background: C.card, border: `1px solid ${C.line}`, fontSize: desktop ? 13 : 12, lineHeight: 1.6, minHeight: desktop ? 0 : 96, ...(desktop ? { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column-reverse' } : { marginTop: 12 }) }}>
      <div>
        {logLines.map((line, i, arr) => (
          <div key={view.log.length - arr.length + i} style={{ fontWeight: i === arr.length - 1 ? 700 : 400, color: i === arr.length - 1 ? C.ink : C.mute }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  )
  const roundLine = (
    <div style={{ fontSize: desktop ? 16 : 13 }}>
      <b>ラウンド {state.round}</b>
      <span style={{ color: C.mute }}> / CPU Lv{level} {levelInfo?.name}</span>
    </div>
  )
  const quitBtn = <button onClick={() => setState(null)} style={{ ...buttonStyle(false, false), padding: '4px 10px', fontSize: 12 }}>やめる</button>
  const speedBar = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', fontSize: 11, color: C.mute, marginTop: 4 }}>
      <span>再生</span>
      {SPEEDS.map((x) => (
        <button key={x.id} onClick={() => changeSpeed(x.id)} style={{ ...buttonStyle(speed === x.id, false), padding: '2px 8px', fontSize: 11, minHeight: 0 }}>{x.label}</button>
      ))}
      {playing && <button onClick={() => setPlay(null)} style={{ ...buttonStyle(true, false), padding: '2px 10px', fontSize: 11, minHeight: 0 }}>スキップ</button>}
    </div>
  )
  const nameOf = (uid) => state.units.find((u) => u.uid === uid)?.name ?? ''
  const nowText = !ev ? '' : ev.type === 'attack' ? `⚔ ${nameOf(ev.src)} の ${ev.skill} → ${nameOf(ev.target)}` : ev.type === 'turn' ? `${ev.team === 'B' ? '相手' : 'あなた'}のターン: ${ev.name}` : ''
  const errBox = cpuError && <div style={{ marginTop: 6, padding: 6, borderRadius: 6, background: '#fde8e8', color: C.hpLow, fontSize: 12 }}>{cpuError}</div>

  // ---- PC: 画面全体を使う(左=盤面、右=詳細・ログ・操作) ----
  if (desktop) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 24px 16px', background: C.paper, color: C.ink, fontFamily: FONT, boxSizing: 'border-box', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {roundLine}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <TeamStatus state={view} team="A" big />
            <TeamStatus state={view} team="B" big />
          </div>
          {quitBtn}
        </div>
        {speedBar}
        {errBox}
        <ActionBar state={view} big />
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(380px, 30vw)', gap: 20 }}>
          <div style={{ minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14, paddingRight: 4 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Row big title="相手" color={C.enemy}>{enemies.map(card)}</Row>
              {enemySummons.length > 0 && <Row big title="相手の召喚物" color={C.enemy}>{enemySummons.map(card)}</Row>}
            </div>
            <AbilityBanner ability={view.lastAbility} now={nowText} big />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {playerSummons.length > 0 && <Row big title="自分の召喚物" color={C.player}>{playerSummons.map(card)}</Row>}
              <Row big title="自分" color={C.player}>{players.map(card)}</Row>
            </div>
          </div>
          <div style={{ minHeight: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {inspected && <div style={{ flex: '0 1 auto', maxHeight: '30%', overflowY: 'auto' }}><InspectBox unit={inspected} big /></div>}
            {logBox}
            <div style={{ flex: '0 1 auto', maxHeight: '58%', overflowY: 'auto', padding: 14, borderRadius: 10, background: C.card, border: `1px solid ${C.line}`, fontSize: 14 }}>
              {panelInner}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ---- スマホ: 1列。上に行動バーを固定、下に操作パネルを固定して、盤面をスクロールで見る ----
  return (
    <div style={wrap}>
      <div style={{ position: 'sticky', top: 0, zIndex: 9, background: C.paper, margin: '-12px -12px 0', padding: '8px 12px 2px', borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {roundLine}
          {quitBtn}
        </div>
        <ActionBar state={view} />
      </div>
      <TeamStatus state={view} team="A" />
      <TeamStatus state={view} team="B" />

      {speedBar}
      {errBox}

      <Row title="相手" color={C.enemy}>{enemies.map(card)}</Row>
      {enemySummons.length > 0 && <Row title="相手の召喚物" color={C.enemy}>{enemySummons.map(card)}</Row>}

      <div style={{ marginTop: 12 }}><AbilityBanner ability={view.lastAbility} now={nowText} /></div>
      {logBox}

      {playerSummons.length > 0 && <Row title="自分の召喚物" color={C.player}>{playerSummons.map(card)}</Row>}
      <Row title="自分" color={C.player}>{players.map(card)}</Row>

      {inspected && <InspectBox unit={inspected} />}

      <div style={{ position: 'sticky', bottom: 0, zIndex: 9, margin: '14px -12px 0', padding: '10px 12px calc(10px + env(safe-area-inset-bottom))', maxHeight: '42vh', overflowY: 'auto', background: C.card, borderTop: `2px solid ${C.line}`, boxShadow: '0 -4px 12px rgba(31,42,68,0.12)' }}>
        {panelInner}
      </div>
    </div>
  )
}
