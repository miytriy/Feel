// Feel Battle - 編成のルール(画面には依存しない部分)
// ・最大5体。同じキャラは1体まで
// ・同じクラス同士でしか編成できない。ただし「ニュートラル」だけは例外で、どのクラスとも組める
// ・スロットの順番は、行動値が同じときの行動の優先順になる(1番目が最優先)

import { MAX_SPELL_SLOTS } from './engine.js'

export const MAX_SLOTS = 5
export { MAX_SPELL_SLOTS }
export const NEUTRAL = 'ニュートラル'
export const STORAGE_KEY = 'feel.formation.v1'

// スロットの配列(キャラdefまたはnull)から、ニュートラル以外のクラスを取り出す
const classesOf = (chars) => [...new Set(chars.filter(Boolean).map((c) => c.class).filter((k) => k !== NEUTRAL))]

// この編成が正しいかを調べる。問題がなければ { ok: true }、あれば { ok: false, reason }
export function validateFormation(chars) {
  const list = chars.filter(Boolean)
  if (list.length < 1 || list.every((c) => c.amulet)) return { ok: false, reason: 'キャラを1体以上編成してください(アミュレットだけでは戦えません)' }
  if (list.length > MAX_SLOTS) return { ok: false, reason: `編成できるのは${MAX_SLOTS}体までです` }
  if (new Set(list.map((c) => c.id)).size !== list.length) return { ok: false, reason: '同じキャラは1体までです' }
  const classes = classesOf(list)
  if (classes.length > 1) return { ok: false, reason: `クラスが混ざっています(${classes.join('・')})。同じクラスだけで編成してください` }
  return { ok: true }
}

// スロットslotIdxにcharを入れられるか(入れたあとの編成が正しいか)。入れられないなら理由を返す
export function canPlace(slots, slotIdx, char) {
  const next = [...slots]
  next[slotIdx] = char
  // 同じキャラが別のスロットにいる場合は、そのスロットと入れ替わるので、重複にはならない
  const dup = next.findIndex((c, i) => c && c.id === char.id && i !== slotIdx)
  if (dup !== -1) next[dup] = slots[slotIdx] ?? null
  const classes = classesOf(next)
  if (classes.length > 1) {
    const mine = char.class
    const others = classesOf(slots.filter((_, i) => i !== slotIdx))
    return { ok: false, reason: `${others.join('・') || mine}の編成には入れられません(${mine})` }
  }
  return { ok: true }
}

// キャラをスロットに入れる(別のスロットに同じキャラがいれば入れ替える)。入れられなければ元のまま返す
export function placeChar(slots, slotIdx, char) {
  if (!canPlace(slots, slotIdx, char).ok) return slots
  const next = [...slots]
  const dup = next.findIndex((c) => c && c.id === char.id)
  if (dup !== -1 && dup !== slotIdx) next[dup] = next[slotIdx] ?? null
  next[slotIdx] = char
  return next
}

export const removeChar = (slots, slotIdx) => slots.map((c, i) => (i === slotIdx ? null : c))

// スロットを入れ替える(順番を変えると、行動値が同じときの優先順が変わる)
export function swapSlots(slots, a, b) {
  if (a === b || a < 0 || b < 0 || a >= slots.length || b >= slots.length) return slots
  const next = [...slots]
  ;[next[a], next[b]] = [next[b], next[a]]
  return next
}

// クイック編成: 選んだ順に、1番目のスロットから詰めて入れる(最大5体)。クラスが合わないキャラは飛ばす
export function quickFill(chars) {
  const result = []
  for (const c of chars) {
    if (result.length >= MAX_SLOTS) break
    if (result.some((x) => x.id === c.id)) continue
    if (!validateFormation([...result, c]).ok) continue
    result.push(c)
  }
  return [...result, ...Array(MAX_SLOTS - result.length).fill(null)]
}

// ---- 保存(いまはこの端末のブラウザに保存。あとでFirestoreに変える予定) ----
export function saveFormation(slots, storage = globalThis.localStorage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(slots.map((c) => (c ? c.id : null))))
    return true
  } catch {
    return false
  }
}

export function loadFormation(allChars, storage = globalThis.localStorage) {
  try {
    const ids = JSON.parse(storage.getItem(STORAGE_KEY) || 'null')
    if (!Array.isArray(ids)) return null
    const slots = ids.slice(0, MAX_SLOTS).map((id) => allChars.find((c) => c.id === id) || null)
    while (slots.length < MAX_SLOTS) slots.push(null)
    return validateFormation(slots).ok ? slots : null // 壊れた保存データは使わない
  } catch {
    return null
  }
}

// 初期の編成(保存がないとき)
export const defaultFormation = (allChars, ids) =>
  quickFill(ids.map((id) => allChars.find((c) => c.id === id)).filter(Boolean))

// ---- スペルセット(キャラ編成とは別)。最大 MAX_SPELL_SLOTS 回分を有効化できる。同じスペルを何回入れてもよい ----
export const TOKEN_TYPE = 'トークン' // このタイプは編成(スペルセット)に入れられない
export const SPELL_STORAGE_KEY = 'feel.spellset.v1'

// スペルのクラス(「エルフ/スペル」→「エルフ」)。ニュートラルのスペルは、どのクラスの編成でも使える
export const spellClassOf = (spell) => String(spell.class || '').split('/')[0]
// この編成(キャラの配列)のクラス。ニュートラルしかいなければ null
export const teamClassOf = (chars) => classesOf(chars)[0] ?? null
// そのスペルを、この編成で使えるか(スペルのクラスが、編成のクラスと同じ、またはニュートラルのスペル)
export const canUseSpell = (chars, spell) => {
  const k = spellClassOf(spell)
  return k === NEUTRAL || k === teamClassOf(chars)
}

export function validateSpellSet(list, chars = []) {
  if (list.length > MAX_SPELL_SLOTS) return { ok: false, reason: `スペルは最大${MAX_SPELL_SLOTS}回までです` }
  const tok = list.find((sp) => sp.type === TOKEN_TYPE)
  if (tok) return { ok: false, reason: `「${tok.name}」はトークンなので、スペルセットには入れられません` }
  const bad = list.find((sp) => !canUseSpell(chars, sp))
  if (bad) return { ok: false, reason: `スペル「${bad.name}」(${spellClassOf(bad)})は、この編成では使えません。外すか、編成のクラスを合わせてください` }
  return { ok: true }
}

export function saveSpellSet(list, storage = globalThis.localStorage) {
  try {
    storage.setItem(SPELL_STORAGE_KEY, JSON.stringify(list.map((sp) => sp.id)))
    return true
  } catch {
    return false
  }
}

export function loadSpellSet(allSpells, storage = globalThis.localStorage) {
  try {
    const ids = JSON.parse(storage.getItem(SPELL_STORAGE_KEY) || 'null')
    if (!Array.isArray(ids)) return []
    return ids.map((id) => allSpells.find((sp) => sp.id === id)).filter((sp) => sp && sp.type !== TOKEN_TYPE).slice(0, MAX_SPELL_SLOTS)
  } catch {
    return []
  }
}
