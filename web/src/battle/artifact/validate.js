// Feel Battle - アーティファクト・素材カードの書き間違いチェック
// アーティファクトは「ユニットとして場に出せる定義」(キャラと同じ書き方 + cost / fusions / fuse)です。
import { validateCharacter } from '../characters/validate.js'

const WHEN_KEYS = ['costMin', 'costMax', 'kindsMin', 'kindsMax', 'countMin', 'countMax', 'ids']

export function validateArtifact(def, { expectedId, depth = 0 } = {}) {
  const errors = validateCharacter(def, { expectedId })
  if (!def || typeof def !== 'object') return errors
  if (def.cost != null && !(Number.isInteger(def.cost) && def.cost >= 0)) errors.push('cost(場に出すMP)は0以上の整数にしてください')
  if (def.fuse != null) {
    if (typeof def.fuse !== 'object') errors.push('fuse は { max, cost } の形にしてください')
    else {
      if (def.fuse.max != null && !(Number.isInteger(def.fuse.max) && def.fuse.max >= 1)) errors.push('fuse.max は1以上の整数にしてください')
      if (def.fuse.cost != null && !(Number.isInteger(def.fuse.cost) && def.fuse.cost >= 0)) errors.push('fuse.cost は0以上の整数にしてください')
    }
  }
  if (def.fusions != null) {
    if (!Array.isArray(def.fusions)) errors.push('fusions は配列にしてください')
    else if (depth > 8) errors.push('fusions が深すぎます(循環していませんか?)')
    else def.fusions.forEach((f, i) => {
      const at = `fusions[${i}]`
      if (!f || typeof f !== 'object') return errors.push(`${at}: { when, into } の形にしてください`)
      for (const k of Object.keys(f.when || {})) if (!WHEN_KEYS.includes(k)) errors.push(`${at}.when: 「${k}」は使えません(使えるのは ${WHEN_KEYS.join(' / ')})`)
      if (f.when?.ids != null && !Array.isArray(f.when.ids)) errors.push(`${at}.when.ids は素材のidの配列にしてください`)
      if (!f.into) return errors.push(`${at}: into(変身先のアーティファクト)がありません`)
      for (const m of validateArtifact(f.into, { depth: depth + 1 })) errors.push(`${at}.into: ${m}`)
    })
  }
  return errors
}

export function validateMaterial(def, { expectedId } = {}) {
  const errors = []
  if (!def || typeof def !== 'object') return ['素材のデータがオブジェクトではありません']
  if (!def.id || typeof def.id !== 'string') errors.push('id がありません')
  else if (expectedId && def.id !== expectedId) errors.push(`id「${def.id}」がファイル名「${expectedId}」と違います`)
  if (!def.name) errors.push('name がありません')
  if (!(Number.isInteger(def.cost) && def.cost >= 0)) errors.push('cost(素材としてのコスト)は0以上の整数にしてください')
  return errors
}
