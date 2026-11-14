// 遺物(部位つき)のルール: 部位ごとのメインステータス候補、サブステータス、レア度ごとのレベル上限と初期個数、抽選、レベルアップ、ステータスへの加算。
// ※数値(メイン・サブの大きさ)は、仕様に書かれていなかったため、Feelのステータスの大きさに合わせて仮に決めた。下の MAIN / SUB を書き換えれば、すべてに反映される。
// 乱数は rng(0以上1未満を返す関数)を渡す。テストでは固定できる。

// 遺物は、いま使用禁止(false)。バトルでの効果(セット遺物・部位つき遺物)・装備・作成がすべて止まる。使えるように戻すときは true にする
export const RELICS_ENABLED = false

// ---- ステータスの種類 ----
// unit: 'flat' = 実数 / 'pct' = %
// MAIN: 5★・最大レベルのときのメインステータスの値。 SUB: 5★の、サブステータス1回ぶんの最大値(実際は 80%/90%/100% のどれか)
export const RELIC_STATS = {
  hp: { label: 'HP', unit: 'flat', main: 400, sub: 40 },
  atk: { label: '攻撃力', unit: 'flat', main: 100, sub: 20 },
  def: { label: '防御力', unit: 'flat', main: 80, sub: 15 },
  hpPct: { label: 'HP', unit: 'pct', main: 43.2, sub: 4.3 },
  atkPct: { label: '攻撃力', unit: 'pct', main: 43.2, sub: 4.3 },
  defPct: { label: '防御力', unit: 'pct', main: 54, sub: 5.4 },
  spd: { label: '速度', unit: 'flat', main: 12, sub: 2 },
  resist: { label: '耐性値', unit: 'flat', main: 120, sub: 8 },
  critRate: { label: 'クリティカルレート', unit: 'pct', main: 32.4, sub: 3.2 },
  critDmg: { label: 'クリティカルダメージ', unit: 'pct', main: 64.8, sub: 6.4 },
  effHit: { label: '効果効率', unit: 'pct', main: 43.2, sub: 4.3 },
  heal: { label: '治癒量', unit: 'pct', main: 34.5 }, // サブステータスにはならない
  physDmg: { label: '物理ダメージ', unit: 'pct', main: 38.8 },
  magDmg: { label: '魔法ダメージ', unit: 'pct', main: 38.8 },
}

// ---- 部位と、メインステータスの候補(重みは、すべて同じ) ----
// only: その部位だけに出るメインステータス(※)
export const RELIC_PARTS = {
  head: { name: '頭部', mains: ['hp'], fixed: true },
  hand: { name: '手部', mains: ['atk'], fixed: true },
  body: { name: '胴体', mains: ['hp', 'hpPct', 'atk', 'atkPct', 'def', 'defPct', 'critRate', 'critDmg', 'heal', 'effHit'], only: ['critRate', 'critDmg', 'heal', 'effHit'] },
  legs: { name: '脚部', mains: ['hp', 'hpPct', 'atk', 'atkPct', 'def', 'defPct', 'spd'], only: ['spd'] },
  sphere: { name: 'コア', mains: ['hp', 'hpPct', 'atk', 'atkPct', 'def', 'defPct', 'physDmg', 'magDmg'], only: ['physDmg', 'magDmg'] },
  rope: { name: 'リンク', mains: ['hp', 'hpPct', 'atk', 'atkPct', 'def', 'defPct', 'critRate', 'critDmg', 'resist'], only: ['critRate', 'critDmg', 'resist'] },
}
export const PART_IDS = Object.keys(RELIC_PARTS)

// ---- サブステータス(全部位共通。この中から、ランダムに選ぶ) ----
export const SUB_STATS = ['hp', 'atk', 'def', 'spd', 'resist', 'hpPct', 'atkPct', 'defPct', 'critRate', 'critDmg', 'effHit']
const SUB_TIERS = [0.8, 0.9, 1.0]
export const SUB_MAX = 4
export const SUB_EVERY = 3 // レベルを3上げるごとに、サブステータスが1個増える(4個のときは、どれかが上がる)

// ---- レア度ごと ----
// stars: レア度(★2〜★5)。maxLevel: レベル上限。subs: 初期のサブステータス数 [最小, 最大]。scale: 数値の大きさの倍率(★5を1とする)
export const RELIC_RARITIES = {
  2: { maxLevel: 6, subs: [0, 0], scale: 0.4 },
  3: { maxLevel: 9, subs: [1, 2], scale: 0.6 },
  4: { maxLevel: 12, subs: [2, 3], scale: 0.8 },
  5: { maxLevel: 15, subs: [3, 4], scale: 1 },
}

const pick = (arr, rng) => arr[Math.min(arr.length - 1, Math.floor(rng() * arr.length))]
const round = (stat, v) => (RELIC_STATS[stat].unit === 'pct' ? Math.round(v * 10) / 10 : Math.round(v))

// メインステータスの値: レベル0で最大の約16%、最大レベルで100%(5★のとき)
export function mainValue(stat, stars, level) {
  const r = RELIC_RARITIES[stars]
  return round(stat, RELIC_STATS[stat].main * r.scale * (0.16 + (0.84 * Math.min(level, r.maxLevel)) / r.maxLevel))
}
const subRoll = (stat, stars, rng) => round(stat, RELIC_STATS[stat].sub * RELIC_RARITIES[stars].scale * pick(SUB_TIERS, rng))

// 遺物を1個つくる。part: 'head' など / stars: 2〜5 / opts.main: メインステータスを指定 / opts.level: 初期レベル(ふつう0)
export function generateRelic(part, stars = 5, rng = Math.random, opts = {}) {
  const P = RELIC_PARTS[part]
  if (!P) throw new Error(`知らない部位です: ${part}`)
  if (!RELIC_RARITIES[stars]) throw new Error(`知らないレア度です: ${stars}`)
  const main = opts.main ?? pick(P.mains, rng)
  if (!P.mains.includes(main)) throw new Error(`${P.name}に出ないメインステータスです: ${main}`)
  const [lo, hi] = RELIC_RARITIES[stars].subs
  const n = lo + Math.floor(rng() * (hi - lo + 1))
  const relic = { part, stars, level: 0, main, subs: [] }
  for (let i = 0; i < n; i++) addSub(relic, rng)
  for (let l = 0; l < (opts.level || 0); l++) levelUp(relic, rng)
  return relic
}

// サブステータスを1個足す(メインと同じ種類・すでに付いている種類は出ない)
function addSub(relic, rng) {
  const used = new Set([relic.main, ...relic.subs.map((s) => s.stat)])
  const pool = SUB_STATS.filter((s) => !used.has(s))
  const stat = pick(pool, rng)
  relic.subs.push({ stat, value: subRoll(stat, relic.stars, rng) })
}

// レベルを1上げる。3の倍数のレベルになったとき、サブステータスが増える(4個あるときは、ランダムな1個の数値が上がる)
export function levelUp(relic, rng = Math.random) {
  const max = RELIC_RARITIES[relic.stars].maxLevel
  if (relic.level >= max) return false
  relic.level += 1
  if (relic.level % SUB_EVERY === 0) {
    if (relic.subs.length < SUB_MAX) addSub(relic, rng)
    else {
      const s = pick(relic.subs, rng)
      s.value = round(s.stat, s.value + subRoll(s.stat, relic.stars, rng))
    }
  }
  return true
}

// 遺物の表示用の行 { stat, label, text }
export const statText = (stat, value) => `${RELIC_STATS[stat].label}${RELIC_STATS[stat].unit === 'pct' ? ` +${value}%` : ` +${value}`}`
export const relicLines = (relic) => [{ main: true, stat: relic.main, value: mainValue(relic.main, relic.stars, relic.level) }, ...relic.subs.map((s) => ({ main: false, ...s }))].map((l) => ({ ...l, text: statText(l.stat, l.value) }))

// 遺物(複数)のメイン・サブを足し合わせる { stat: 合計 }(同じ種類の実数と%は、別のキーのまま)
export function relicTotals(relics) {
  const t = {}
  for (const r of relics || []) for (const l of relicLines(r)) t[l.stat] = (t[l.stat] || 0) + l.value
  return t
}

// 元のステータス { hp, atk, def, spd, critRate, critDmg, dmgResist, physUp, magUp, healUp, effHit } に、遺物の合計を反映する(元の値を書き換えず、新しい値を返す)
// HP・攻撃力・防御力: 元の値 × (1+%) + 実数 / 速度・耐性値: 実数を足す / クリティカル・ダメージ%・治癒量・効果効率: % をそのまま足す
export function applyRelics(base, relics) {
  const t = relicTotals(relics)
  const o = { ...base }
  for (const k of ['hp', 'atk', 'def']) o[k] = Math.round(base[k] * (1 + (t[`${k}Pct`] || 0) / 100) + (t[k] || 0))
  o.spd = Math.round(base.spd + (t.spd || 0))
  o.dmgResist = (base.dmgResist || 0) + (t.resist || 0)
  o.critRate = (base.critRate ?? 5) + (t.critRate || 0)
  o.critDmg = (base.critDmg ?? 50) + (t.critDmg || 0)
  o.physUp = (base.physUp || 0) + (t.physDmg || 0)
  o.magUp = (base.magUp || 0) + (t.magDmg || 0)
  o.healUp = (base.healUp || 0) + (t.heal || 0)
  o.effHit = (base.effHit || 0) + (t.effHit || 0)
  return o
}
