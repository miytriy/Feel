// 部位つき遺物の所持・装備(サーバー側)。遺物の中身(メイン・サブ)は、サーバーだけが作る。画面から届いた中身は、信用しない。
// 保存場所: users/{uid} の relics(所持の配列)と relicEquip({ キャラid: { 部位: 遺物のid } })
import { generateRelic, PART_IDS, RELIC_PARTS, RELIC_RARITIES } from '../web/src/battle/relicRules.js'

export const RELIC_INV_MAX = 300 // 持てる遺物の数

export function forgeRelic({ part, stars, main, level }, rng, id) {
  if (!PART_IDS.includes(part)) return { error: '部位が正しくありません' }
  const st = Number(stars)
  if (!RELIC_RARITIES[st]) return { error: 'レア度が正しくありません' }
  const lv = level == null ? 0 : Number(level)
  if (!Number.isInteger(lv) || lv < 0 || lv > RELIC_RARITIES[st].maxLevel) return { error: 'レベルが正しくありません' }
  if (main != null && !RELIC_PARTS[part].mains.includes(main)) return { error: 'その部位に出ないメインステータスです' }
  return { relic: { id, ...generateRelic(part, st, rng, { main: main ?? undefined, level: lv }) } }
}

// 装備の形を整える: 持っていない遺物・部位の違う遺物・同じ遺物の二重装備は、外す
export function normalizeEquip(equip, relics) {
  const byId = new Map((relics || []).map((r) => [r.id, r]))
  const used = new Set(), out = {}
  for (const [cid, slots] of Object.entries(equip || {})) {
    if (!slots || typeof slots !== 'object') continue
    for (const part of PART_IDS) {
      const rid = slots[part]
      const r = byId.get(rid)
      if (!r || r.part !== part || used.has(rid)) continue
      used.add(rid)
      ;(out[cid] ||= {})[part] = rid
    }
  }
  return out
}

// キャラに装備している遺物(バトルの relicPieces に使う)
export function piecesOf(data, charId) {
  const slots = data?.relicEquip?.[charId]
  if (!slots) return []
  const byId = new Map((data.relics || []).map((r) => [r.id, r]))
  return PART_IDS.map((p) => { const r = byId.get(slots[p]); return r && r.part === p ? r : null }).filter(Boolean).map(({ id: _id, ...r }) => r)
}
