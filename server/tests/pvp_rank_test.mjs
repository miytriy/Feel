// ランクマッチのテスト: 待ち行列 → 組み合わせ → 降参 → BP が保存されて、2人に知らされる(認証とFirestoreは偽物)
import http from 'node:http'
import WebSocket from 'ws'
import { attachPvp } from '../pvp/ws.js'
import { loadRegistry } from '../pvp/registry.js'

const reg = await loadRegistry()
const mains = reg.chars.filter((c) => !c.amulet && !c.id.startsWith('test_') && c.class === 'ニュートラル')
const ids = mains.slice(0, 3).map((c) => c.id)
const owned = Object.fromEntries(ids.map((i) => [i, 1]))
const users = { u1: { owned, rank: { bp: 100, wins: 0, losses: 0, streak: 0 } }, u2: { owned, rank: { bp: 250 } }, u3: { owned, rank: { bp: 6000 } }, u4: { owned } }
const auth = { verifyIdToken: async (t) => { if (!users[t]) throw new Error('bad'); return { uid: t } } }
const db = { collection: () => ({ doc: (uid) => ({ get: async () => ({ exists: !!users[uid], data: () => users[uid] }), set: async (d) => { users[uid] = { ...users[uid], ...d } } }) }) }
const server = http.createServer(); await new Promise((r) => server.listen(0, r))
const pvp = attachPvp({ server, auth, db })
const url = `ws://127.0.0.1:${server.address().port}/pvp`
let failed = 0
const ok = (c, m) => { if (!c) { failed++; console.log('NG', m) } else console.log('ok', m) }
function client(token) {
  const ws = new WebSocket(url); const inbox = []; const waiters = []
  ws.on('message', (d) => { const m = JSON.parse(String(d)); inbox.push(m); waiters.splice(0).forEach((w) => w()) })
  const next = async (type, ms = 5000) => { const t0 = Date.now(); for (;;) { const i = inbox.findIndex((m) => m.type === type); if (i >= 0) return inbox.splice(i, 1)[0]; if (Date.now() - t0 > ms) throw new Error('timeout ' + type); await new Promise((r) => { waiters.push(r); setTimeout(r, 100) }) } }
  const send = (m) => ws.send(JSON.stringify(m))
  return new Promise((res) => ws.on('open', async () => { send({ type: 'auth', token }); await next('authed'); res({ ws, send, next, inbox }) }))
}
const team = { ids, spells: [] }
const [a, b, far] = [await client('u1'), await client('u2'), await client('u3')]
far.send({ type: 'queue', team }); ok((await far.next('queued')).bp === 6000, '待ち行列に入る(BPが返る)')
a.send({ type: 'queue', team }); ok((await a.next('queued')).bp === 100, 'u1 も入る')
a.send({ type: 'queue', team }); ok((await a.next('error')).message.includes('すでに'), '二重に入れない')
b.send({ type: 'queue', team }); await b.next('queued')
const sa = await a.next('start'), sb = await b.next('start')
ok(sa.ranked && sb.ranked && sa.side !== sb.side, '近いBPの2人が組み合わされる(ランク戦)')
ok(typeof sa.opp.bp === 'number', '相手のBPが分かる')
await new Promise((r) => setTimeout(r, 1300))
ok(far.inbox.every((m) => m.type !== 'start'), '遠いBPの人は、まだ組み合わされない')
far.send({ type: 'queue-cancel' }); ok((await far.next('queue-left')).reason, '待ち行列をやめられる')
// u1 が降参 → u2 の勝ち
a.send({ type: 'surrender' })
const ra = await a.next('rank'), rb = await b.next('rank')
ok(ra.delta < 0 && rb.delta > 0, `BPが動く(u1 ${ra.delta} / u2 +${rb.delta})`)
ok(users.u2.rank.wins === 1 && users.u1.rank.losses === 1 && users.u1.rank.bp === ra.bp, '勝敗とBPが保存される')
ok(typeof rb.label === 'string' && rb.label.includes('ブロンズ'), '段位の名前が付く ' + rb.label)
// 部屋の中にいる間は、また入れない
b.send({ type: 'queue', team }); const q2 = await b.next('queued').catch(async () => ({ err: (await b.next('error')).message })); ok(q2.bp === users.u2.rank.bp, '終わったあとは、また待ち行列に入れる ' + (q2.err || ''))
b.send({ type: 'queue-cancel' }); await b.next('queue-left')
for (const x of [a, b, far]) x.ws.close()
const st = await pvp.status(); ok(st.ok && st.queue === 0, '状態の確認(/api/pvp/status)が動く')
server.close(); process.exit(failed ? 1 : 0)
