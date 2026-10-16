// Feel Battle - スペル一覧(自動で集めます)
// スペルを増やすには、このフォルダに「スペルのid.js」を1つ作るだけです(1つにつき1ファイル)。
import { validateSpell } from './validate.js'

const modules = import.meta.glob(['./*.js', './*/*.js'], { eager: true }) // クラスごとのフォルダ(例: ./royal/xxx.js)に置いてもOK
const list = []
for (const [path, mod] of Object.entries(modules)) {
  if (path === './index.js' || path === './validate.js') continue // (./validate.js 以外のフォルダ内のファイルは、すべてスペルとして読む)
  const def = mod.default
  const fileId = path.split('/').pop().replace(/\.js$/, '')
  const errors = validateSpell(def, { expectedId: fileId })
  if (errors.length) {
    console.error(`[スペルデータの問題] ${path}\n - ${errors.join('\n - ')}`)
    continue
  }
  if (list.some((c) => c.id === def.id)) { console.error(`[スペルデータの問題] ${path}: id「${def.id}」が重複しています`); continue }
  list.push(def)
}
export const ALL_SPELLS = list.sort((a, b) => a.id.localeCompare(b.id))
export const spellById = (id) => ALL_SPELLS.find((c) => c.id === id)
