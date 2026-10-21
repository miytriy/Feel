// Feel Battle - キャラクター一覧(自動で集めます)
//
// キャラを増やすには、このフォルダの中のフォルダ(test / neutral / elf など)に
// 「キャラのid.js」というファイルを1つ作るだけです(1体につき1ファイル)。ここは編集しなくて大丈夫です。
// 書き方は _template.js を見てください。
import { validateCharacter } from './validate.js'

// ./フォルダ名/ファイル名.js をすべて読み込む(Viteの機能)
const modules = import.meta.glob(['./*/*.js', './*/tokens/*.js', '../amulet/*/*.js', '../amulet/*/tokens/*.js'], { eager: true }) // tokens フォルダ: 召喚専用のトークン(ファイル名とidが違ってもOK) / ../amulet フォルダ: アミュレット(amulet/クラス名/id.js。キャラとは別のフォルダ。編成に入れられる。ファイル名=id。召喚専用のものは amulet/クラス名/tokens/)

const list = []
for (const [path, mod] of Object.entries(modules)) {
  // 1ファイルに1体(export default { ... }) か、まとめて複数体(export default [ ... ]) のどちらでも読める
  const defs = Array.isArray(mod.default) ? mod.default : [mod.default]
  const fileId = path.split('/').pop().replace(/\.js$/, '')
  for (const def of defs) {
    // 1体だけのファイルは、idとファイル名が同じかもチェックする
    const errors = validateCharacter(def, { expectedId: defs.length === 1 && !path.includes('/tokens/') ? fileId : undefined })
    if (errors.length) {
      // 書き間違いがあっても画面は止めず、原因をコンソールに出す(そのキャラは一覧に入れない)
      console.error(`[キャラデータの問題] ${path}\n - ${errors.join('\n - ')}`)
      continue
    }
    if (list.some((c) => c.id === def.id)) {
      console.error(`[キャラデータの問題] ${path}: id「${def.id}」が重複しています(後のものは使いません)`)
      continue
    }
    list.push(def)
  }
}

export const ALL_CHARACTERS = list.sort((a, b) => a.id.localeCompare(b.id))
export const charById = (id) => ALL_CHARACTERS.find((c) => c.id === id)
