// Feel Battle - 編成のルール(画面には依存しない部分)
// ・キャラは最大5体。同じキャラは1体まで
// ・アミュレットは、キャラとは別の専用枠(MAX_AMULET_SLOTS 個)。スロットの配列は、キャラ5つ + アミュレット2つ(6・7番目)の、計 TOTAL_SLOTS 個
// ・同じクラス同士でしか編成できない。ただし「ニュートラル」だけは例外で、どのクラスとも組める
// ・スロットの順番は、行動値が同じときの行動の優先順になる(1番目が最優先)

import { MAX_SPELL_SLOTS } from './engine.js'

export const MAX_SLOTS = 5 // キャラの枠
export const MAX_AMULET_SLOTS = 2 // アミュレット専用の枠(スロット配列の、キャラの枠のあと)
export const TOTAL_SLOTS = MAX_SLOTS + MAX_AMULET_SLOTS
export { MAX_SPELL_SLOTS }
export const NEUTRAL = 'ニュートラル'
export const STORAGE_KEY = 'feel.formation.v1'

// スロットの配列(キャラdefまたはnull)から、ニュートラル以外のクラスを取り出す
const classesOf = (chars) => [...new Set(chars.filter(Boolean).map((c) => c.class).filter((k) => k !== NEUTRAL))]

// この編成が正しいかを調べる。問題がなければ { ok: true }、あれば { ok: false, reason }
export function validateFormation(chars) {
  const list = chars.filter(Boolean)
  const mains = list.filter((c) => !c.amulet)
  if (mains.length < 1) return { ok: false, reason: 'キャラを1体以上編成してください(アミュレットだけでは戦えません)' }
  if (mains.length > MAX_SLOTS) return { ok: false, reason: `編成できるのは${MAX_SLOTS}体までです` }
  if (list.length - mains.length > MAX_AMULET_SLOTS) return { ok: false, reason: `アミュレットは${MAX_AMULET_SLOTS}つまでです` }
  if (new Set(list.map((c) => c.id)).size !== list.length) return { ok: false, reason: '同じキャラは1体までです' }
  const classes = classesOf(list)
  if (classes.length > 1) return { ok: false, reason: `クラスが混ざっています(${classes.join('・')})。同じクラスだけで編成してください` }
  return { ok: true }
}

// スロットslotIdxにcharを入れられるか(入れたあとの編成が正しいか)。入れられないなら理由を返す
export function canPlace(slots, slotIdx, char) {
  if (slotIdx >= MAX_SLOTS && !char.amulet) return { ok: false, reason: 'アミュレットの枠には、アミュレットだけ入れられます' }
  if (slotIdx < MAX_SLOTS && char.amulet) return { ok: false, reason: 'アミュレットは、アミュレットの枠に入れてください' }
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
//   keepAmulets: いまのアミュレット(新しい編成とクラスが合うものだけ、そのまま残す)
export function quickFill(chars, keepAmulets = []) {
  const result = []
  for (const c of chars) {
    if (c.amulet) continue // アミュレットは、専用の枠
    if (result.length >= MAX_SLOTS) break
    if (result.some((x) => x.id === c.id)) continue
    if (!validateFormation([...result, c]).ok) continue
    result.push(c)
  }
  const amulets = []
  for (const a of keepAmulets) {
    if (a && amulets.length < MAX_AMULET_SLOTS && validateFormation([...result, ...amulets, a]).ok) amulets.push(a)
  }
  return [...result, ...Array(MAX_SLOTS - result.length).fill(null), ...amulets, ...Array(MAX_AMULET_SLOTS - amulets.length).fill(null)]
}

// 定義の配列(古い保存データも含む)を、スロットの並び(キャラ5つ + アミュレット2つ)に直す。キャラの枠に入っていたアミュレットは、アミュレットの枠へ移す
export function arrangeSlots(defs) {
  const list = defs.filter(Boolean)
  const mains = list.filter((c) => !c.amulet).slice(0, MAX_SLOTS)
  const amulets = list.filter((c) => c.amulet).slice(0, MAX_AMULET_SLOTS)
  // キャラは、もとの並びの位置をなるべく保つ
  const slots = Array(TOTAL_SLOTS).fill(null)
  defs.slice(0, MAX_SLOTS).forEach((c, i) => { if (c && !c.amulet) slots[i] = c })
  let k = 0
  for (const c of mains) { if (!slots.slice(0, MAX_SLOTS).includes(c)) { while (k < MAX_SLOTS && slots[k]) k++; if (k < MAX_SLOTS) slots[k] = c } }
  amulets.forEach((a, i) => { slots[MAX_SLOTS + i] = a })
  return slots
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
    const slots = arrangeSlots(ids.slice(0, TOTAL_SLOTS).map((id) => allChars.find((c) => c.id === id) || null))
    return validateFormation(slots).ok ? slots : null // 壊れた保存データは使わない
  } catch {
    return null
  }
}

// 初期の編成(保存がないとき)
export const defaultFormation = (allChars, ids) =>
  quickFill(ids.map((id) => allChars.find((c) => c.id === id)).filter(Boolean))

// ---- スペルセット(キャラ編成とは別)。最大 MAX_SPELL_SLOTS 回分を有効化できる。同じスペルを何回入れてもよい ----
export const TOKEN_TYPE = 'トークン' // このタイプ(「トークン」「トークン/マナリア/スペル」のように、先頭がトークン)は編成(スペルセット)に入れられない
export const isTokenSpell = (sp) => String(sp?.type || '').split('/')[0] === TOKEN_TYPE
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
  const tok = list.find(isTokenSpell)
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
    return ids.map((id) => allSpells.find((sp) => sp.id === id)).filter((sp) => sp && !isTokenSpell(sp)).slice(0, MAX_SPELL_SLOTS)
  } catch {
    return []
  }
}
