// Feel Battle - バトルの処理(段階4: アーマー・墓場・召喚物・アミュレット・遺物 を追加。段階3までの進化・EP・信仰値・カウントダウン・クレスト・連携・奥義・アクセラレートを含む)
// 画面やFirebaseには依存しません。「状態 + 行動 → 新しい状態」の形で作ってあります。

const AV_BASE = 10000 // 初期行動値 = 10000 ÷ 速度
const ROUND_AV = 100 // 行動値が100進むごとに1ラウンド
const EPS = 1e-9
const MP_CAP = 10 // MPの最大値の上限
const EP_MAX = 2 // EPの最大ストック
const EP_GRANT_ROUND = 5 // このラウンドの開始時にEPをもらう
const EP_GRANT = 2 // もらえるEPの数
const CREST_MAX = 5 // クレストを置ける数
const ULTIMATE_GAUGE = 10 // 奥義ゲージがこの値以上のとき【奥義】が働く
const LIBERATION_GAUGE = 15 // 奥義ゲージがこの値以上のとき【解放奥義】が働く
const MAX_ACTIONS_PER_TURN = 30 // 1ターンに使える特性・進化の回数の安全上限
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
  onAttack: '攻撃時', onEngage: '交戦時', combo: 'コンボ', onEvolve: '進化時',
  roundStart: 'ラウンド開始時', allyTurnStart: '味方のターン開始時', link: '連携',
}

// ---------- 遺物(頭・胴・脚・靴のセットを装備したキャラに、セット効果がつく) ----------
// pct = 元のステータスに対する+%、flat = そのまま足す値(少女の物語は%ではなく、耐性値+10)
export const RELICS = {
  'ピエロの祝福': { desc: '攻撃力 +12%', mods: [{ stat: 'atk', pct: 12 }] },
  '鬼の形相': { desc: 'HP +21%', mods: [{ stat: 'hp', pct: 21 }] },
  '月と太陽の印字': { desc: '魔力 +13%', mods: [{ stat: 'mag', pct: 13 }] },
  '紅血の証': { desc: '防御力 +29%', mods: [{ stat: 'def', pct: 29 }] },
  '少女の物語': { desc: 'ダメージ耐性値 +10', mods: [{ stat: 'dmgResist', flat: 10 }] },
}

// ---------- ユニットの作成 ----------

// アクセラレート: キャラ本体とは別の速度をもつ特性(行動バーに本体とは別の枠として並ぶ)
function makeAccel(a) {
  const av = AV_BASE / a.speed
  return { ...JSON.parse(JSON.stringify(a)), id: a.id || 'accelerate', speed: a.speed, baseAV: av, curAV: av }
}

function makeUnit(def, team, index, field = 'main', uid = null) {
  const s = { ...def.stats }
  const base = {
    atk: s.atk, mag: s.mag ?? 0, def: s.def, spd: s.spd,
    critRate: s.critRate ?? 5, critDmg: s.critDmg ?? 50, dmgResist: s.dmgResist ?? 0,
  }
  // 遺物のセット効果(def.relic に遺物の名前を書く)を、元のステータスに反映する
  const relic = def.relic ? RELICS[def.relic] : null
  if (def.relic && !relic) throw new Error(`知らない遺物です: ${def.relic}`)
  for (const m of relic ? relic.mods : []) {
    const cur = m.stat === 'hp' ? s.hp : base[m.stat]
    const next = Math.round(cur * (1 + (m.pct || 0) / 100) + (m.flat || 0))
    if (m.stat === 'hp') s.hp = next
    else base[m.stat] = next
  }
  const passives = def.passives || []
  const keywords = passives.filter((p) => typeof p === 'string')
  const clone = (x) => JSON.parse(JSON.stringify(x))
  return {
    uid: uid || `${team}${index}`, defId: def.id, name: def.name, class: def.class, team, relic: def.relic || null,
    field, // 'main' = 場のキャラ / 'summon' = 召喚物フィールドの召喚物・アミュレット
    isAmulet: field === 'summon' && !!def.amulet, // アミュレット: スキル攻撃はできず、相手のスキル攻撃の対象にもならない
    maxHp: s.hp, baseMaxHp: s.hp, hp: s.hp, armor: 0, armorRate: 1,
    base, ...base,
    baseAV: AV_BASE / base.spd, curAV: AV_BASE / base.spd,
    skill: { ...def.skill },
    keywords,
    passiveObjs: clone(passives.filter((p) => typeof p === 'object')),
    traits: clone(def.traits || []),
    stealth: keywords.includes('stealth'),
    barrier: keywords.includes('barrier') ? 1 : 0,
    evolvable: field === 'main' && def.evolvable !== false, evolved: false,
    accel: def.accelerate ? makeAccel(def.accelerate) : null,
    countdown: def.countdown ?? null,
    comboCount: 0,
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
    units, totalAV: 0, round: 0, turns: 0, actionsThisTurn: 0,
    mp: { A: 0, B: 0 }, mpMax: { A: 0, B: 0 }, ep: { A: 0, B: 0 },
    faith: { A: 0, B: 0 }, crests: { A: [], B: [] }, graveyard: { A: 0, B: 0 },
    link: { A: 0, B: 0 }, traitCount: { A: 0, B: 0 }, summonSeq: 0, pending: null,
    active: null, activeKind: null, winner: null, log: ['バトル開始!'],
  }
  startRound(state)
  recalc(state)
  return advance(state)
}

export const getUnit = (state, uid) => state.units.find((u) => u.uid === uid)
export const getActiveUnit = (state) => (state.active ? getUnit(state, state.active) : null)
const hasKw = (u, k) => u.keywords.includes(k)
// 「味方」「相手」は場のキャラのこと。召喚物は専用の指定(summons)で選ぶ
const alliesOf = (state, u) => state.units.filter((x) => x.alive && x.field === 'main' && x.team === u.team)
const enemiesOf = (state, u) => state.units.filter((x) => x.alive && x.field === 'main' && x.team !== u.team)
const summonsOf = (state, u) => state.units.filter((x) => x.alive && x.field === 'summon' && x.team === u.team)
const SUMMON_MAX = 5 // 召喚物フィールドは最大5体
const abilityTargetable = (u) => u.alive && !u.stealth && !hasKw(u, 'aura')
// 単体を選ぶ能力の候補: 相手の場のキャラ + 相手のアミュレット(アミュレットは、単体指定の能力で消滅させられる)
const enemyOneList = (state, u) => [
  ...enemiesOf(state, u).filter(abilityTargetable),
  ...state.units.filter((x) => x.alive && x.field === 'summon' && x.isAmulet && x.team !== u.team),
]

// 奥義ゲージ = 現在のターン数(ラウンド数) + 特性の発動回数(チーム全体)
export const gaugeOf = (state, team) => state.round + state.traitCount[team]

// 条件: graveyard(墓場の下限) faith(信仰値の下限) hpBelow/hpAbove(HP%) evolved(進化済みか) crests(クレストの数の下限)
//       link(連携の下限) gauge(奥義ゲージの下限) ultimate(奥義: ゲージ10以上) liberation(解放奥義: ゲージ15以上)
function checkCond(state, unit, c) {
  if (!c) return true
  if (c.link != null && state.link[unit.team] < c.link) return false
  if (c.gauge != null && gaugeOf(state, unit.team) < c.gauge) return false
  if (c.ultimate && gaugeOf(state, unit.team) < ULTIMATE_GAUGE) return false
  if (c.liberation && gaugeOf(state, unit.team) < LIBERATION_GAUGE) return false
  if (c.faith != null && state.faith[unit.team] < c.faith) return false
  if (c.graveyard != null && state.graveyard[unit.team] < c.graveyard) return false
  if (c.hpBelow != null && (unit.hp / unit.maxHp) * 100 > c.hpBelow) return false
  if (c.hpAbove != null && (unit.hp / unit.maxHp) * 100 < c.hpAbove) return false
  if (c.evolved != null && unit.evolved !== c.evolved) return false
  if (c.crests != null && state.crests[unit.team].length < c.crests) return false
  if (c.combo != null && unit.comboCount < c.combo) return false // コンボ: 味方の特性が使われた回数(自分の前のターンが終わってから)
  return true
}

// クレストの効果を出す役(置いたキャラ。倒れていたら味方の誰か)
function crestSource(state, crest) {
  const src = getUnit(state, crest.sourceUid)
  if (src && src.alive) return src
  return state.units.find((u) => u.alive && u.team === crest.team) || null
}

// ---------- ステータスの再計算(バフ・常時・アクティブ・クレスト) ----------

function recalc(state) {
  // クレストの常時効果(味方全体 / 相手全体へのバフ)
  const crestMods = new Map()
  for (const team of ['A', 'B']) {
    for (const crest of state.crests[team]) {
      const src = crestSource(state, crest)
      if (!src) continue
      for (const p of crest.passives) {
        if (p.trigger !== 'constant' || !checkCond(state, src, p.condition)) continue
        const targets = state.units.filter((u) => u.alive && (p.target === 'enemies' ? u.team !== team : u.team === team))
        for (const e of p.effects) {
          if (e.type !== 'buff') continue
          for (const u of targets) crestMods.set(u.uid, [...(crestMods.get(u.uid) || []), e])
        }
      }
    }
  }
  for (const u of state.units) {
    const mods = [...u.buffs, ...(crestMods.get(u.uid) || [])]
    for (const p of u.passiveObjs) {
      if (!(p.trigger === 'constant' || (p.trigger === 'active' && u.uid === state.active))) continue
      if (!checkCond(state, u, p.condition)) continue
      for (const e of p.effects) if (e.type === 'buff') mods.push(e)
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

// アーマーがあれば、吸収レートの分だけ先にアーマーが受ける
// 例: 吸収レート60%なら、ダメージの60%をアーマーが受け、体力は残り40%分を受ける
//     アーマーが足りなければ、あふれた分は体力が受ける
// 確定ダメージ(isTrue)は、アーマーに対するダメージが元の50%に減る
const TRUE_VS_ARMOR = 0.5
function dealDamage(target, dmg, isTrue = false) {
  const mult = isTrue ? TRUE_VS_ARMOR : 1
  const toArmor = dmg * target.armorRate // アーマーが受け持つ分
  const covered = Math.min(toArmor, target.armor / mult) // アーマーで止められるダメージ
  target.armor -= covered * mult
  target.hp -= dmg - covered
  if (target.hp <= 0) {
    target.hp = 0
    target.alive = false
  }
}

// 攻撃を受ける(バリアがあれば0ダメージにして壊れる)。実際に与えたダメージを返す
function applyDamage(state, source, target, amount, isTrue = false) {
  if (!target.alive) return 0
  if (target.isAmulet) return 0 // アミュレットには体力がなく、ダメージを受けない(なくなるのは、破壊・消滅・カウントダウンだけ)
  if (target.barrier > 0) {
    target.barrier = 0
    state.log.push(`${target.name}のバリアが攻撃を防いだ!`)
    return 0
  }
  dealDamage(target, amount, isTrue)
  if (!target.alive) target.killedBy = source.uid
  if (target.field === 'main') state.graveyard[target.team] += GRAVE_PER_HIT // 攻撃をされると墓場が溜まる
  return amount
}

function heal(state, unit, amount) {
  if (!unit.alive || unit.isAmulet) return
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
    case 'otherAllyOne': {
      const others = allies.filter((u) => u !== source)
      if (ctx.chosen) return others.filter((u) => u.uid === ctx.chosen)
      return others.slice(0, 1) // 選ばれなかった(CPUの読み・テストなど)ときは先頭の1体
    }
    case 'summons': return summonsOf(state, source)
    case 'allyField': return [...allies, ...summonsOf(state, source)] // 自分の場すべて(場のキャラ + 召喚物)
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

// クレストを置く(最大5つ、同名は置けない)
function placeCrest(state, source, def) {
  const area = state.crests[source.team]
  if (area.length >= CREST_MAX) {
    state.log.push(`クレストは${CREST_MAX}つまでしか置けない(【${def.name}】は置けなかった)`)
    return
  }
  if (area.some((c) => c.name === def.name)) {
    state.log.push(`同名のクレスト【${def.name}】は置けない`)
    return
  }
  const crest = JSON.parse(JSON.stringify(def))
  crest.passives = crest.passives || []
  crest.countdown = def.countdown ?? null
  crest.sourceUid = source.uid
  crest.team = source.team
  area.push(crest)
  state.log.push(`クレスト【${def.name}】を置いた`)
}

// 墓場: 攻撃を受けるたびに+1、キャラが倒されると+3(チーム共有)
const GRAVE_PER_HIT = 1
const GRAVE_PER_DEATH = 3
// 効果の perGraveyard が指定されていれば、墓場1つにつきその分だけ効果が大きくなる
const graveBonus = (state, source, e) => (e.perGraveyard || 0) * state.graveyard[source.team]

// 召喚: 召喚物フィールド(最大5体)に出す。満員なら出せない
function summon(state, source, def) {
  if (summonsOf(state, source).length >= SUMMON_MAX) {
    state.log.push(`召喚物フィールドが満員で、${def.name}は出せなかった`)
    return null
  }
  state.summonSeq += 1
  const u = makeUnit(def, source.team, 0, 'summon', `${source.team}s${state.summonSeq}`)
  state.units.push(u)
  state.log.push(`${source.name}は${def.name}を${u.isAmulet ? '設置' : '召喚'}した`)
  recalc(state)
  return u
}

// 選択が必要な効果(choose: true)の、選べる対象の一覧
function candidatesOf(state, source, e) {
  const key = e.target || 'self'
  if (key === 'otherAllyOne') return alliesOf(state, source).filter((u) => u.uid !== source.uid)
  if (key === 'allyOne') return alliesOf(state, source)
  if (key === 'enemyOne') return enemyOneList(state, source)
  return resolveTargets(state, source, key, {})
}

// 候補が0体 → 何もしない / 1体 → 自動で選ぶ / 2体以上 → state.pending に残して、選ばれるまで待つ(ファンファーレのときだけ)
function runEffects(state, source, effects, ctx = {}) {
  for (let idx = 0; idx < effects.length; idx++) {
    const e = effects[idx]
    if (e.condition && !checkCond(state, source, e.condition)) continue
    if (e.optional) { // 「追加でMPを消費すると〜」のように、使うかどうかを選べる効果
      if (ctx.answer === undefined) {
        if (e.mpCost && state.mp[source.team] < e.mpCost) { state.log.push(`MPが足りないので、追加の効果はなし`); continue }
        if (ctx.allowPending) {
          state.pending = { uid: source.uid, effects: effects.slice(idx), candidates: ['yes', 'no'], confirm: true, prompt: e.prompt || '追加の効果を使いますか?', trigger: ctx.trigger || null, nextPassive: ctx.nextPassive ?? null }
          state.log.push(`${source.name}の効果: ${state.pending.prompt}`)
          recalc(state)
          return
        }
      } else {
        const ans = ctx.answer
        ctx = { ...ctx, answer: undefined }
        if (ans === 'no') continue
      }
    }
    if (e.choose && !ctx.chosen && ctx.allowPending) {
      const cands = candidatesOf(state, source, e)
      if (cands.length === 0) { state.log.push(`${source.name}の効果の対象がいなかった`); continue }
      if (cands.length > 1) {
        // 選んでもらうために止まる(残りの効果と、あとに続くパッシブは、選ばれたあとに続けて行う)
        state.pending = { uid: source.uid, effects: effects.slice(idx), candidates: cands.map((u) => u.uid), trigger: ctx.trigger || null, nextPassive: ctx.nextPassive ?? null }
        state.log.push(`${source.name}の効果: 対象を選んでください`)
        recalc(state)
        return
      }
      ctx = { ...ctx, chosen: cands[0].uid } // 1体だけなら自動で選ぶ
    }

    // チーム全体に関わる効果(対象を選ばない)
    if (e.type === 'faith') {
      const next = Math.max(0, state.faith[source.team] + (e.amount ?? 1))
      state.log.push(`信仰値が${(e.amount ?? 1) >= 0 ? '+' : ''}${e.amount ?? 1}(${next})`)
      state.faith[source.team] = next
      continue
    }
    if (e.type === 'graveyard') {
      const amount = e.amount ?? 1
      const next = Math.max(0, state.graveyard[source.team] + amount)
      state.log.push(`墓場が${amount >= 0 ? '+' : ''}${amount}(${next})`)
      state.graveyard[source.team] = next
      continue
    }
    if (e.type === 'summon') {
      if (e.mpCost) { // 追加でMPを消費すると働く効果(MPが足りなければ働かない)
        if (state.mp[source.team] < e.mpCost) { state.log.push(`MPが足りないので、${e.unit.name}の追加召喚はなし`); continue }
        state.mp[source.team] -= e.mpCost
        state.log.push(`MPを${e.mpCost}消費して、追加で召喚する`)
      }
      for (let i = 0; i < (e.count ?? 1); i++) summon(state, source, e.unit)
      continue
    }
    if (e.type === 'crest') {
      placeCrest(state, source, e.crest)
      continue
    }
    if (e.type === 'ep') {
      state.ep[source.team] = Math.min(EP_MAX, state.ep[source.team] + (e.amount ?? 1))
      continue
    }
    if (e.type === 'mp') {
      state.mp[source.team] = Math.min(state.mpMax[source.team], state.mp[source.team] + (e.amount ?? 1))
      continue
    }

    const targets = resolveTargets(state, source, e.target || 'self', ctx)
    for (const t of targets) {
      if (!t) continue
      switch (e.type) {
        case 'damage': {
          const skill = { stat: e.stat || 'atk', mult: e.mult ?? 1, add: (e.add || 0) + graveBonus(state, source, e), type: e.dmgType || 'physical' }
          const { damage } = calcDamage(source, t, skill, ctx.opts)
          const dealt = applyDamage(state, source, t, damage, skill.type === 'true')
          source.stealth = false // 能力でダメージを与えたら潜伏を失う
          if (dealt > 0) state.log.push(`${source.name}の効果で${t.name}に${Math.round(dealt)}ダメージ`)
          break
        }
        case 'heal':
          heal(state, t, (e.flat ?? (e.stat === 'maxHp' ? source.maxHp : source.atk) * (e.mult ?? 1)) + graveBonus(state, source, e))
          break
        case 'buff':
          t.buffs.push({ stat: e.stat, pct: (e.pct || 0) + graveBonus(state, source, e), flat: e.flat || 0, turns: e.turns ?? null })
          state.log.push(`${t.name}の${statLabel(e.stat)}が上がった`)
          break
        case 'loseHp': { // 現在体力を直接減らす(ダメージではないので、防御・アーマー・バリアは関係なく、墓場も増えない)
          if (t.isAmulet || !t.alive) break
          const before = t.hp
          t.hp = Math.max(0, t.hp - (e.amount || 0))
          state.log.push(`${t.name}の現在体力が${Math.round(before - t.hp)}減った`)
          if (t.hp <= 0) { t.alive = false; t.killedBy = source.uid }
          break
        }
        case 'maxHp': { // 最大HPを元のHPの+%だけ増やす(現在HPも同じだけ増える。アミュレットには体力がない)
          if (t.isAmulet) break
          const up = Math.round((t.baseMaxHp * (e.pct || 0)) / 100)
          t.maxHp += up
          t.hp += up
          state.log.push(`${t.name}の最大HPが${up}増えた`)
          break
        }
        case 'armor':
        case 'shield': { // 'shield' は昔の書き方(アーマーと同じ)
          const amount = (e.flat ?? (e.stat === 'maxHp' ? source.maxHp : source.atk) * (e.mult ?? 1)) + graveBonus(state, source, e)
          t.armor += amount
          t.armorRate = e.rate ?? 1
          state.log.push(`${t.name}は${Math.round(amount)}のアーマーを得た(吸収${Math.round((e.rate ?? 1) * 100)}%)`)
          break
        }
        case 'barrier':
          t.barrier = 1
          state.log.push(`${t.name}はバリアを得た`)
          break
        case 'loseKeyword': { // キーワード能力(守護など)を失わせる
          const k = e.keyword || 'guard'
          if (t.keywords.includes(k)) {
            t.keywords = t.keywords.filter((x) => x !== k)
            state.log.push(`${t.name}は【${KEYWORDS[k]?.label || k}】を失った`)
          } else state.log.push(`${t.name}は【${KEYWORDS[k]?.label || k}】を持っていなかった`)
          break
        }
        case 'vanish': // 消滅させる(破壊とは違い、墓場に行かず、ラストワードも働かない)
          if (t.alive) {
            t.alive = false; t.deathHandled = true; t.hp = 0
            t.buffs = []; t.armor = 0; t.barrier = 0; t.stealth = false
            state.log.push(`${t.name}は消滅した`)
          }
          break
        case 'destroy': // 破壊する(召喚物の「自身を破壊」など)
          if (t.alive) { t.hp = 0; t.alive = false; state.log.push(`${t.name}は破壊された`) }
          break
        case 'reenter': // 入場し直す: 入場直後の状態に戻る(次の自分のターン開始時にファンファーレがもう一度働き、そのターンはスキル攻撃ができない)
          t.hasActed = false
          t.comboCount = 0
          state.log.push(`${t.name}は入場し直した`)
          break
        case 'advance':
          t.curAV = Math.max(0, t.curAV - (t.baseAV * (e.pct ?? 0)) / 100)
          state.log.push(`${t.name}の行動順が早まった`)
          break
        default:
          break
      }
    }
  }
  recalc(state)
}

// トリガー型パッシブ(ファンファーレ・攻撃時・交戦時・進化時・ラストワード)を発動する
function fire(state, trigger, unit, ctx = {}, from = 0) {
  if (!unit.alive && trigger !== 'lastWord') return
  for (let i = from; i < unit.passiveObjs.length; i++) {
    const p = unit.passiveObjs[i]
    if (p.trigger !== trigger || !checkCond(state, unit, p.condition)) continue
    state.log.push(`${unit.name}の【${p.name || TRIGGER_LABELS[trigger]}】`)
    runEffects(state, unit, p.effects, { ...ctx, trigger, nextPassive: i + 1 })
    if (state.pending) return // 選ぶのを待つ。続きは、選ばれたあとに行う
  }
}

// クレストのトリガー(ラウンド開始時・味方のターン開始時)
function fireCrests(state, team, trigger, subject, opts) {
  for (const crest of [...state.crests[team]]) {
    for (const p of crest.passives) {
      if (p.trigger !== trigger) continue
      const source = trigger === 'allyTurnStart' ? subject : crestSource(state, crest)
      if (!source || !checkCond(state, source, p.condition)) continue
      state.log.push(`クレスト【${crest.name}】が働いた`)
      runEffects(state, source, p.effects, { opts })
    }
  }
}

// クレストのカウントダウンを1つ進める(0になったら消える)
function tickCrest(state, crest) {
  if (crest.countdown == null) return
  crest.countdown -= 1
  if (crest.countdown <= 0) {
    state.crests[crest.team] = state.crests[crest.team].filter((c) => c !== crest)
    state.log.push(`クレスト【${crest.name}】は役目を終えて消えた`)
    recalc(state) // クレストの常時効果がなくなった分を反映
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
      u.armor = 0
      u.barrier = 0
      u.stealth = false
      state.log.push(`${u.name}は倒れた`)
      if (u.field === 'main') state.graveyard[u.team] += GRAVE_PER_DEATH // 倒されると墓場が大きく増える
      const killer = u.killedBy ? getUnit(state, u.killedBy) : null
      fire(state, 'lastWord', u, { other: killer, opts })
    }
    recalc(state)
  }
}

// ---------- 行動の一覧 ----------

export function attackableTargets(state, actor) {
  // スキル攻撃は、相手の場のキャラと召喚物を選べる(アミュレットは選べない)
  const candidates = state.units.filter(
    (u) => u.alive && u.team !== actor.team && !u.isAmulet && !u.stealth && !hasKw(u, 'intimidate')
  )
  const guards = candidates.filter((u) => hasKw(u, 'guard'))
  return guards.length ? guards : candidates
}

function traitTargets(state, actor, trait) {
  switch (trait.target) {
    case 'allyOne': return alliesOf(state, actor).map((u) => u.uid)
    case 'otherAllyOne': return alliesOf(state, actor).filter((u) => u.uid !== actor.uid).map((u) => u.uid)
    case 'enemyOne': return enemyOneList(state, actor).map((u) => u.uid)
    case 'enemies': return enemiesOf(state, actor).some(abilityTargetable) ? [null] : []
    default: return [null]
  }
}

function accelActions(state, actor) {
  const ac = actor.accel
  const list = []
  if (state.mp[actor.team] >= (ac.cost ?? 0) && checkCond(state, actor, ac.condition)) {
    for (const target of traitTargets(state, actor, ac)) list.push({ type: 'accelerate', trait: ac.id, target })
  }
  return list
}

// 今行動するユニットが選べる行動の一覧
//  skill = スキル攻撃(ターン終了) / trait = 特性(MPを使う。ターンは続く)
//  evolve = 進化(EPを使う。ターンは続く) / endTurn = 何もせず終える
//  accelerate = アクセラレートの実行(アクセラレートの番のときだけ。実行すると本体の行動を消費する)
export function legalActions(state) {
  const actor = getActiveUnit(state)
  if (!actor || state.winner || !actor.alive) return []
  // 効果の対象を選ぶ場面(ファンファーレなど): 選べる対象だけが行動になる
  if (state.pending) return state.pending.candidates.map((uid) => ({ type: 'choose', target: uid }))
  // アクセラレートの番: 実行する(特性を使う) か、見送る(endTurn)
  if (state.activeKind === 'accel') return [...accelActions(state, actor), { type: 'endTurn' }]
  const actions = []
  const canUseSkill = !actor.isAmulet && (actor.hasActed || hasKw(actor, 'rush') || hasKw(actor, 'dash'))
  const targets = attackableTargets(state, actor)
  if (canUseSkill) for (const t of targets) actions.push({ type: 'skill', target: t.uid })

  if (state.actionsThisTurn < MAX_ACTIONS_PER_TURN) {
    for (const tr of actor.traits) {
      if (!tr.repeatable && actor.usedTraits.includes(tr.id)) continue // 同じ特性は1ターンに1回(連続使用できる特性は除く)
      if (state.mp[actor.team] < tr.cost) continue
      if (!checkCond(state, actor, tr.condition)) continue
      for (const target of traitTargets(state, actor, tr)) actions.push({ type: 'trait', trait: tr.id, target })
    }
    if (actor.evolvable && !actor.evolved && state.ep[actor.team] >= 1) actions.push({ type: 'evolve' })
  }
  if (!canUseSkill || targets.length === 0) actions.push({ type: 'endTurn' })
  return actions
}

const sameAction = (a, b) =>
  a.type === b.type && (a.target ?? null) === (b.target ?? null) && (a.trait ?? null) === (b.trait ?? null)

// ---------- ターンとラウンドの進行 ----------

function startRound(state, opts) {
  state.round += 1
  for (const team of ['A', 'B']) {
    state.mpMax[team] = Math.min(MP_CAP, state.mpMax[team] + 1)
    state.mp[team] = state.mpMax[team]
    if (state.round === EP_GRANT_ROUND) state.ep[team] = Math.min(EP_MAX, state.ep[team] + EP_GRANT)
  }
  if (state.round === EP_GRANT_ROUND) state.log.push(`ラウンド${EP_GRANT_ROUND}: 両チームにEP${EP_GRANT}が与えられた(進化できる)`)
  for (const u of state.units) {
    if (u.alive && hasKw(u, 'dash')) u.curAV = Math.max(0, u.curAV - u.baseAV) // 疾走: 行動順100%アップ
  }
  for (const team of ['A', 'B']) {
    fireCrests(state, team, 'roundStart', null, opts)
    // 置いたキャラが倒れているクレストは、ラウンド開始時にカウントダウンが進む
    for (const crest of [...state.crests[team]]) {
      const src = getUnit(state, crest.sourceUid)
      if (!src || !src.alive) tickCrest(state, crest)
    }
  }
  resolveDeaths(state, opts)
  recalc(state) // ラウンドが進むと奥義ゲージも変わる
}

function beginTurn(state, unit, opts) {
  state.actionsThisTurn = 0
  unit.usedTraits = []
  recalc(state) // アクティブ(自ターン中だけ有効)をここで反映

  // カウントダウン: 自分のターン開始時に1つ進み、0になったら破壊される
  if (unit.countdown != null) {
    unit.countdown -= 1
    if (unit.countdown <= 0) {
      state.log.push(`${unit.name}のカウントダウンが0になり、破壊された`)
      unit.hp = 0
      unit.alive = false
      resolveDeaths(state, opts)
      return
    }
  }
  for (const crest of [...state.crests[unit.team]]) {
    if (crest.sourceUid === unit.uid) tickCrest(state, crest)
  }
  fireCrests(state, unit.team, 'allyTurnStart', unit, opts)
  if (!unit.hasActed) fire(state, 'fanfare', unit, { opts, allowPending: true }) // 最初のターン開始時だけ(選ぶ効果は、プレイヤーが選ぶまで待つ)
  resolveDeaths(state, opts)
}

function endTurn(state, actor) {
  actor.hasActed = true
  actor.curAV = actor.baseAV
  actor.comboCount = 0 // コンボは、自分のターンが終わった後から数え直す
  actor.buffs = actor.buffs
    .map((b) => ({ ...b, turns: b.turns == null ? null : b.turns - 1 }))
    .filter((b) => b.turns == null || b.turns > 0)
  state.turns += 1
  state.active = null
  state.activeKind = null
  recalc(state)
}

// 行動バー上の全員の行動値を同じだけ進める(本体もアクセラレートも)
function shiftAV(state, amount) {
  for (const u of state.units) {
    if (!u.alive) continue
    u.curAV = Math.max(0, u.curAV - amount)
    if (u.accel) u.accel.curAV = Math.max(0, u.accel.curAV - amount)
  }
}

// アクセラレートの行動が終わったとき。実行したなら本体の行動も消費し、本体とアクセラレートの行動値を初期値に戻す
// (見送ったときは、アクセラレートの行動値だけ初期値に戻る)
function endAccel(state, unit, executed) {
  unit.accel.curAV = unit.accel.baseAV
  if (executed) unit.curAV = unit.baseAV
  state.turns += 1
  state.active = null
  state.activeKind = null
  recalc(state)
}

function checkWinner(state) {
  // 勝敗は場のキャラだけで決まる(召喚物は数えない)
  const aAlive = state.units.some((u) => u.team === 'A' && u.field === 'main' && u.alive)
  const bAlive = state.units.some((u) => u.team === 'B' && u.field === 'main' && u.alive)
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
    // 行動バー上の枠: キャラ本体と、アクセラレート(あれば)は別々の枠
    const slots = []
    for (const u of alive) {
      slots.push({ u, kind: 'body', av: u.curAV, spd: u.spd })
      if (u.accel) slots.push({ u, kind: 'accel', av: u.accel.curAV, spd: u.accel.speed })
    }
    let slot = slots[0]
    for (const sl of slots) {
      const tie = Math.abs(sl.av - slot.av) <= EPS
      if (sl.av < slot.av - EPS || (tie && (sl.spd > slot.spd || (sl.spd === slot.spd && sl.kind === 'accel' && slot.kind === 'body')))) slot = sl
    }
    const next = slot.u

    // ラウンドの境目が先に来るなら、先にラウンドを進める
    const toBoundary = state.round * ROUND_AV - state.totalAV
    if (toBoundary <= slot.av + EPS) {
      shiftAV(state, toBoundary)
      state.totalAV += toBoundary
      startRound(state, opts)
      continue
    }

    shiftAV(state, Math.max(0, slot.av))
    state.totalAV += Math.max(0, slot.av)
    state.active = next.uid
    state.activeKind = slot.kind

    if (slot.kind === 'accel') {
      recalc(state)
      if (legalActions(state).length === 1) { // 実行できないときは見送る
        state.log.push(`${next.name}のアクセラレートは使えず、見送った`)
        endAccel(state, next, false)
        continue
      }
      return state
    }

    beginTurn(state, next, opts)

    if (checkWinner(state)) continue
    if (!next.alive) {
      state.active = null
      state.activeKind = null
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
  const dealt = applyDamage(state, actor, target, damage, skill.type === 'true')
  if (dealt > 0) {
    state.log.push(`${actor.name}の「${skill.name}」! ${target.name}に${Math.round(dealt)}ダメージ${isCrit ? '(クリティカル!)' : ''}`)
    let total = dealt
    if (hasKw(actor, 'finisher') && target.alive) {
      const fixed = Math.floor(target.hp * FINISHER_RATE)
      if (fixed > 0) {
        dealDamage(target, fixed, true) // 必殺の固定ダメージは確定ダメージ
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
  if (actor.field === 'main') countLink(state, actor, opts) // 連携は場のキャラのスキルだけ数える
}

// 連携: 味方がスキルを発動した回数を数える。【連携_N】は、回数がNに達したときに働く
function countLink(state, actor, opts) {
  state.link[actor.team] += 1
  const count = state.link[actor.team]
  for (const u of state.units) {
    if (!u.alive || u.team !== actor.team) continue
    for (const p of u.passiveObjs) {
      if (p.trigger !== 'link' || p.min !== count || !checkCond(state, u, p.condition)) continue
      state.log.push(`${u.name}の【連携_${p.min}】`)
      runEffects(state, u, p.effects, { opts })
    }
  }
  resolveDeaths(state, opts)
}

// 味方の特性が使われたとき、コンボを持つ味方のカウントを1つ進める
// (コンボ持ちのターンが終わってから、次にそのキャラのターンが来るまでの間に使われた特性を数える)
function countCombos(state, actor, opts) {
  for (const u of state.units) {
    if (!u.alive || u.team !== actor.team || u.uid === actor.uid) continue
    const combos = u.passiveObjs.filter((p) => p.trigger === 'combo')
    if (!combos.length && !u.passiveObjs.some((p) => p.condition?.combo != null)) continue
    u.comboCount += 1
    for (const p of combos) {
      if (p.min !== u.comboCount || !checkCond(state, u, p.condition)) continue
      state.log.push(`${u.name}の【${p.name || 'コンボ'}】(${u.comboCount}コンボ)`)
      runEffects(state, u, p.effects, { opts })
    }
  }
}

function doTrait(state, actor, action, opts) {
  const trait = actor.traits.find((t) => t.id === action.trait)
  state.mp[actor.team] -= trait.cost
  state.traitCount[actor.team] += 1 // 奥義ゲージに数えられる
  actor.usedTraits.push(trait.id)
  recalc(state)
  state.log.push(`${actor.name}の特性【${trait.name}】(MP${trait.cost})`)
  runEffects(state, actor, trait.effects, { opts, chosen: action.target })
  countCombos(state, actor, opts)
  resolveDeaths(state, opts)
}

// アクセラレートを実行する(特性と同じようにMPを使い、特性の発動回数として数える)
function doAccelerate(state, actor, action, opts) {
  const ac = actor.accel
  state.mp[actor.team] -= ac.cost ?? 0
  state.traitCount[actor.team] += 1
  recalc(state)
  state.log.push(`${actor.name}の【${ac.name}】(MP${ac.cost ?? 0})`)
  runEffects(state, actor, ac.effects, { opts, chosen: action.target })
  countCombos(state, actor, opts)
  resolveDeaths(state, opts)
}

// 進化: EPを1つ使い、HPと攻撃力が+100%、突進と同じ効果(進化したターンからスキルを使える)を得る
function doEvolve(state, actor, opts) {
  state.ep[actor.team] -= 1
  actor.evolved = true
  actor.maxHp += actor.baseMaxHp
  actor.hp += actor.baseMaxHp
  actor.buffs.push({ stat: 'atk', pct: 100, flat: 0, turns: null })
  if (!actor.keywords.includes('rush')) actor.keywords.push('rush')
  state.log.push(`${actor.name}は進化した!(体力と攻撃力が2倍に)`)
  recalc(state)
  fire(state, 'onEvolve', actor, { opts, allowPending: true }) // 選ぶ効果は、プレイヤーが選ぶまで待つ
  if (!state.pending) resolveDeaths(state, opts)
}

// 行動を実行して、次の行動待ちの状態を返す(元の状態は書き換えない)
//  特性・進化を使った場合は、同じユニットのターンが続く
export function applyAction(prev, action, opts = {}) {
  if (prev.winner || !prev.active) return prev
  const state = structuredClone(prev)
  const actor = getActiveUnit(state)
  if (!legalActions(state).some((a) => sameAction(a, action))) throw new Error('その行動は選べません')

  if (state.activeKind === 'accel') {
    const executed = action.type === 'accelerate'
    if (executed) doAccelerate(state, actor, action, opts)
    else state.log.push(`${actor.name}はアクセラレートを見送った`)
    endAccel(state, actor, executed)
    return advance(state, opts)
  }

  if (action.type === 'choose') {
    const p = state.pending
    state.pending = null
    if (p.confirm) {
      state.log.push(action.target === 'yes' ? '使うことにした' : '使わないことにした')
      runEffects(state, actor, p.effects, { opts, answer: action.target, trigger: p.trigger })
    } else {
      state.log.push(`${getUnit(state, action.target).name}を選んだ`)
      runEffects(state, actor, p.effects, { opts, chosen: action.target, trigger: p.trigger })
    }
    if (p.trigger && p.nextPassive != null) fire(state, p.trigger, actor, { opts, allowPending: true }, p.nextPassive) // 続きのパッシブ
    if (!state.pending) resolveDeaths(state, opts)
    if (checkWinner(state) || !actor.alive) return advance(state, opts)
    const acts = legalActions(state)
    if (acts.length === 1 && acts[0].type === 'endTurn') {
      state.log.push(`${actor.name}は様子を見ている(入場直後はスキルを使えない)`)
      endTurn(state, actor)
      return advance(state, opts)
    }
    return state
  }

  if (action.type === 'skill') {
    doSkill(state, actor, action.target, opts)
    endTurn(state, actor)
    return advance(state, opts)
  }
  if (action.type === 'trait' || action.type === 'evolve') {
    state.actionsThisTurn += 1
    if (action.type === 'trait') doTrait(state, actor, action, opts)
    else doEvolve(state, actor, opts)
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
