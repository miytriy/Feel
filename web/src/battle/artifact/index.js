// Feel Battle - アーティファクト一覧(自動で集めます)
//
// アーティファクト: artifact/クラス名/ピックアップ/id.js (例: artifact/witch/1/artifact_witch_01.js) に1つずつ置く。書き方は _template.js
// 融合の素材は、手持ちの別のアーティファクトです(素材専用のカードはありません)
// 変身先(トークン)は artifact/クラス名/tokens/ に置くと、ファイル名とidが違ってもOK(一覧には入れず、融合の変身先としてだけ使う)
import { validateArtifact } from './validate.js'
import { rotationOfPath } from '../rotations.js'

const artMods = import.meta.glob(['./*/*/*.js', './*/*/tokens/*.js', './*/tokens/*.js'], { eager: true })

const arts = []
const tokens = [] // 変身先などのトークン
for (const [path, mod] of Object.entries(artMods)) {
  if (/\/_[^/]*\.js$/.test(path)) continue
  const def = mod.default
  const isToken = path.includes('/tokens/')
  const errors = validateArtifact(def, { expectedId: isToken ? undefined : path.split('/').pop().replace(/\.js$/, '') })
  if (errors.length) { console.error(`[アーティファクトデータの問題] ${path}\n - ${errors.join('\n - ')}`); continue }
  if (isToken) { tokens.push(def); continue }
  if (arts.some((c) => c.id === def.id)) { console.error(`[アーティファクトデータの問題] ${path}: id「${def.id}」が重複しています`); continue }
  const rotation = def.rotation ?? rotationOfPath(path)
  arts.push({ ...def, unitType: 'アーティファクト', ...(rotation ? { rotation } : {}) })
}
export const ALL_ARTIFACTS = arts.sort((a, b) => a.id.localeCompare(b.id))
// 融合の変身先を探す一覧(アーティファクト + トークン)。バトルを作るときに artifactCatalog として渡す
export const ARTIFACT_CATALOG = [...ALL_ARTIFACTS, ...tokens]
export const artifactById = (id) => ALL_ARTIFACTS.find((c) => c.id === id)
