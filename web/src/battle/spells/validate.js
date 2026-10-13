// Feel Battle - スペルのデータが正しい書き方かをチェックする
import { validateEffects, RARITIES, CLASSES } from '../characters/validate.js'

const isStr = (x) => typeof x === 'string' && x.length > 0
// スペルは「キャラ」ではなくプレイヤーの能力なので、キャラ自身を指す対象や、対象を選ぶ効果は使えない
const BAD_TARGETS = ['self', 'allyOne', 'otherAllyOne', 'enemyOne', 'entered']

export function validateSpell(def, opts = {}) {
  const errs = []
  const label = def && def.name ? `「${def.name}」` : '(名前なし)'
  const add = (m) => errs.push(`${label}: ${m}`)
  if (!def || typeof def !== 'object') return ['スペルのデータがオブジェクトではありません']
  if (!isStr(def.id)) add('id がありません')
  if (opts.expectedId && def.id !== opts.expectedId) add(`id「${def.id}」がファイル名「${opts.expectedId}」と違います`)
  if (!isStr(def.name)) add('name(名前)がありません')
  const k = String(def.class || '').split('/')
  if (k.length !== 2 || k[1] !== 'スペル' || !CLASSES.includes(k[0])) add(`class は「クラス名/スペル」の形で書いてください(例: エルフ/スペル)`)
  if (def.rarity != null && !RARITIES.includes(def.rarity)) add(`rarity「${def.rarity}」は使えません`)
  if (typeof def.cost !== 'number' || !Number.isFinite(def.cost) || def.cost < 0) add('cost(MP)は0以上の数字で書いてください')
  if (!Array.isArray(def.effects) || def.effects.length === 0) add('effects は1つ以上の配列で書いてください')
  else {
    errs.push(...validateEffects(def.effects, `${label}`))
    def.effects.forEach((e, i) => {
      if (e && BAD_TARGETS.includes(e.target)) add(`効果${i + 1}: スペルでは対象「${e.target}」は使えません`)
      if (e && e.choose) add(`効果${i + 1}: スペルでは「対象を選ぶ(choose)」効果はまだ使えません`)
    })
  }
  return errs
}
