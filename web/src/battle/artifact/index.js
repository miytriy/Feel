// Feel Battle - アーティファクト・素材カード一覧(自動で集めます)
//
// アーティファクト: artifact/クラス名/ピックアップ/id.js (例: artifact/witch/1/artifact_witch_01.js) に1つずつ置く。書き方は _template.js
// 素材カード    : artifact/materials/id.js (または materials/ピックアップ/id.js) に1つずつ置く
// 変身先(トークン)は artifact/クラス名/tokens/ に置くと、ファイル名とidが違ってもOK(一覧には入れず、融合の変身先としてだけ使う)
import { validateArtifact, validateMaterial } from './validate.js'
import { rotationOfPath } from '../rotations.js'

const artMods = import.meta.glob(['./*/*/*.js', './*/*/tokens/*.js', './*/tokens/*.js'], { eager: true })
const matMods = import.meta.glob(['./materials/*.js', './materials/*/*.js'], { eager: true })

const arts = []
for (const [path, mod] of Object.entries(artMods)) {
  if (path.startsWith('./materials/') || /\/_[^/]*\.js$/.test(path)) continue
  const def = mod.default
  const isToken = path.includes('/tokens/')
  const errors = validateArtifact(def, { expectedId: isToken ? undefined : path.split('/').pop().replace(/\.js$/, '') })
  if (errors.length) { console.error(`[アーティファクトデータの問題] ${path}\n - ${errors.join('\n - ')}`); continue }
  if (isToken) continue
  if (arts.some((c) => c.id === def.id)) { console.error(`[アーティファクトデータの問題] ${path}: id「${def.id}」が重複しています`); continue }
  const rotation = def.rotation ?? rotationOfPath(path)
  arts.push({ ...def, unitType: 'アーティファクト', ...(rotation ? { rotation } : {}) })
}
export const ALL_ARTIFACTS = arts.sort((a, b) => a.id.localeCompare(b.id))
export const artifactById = (id) => ALL_ARTIFACTS.find((c) => c.id === id)

const mats = []
for (const [path, mod] of Object.entries(matMods)) {
  if (/\/_[^/]*\.js$/.test(path)) continue
  const def = mod.default
  const errors = validateMaterial(def, { expectedId: path.split('/').pop().replace(/\.js$/, '') })
  if (errors.length) { console.error(`[素材カードデータの問題] ${path}\n - ${errors.join('\n - ')}`); continue }
  if (mats.some((c) => c.id === def.id)) { console.error(`[素材カードデータの問題] ${path}: id「${def.id}」が重複しています`); continue }
  const rotation = def.rotation ?? rotationOfPath(path)
  mats.push({ ...def, unitType: '素材', ...(rotation ? { rotation } : {}) })
}
export const ALL_MATERIALS = mats.sort((a, b) => a.id.localeCompare(b.id))
export const materialById = (id) => ALL_MATERIALS.find((c) => c.id === id)
