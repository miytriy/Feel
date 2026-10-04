// Feel Battle - CPUの頭脳(レベル1〜4)
import { legalActions, applyAction, calcDamage, refStatValue, getUnit, getActiveUnit } from './engine.js'

export const CPU_LEVELS = [
  { level: 1, name: 'かんたん', description: '何も考えずに行動する' },
  { level: 2, name: 'ふつう', description: 'ダメージの大きい相手を狙うが、ときどきミスをする' },
  { level: 3, name: 'つよい', description: '倒せる相手や危険な相手を優先し、特性も有効に使う' },
  { level: 4, name: 'げきつよ', description: '数手先まで読んで選ぶ' },
]

const MISTAKE_RATE_LV2 = 0.3 // レベル2がランダムに行動してしまう確率
const TRAIT_RATE_LV2 = 0.5 // レベル2が特性を使う確率(使えるとき)
const TRAIT_MIN_GAIN = 0.01 // レベル3: 盤面が これ以上よくなる特性だけ使う
const LOOKAHEAD = 50 // レベル4: 最大何回先の行動まで読むか
const SAMPLES = 3 // レベル4: 乱数(クリティカル)を入れた試行の回数
const MARGIN = 0.15 // レベル4: レベル3の選択より、これ以上よいときだけ選び直す

const pickRandom = (list, rng) => list[Math.floor(rng() * list.length)]

// 期待ダメージ(クリティカルは確率の平均で計算)
function expectedDamage(state, action) {
  const actor = getActiveUnit(state)
  const target = getUnit(state, action.target)
  return calcDamage(actor, target, actor.skill, { expected: true }).damage
}

// 攻撃対象の評価: 削れるHPの割合 + 倒せるボーナス + 相手の危険度
function scoreTarget(state, action) {
  const actor = getActiveUnit(state)
  const target = getUnit(state, action.target)
  const dmg = expectedDamage(state, action)
  const remaining = target.hp + target.shield
  const effective = Math.min(dmg, remaining)
  const canKill = dmg >= remaining

  const enemies = state.units.filter((u) => u.alive && u.team !== actor.team)
  const threat = (u) => (Math.max(u.atk, u.mag) * u.spd) / 100
  const maxThreat = Math.max(...enemies.map(threat), 1)
  const barrierPenalty = target.barrier > 0 ? 0.5 : 0 // バリアがあると攻撃が無駄になる

  return effective / target.maxHp + (canKill ? 1 : 0) + 0.3 * (threat(target) / maxThreat) - barrierPenalty
}

function pickBest(actions, scoreFn) {
  let best = actions[0]
  let bestScore = -Infinity
  for (const a of actions) {
    const s = scoreFn(a)
    if (s > bestScore) {
      bestScore = s
      best = a
    }
  }
  return best
}

// ---- 盤面の有利さ(自分のチーム視点) ----
// チームの強さ = 残り体力の合計 × 1ターンあたりの攻撃力の合計(バリア・信仰値・クレストは少し加点)。
function unitPower(u) {
  const sk = u.skill
  const perHit = (refStatValue(u, sk) * sk.mult + (sk.add || 0)) * (1 + (u.critRate / 100) * (u.critDmg / 100))
  return (perHit * u.spd) / 100
}

function teamPower(state, team) {
  let hp = 0
  let power = 0
  let barriers = 0
  for (const u of state.units) {
    if (!u.alive || u.team !== team) continue
    hp += u.hp + u.shield
    power += unitPower(u)
    barriers += u.barrier
  }
  return hp * power * (1 + 0.08 * barriers)
}

function evaluate(state, team) {
  if (state.winner) {
    if (state.winner === 'draw') return 0
    let mine = 0
    let theirs = 0
    for (const u of state.units) {
      if (!u.alive) continue
      if (u.team === team) mine += (u.hp + u.shield) / u.maxHp
      else theirs += (u.hp + u.shield) / u.maxHp
    }
    return (state.winner === team ? 100 : -100) + (mine - theirs)
  }
  const enemy = team === 'A' ? 'B' : 'A'
  const power = Math.log((teamPower(state, team) + 1) / (teamPower(state, enemy) + 1))
  // 信仰値とクレストも、少しだけ価値があるものとして数える
  const faith = state.faith[team] - state.faith[enemy]
  const crests = state.crests[team].length - state.crests[enemy].length
  return power + 0.03 * faith + 0.12 * crests
}

// ---- レベル3: 特性は「盤面がよくなるなら使う」、攻撃は対象の評価で選ぶ ----
function chooseLv3(state, actions) {
  const skills = actions.filter((a) => a.type === 'skill')
  const traits = actions.filter((a) => a.type === 'trait' || a.type === 'evolve')
  const endAction = actions.find((a) => a.type === 'endTurn')
  const team = getActiveUnit(state).team

  if (traits.length) {
    const base = evaluate(state, team)
    let best = null
    let bestGain = TRAIT_MIN_GAIN
    for (const t of traits) {
      const gain = evaluate(applyAction(state, t, { expected: true }), team) - base
      if (gain > bestGain) {
        best = t
        bestGain = gain
      }
    }
    if (best) return best
  }
  return skills.length ? pickBest(skills, (a) => scoreTarget(state, a)) : endAction
}

// ---- レベル4: 先読み ----
function seededRng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 先読み中の動き方(軽い): 使える特性は全部使い、そのあと一番よい対象を攻撃する
function quickPolicy(state) {
  const actions = legalActions(state)
  const trait = actions.find((a) => a.type === 'trait' || a.type === 'evolve')
  if (trait) return trait
  const skills = actions.filter((a) => a.type === 'skill')
  return skills.length ? pickBest(skills, (a) => scoreTarget(state, a)) : actions[0]
}

function rollout(state, action, team, seed) {
  const opts = { rng: seededRng(seed) }
  let s = applyAction(state, action, opts)
  for (let i = 0; i < LOOKAHEAD && !s.winner; i++) s = applyAction(s, quickPolicy(s), opts)
  return evaluate(s, team)
}

function chooseLv4(state, actions) {
  const team = getActiveUnit(state).team
  const base = chooseLv3(state, actions)
  const candidates = actions.filter((a) => a.type !== 'endTurn' || !actions.some((x) => x.type === 'skill'))
  const seeds = Array.from({ length: SAMPLES }, () => Math.floor(Math.random() * 1e9))
  const value = (a) => seeds.reduce((sum, seed) => sum + rollout(state, a, team, seed), 0) / SAMPLES

  const baseValue = value(base)
  let best = base
  let bestValue = baseValue
  for (const a of candidates) {
    if (a === base) continue
    const v = value(a)
    if (v > bestValue) {
      bestValue = v
      best = a
    }
  }
  return bestValue > baseValue + MARGIN ? best : base
}

// 今の状態で、CPUが選ぶ行動を返す(特性を使ったあとも、同じキャラの番が続くので何度か呼ばれる)
export function chooseAction(state, level = 1, rng = Math.random) {
  const actions = legalActions(state)
  if (actions.length <= 1) return actions[0]

  const skills = actions.filter((a) => a.type === 'skill')
  const traits = actions.filter((a) => a.type === 'trait' || a.type === 'evolve')
  const endAction = actions.find((a) => a.type === 'endTurn')
  const anything = skills.length ? [...skills, ...traits] : [...traits, endAction].filter(Boolean)

  if (level <= 1) return pickRandom(anything, rng)
  if (level === 2) {
    if (rng() < MISTAKE_RATE_LV2) return pickRandom(anything, rng)
    if (traits.length && rng() < TRAIT_RATE_LV2) return pickRandom(traits, rng)
    return skills.length ? pickBest(skills, (a) => expectedDamage(state, a)) : endAction
  }
  if (level === 3) return chooseLv3(state, actions)
  return chooseLv4(state, actions)
}
