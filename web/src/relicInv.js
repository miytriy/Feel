// 部位つき遺物: 所持と装備(サーバーに保存してあるものを、この端末に写して使う)
import { useSyncExternalStore } from 'react'
import { fetchRelics, forgeRelicApi, equipRelicApi, deleteRelicApi } from './api.js'
import { PART_IDS } from './battle/relicRules.js'

let state = { relics: [], equip: {}, max: 300, loaded: false, error: '' }
const listeners = new Set()
const set = (patch) => { state = { ...state, ...patch }; listeners.forEach((f) => f()) }
export const useRelicInv = () => useSyncExternalStore((f) => { listeners.add(f); return () => listeners.delete(f) }, () => state)

// サーバーから読み込む(ログインしていないときは、読み込めない)
export async function loadRelics() {
  try {
    const r = await fetchRelics()
    set({ relics: r.relics || [], equip: r.equip || {}, max: r.max || 300, loaded: true, error: '' })
  } catch (e) { set({ loaded: false, error: e.message || '遺物を読み込めませんでした' }) }
}
export const clearRelics = () => set({ relics: [], equip: {}, loaded: false, error: '' })
export async function forgeRelic(opts) { const r = await forgeRelicApi(opts); set({ relics: [...state.relics, r.relic] }); return r.relic }
export async function equipRelic(charId, part, relicId) { const r = await equipRelicApi(charId, part, relicId); set({ equip: r.equip }) }
export async function deleteRelic(relicId) { const r = await deleteRelicApi(relicId); set({ relics: r.relics, equip: r.equip }) }

// そのキャラが装備している遺物(部位の順)
export function equippedOf(charId, s = state) {
  const slots = s.equip[charId] || {}
  return PART_IDS.map((p) => s.relics.find((r) => r.id === slots[p] && r.part === p)).filter(Boolean)
}
// どのキャラが付けているか(遺物のid → キャラid)
export function ownerMap(s = state) {
  const m = {}
  for (const [cid, slots] of Object.entries(s.equip)) for (const rid of Object.values(slots)) m[rid] = cid
  return m
}
// バトルに出す自分のキャラ定義へ、装備している遺物を反映する(CPU戦・テスト戦。対人戦はサーバーが、保存してある装備を使う)
export const withRelicPieces = (def) => {
  const p = equippedOf(def.id).map(({ id: _id, ...r }) => r)
  return p.length ? { ...def, relicPieces: p } : def
}
