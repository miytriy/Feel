// Feel Battle - キャラクターのデータが正しい書き方かをチェックする
// (名前の打ち間違い・足りない項目を、戦闘を始める前に見つけるためのものです)
import { KEYWORDS, TRIGGER_LABELS, RELICS } from '../engine.js'

export const CLASSES = ['エルフ', 'ロイヤル', 'ウィッチ', 'ドラゴン', 'ナイトメア', 'ビショップ', 'ネメシス', 'ニュートラル']
export const RARITIES = ['legend', 'gold', 'silver', 'bronze']
const SKILL_STATS = ['atk', 'mag']
const DMG_TYPES = ['physical', 'magic', 'true']
const EFFECT_TYPES = ['damage', 'heal', 'buff', 'armor', 'shield', 'barrier', 'advance', 'mp', 'ep', 'faith', 'graveyard', 'crest', 'summon', 'reenter', 'loseKeyword', 'destroy', 'vanish', 'maxHp', 'loseHp']
const EFFECT_TARGETS = ['self', 'opponent', 'allies', 'otherAllies', 'allyOne', 'enemies', 'enemyOne', 'enemyRandom', 'summons', 'otherAllyOne', 'allyField']
const TRAIT_TARGETS = ['self', 'allies', 'otherAllies', 'allyOne', 'otherAllyOne', 'enemies', 'enemyOne', 'enemyRandom', 'summons']
const BUFF_STATS = ['atk', 'mag', 'def', 'spd', 'critRate', 'critDmg', 'dmgResist']
const CONDITION_KEYS = ['link', 'gauge', 'ultimate', 'liberation', 'faith', 'graveyard', 'hpBelow', 'hpAbove', 'evolved', 'crests', 'combo']

const isNum = (x) => typeof x === 'number' && Number.isFinite(x)
const isStr = (x) => typeof x === 'string' && x.length > 0

function checkCondition(c, where, errs) {
  if (c == null) return
  if (typeof c !== 'object') return errs.push(`${where}: condition はオブジェクトで書いてください`)
  for (const k of Object.keys(c)) if (!CONDITION_KEYS.includes(k)) errs.push(`${where}: 知らない条件「${k}」(使えるもの: ${CONDITION_KEYS.join(' / ')})`)
}

function checkEffects(effects, where, errs, depth = 0) {
  if (!Array.isArray(effects) || effects.length === 0) return errs.push(`${where}: effects は1つ以上の配列で書いてください`)
  effects.forEach((e, i) => {
    const w = `${where} の効果${i + 1}`
    if (!e || typeof e !== 'object') return errs.push(`${w}: オブジェクトで書いてください`)
    if (!EFFECT_TYPES.includes(e.type)) return errs.push(`${w}: 知らない効果の種類「${e.type}」(使えるもの: ${EFFECT_TYPES.join(' / ')})`)
    if (e.target != null && !EFFECT_TARGETS.includes(e.target)) errs.push(`${w}: 知らない対象「${e.target}」`)
    if (e.type === 'damage' && e.dmgType != null && !DMG_TYPES.includes(e.dmgType)) errs.push(`${w}: dmgType は ${DMG_TYPES.join(' / ')} のどれか`)
    if (e.type === 'buff') {
      if (!BUFF_STATS.includes(e.stat)) errs.push(`${w}: buff の stat は ${BUFF_STATS.join(' / ')} のどれか(「${e.stat}」は使えません)`)
      if (e.pct == null && e.flat == null && e.perGraveyard == null) errs.push(`${w}: buff には pct か flat が必要です`)
    }
    if (e.type === 'summon') {
      if (!e.unit) errs.push(`${w}: summon には unit(召喚するキャラ)が必要です`)
      else if (depth < 2) errs.push(...validateCharacter(e.unit, { summon: true }).map((m) => `${w} の召喚物 → ${m}`))
    }
    if (e.type === 'crest' && !(e.crest && isStr(e.crest.name))) errs.push(`${w}: crest には name を持つ crest が必要です`)
    if (['heal', 'armor', 'shield'].includes(e.type) && e.flat == null && e.mult == null && e.perGraveyard == null) errs.push(`${w}: ${e.type} には mult か flat が必要です`)
    checkCondition(e.condition, w, errs)
  })
}

// 問題がなければ空の配列、あれば問題点(日本語)の配列を返す
export function validateCharacter(def, opts = {}) {
  const errs = []
  const label = def && def.name ? `「${def.name}」` : '(名前なし)'
  const add = (m) => errs.push(`${label}: ${m}`)
  if (!def || typeof def !== 'object') return ['キャラのデータがオブジェクトではありません']
  if (!isStr(def.id)) add('id がありません')
  if (opts.expectedId && def.id !== opts.expectedId) add(`id「${def.id}」がファイル名「${opts.expectedId}」と違います`)
  if (!isStr(def.name)) add('name(名前)がありません')
  if (def.rarity != null && !RARITIES.includes(def.rarity)) add(`rarity「${def.rarity}」は使えません(${RARITIES.join(' / ')})`)
  if (!CLASSES.includes(def.class)) add(`class「${def.class}」は使えません(${CLASSES.join(' / ')})`)

  const s = def.stats
  if (!s || typeof s !== 'object') add('stats がありません')
  else {
    for (const k of ['hp', 'atk', 'def', 'spd']) if (!isNum(s[k])) add(`stats.${k} が数字ではありません`)
    if (isNum(s.hp) && s.hp <= 0) add('stats.hp は1以上にしてください')
    if (isNum(s.spd) && s.spd <= 0) add('stats.spd は1以上にしてください')
    for (const k of Object.keys(s)) if (!['hp', 'atk', 'def', 'spd', 'mag', 'critRate', 'critDmg', 'dmgResist'].includes(k)) add(`stats に知らない項目「${k}」があります`)
  }

  const sk = def.skill
  if (!sk || typeof sk !== 'object') add('skill がありません')
  else {
    if (!SKILL_STATS.includes(sk.stat)) add(`skill.stat は ${SKILL_STATS.join(' / ')} のどちらか`)
    if (!DMG_TYPES.includes(sk.type)) add(`skill.type は ${DMG_TYPES.join(' / ')} のどれか`)
    if (!isNum(sk.mult)) add('skill.mult が数字ではありません')
  }

  ;(def.passives || []).forEach((p, i) => {
    if (typeof p === 'string') {
      if (!KEYWORDS[p]) add(`passives の「${p}」は知らないキーワードです(使えるもの: ${Object.keys(KEYWORDS).join(' / ')})`)
    } else if (p && typeof p === 'object') {
      const w = `パッシブ${i + 1}(${p.name || '名前なし'})`
      if (!TRIGGER_LABELS[p.trigger]) errs.push(`${label}: ${w}: 知らない trigger「${p.trigger}」(使えるもの: ${Object.keys(TRIGGER_LABELS).join(' / ')})`)
      if (p.trigger === 'combo' || p.trigger === 'link') if (!isNum(p.min)) errs.push(`${label}: ${w}: ${p.trigger} には min(回数)が必要です`)
      checkCondition(p.condition, `${label}: ${w}`, errs)
      checkEffects(p.effects, `${label}: ${w}`, errs)
    } else add(`passives の${i + 1}番目が文字列でもオブジェクトでもありません`)
  })

  const ids = new Set()
  ;(def.traits || []).forEach((t, i) => {
    const w = `特性${i + 1}(${t && t.name ? t.name : '名前なし'})`
    if (!t || !isStr(t.id)) return errs.push(`${label}: ${w}: id がありません`)
    if (ids.has(t.id)) errs.push(`${label}: ${w}: id「${t.id}」が重複しています`)
    ids.add(t.id)
    if (!isStr(t.name)) errs.push(`${label}: ${w}: name がありません`)
    if (!isNum(t.cost) || t.cost < 0) errs.push(`${label}: ${w}: cost(MP)は0以上の数字にしてください`)
    if (!TRAIT_TARGETS.includes(t.target)) errs.push(`${label}: ${w}: target「${t.target}」は使えません(${TRAIT_TARGETS.join(' / ')})`)
    checkCondition(t.condition, `${label}: ${w}`, errs)
    checkEffects(t.effects, `${label}: ${w}`, errs)
  })

  if (def.accelerate) {
    const a = def.accelerate
    if (!isNum(a.speed) || a.speed <= 0) add('accelerate.speed は1以上の数字にしてください')
    if (!isNum(a.cost) || a.cost < 0) add('accelerate.cost は0以上の数字にしてください')
    if (!TRAIT_TARGETS.includes(a.target)) add(`accelerate.target「${a.target}」は使えません`)
    checkEffects(a.effects, `${label}: accelerate`, errs)
  }
  if (def.relic != null && !RELICS[def.relic]) add(`relic「${def.relic}」は知らない遺物です(${Object.keys(RELICS).join(' / ')})`)
  if (def.countdown != null && !(isNum(def.countdown) && def.countdown > 0)) add('countdown は1以上の数字にしてください')
  if (opts.summon && def.amulet && def.stats && def.stats.atk == null) add('stats.atk がありません')
  return errs
}
