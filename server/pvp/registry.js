// 対人戦用: キャラ・スペルの定義を、サーバー(Node)で読み込む。
// 画面側の web/src/battle/characters/index.js と spells/index.js は Vite の機能(import.meta.glob)を使うので、
// サーバーでは、同じフォルダを fs で走査して、同じ検証をかけて読み込む(結果は同じ一覧になる)。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const BATTLE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/src/battle')

function walk(dir, rel = []) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) out.push(...walk(path.join(dir, e.name), [...rel, e.name]))
    else if (e.name.endsWith('.js')) out.push([...rel, e.name])
  }
  return out
}

// フォルダの中のファイルを、{ './class/x.js': モジュール } の形で読む(画面側の glob と同じキー)。depth 1(index.js など)は除く
async function loadModules(dir, prefix) {
  const mods = {}
  for (const parts of walk(dir)) {
    if (parts.length < 2) continue
    mods[`${prefix}${parts.join('/')}`] = await import(pathToFileURL(path.join(dir, ...parts)).href)
  }
  return mods
}

let cache = null
export async function loadRegistry() {
  if (cache) return cache
  const { validateCharacter } = await import(pathToFileURL(path.join(BATTLE, 'characters/validate.js')).href)
  const { validateSpell } = await import(pathToFileURL(path.join(BATTLE, 'spells/validate.js')).href)
  const { rotationOfPath } = await import(pathToFileURL(path.join(BATTLE, 'rotations.js')).href)

  const charMods = {
    ...(await loadModules(path.join(BATTLE, 'characters'), './')),
    ...(await loadModules(path.join(BATTLE, 'amulet'), '../amulet/')),
  }
  const chars = []
  for (const [p, mod] of Object.entries(charMods)) {
    const defs = Array.isArray(mod.default) ? mod.default : [mod.default]
    const fileId = p.split('/').pop().replace(/\.js$/, '')
    for (const def of defs) {
      const errors = validateCharacter(def, { expectedId: defs.length === 1 && !p.includes('/tokens/') ? fileId : undefined })
      if (errors.length || chars.some((c) => c.id === def.id)) continue
      const rotation = def.rotation ?? rotationOfPath(p)
      chars.push(rotation ? { ...def, rotation } : def)
    }
  }
  const spellMods = await loadModules(path.join(BATTLE, 'spells'), './')
  const spells = []
  for (const [p, mod] of Object.entries(spellMods)) {
    if (p === './validate.js') continue
    const def = mod.default
    if (!def) continue
    const fileId = p.split('/').pop().replace(/\.js$/, '')
    const errors = validateSpell(def, { expectedId: p.includes('/tokens/') ? undefined : fileId })
    if (errors.length || spells.some((c) => c.id === def.id)) continue
    const rotation = def.rotation ?? rotationOfPath(p)
    spells.push(rotation ? { ...def, rotation } : def)
  }
  chars.sort((a, b) => a.id.localeCompare(b.id)); spells.sort((a, b) => a.id.localeCompare(b.id))
  const engine = await import(pathToFileURL(path.join(BATTLE, 'engine.js')).href)
  const ai = await import(pathToFileURL(path.join(BATTLE, 'ai.js')).href)
  const formation = await import(pathToFileURL(path.join(BATTLE, 'formation.js')).href)
  const enhance = await import(pathToFileURL(path.join(BATTLE, '../enhance.js')).href)
  const testChars = await import(pathToFileURL(path.join(BATTLE, 'characters/test/test_chars.js')).href).catch(() => null)
  cache = { chars, spells, engine, ai, formation, enhance, charById: new Map(chars.map((c) => [c.id, c])), spellById: new Map(spells.map((s) => [s.id, s])), testChars }
  return cache
}
