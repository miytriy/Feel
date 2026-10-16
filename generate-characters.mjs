// Feel - server/characters.json(ガチャの排出リスト)を、キャラのファイルから自動で作る
//
// 使い方(パソコンで試すとき): リポジトリの一番上で  node scripts/generate-characters.mjs
// ふだんは、キャラのファイルを GitHub に保存すると自動で動きます(.github/workflows/sync-characters.yml)。
//
// - web/src/battle/characters/ の中の「test」以外のフォルダにあるキャラ(1体1ファイル)を全部集めて、
//   id・name・class・rarity だけを server/characters.json に書き出します。
// - まだキャラのファイルがないけれど、ガチャに入れたいキャラは scripts/gacha-extra.json に書きます。
//   (同じidのキャラのファイルができたら、ファイルのほうが優先されます)
// - 書き間違い(必須項目なし・id重複など)があれば、エラーで止まります。そのときは characters.json は変わりません。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const charDir = path.join(root, 'web/src/battle/characters')
const outFile = path.join(root, 'server/characters.json')
const extraFile = path.join(root, 'scripts/gacha-extra.json')

const { validateCharacter, CLASSES, RARITIES } = await import(pathToFileURL(path.join(charDir, 'validate.js')).href)

const errors = []
const map = new Map() // id -> { id, name, class, rarity }
const fromFile = new Set()

for (const dir of fs.readdirSync(charDir, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== 'test')) {
  for (const f of fs.readdirSync(path.join(charDir, dir.name)).filter((x) => x.endsWith('.js')).sort()) {
    const rel = `${dir.name}/${f}`
    let mod
    try {
      mod = await import(pathToFileURL(path.join(charDir, dir.name, f)).href)
    } catch (e) {
      errors.push(`${rel}: 読み込めません(${e.message})`)
      continue
    }
    const defs = Array.isArray(mod.default) ? mod.default : [mod.default]
    const fileId = f.replace(/\.js$/, '')
    for (const def of defs) {
      const errs = validateCharacter(def, { expectedId: defs.length === 1 ? fileId : undefined })
      if (errs.length) { errors.push(`${rel}: ${errs.join(' / ')}`); continue }
      if (fromFile.has(def.id)) { errors.push(`${rel}: id「${def.id}」が重複しています`); continue }
      fromFile.add(def.id)
      map.set(def.id, { id: def.id, name: def.name, class: def.class, rarity: def.rarity })
    }
  }
}

// ファイルがまだないが、ガチャに入れるキャラ
let extras = []
if (fs.existsSync(extraFile)) {
  try {
    extras = JSON.parse(fs.readFileSync(extraFile, 'utf8'))
  } catch (e) {
    errors.push(`scripts/gacha-extra.json: JSONの書き方が正しくありません(${e.message})`)
  }
}
for (const x of Array.isArray(extras) ? extras : []) {
  if (!x || typeof x.id !== 'string' || typeof x.name !== 'string' || !CLASSES.includes(x.class) || !RARITIES.includes(x.rarity)) {
    errors.push(`scripts/gacha-extra.json: 項目が正しくありません ${JSON.stringify(x)}`)
    continue
  }
  if (fromFile.has(x.id)) console.log(`メモ: ${x.id} はキャラのファイルができたので、gacha-extra.json の分は使いません(消して大丈夫です)`)
  else map.set(x.id, { id: x.id, name: x.name, class: x.class, rarity: x.rarity })
}

if (errors.length) {
  console.error('キャラデータに問題があります。characters.json は変更しませんでした:\n - ' + errors.join('\n - '))
  process.exit(1)
}

// 並び順: ニュートラル → エルフ → ロイヤル → その他、それぞれ id 順
const order = ['neutral', 'elf', 'royal']
const rank = (id) => { const i = order.indexOf(id.split('_')[0]); return i < 0 ? order.length : i }
const list = [...map.values()].sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id))

const line = (c) => `  { "id": ${JSON.stringify(c.id)}, "name": ${JSON.stringify(c.name)}, "class": ${JSON.stringify(c.class)}, "rarity": ${JSON.stringify(c.rarity)} }`
const text = '[\n' + list.map(line).join(',\n') + '\n]\n'
JSON.parse(text) // 念のため、書き出す前にJSONとして正しいか確認
fs.writeFileSync(outFile, text)
console.log(`server/characters.json を作りました(${list.length}体)`)
