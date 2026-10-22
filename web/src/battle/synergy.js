// Feel Battle - CPU Lv.5 の編成とスペルの選び方(シナジー)
//
// 【規則】Lv.5 のCPUは、次のように編成を作ります。
//   1. 同じクラス(+ニュートラル)の中から、5体の組み合わせを全部調べる
//   2. 点数 = 「1体ずつの強さ」の合計 + 「シナジー(相性のよい組み合わせ)」の加点
//   3. 点数のよい編成を使う(毎回同じにならないよう、少しだけ運を足す)
//   4. その編成で使える(同じクラスかニュートラルの)スペルから、編成に合う強いものを選ぶ
// シナジーは、キャラの定義(パッシブ・特性・効果)から自動で読み取ったタグで決まります。
// キャラを足しても、ここは直さなくてよい(タグは自動)。新しいシナジーの規則を足すときは、SYNERGY_RULES に1つ足します。

import { MAX_SLOTS, MAX_SPELL_SLOTS, NEUTRAL, isTokenSpell, canUseSpell } from './formation.js'

export const SYNERGY_LEVEL = 5 // このレベル以上のCPUは、シナジーのある編成とスペルを使う

// ---------------------------------------------------------------------------
// 1. キャラの特徴(タグ)を、定義から読み取る
// ---------------------------------------------------------------------------
const ALLY_TARGETS = new Set(['allyField', 'allies', 'otherAllies', 'allyOne', 'otherAllyOne'])
const ENEMY_TARGETS = new Set(['enemies', 'enemyOne', 'enemyRandom', 'opponent'])

// 効果の木をたどって、召喚・強化・回復などの数を数える(召喚する側のキャラの定義(unit)の中は、見ない)
function scanEffects(node, acc) {
  if (Array.isArray(node)) { node.forEach((n) => scanEffects(n, acc)); return }
  if (!node || typeof node !== 'object') return
  switch (node.type) {
    case 'summon': acc.summon += node.count || 1; break
    case 'buff': case 'maxHp': if (ALLY_TARGETS.has(node.target)) acc.buff += 1; break
    case 'heal': acc.heal += 1; break
    case 'reenter': acc.reenter += 1; break
    case 'damage': if (ENEMY_TARGETS.has(node.target)) acc.dmg += 1; break
    default: break
  }
  for (const [k, v] of Object.entries(node)) {
    if (k === 'unit' || k === 'spell' || typeof v !== 'object' || v === null) continue
    scanEffects(v, acc)
  }
}

const KEYS = ['strength', 'amulet', 'fanfare', 'reactEnter', 'reactDeath', 'lastWord', 'evolve', 'combo', 'guard', 'rush', 'stealth', 'summon', 'buff', 'heal', 'reenter', 'dmg', 'traits', 'highAtk']

export function charFeatures(c) {
  const f = Object.fromEntries(KEYS.map((k) => [k, 0]))
  const acc = { summon: 0, buff: 0, heal: 0, reenter: 0, dmg: 0 }
  for (const p of c.passives || []) {
    if (typeof p === 'string') {
      if (p === 'guard') f.guard += 1
      else if (p === 'rush' || p === 'dash') f.rush += 1
      else if (p.startsWith('stealth')) f.stealth += 1
      continue
    }
    if (p.trigger === 'fanfare') f.fanfare += 1
    else if (p.trigger === 'allyEnter') f.reactEnter += 1
    else if (p.trigger === 'allyDeath') f.reactDeath += 1
    else if (p.trigger === 'lastWord') f.lastWord += 1
    else if (p.trigger === 'onEvolve' || p.trigger === 'onEvolved') f.evolve += 1
    if (p.trigger === 'combo' || /コンボ_\d/.test(p.name || '')) f.combo += 1
    scanEffects(p.effects, acc)
  }
  for (const t of c.traits || []) { f.traits += 1; scanEffects(t.effects, acc) }
  f.summon = acc.summon; f.buff = acc.buff; f.heal = acc.heal; f.reenter = acc.reenter; f.dmg = acc.dmg
  if (c.amulet) f.amulet = 1
  const st = c.stats
  f.strength = Math.sqrt(Math.max(1, st.hp) * Math.max(st.atk, st.mag || 0, 1) * (st.spd / 100 + 0.4))
  return f
}

const median = (list) => { const a = [...list].sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : 1 }
const typeTags = (c) => String(c.type || '').split('/').filter((t) => t && t !== 'トークン' && t !== 'アミュレット')

// ---------------------------------------------------------------------------
// 2. シナジーの規則(点数)。f は、編成の5体ぶんの特徴の合計
// ---------------------------------------------------------------------------
// ctx: { atkMedian, spdMedian, summonSpell(その編成で使える、召喚するスペルがあるか) }
export const SYNERGY_RULES = [
  { id: 'enter', name: '展開 × 入場に反応', // 召喚する(または、設置する)キャラ + 味方が入場すると働くキャラ
    score: (f, x) => 0.5 * Math.min(f.summon + 0.5 * f.amulet + (x.summonSpell ? 1 : 0), 4) * Math.min(f.reactEnter, 3) / 3 },
  { id: 'combo', name: 'コンボ', // コンボを使うキャラ + 能力がたくさん働く仲間(入場への反応・ファンファーレ・特性)
    score: (f) => 0.5 * Math.min(f.combo, 2) * Math.min(f.reactEnter * 2 + f.fanfare * 0.5 + f.traits + f.amulet * 2, 6) / 3 },
  { id: 'reenter', name: '入場し直し × ファンファーレ', // 入場し直させる効果 + ファンファーレを持つ仲間
    score: (f) => 0.5 * Math.min(f.reenter, 1) * Math.min(f.fanfare, 4) / 2 },
  { id: 'evolve', name: '進化(EPは2個)', score: (f) => 0.35 * Math.min(f.evolve, 3) - 0.15 * Math.max(0, f.evolve - 3) },
  { id: 'guard', name: '守護 + 火力', // 前に立つ守護と、倒す役
    score: (f) => 0.6 * Math.min(f.guard, 2) + (f.guard >= 1 && f.highAtk >= 2 ? 0.4 : 0) },
  { id: 'lastword', name: 'ラストワード × 展開', score: (f) => 0.3 * Math.min(f.lastWord, 2) * (f.summon > 0 || f.reenter > 0 ? 1 : 0.5) },
  { id: 'support', name: '回復・強化の仲間', score: (f) => 0.4 * Math.min(f.heal + f.buff, 2) },
  { id: 'rush', name: '突進・疾走(出てすぐ攻める)', score: (f) => 0.3 * Math.min(f.rush, 2) },
  { id: 'pressure', name: '相手への攻撃の効果', score: (f) => 0.2 * Math.min(f.dmg, 3) },
  { id: 'type', name: '同じタイプのそろい', // 「ルミナス」「レヴィオン」など
    score: (f) => 0.5 * Math.max(0, f.sameType - 2) },
  { id: 'speed', name: '速さのバランス',
    score: (f, x) => (f.fastest >= x.spdMedian * 1.15 ? 0.3 : 0) - (f.avgSpd < x.spdMedian * 0.75 ? 0.5 : 0) },
  { id: 'amulet', name: 'アミュレットは1つまで・戦うキャラは3体以上',
    score: (f) => -3 * Math.max(0, f.amulet - 1) - 5 * Math.max(0, 3 - f.mains) },
]

// 編成(特徴の配列)の点数。unit: 1体ずつの強さの合計(中央値で割って、1体≒1点)
function scoreFeatures(fs, chars, ctx) {
  const f = Object.fromEntries(KEYS.map((k) => [k, 0]))
  let fastest = 0
  let spdSum = 0
  const typeCount = {}
  for (let i = 0; i < fs.length; i++) {
    for (const k of KEYS) f[k] += fs[i][k]
    const spd = chars[i].stats.spd
    if (!chars[i].amulet) { fastest = Math.max(fastest, spd); spdSum += spd }
    for (const t of typeTags(chars[i])) typeCount[t] = (typeCount[t] || 0) + 1
  }
  f.mains = fs.length - f.amulet
  f.fastest = fastest
  f.avgSpd = f.mains ? spdSum / f.mains : 0
  f.sameType = Math.max(0, ...Object.values(typeCount))
  let total = 0 // 1体ずつの強さ(中央値のキャラ ≒ 1点。アミュレットは0.3点)
  for (let i = 0; i < fs.length; i++) total += chars[i].amulet ? 0.3 : fs[i].strength / ctx.strengthMedian
  for (const r of SYNERGY_RULES) total += r.score(f, ctx) // シナジーの加点
  return { total, f }
}

// 編成の点数と、働いているシナジーの内訳(確認用)
export function explainTeam(chars, ctx) {
  const c = ctx || makeContext(chars, [])
  const fs = chars.map(charFeatures)
  const { total, f } = scoreFeatures(fs, chars, c)
  const parts = SYNERGY_RULES.map((r) => ({ id: r.id, name: r.name, score: r.score(f, c) })).filter((p) => Math.abs(p.score) > 1e-6)
  return { total, parts }
}

function makeContext(pool, spells) {
  const feats = pool.map(charFeatures)
  const mains = pool.filter((c) => !c.amulet)
  return {
    strengthMedian: median(feats.filter((_, i) => !pool[i].amulet).map((f) => f.strength)) || 1,
    atkMedian: median(mains.map((c) => c.stats.atk)),
    spdMedian: median(mains.map((c) => c.stats.spd)),
    summonSpell: spells.some((sp) => spellHas(sp, 'summon')),
  }
}

// ---------------------------------------------------------------------------
// 3. 編成を探す(同じクラス + ニュートラルの中から、5体の組み合わせを全部調べる)
// ---------------------------------------------------------------------------
function* combinations(n, k) {
  const idx = Array.from({ length: k }, (_, i) => i)
  while (true) {
    yield idx
    let i = k - 1
    while (i >= 0 && idx[i] === n - k + i) i--
    if (i < 0) return
    idx[i]++
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1
  }
}
const choose = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return Math.round(r) }
const MAX_COMBOS = 300000 // これより多いときは、ランダムに選んだ組み合わせだけを調べる
const TOP_N = 6 // クラスごとに、点数の高い編成を何個まで候補に残すか
const PICK_TEMP = 0.45 // 候補からの選び方のゆらぎ(小さいほど、いちばん点数の高い編成を選ぶ)

function bestInPool(pool, ctx, rng, noise) {
  const k = Math.min(MAX_SLOTS, pool.length)
  const feats = pool.map(charFeatures)
  // 「あとでスペルを足す」ので、クラスで使える召喚スペルの有無は ctx に入っている
  const mainsInPool = pool.filter((c) => !c.amulet).length
  if (mainsInPool < Math.min(3, k)) return []
  const top = [] // 点数のよい編成を、上から TOP_N 個まで残す
  const consider = (idx) => {
    const chars = idx.map((i) => pool[i])
    const fs = idx.map((i) => feats[i])
    const { total } = scoreFeatures(fs, chars, ctx)
    const t = total + rng() * noise
    if (top.length < TOP_N || t > top[top.length - 1].total) {
      top.push({ total: t, idx: [...idx] })
      top.sort((a, b) => b.total - a.total)
      if (top.length > TOP_N) top.pop()
    }
  }
  const nCombos = choose(pool.length, k)
  if (nCombos <= MAX_COMBOS) {
    for (const idx of combinations(pool.length, k)) consider(idx)
  } else {
    for (let n = 0; n < MAX_COMBOS; n++) {
      const set = new Set()
      while (set.size < k) set.add(Math.floor(rng() * pool.length))
      consider([...set])
    }
  }
  return top.map((c) => ({ total: c.total, team: c.idx.map((i) => pool[i]) }))
}

// CPU Lv.5 の編成: クラスごとに、点数の高い編成を候補として探し、点数が高いものほど選ばれやすいように選ぶ
// (点数が一番の編成が、いちばん選ばれやすい。でも、毎回まったく同じ編成にはならない)
// pool: 使ってよいキャラ(トークンなどは除いておく) / allSpells: スペル全体(編成に合う召喚スペルの有無を見るため)
export function buildSynergyTeam(pool, allSpells = [], rng = Math.random) {
  const classes = [...new Set(pool.map((c) => c.class).filter((k) => k !== NEUTRAL))]
  const groups = classes.length ? classes : [NEUTRAL]
  const cands = []
  for (const cls of groups) {
    const members = pool.filter((c) => c.class === NEUTRAL || c.class === cls)
    const spells = allSpells.filter((sp) => !isTokenSpell(sp) && (sp.class || '').split('/')[0] === cls)
    cands.push(...bestInPool(members, makeContext(members, spells), rng, 0.1))
  }
  if (!cands.length) return []
  const top = Math.max(...cands.map((c) => c.total))
  const weights = cands.map((c) => Math.exp((c.total - top) / PICK_TEMP))
  let r = rng() * weights.reduce((a, b) => a + b, 0)
  for (let i = 0; i < cands.length; i++) { r -= weights[i]; if (r <= 0) return cands[i].team }
  return cands[0].team
}

// ---------------------------------------------------------------------------
// 4. スペルを選ぶ(編成に合う、強いスペル)
// ---------------------------------------------------------------------------
// スペルの効果の中に、ある種類の効果があるか(モードの中も見る)
function spellEffects(sp) {
  const out = []
  const walk = (effects) => {
    for (const e of effects || []) {
      if (!e) continue
      if (e.type === 'mode') (e.modes || []).forEach((m) => walk(m.effects))
      else out.push(e)
    }
  }
  walk(sp.effects)
  return out
}
function spellHas(sp, type) {
  const walk = (effects) => (effects || []).some((e) => e && (e.type === type || (e.type === 'mode' && (e.modes || []).some((m) => walk(m.effects)))))
  return walk(sp.effects) || (sp.modes || []).some((m) => walk(m.effects))
}

// 効果1つの価値(1体ぶんの強さ ≒ 1)。編成の特徴 f に合うほど、高くなる
function effectValue(e, f, x, allSpells) {
  switch (e.type) {
    case 'summon': {
      const n = e.count || 1
      const u = e.unit && typeof e.unit === 'object' ? e.unit : null
      const s = u ? charFeatures({ ...u, passives: u.passives || [], traits: u.traits || [] }).strength / x.strengthMedian : 0.6
      // 入場に反応するキャラ・コンボがいるほど、召喚の価値が上がる
      return n * Math.max(0.3, s) * (1 + 0.5 * Math.min(f.reactEnter, 3) + 0.2 * Math.min(f.combo, 2))
    }
    case 'damage': return ((e.add || 0) + (e.mult || 0) * x.atkMedian) / 150 * (e.target === 'enemies' ? 3 : 1)
    case 'heal': return (e.flat || 0) / 200 * 0.6
    case 'buff': case 'maxHp': return ((e.flat || 0) / 100) * (ALLY_TARGETS.has(e.target) ? 3 : 0.8) * (e.target === 'allyField' ? 1.2 : 1) * 0.5
    case 'enableSpell': {
      const sp = e.spell && typeof e.spell === 'object' ? e.spell : (allSpells || []).find((s) => s.id === e.spell)
      return sp ? 0.9 * spellValue(sp, f, x, allSpells, 0) : 0.2
    }
    default: return 0.25
  }
}

// スペル1つの価値。モードのあるスペルは、いちばんよいモードの価値。MPが重いほど、使いにくいので割り引く
export function spellValue(sp, f, x, allSpells = [], depth = 0) {
  if (depth > 2) return 0
  let value = 0
  const modes = (sp.effects || []).find((e) => e && e.type === 'mode')
  const sumOf = (effects) => (effects || []).reduce((s, e) => s + (e.type === 'mode' ? 0 : effectValue(e, f, x, allSpells)), 0)
  if (modes) value = Math.max(...(modes.modes || []).map((m) => sumOf(m.effects)), 0)
  else if (sp.modes) value = Math.max(...sp.modes.map((m) => sumOf(m.effects)), 0)
  else value = sumOf(sp.effects)
  const cost = sp.cost || 0
  return (value / (1 + 0.18 * cost)) * (cost > 6 ? 0.6 : 1)
}

// CPU Lv.5 のスペルセット: 使えるスペルのうち、編成に合う強いものから MAX_SPELL_SLOTS 回分
// (種類が足りないときは、いちばん強いものをくり返す)
export function pickSynergySpells(allSpells, team, rng = Math.random) {
  const usable = allSpells.filter((sp) => !isTokenSpell(sp) && canUseSpell(team, sp))
  if (!usable.length) return []
  const ctx = makeContext(team, usable)
  const fs = team.map(charFeatures)
  const { f } = scoreFeatures(fs, team, ctx)
  const ranked = usable
    .map((sp) => ({ sp, v: spellValue(sp, f, ctx, allSpells) + rng() * 0.02 }))
    .sort((a, b) => b.v - a.v)
  const out = ranked.slice(0, MAX_SPELL_SLOTS).map((r) => r.sp)
  while (out.length < MAX_SPELL_SLOTS) out.push(ranked[0].sp)
  return out
}
