// 部位つき遺物(サーバー): node server/tests/relics_test.mjs
import assert from 'node:assert/strict'
import { createApp } from '../app.js'
import { gateToken } from '../gate.js'
import { forgeRelic, normalizeEquip, piecesOf } from '../relics.js'
import { loadRegistry } from '../pvp/registry.js'
import { buildTeam } from '../pvp/room.js'

// 最小のメモリ上のFirestore
const store = new Map()
const docRef = (path) => ({ path, get: async () => ({ exists: store.has(path), data: () => JSON.parse(JSON.stringify(store.get(path))) }) })
const db = {
  collection: (c) => ({ doc: (id = Math.random().toString(36).slice(2)) => docRef(`${c}/${id}`) }),
  runTransaction: async (fn) => fn({ get: (ref) => ref.get(), set: (ref, v, o) => store.set(ref.path, o?.merge ? { ...(store.get(ref.path) || {}), ...JSON.parse(JSON.stringify(v)) } : JSON.parse(JSON.stringify(v))) }),
}
const auth = { verifyIdToken: async (t) => { if (!t.startsWith('uid:')) throw new Error('bad'); return { uid: t.slice(4) } } }
const FieldValue = { serverTimestamp: () => 0 }
const PW = 'secret'
let n = 0
const app = createApp({ db, auth, FieldValue, masterPassword: PW, randomId: () => `r${++n}` })
const server = await new Promise((r) => { const s = app.listen(0, () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const TOKEN = gateToken(PW)
const api = async (method, path, uid, body, gate = TOKEN) => {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer uid:${uid}`, ...(gate ? { 'X-Gate-Token': gate } : {}) }, body: body ? JSON.stringify(body) : undefined })
  return { status: res.status, body: await res.json().catch(() => ({})) }
}
let bad = 0
const ok = (c, m) => { if (!c) { bad++; console.log('NG', m) } else console.log('ok', m) }

store.set('users/u1', { gems: 0, owned: {}, sig: {}, enh: {} })
store.set('users/u2', { gems: 0, owned: {}, sig: {}, enh: {} })

ok((await api('POST', '/api/relics/forge', 'u1', { part: 'head', stars: 5 }, '')).status === 403, '通行証なしでは、遺物を作れない')
const f1 = await api('POST', '/api/relics/forge', 'u1', { part: 'head', stars: 5, level: 15 })
ok(f1.status === 200 && f1.body.relic.main === 'hp' && f1.body.relic.level === 15 && f1.body.relic.subs.length === 4, '頭部★5 Lv15: メインHP・サブ4個')
ok((await api('POST', '/api/relics/forge', 'u1', { part: 'hand', stars: 9 })).status === 400, 'レア度が不正なら断る')
ok((await api('POST', '/api/relics/forge', 'u1', { part: 'hand', stars: 5, main: 'hp' })).status === 400, '手部にHPのメインは出ない')
const f2 = await api('POST', '/api/relics/forge', 'u1', { part: 'hand', stars: 4 })
const f3 = await api('POST', '/api/relics/forge', 'u1', { part: 'head', stars: 3 })
let g = (await api('GET', '/api/relics', 'u1')).body
ok(g.relics.length === 3, '所持が3個')

const a = await api('POST', '/api/relics/equip', 'u1', { charId: 'royal_17', part: 'head', relicId: f1.body.relic.id })
ok(a.status === 200 && a.body.equip.royal_17.head === f1.body.relic.id, '装備できる')
ok((await api('POST', '/api/relics/equip', 'u1', { charId: 'royal_17', part: 'head', relicId: f2.body.relic.id })).status === 400, '部位の違う遺物は装備できない')
ok((await api('POST', '/api/relics/equip', 'u2', { charId: 'royal_17', part: 'head', relicId: f1.body.relic.id })).status === 400, '他人の遺物は装備できない')
const b = await api('POST', '/api/relics/equip', 'u1', { charId: 'elf_17', part: 'head', relicId: f1.body.relic.id })
ok(b.body.equip.elf_17.head === f1.body.relic.id && !b.body.equip.royal_17?.head, '同じ遺物を別のキャラに付けると、元のキャラから外れる')
const c = await api('POST', '/api/relics/equip', 'u1', { charId: 'elf_17', part: 'head', relicId: null })
ok(!c.body.equip.elf_17?.head, '外せる')
await api('POST', '/api/relics/equip', 'u1', { charId: 'royal_17', part: 'head', relicId: f3.body.relic.id })
const d = await api('POST', '/api/relics/delete', 'u1', { relicId: f3.body.relic.id })
ok(d.body.relics.length === 2 && !d.body.equip.royal_17?.head, '捨てると、装備も外れる')

// PvP: 保存した装備だけが、バトル用の定義に反映される
await api('POST', '/api/relics/equip', 'u1', { charId: 'royal_17', part: 'head', relicId: f1.body.relic.id })
const data = store.get('users/u1')
const reg = await loadRegistry()
const ids = ['royal_17', 'royal_03']
const built = buildTeam(reg, { ids, spells: [], relicPieces: [{ part: 'head', stars: 5, level: 15, main: 'hp', subs: [] }] }, { relicData: data, format: 'infinity' })
ok(!built.error && built.defs[0].relicPieces?.length === 1 && built.defs[0].relicPieces[0].main === 'hp' && !built.defs[1].relicPieces, '対人戦: 保存した装備が反映され、画面から届いた中身は使わない')
ok(normalizeEquip({ x: { head: 'none' } }, []).x === undefined, '持っていない遺物の装備は外れる')
ok(forgeRelic({ part: 'body', stars: 5 }, Math.random, 'z').relic.id === 'z', '胴体の遺物を作れる')
const bannedBuilt = buildTeam(reg, { ids, spells: [] }, { relicData: data })
ok(!bannedBuilt.error && !bannedBuilt.defs[0].relicPieces, 'ローテーションでは、装備していても遺物は反映されない(使用禁止)')
server.close()
console.log(bad ? `NG ${bad}件` : 'OK: すべて合格')
process.exit(bad ? 1 : 0)
