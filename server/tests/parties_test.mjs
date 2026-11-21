// パーティー(編成)のアカウント保存: node server/tests/parties_test.mjs
import assert from 'node:assert/strict'
import { createApp } from '../app.js'
import { gateToken } from '../gate.js'

// 最小のメモリ上のFirestore
const store = new Map()
const docRef = (path) => ({ path, set: async (v, o) => { store.set(path, o?.merge ? { ...(store.get(path) || {}), ...JSON.parse(JSON.stringify(v)) } : JSON.parse(JSON.stringify(v))) }, get: async () => ({ exists: store.has(path), data: () => JSON.parse(JSON.stringify(store.get(path))) }) })
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
const mine = (n) => ({ ids: ['a' + n, 'b' + n, null, null, null, null, null], spellIds: ['s' + n] })

ok((await fetch(base + '/api/parties', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Gate-Token': TOKEN }, body: JSON.stringify({ list: [mine(1)] }) })).status === 401, 'ログインしていないと、保存できない(アカウント所持者だけ)')
const r = await api('POST', '/api/parties', 'u1', { list: [mine(1), mine(2)], active: 1 })
ok(r.status === 200 && r.body.parties.list.length === 36 && r.body.parties.active === 1, '36枠(フォーマット3つ×12)に整えて保存できる')
ok(store.get('users/u1').parties.list[1].ids[0] === 'a2', 'アカウントのデータに入る')
ok(JSON.stringify(store.get('users/u1').parties.list[35]) === JSON.stringify({ ids: Array(7).fill(null), spellIds: [] }), '足りない枠は空にする')
ok(!store.get('users/u2').parties, '別のアカウントには入らない(本人だけ)')
ok((await api('GET', '/api/me', 'u1')).body.parties?.list?.[0]?.ids?.[0] === 'a1', '/api/me で、自分の編成が返る')
ok((await api('GET', '/api/me', 'u2')).body.parties == null, '/api/me で、他人の編成は返らない')
ok((await api('POST', '/api/parties', 'u1', { list: 'x' })).status === 400, '形が違うと断る')
ok((await api('POST', '/api/parties', 'u1', { list: Array(37).fill(mine(1)) })).status === 400, '37枠以上は断る')
const big = await api('POST', '/api/parties', 'u1', { list: [{ ids: ['x'.repeat(100), 5, 'ok', ...Array(9).fill('z')], spellIds: ['1', '2', '3', '4', '5'] }], active: 99 })
ok(big.body.parties.list[0].ids.length === 7 && big.body.parties.list[0].ids[0] === null && big.body.parties.list[0].ids[1] === null && big.body.parties.list[0].ids[2] === 'ok' && big.body.parties.list[0].spellIds.length === 3 && big.body.parties.active === null, '長すぎる・変な値は、整えて保存する')
server.close()
console.log(bad ? `NG ${bad}` : '全部OK')
process.exit(bad ? 1 : 0)
