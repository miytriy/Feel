// Feel Battle - パーティー(編成の保存枠)。アカウントごとに最大 MAX_PARTIES 個まで保存できる。
// いまは、この端末のブラウザに保存する(アカウントのIDごとに分ける)。あとでサーバーに変えやすいよう、画面とは切り離してある。
import { MAX_SLOTS } from './formation.js'
import { MAX_SPELL_SLOTS } from './engine.js'

export const MAX_PARTIES = 5
const partiesKey = (uid) => `feel.parties.v1.${uid}`
const activeKey = (uid) => `feel.parties.active.v1.${uid}`

export const emptyParty = () => ({ ids: Array(MAX_SLOTS).fill(null), spellIds: [] })

// 保存データの形を整える(壊れたデータでも、必ず MAX_PARTIES 個の正しい形にする)
function normalize(raw) {
  const list = Array.isArray(raw) ? raw : []
  return Array.from({ length: MAX_PARTIES }, (_, i) => {
    const p = list[i]
    if (!p || !Array.isArray(p.ids)) return emptyParty()
    const ids = p.ids.slice(0, MAX_SLOTS).map((x) => (typeof x === 'string' ? x : null))
    while (ids.length < MAX_SLOTS) ids.push(null)
    const spellIds = Array.isArray(p.spellIds) ? p.spellIds.filter((x) => typeof x === 'string').slice(0, MAX_SPELL_SLOTS) : []
    return { ids, spellIds }
  })
}

export function loadParties(uid, storage = globalThis.localStorage) {
  try {
    return normalize(JSON.parse(storage.getItem(partiesKey(uid)) || 'null'))
  } catch {
    return normalize(null)
  }
}

// index番目のパーティーを保存する。成功したら、保存後の全パーティーを返す(失敗したら null)
export function saveParty(uid, index, slots, spellSet, storage = globalThis.localStorage) {
  if (!Number.isInteger(index) || index < 0 || index >= MAX_PARTIES) return null
  try {
    const all = loadParties(uid, storage)
    all[index] = { ids: slots.map((c) => (c ? c.id : null)), spellIds: spellSet.map((sp) => sp.id) }
    storage.setItem(partiesKey(uid), JSON.stringify(all))
    return all
  } catch {
    return null
  }
}

// 最後に選んだパーティーの番号(なければ null)
export function getActiveParty(uid, storage = globalThis.localStorage) {
  try {
    const n = JSON.parse(storage.getItem(activeKey(uid)) || 'null')
    return Number.isInteger(n) && n >= 0 && n < MAX_PARTIES ? n : null
  } catch {
    return null
  }
}
export function setActiveParty(uid, index, storage = globalThis.localStorage) {
  try { storage.setItem(activeKey(uid), JSON.stringify(index)) } catch { /* 保存できなくても動く */ }
}

// 保存データ(id)から、キャラ・スペルの定義に戻す。なくなったキャラ・スペルは空きにする
export const partyToSlots = (party, allChars) => party.ids.map((id) => allChars.find((c) => c.id === id) || null)
export const partyToSpells = (party, allSpells) => party.spellIds.map((id) => allSpells.find((sp) => sp.id === id)).filter(Boolean)
export const partyCount = (party) => party.ids.filter(Boolean).length
