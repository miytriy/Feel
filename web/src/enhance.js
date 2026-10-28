// 署名による強化(1回で全ステータス+10)。ステータスの上乗せは、戦闘に入る前のキャラ定義に反映する
export const SIG_PER_LEVEL = 100
export const ENHANCE_STEP = 10

let levels = {}
export const setEnhanceLevels = (map) => { levels = map || {} }
export const enhanceLevelOf = (id) => levels[id] || 0

// 強化レベルぶんのステータスを足した定義を返す(レベル0なら、元の定義のまま)。魔力は、持っているキャラだけ
export function enhanceDef(def, lv = levels[def?.id] || 0) {
  if (!def || !(lv > 0) || def.amulet) return def
  const add = lv * ENHANCE_STEP
  const stats = { ...def.stats }
  for (const k of ['hp', 'atk', 'def', 'spd']) stats[k] = (stats[k] || 0) + add
  if (stats.mag != null) stats.mag += add
  return { ...def, stats }
}
