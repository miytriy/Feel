// 遺物を、人事画面から自由に持たせる(どのキャラにも、どの遺物でも)。選んだ内容はこの端末に覚えておく。
// 持たせた遺物は、自分のチームでバトルするとき(CPU戦・テスト戦)に、元のステータスに反映される。
// 保存の形: { キャラのid: 遺物の名前 | '' }   '' は「遺物なし」。載っていないキャラは、キャラ本来の遺物のまま。
import { useSyncExternalStore } from 'react'
import { RELICS } from './battle/engine.js'
import { rotationAllowed, DEFAULT_FORMAT, FORMATS, ROTATIONS } from './battle/rotations.js'

const KEY = 'feel.relics'
const listeners = new Set()
let cache = null

function load() {
  if (cache) return cache
  let m = {}
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}')
    for (const [id, name] of Object.entries(raw || {})) if (name === '' || RELICS[name]) m[id] = name // 知らない遺物は捨てる
  } catch { m = {} }
  cache = m
  return cache
}

export const relicChoices = () => load()
// そのキャラが、いま持っている遺物の名前(なければ null)
export const relicOf = (def) => {
  const m = load()
  if (def.id in m) return m[def.id] || null
  return def.relic || null
}
export const hasRelicChoice = (def) => def.id in load()
// name: 遺物の名前 / '' で「なし」/ null で「キャラ本来の遺物に戻す」
export function setRelicChoice(def, name) {
  const next = { ...load() }
  if (name == null) delete next[def.id]
  else next[def.id] = name
  cache = next
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* 保存できなくても、このまま遊べる */ }
  listeners.forEach((f) => f())
}
// バトルに出すキャラ定義へ、選んだ遺物を反映する
export const withRelic = (def) => {
  const m = load()
  if (!(def.id in m)) return def
  const r = m[def.id]
  const { relic: _old, ...rest } = def
  return r ? { ...rest, relic: r } : rest
}
// 対人戦のサーバーへ送る、編成のキャラに持たせた遺物 { キャラid: 遺物の名前 | '' }(選んでいないキャラは含めない)
// 対人戦に送る遺物。その形式で使えない遺物は、送らずに「遺物なし」にする(サーバー側でも同じ検査をする)
export const relicPayload = (defs, format = DEFAULT_FORMAT) => {
  const m = load(), o = {}
  for (const d of defs || []) {
    if (!(d.id in m)) continue
    const n = m[d.id]
    o[d.id] = n && !rotationAllowed(format, RELICS[n]?.rotation) ? '' : n
  }
  return o
}
// 遺物が、どの形式で使えるか(人事画面の表示用)。例: 'ベーシック / ローテーション・アンリミテッド'
export const relicFormats = (name) => Object.keys(FORMATS).filter((f) => rotationAllowed(f, RELICS[name]?.rotation)).map((f) => FORMATS[f].name)
export const relicRotationName = (name) => { const r = RELICS[name]?.rotation; return ROTATIONS[r] ?? String(r ?? '') }
export function useRelicChoices() {
  return useSyncExternalStore((f) => { listeners.add(f); return () => listeners.delete(f) }, () => load())
}
