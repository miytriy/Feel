// Feel Battle - バトルの基本処理(段階1)
// 画面やFirebaseには依存しません。「状態 + 行動 → 新しい状態」の形で作ってあります。

const AV_BASE = 10000 // 初期行動値 = 10000 ÷ 速度
const ROUND_AV = 100 // 行動値が100進むごとに1ラウンド
const EPS = 1e-9

// 入場した最初のターンでもスキルを使えるパッシブ(突進・疾走)
const FIRST_TURN_SKILL_PASSIVES = ['rush', 'dash']

// キャラ定義 → バトル中のユニット
function makeUnit(def, team, index) {
  const s = def.stats
  const baseAV = AV_BASE / s.spd
  return {
    uid: `${team}${index}`,
    defId: def.id,
    name: def.name,
    class: def.class,
    team,
    maxHp: s.hp,
    hp: s.hp,
    shield: 0,
    shieldRate: 1,
    atk: s.atk,
    mag: s.mag ?? 0,
    def: s.def,
    spd: s.spd,
    critRate: s.critRate ?? 5,
    critDmg: s.critDmg ?? 50,
    dmgResist: s.dmgResist ?? 0,
    passives: [...(def.passives || [])],
    skill: { ...def.skill },
    baseAV,
    curAV: baseAV,
    hasActed: false,
    alive: true,
  }
}

// バトルを作る(teamA = プレイヤー側, teamB = 相手側。最大5体ずつ)
export function createBattle(teamADefs, teamBDefs) {
  if (teamADefs.length < 1 || teamADefs.length > 5 || teamBDefs.length < 1 || teamBDefs.length > 5) {
    throw new Error('編成は1〜5体にしてください')
  }
  const units = [
    ...teamADefs.map((d, i) => makeUnit(d, 'A', i)),
    ...teamBDefs.map((d, i) => makeUnit(d, 'B', i)),
  ]
  const state = { units, totalAV: 0, round: 1, active: null, winner: null, log: ['バトル開始!'] }
  return advance(state)
}

export function getUnit(state, uid) {
  return state.units.find((u) => u.uid === uid)
}

export function getActiveUnit(state) {
  return state.active ? getUnit(state, state.active) : null
}

// 今行動するユニットが選べる行動の一覧
export function legalActions(state) {
  const actor = getActiveUnit(state)
  if (!actor || state.winner) return []
  const canUseSkill = actor.hasActed || actor.passives.some((p) => FIRST_TURN_SKILL_PASSIVES.includes(p))
  if (!canUseSkill) return [{ type: 'wait' }]
  const targets = state.units.filter((u) => u.alive && u.team !== actor.team)
  return targets.map((t) => ({ type: 'skill', target: t.uid }))
}

// 魔力参照の攻撃は、攻撃力の70%を魔力に変換して攻撃する(魔力は原則0で、攻撃のたびに0へ戻る)
const MAGIC_CONVERSION = 0.7
export function refStatValue(unit, skill) {
  return skill.stat === 'mag' ? unit.atk * MAGIC_CONVERSION + unit.mag : unit.atk
}

// ダメージ計算(opts.expected = true なら、クリティカルを確率の平均で計算する。CPUの思考用)
export function calcDamage(attacker, defender, skill, opts = {}) {
  const rng = opts.rng || Math.random
  const refStat = refStatValue(attacker, skill)
  const base = refStat * skill.mult + (skill.add || 0)

  const critChance = Math.min(1, Math.max(0, attacker.critRate / 100))
  let critMul = 1
  let isCrit = false
  if (opts.expected) {
    critMul = 1 + critChance * (attacker.critDmg / 100)
  } else if (rng() < critChance) {
    isCrit = true
    critMul = 1 + attacker.critDmg / 100
  }

  let defense = defender.def
  if (skill.type === 'magic') defense *= 0.95 // 魔法は防御力を5%無視
  const defCoef = skill.type === 'true' ? 1 : 1 - defense / (defense + 200 + 10) // 確定ダメージは防御無視
  const resCoef = 1 - defender.dmgResist / (defender.dmgResist + 800)

  const raw = base * critMul * defCoef * resCoef
  return { damage: opts.expected ? raw : Math.max(1, Math.floor(raw)), isCrit }
}

// シールドがあれば先に吸収する(仮の処理)
function dealDamage(target, dmg) {
  const absorbed = Math.min(target.shield, dmg * target.shieldRate)
  target.shield -= absorbed
  target.hp -= dmg - absorbed
  if (target.hp <= 0) {
    target.hp = 0
    target.alive = false
  }
}

function checkWinner(state) {
  const aAlive = state.units.some((u) => u.team === 'A' && u.alive)
  const bAlive = state.units.some((u) => u.team === 'B' && u.alive)
  if (aAlive && bAlive) return null
  if (aAlive) return 'A'
  if (bAlive) return 'B'
  return 'draw'
}

function endTurn(state, actor) {
  actor.hasActed = true
  actor.curAV = actor.baseAV
}

// 次に行動するユニットを決める。選べる行動がない(待機のみ)ときは自動で飛ばす
function advance(state) {
  for (let guard = 0; guard < 1000; guard++) {
    const winner = checkWinner(state)
    if (winner) {
      state.winner = winner
      state.active = null
      return state
    }
    const alive = state.units.filter((u) => u.alive)
    let next = alive[0]
    for (const u of alive) {
      if (u.curAV < next.curAV - EPS || (Math.abs(u.curAV - next.curAV) <= EPS && u.spd > next.spd)) {
        next = u
      }
    }
    const elapsed = Math.max(0, next.curAV)
    for (const u of alive) u.curAV = Math.max(0, u.curAV - elapsed)
    state.totalAV += elapsed
    state.round = Math.floor(state.totalAV / ROUND_AV + EPS) + 1
    state.active = next.uid

    const actions = legalActions(state)
    if (actions.length === 1 && actions[0].type === 'wait') {
      state.log.push(`${next.name}は様子を見ている(入場直後はスキルを使えない)`)
      endTurn(state, next)
      continue
    }
    return state
  }
  throw new Error('バトルが終わりませんでした')
}

// 行動を実行して、次の行動待ちの状態を返す(元の状態は書き換えない)
export function applyAction(prev, action, opts = {}) {
  if (prev.winner || !prev.active) return prev
  const state = structuredClone(prev)
  const actor = getActiveUnit(state)

  if (action.type === 'skill') {
    const legal = legalActions(state).some((a) => a.type === 'skill' && a.target === action.target)
    if (!legal) throw new Error('その対象は選べません')
    const target = getUnit(state, action.target)
    const { damage, isCrit } = calcDamage(actor, target, actor.skill, opts)
    dealDamage(target, damage)
    state.log.push(
      `${actor.name}の「${actor.skill.name}」! ${target.name}に${Math.round(damage)}ダメージ${isCrit ? '(クリティカル!)' : ''}`
    )
    if (!target.alive) state.log.push(`${target.name}は倒れた`)
  } else {
    state.log.push(`${actor.name}は待機した`)
  }

  endTurn(state, actor)
  return advance(state)
}
