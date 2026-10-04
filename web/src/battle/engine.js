// Feel Battle - バトルの処理(段階2: 能力)
// 画面やFirebaseには依存しません。「状態 + 行動 → 新しい状態」の形で作ってあります。

const AV_BASE = 10000 // 初期行動値 = 10000 ÷ 速度
const ROUND_AV = 100 // 行動値が100進むごとに1ラウンド
const EPS = 1e-9
const MP_CAP = 10 // MPの最大値の上限(仮)
const MAX_TURNS = 1500 // これを超えたら引き分け(膠着対策)
const MAGIC_CONVERSION = 0.7 // 魔力参照の攻撃は、攻撃力の70%を魔力に変換する
const FINISHER_RATE = 0.35 // 必殺: 相手の現在HPの35%
const STATS = ['atk', 'mag', 'def', 'spd', 'critRate', 'critDmg', 'dmgResist']

// 画面表示用: キーワード能力の名前と説明
export const KEYWORDS = {
  guard: { label: '守護', desc: '相手は守護を持つキャラ以外を攻撃できない' },
  stealth: { label: '潜伏', desc: '相手の特性で選ばれず、攻撃もされない。攻撃するか能力でダメージを与えると失う' },
  aura: { label: 'オーラ', desc: '相手の能力で選ばれない' },
  intimidate: { label: '威圧', desc: '相手のスキルで選ばれない' },
  rush: { label: '突進', desc: '場に出たターンでもスキルを発動できる' },
  dash: { label: '疾走', desc: '場に出たターンでもスキルを発動できる。ラウンド開始時に行動順100%アップ' },
  finisher: { label: '必殺', desc: 'スキルでダメージを与えたとき、相手の現在HP35%の固定ダメージ(防御無視)' },
  drain: { label: 'ドレイン', desc: 'スキルで与えたダメージと同じだけ自身を回復' },
  barrier: { label: 'バリア', desc: '攻撃を一回0ダメージにして壊れる' },
}
export const TRIGGER_LABELS = {
  fanfare: 'ファンファーレ', constant: '常時', active: 'アクティブ', lastWord: 'ラストワード',
  onAttack: '攻撃時', onEngage: '交戦時', combo: 'コンボ',
}

// ---------- ユニットの作成 ----------

function makeUnit(def, team, index) {
  const s = def.stats
  const base = {
    atk: s.atk, mag: s.mag ?? 0, def: s.def, spd: s.spd,
    critRate: s.critRate ?? 5, critDmg: s.critDmg ?? 50, dmgResist: s.dmgResist ?? 0,
  }
  const passives = def.passives || []
  const keywords = passives.filter((p) => typeof p === 'string')
  const clone = (x) => JSON.parse(JSON.stringify(x))
  return {
    uid: `${team}${index}`, defId: def.id, name: def.name, class: def.class, team,
    maxHp: s.hp, hp: s.hp, shield: 0, shieldRate: 1,
    base, ...base,
    baseAV: AV_BASE / base.spd, curAV: AV_BASE / base.spd,
    skill: { ...def.skill },
    keywords,
    passiveObjs: clone(passives.filter((p) => typeof p === 'object')),
    traits: clone(def.traits || []),
    stealth: keywords.includes('stealth'),
    barrier: keywords.includes('barrier') ? 1 : 0,
    buffs: [], usedTraits: [],
    hasActed: false, alive: true, deathHandled: false, killedBy: null,
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
  const state = {
    units, totalAV: 0, round: 0, turns: 0, abilityCount: 0,
    mp: { A: 0, B: 0 }, mpMax: { A: 0, B: 0 },
    active: null, winner: null, log: ['バトル開始!'],
  }
  startRound(state)
  recalc(state)
  return advance(state)
}

export const getUnit = (state, uid) => state.units.find((u) => u.uid === uid)
export const getActiveUnit = (state) => (state.active ? getUnit(state, state.active) : null)
const hasKw = (u, k) => u.keywords.includes(k)
const alliesOf = (state, u) => state.units.filter((x) => x.alive && x.team === u.team)
const enemiesOf = (state, u) => state.units.filter((x) => x.alive && x.team !== u.team)
const abilityTargetable = (u) => u.alive && !u.stealth && !hasKw(u, 'aura')

// ---------- ステータスの再計算(バフ・常時・アクティブ) ----------

function recalc(state) {
  for (const u of state.units) {
    const mods = [...u.buffs]
    for (const p of u.passiveObjs) {
      if (p.trigger === 'constant' || (p.trigger === 'active' && u.uid === state.active)) {
        for (const e of p.effects) if (e.type === 'buff') mods.push(e)
      }
    }
    for (const stat of STATS) {
      let pct = 0
      let flat = 0
      for (const m of mods) {
        if (m.stat === stat) {
          pct += m.pct || 0
          flat += m.flat || 0
        }
      }
      u[stat] = Math.max(stat === 'spd' ? 1 : 0, (u.base[stat] + flat) * (1 + pct / 100))
    }
    // 速度が変わったら、行動までの進み具合は保ったまま行動値を調整する
    const newBase = AV_BASE / u.spd
    if (Math.abs(newBase - u.baseAV) > EPS) {
      u.curAV = u.curAV * (newBase / u.baseAV)
      u.baseAV = newBase
    }
  }
}

// ---------- ダメージ ----------

export function refStatValue(unit, skill) {
  return skill.stat === 'mag' ? unit.atk * MAGIC_CONVERSION + unit.mag : unit.atk
}

// opts.expected = true なら、クリティカルを確率の平均で計算する(CPUの思考用)
export function calcDamage(attacker, defender, skill, opts = {}) {
  const rng = opts.rng || Math.random
  const base = refStatValue(attacker, skill) * skill.mult + (skill.add || 0)

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

// 攻撃を受ける(バリアがあれば0ダメージにして壊れる)。実際に与えたダメージを返す
function applyDamage(state, source, target, amount) {
  if (!target.alive) return 0
  if (target.barrier > 0) {
    target.barrier = 0
    state.log.push(`${target.name}のバリアが攻撃を防いだ!`)
    return 0
  }
  dealDamage(target, amount)
  if (!target.alive) target.killedBy = source.uid
  return amount
}

function heal(state, unit, amount) {
  if (!unit.alive) return
  const before = unit.hp
  unit.hp = Math.min(unit.maxHp, unit.hp + amount)
  const gained = Math.round(unit.hp - before)
  if (gained > 0) state.log.push(`${unit.name}は${gained}回復した`)
}

// ---------- 効果の実行 ----------

function resolveTargets(state, source, key, ctx) {
  const rng = ctx.opts?.rng || Math.random
  const allies = alliesOf(state, source)
  const enemies = enemiesOf(state, source).filter(abilityTargetable)
  const pickRandom = (list) => (list.length ? [list[Math.floor(rng() * list.length)]] : [])
  switch (key) {
    case 'self': return [source]
    case 'opponent': return ctx.other && ctx.other.alive ? [ctx.other] : []
    case 'allies': return allies
    case 'otherAllies': return allies.filter((u) => u !== source)
    case 'allyOne': {
      if (ctx.chosen) return [getUnit(state, ctx.chosen)]
      return [[...allies].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]].filter(Boolean)
    }
    case 'enemies': return enemies
    case 'enemyOne': return ctx.chosen ? [getUnit(state, ctx.chosen)] : pickRandom(enemies)
    case 'enemyRandom': return pickRandom(enemies)
    default: return []
  }
}

function statLabel(stat) {
  return { atk: '攻撃力', mag: '魔力', def: '防御力', spd: '速度', critRate: 'クリティカルレート', critDmg: 'クリティカルダメージ', dmgResist: 'ダメージ耐性' }[stat] || stat
}

function runEffects(state, source, effects, ctx = {}) {
  for (const e of effects) {
    const targets = resolveTargets(state, source, e.target || 'self', ctx)
    for (const t of targets) {
      if (!t) continue
      switch (e.type) {
        case 'damage': {
          const skill = { stat: e.stat || 'atk', mult: e.mult ?? 1, add: e.add || 0, type: e.dmgType || 'physical' }
          const { damage } = calcDamage(source, t, skill, ctx.opts)
          const dealt = applyDamage(state, source, t, damage)
          source.stealth = false // 能力でダメージを与えたら潜伏を失う
          if (dealt > 0) state.log.push(`${source.name}の効果で${t.name}に${Math.round(dealt)}ダメージ`)
          break
        }
        case 'heal':
          heal(state, t, (e.stat === 'maxHp' ? source.maxHp : source.atk) * (e.mult ?? 1))
          break
        case 'buff':
          t.buffs.push({ stat: e.stat, pct: e.pct || 0, flat: e.flat || 0, turns: e.turns ?? null })
          state.log.push(`${t.name}の${statLabel(e.stat)}が上がった`)
          break
        case 'shield': {
          const amount = (e.stat === 'maxHp' ? source.maxHp : source.atk) * (e.mult ?? 1)
          t.shield += amount
          t.shieldRate = e.rate ?? 1
          state.log.push(`${t.name}は${Math.round(amount)}のシールドを得た`)
          break
        }
        case 'barrier':
          t.barrier = 1
          state.log.push(`${t.name}はバリアを得た`)
          break
        case 'advance':
          t.curAV = Math.max(0, t.curAV - (t.baseAV * (e.pct ?? 0)) / 100)
          state.log.push(`${t.name}の行動順が早まった`)
          break
        case 'mp':
          state.mp[source.team] = Math.min(state.mpMax[source.team], state.mp[source.team] + (e.amount ?? 1))
          break
        default:
          break
      }
    }
  }
  recalc(state)
}

// トリガー型パッシブ(ファンファーレ・攻撃時・交戦時・ラストワード)を発動する
function fire(state, trigger, unit, ctx = {}) {
  if (!unit.alive && trigger !== 'lastWord') return
  for (const p of unit.passiveObjs) {
    if (p.trigger !== trigger) continue
    state.log.push(`${unit.name}の【${p.name || TRIGGER_LABELS[trigger]}】`)
    runEffects(state, unit, p.effects, ctx)
  }
}

// 倒れたユニットの後始末(ラストワード)。連鎖して倒れた場合も処理する
function resolveDeaths(state, opts) {
  for (let i = 0; i < 50; i++) {
    const dead = state.units.filter((u) => !u.alive && !u.deathHandled)
    if (!dead.length) return
    for (const u of dead) {
      u.deathHandled = true
      u.buffs = []
      u.shield = 0
      u.barrier = 0
      u.stealth = false
      state.log.push(`${u.name}は倒れた`)
      const killer = u.killedBy ? getUnit(state, u.killedBy) : null
      fire(state, 'lastWord', u, { other: killer, opts })
    }
    recalc(state)
  }
}

// ---------- 行動の一覧 ----------

export function attackableTargets(state, actor) {
  const candidates = enemiesOf(state, actor).filter((u) => !u.stealth && !hasKw(u, 'intimidate'))
  const guards = candidates.filter((u) => hasKw(u, 'guard'))
  return guards.length ? guards : candidates
}

function traitTargets(state, actor, trait) {
  switch (trait.target) {
    case 'allyOne': return alliesOf(state, actor).map((u) => u.uid)
    case 'enemyOne': return enemiesOf(state, actor).filter(abilityTargetable).map((u) => u.uid)
    case 'enemies': return enemiesOf(state, actor).some(abilityTargetable) ? [null] : []
    default: return [null]
  }
}

// 今行動するユニットが選べる行動の一覧
//  skill = スキル攻撃(ターン終了) / trait = 特性(MPを使う。ターンは続く) / endTurn = 何もせず終える
export function legalActions(state) {
  const actor = getActiveUnit(state)
  if (!actor || state.winner || !actor.alive) return []
  const actions = []
  const canUseSkill = actor.hasActed || hasKw(actor, 'rush') || hasKw(actor, 'dash')
  const targets = attackableTargets(state, actor)
  if (canUseSkill) for (const t of targets) actions.push({ type: 'skill', target: t.uid })

  for (const tr of actor.traits) {
    if (actor.usedTraits.includes(tr.id)) continue // 同じ特性は1ターンに1回
    if (state.mp[actor.team] < tr.cost) continue
    for (const target of traitTargets(state, actor, tr)) actions.push({ type: 'trait', trait: tr.id, target })
  }
  if (!canUseSkill || targets.length === 0) actions.push({ type: 'endTurn' })
  return actions
}

const sameAction = (a, b) =>
  a.type === b.type && (a.target ?? null) === (b.target ?? null) && (a.trait ?? null) === (b.trait ?? null)

// ---------- ターンとラウンドの進行 ----------

function startRound(state) {
  state.round += 1
  for (const team of ['A', 'B']) {
    state.mpMax[team] = Math.min(MP_CAP, state.mpMax[team] + 1)
    state.mp[team] = state.mpMax[team]
  }
  for (const u of state.units) {
    if (u.alive && hasKw(u, 'dash')) u.curAV = Math.max(0, u.curAV - u.baseAV) // 疾走: 行動順100%アップ
  }
}

function beginTurn(state, unit, opts) {
  state.abilityCount = 0
  unit.usedTraits = []
  recalc(state) // アクティブ(自ターン中だけ有効)をここで反映
  if (!unit.hasActed) fire(state, 'fanfare', unit, { opts }) // 入場ターン開始時
  resolveDeaths(state, opts)
}

function endTurn(state, actor) {
  actor.hasActed = true
  actor.curAV = actor.baseAV
  actor.buffs = actor.buffs
    .map((b) => ({ ...b, turns: b.turns == null ? null : b.turns - 1 }))
    .filter((b) => b.turns == null || b.turns > 0)
  state.turns += 1
  state.active = null
  recalc(state)
}

function checkWinner(state) {
  const aAlive = state.units.some((u) => u.team === 'A' && u.alive)
  const bAlive = state.units.some((u) => u.team === 'B' && u.alive)
  if (aAlive && bAlive) return null
  if (aAlive) return 'A'
  if (bAlive) return 'B'
  return 'draw'
}

// 次に行動するユニットを決める。選べる行動がない(終了のみ)ときは自動で飛ばす
function advance(state, opts) {
  for (let guard = 0; guard < 3000; guard++) {
    const winner = checkWinner(state)
    if (winner) {
      state.winner = winner
      state.active = null
      return state
    }
    if (state.turns > MAX_TURNS) {
      state.log.push('決着がつかないため、引き分けになりました')
      state.winner = 'draw'
      state.active = null
      return state
    }
    const alive = state.units.filter((u) => u.alive)
    let next = alive[0]
    for (const u of alive) {
      if (u.curAV < next.curAV - EPS || (Math.abs(u.curAV - next.curAV) <= EPS && u.spd > next.spd)) next = u
    }

    // ラウンドの境目が先に来るなら、先にラウンドを進める
    const toBoundary = state.round * ROUND_AV - state.totalAV
    if (toBoundary <= next.curAV + EPS) {
      for (const u of alive) u.curAV = Math.max(0, u.curAV - toBoundary)
      state.totalAV += toBoundary
      startRound(state)
      continue
    }

    const elapsed = Math.max(0, next.curAV)
    for (const u of alive) u.curAV = Math.max(0, u.curAV - elapsed)
    state.totalAV += elapsed
    state.active = next.uid
    beginTurn(state, next, opts)

    if (checkWinner(state)) continue
    if (!next.alive) {
      state.active = null
      recalc(state)
      continue
    }
    const actions = legalActions(state)
    if (actions.length === 1 && actions[0].type === 'endTurn') {
      state.log.push(`${next.name}は様子を見ている(入場直後はスキルを使えない)`)
      endTurn(state, next)
      continue
    }
    return state
  }
  throw new Error('バトルが終わりませんでした')
}

// ---------- 行動の実行 ----------

function doSkill(state, actor, targetUid, opts) {
  const target = getUnit(state, targetUid)
  const skill = actor.skill
  actor.stealth = false // 攻撃したら潜伏を失う

  // 攻撃時・交戦時の能力(ダメージ計算の前に働く)
  fire(state, 'onAttack', actor, { other: target, opts })
  fire(state, 'onEngage', actor, { other: target, opts })
  fire(state, 'onEngage', target, { other: actor, opts })
  recalc(state)

  const { damage, isCrit } = calcDamage(actor, target, skill, opts)
  const dealt = applyDamage(state, actor, target, damage)
  if (dealt > 0) {
    state.log.push(`${actor.name}の「${skill.name}」! ${target.name}に${Math.round(dealt)}ダメージ${isCrit ? '(クリティカル!)' : ''}`)
    let total = dealt
    if (hasKw(actor, 'finisher') && target.alive) {
      const fixed = Math.floor(target.hp * FINISHER_RATE)
      if (fixed > 0) {
        dealDamage(target, fixed)
        if (!target.alive) target.killedBy = actor.uid
        total += fixed
        state.log.push(`【必殺】${target.name}に追加で${fixed}の固定ダメージ`)
      }
    }
    if (hasKw(actor, 'drain')) heal(state, actor, total)
  } else {
    state.log.push(`${actor.name}の「${skill.name}」!`)
  }
  resolveDeaths(state, opts)
}

function doTrait(state, actor, action, opts) {
  const trait = actor.traits.find((t) => t.id === action.trait)
  state.mp[actor.team] -= trait.cost
  actor.usedTraits.push(trait.id)
  state.abilityCount += 1
  state.log.push(`${actor.name}の特性【${trait.name}】(MP${trait.cost})`)
  runEffects(state, actor, trait.effects, { opts, chosen: action.target })
  for (const p of actor.passiveObjs) {
    if (p.trigger === 'combo' && p.min === state.abilityCount) {
      state.log.push(`${actor.name}の【${p.name || 'コンボ'}】(${state.abilityCount}コンボ)`)
      runEffects(state, actor, p.effects, { opts })
    }
  }
  resolveDeaths(state, opts)
}

// 行動を実行して、次の行動待ちの状態を返す(元の状態は書き換えない)
//  特性を使った場合は、同じユニットのターンが続く
export function applyAction(prev, action, opts = {}) {
  if (prev.winner || !prev.active) return prev
  const state = structuredClone(prev)
  const actor = getActiveUnit(state)
  if (!legalActions(state).some((a) => sameAction(a, action))) throw new Error('その行動は選べません')

  if (action.type === 'skill') {
    doSkill(state, actor, action.target, opts)
    endTurn(state, actor)
    return advance(state, opts)
  }
  if (action.type === 'trait') {
    doTrait(state, actor, action, opts)
    if (checkWinner(state) || !actor.alive) return advance(state, opts)
    const actions = legalActions(state)
    if (actions.length === 1 && actions[0].type === 'endTurn') {
      endTurn(state, actor)
      return advance(state, opts)
    }
    return state
  }
  state.log.push(`${actor.name}はターンを終えた`)
  endTurn(state, actor)
  return advance(state, opts)
}
