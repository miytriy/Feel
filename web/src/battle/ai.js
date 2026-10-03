// Feel Battle - CPUの頭脳(レベル1〜4)
import { legalActions, applyAction, calcDamage, getUnit, getActiveUnit } from './engine.js'

export const CPU_LEVELS = [
  { level: 1, name: 'かんたん', description: 'ランダムに攻撃する' },
  { level: 2, name: 'ふつう', description: 'ダメージの大きい相手を狙うが、ときどきミスをする' },
  { level: 3, name: 'つよい', description: '倒せる相手や危険な相手を優先する' },
  { level: 4, name: 'げきつよ', description: '数手先まで読んで選ぶ' },
]

// 期待ダメージ(クリティカルは確率の平均で計算)
function expectedDamage(state, action) {
  const actor = getActiveUnit(state)
  const target = getUnit(state, action.target)
  return calcDamage(actor, target, actor.skill, { expected: true }).damage
}

// レベル3の評価: 削れるHPの割合 + 倒せるボーナス + 相手の危険度
function scoreLv3(state, action) {
  const actor = getActiveUnit(state)
  const target = getUnit(state, action.target)
  const dmg = expectedDamage(state, action)
  const remaining = target.hp + target.shield
  const effective = Math.min(dmg, remaining)
  const canKill = dmg >= remaining

  const enemies = state.units.filter((u) => u.alive && u.team !== actor.team)
  const threat = (u) => (Math.max(u.atk, u.mag) * u.spd) / 100
  const maxThreat = Math.max(...enemies.map(threat), 1)

  return effective / target.maxHp + (canKill ? 1 : 0) + 0.3 * (threat(target) / maxThreat)
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

// レベル4用: 盤面の有利さ(自分のチーム視点)
// チームの強さ = 残り体力の合計 × 1ターンあたりの攻撃力の合計。
// 相手を倒すと攻撃力の合計が減るので、「倒す」「集中攻撃する」ことが自然に高く評価される。
function unitPower(u) {
  const sk = u.skill
  const ref = sk.stat === 'mag' ? u.mag : u.atk
  const perHit = (ref * sk.mult + (sk.add || 0)) * (1 + (u.critRate / 100) * (u.critDmg / 100))
  return (perHit * u.spd) / 100
}

function teamPower(state, team) {
  let hp = 0
  let power = 0
  for (const u of state.units) {
    if (!u.alive || u.team !== team) continue
    hp += u.hp + u.shield
    power += unitPower(u)
  }
  return hp * power
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
  return Math.log((teamPower(state, team) + 1) / (teamPower(state, enemy) + 1))
}

const MISTAKE_RATE_LV2 = 0.3 // レベル2がランダムに行動してしまう確率
const LOOKAHEAD = 150 // 最大何回先の行動まで読むか(ほぼ決着まで)
const SAMPLES = 8 // 乱数(クリティカル)を入れた試行の回数
const MARGIN = 5 // レベル3の選択より、これ以上よい点数のときだけ選び直す

// 同じ乱数の並びを使い回すための簡易乱数(どの行動も同じ条件で比べるため)
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

// 1つの行動を選んだあと、決着まで(双方がレベル3の動きをすると仮定して)試して点数をつける
function rollout(state, action, team, seed) {
  const opts = { rng: seededRng(seed) }
  let s = applyAction(state, action, opts)
  for (let i = 0; i < LOOKAHEAD && !s.winner; i++) {
    const pick = pickBest(legalActions(s), (x) => scoreLv3(s, x))
    s = applyAction(s, pick, opts)
  }
  return evaluate(s, team)
}

function chooseLv4(state) {
  const actions = legalActions(state)
  const team = getActiveUnit(state).team
  const base = pickBest(actions, (a) => scoreLv3(state, a)) // レベル3の選択

  const seeds = Array.from({ length: SAMPLES }, () => Math.floor(Math.random() * 1e9))
  const value = (a) => seeds.reduce((sum, seed) => sum + rollout(state, a, team, seed), 0) / SAMPLES

  const baseValue = value(base)
  let best = base
  let bestValue = baseValue
  for (const a of actions) {
    if (a === base) continue
    const v = value(a)
    if (v > bestValue) {
      bestValue = v
      best = a
    }
  }
  return bestValue > baseValue + MARGIN ? best : base
}

// 今の状態で、CPUが選ぶ行動を返す
export function chooseAction(state, level = 1, rng = Math.random) {
  const actions = legalActions(state)
  if (actions.length <= 1) return actions[0]

  if (level <= 1) return actions[Math.floor(rng() * actions.length)]
  if (level === 2) {
    if (rng() < MISTAKE_RATE_LV2) return actions[Math.floor(rng() * actions.length)]
    return pickBest(actions, (a) => expectedDamage(state, a))
  }
  if (level === 3) return pickBest(actions, (a) => scoreLv3(state, a))
  return chooseLv4(state)
}
