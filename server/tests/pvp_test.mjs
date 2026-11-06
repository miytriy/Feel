// 対人戦のテスト: 本物のWebSocketで2人が入って、最後まで対戦する(認証とFirestoreは偽物)
import http from 'node:http'
import WebSocket from 'ws'
import { attachPvp } from '../pvp/ws.js'
import { loadRegistry } from '../pvp/registry.js'

const reg = await loadRegistry()
const mains = reg.chars.filter((c) => !c.amulet && !c.id.startsWith('test_') && c.class === 'ニュートラル')
const ids1 = mains.slice(0, 3).map((c) => c.id), ids2 = mains.slice(3, 6).map((c) => c.id)
const users = { u1: { owned: Object.fromEntries(ids1.map((i) => [i, 1])) }, u2: { owned: Object.fromEntries(ids2.map((i) => [i, 1])) }, u3: { owned: {} } }
const auth = { verifyIdToken: async (t) => { if (!users[t]) throw new Error('bad'); return { uid: t } } }
const db = { collection: () => ({ doc: (uid) => ({ get: async () => ({ exists: !!users[uid], data: () => users[uid] }) }) }) }
const server = http.createServer(); await new Promise((r) => server.listen(0, r))
attachPvp({ server, auth, db })
const url = `ws://127.0.0.1:${server.address().port}/pvp`
let failed = 0
const ok = (c, m) => { if (!c) { failed++; console.log('NG', m) } else console.log('ok', m) }

function client(token) {
  const ws = new WebSocket(url); const inbox = []; const waiters = []
  ws.on('message', (d) => { const m = JSON.parse(String(d)); inbox.push(m); waiters.splice(0).forEach((w) => w()) })
  const next = async (type, ms = 3000) => { const t0 = Date.now(); for (;;) { const i = inbox.findIndex((m) => m.type === type); if (i >= 0) return inbox.splice(i, 1)[0]; if (Date.now() - t0 > ms) throw new Error('timeout ' + type); await new Promise((r) => { waiters.push(r); setTimeout(r, 50) }) } }
  const send = (m) => ws.send(JSON.stringify(m))
  return new Promise((res) => ws.on('open', async () => { send({ type: 'auth', token }); await next('authed'); res({ ws, send, next, inbox }) }))
}

const a = await client('u1'), b = await client('u2')
a.send({ type: 'create', team: { ids: ids1, spells: [] } })
const created = await a.next('created'); ok(/^[A-Z2-9]{6}$/.test(created.code), 'ルームコードが発行される ' + created.code)
// 所持していないキャラ・存在しないルーム
const c = await client('u3'); c.send({ type: 'join', code: created.code, team: { ids: ids2, spells: [] } })
ok((await c.next('error')).message.includes('所持'), '所持していないキャラは入れない')
b.send({ type: 'join', code: 'ZZZZZZ', team: { ids: ids2, spells: [] } }); ok((await b.next('error')).message.includes('見つかりません'), '存在しないルーム')
b.send({ type: 'join', code: created.code.toLowerCase(), team: { ids: ids2, spells: [] } })
const sa = await a.next('start'), sb = await b.next('start')
ok(sa.side === 'A' && sb.side === 'B' && sa.opp.name && sb.state.units.length > 0, '2人そろうと開始(A/B)')
// 相手の番に動く・不正な行動
let cur = sa.state; let n = 0
const players = { A: a, B: b }
const actor = (s) => s.units.find((u) => u.uid === s.active).team
const wrong = players[actor(cur) === 'A' ? 'B' : 'A']; wrong.send({ type: 'action', action: { type: 'endTurn' } })
ok((await wrong.next('error')).message.includes('番'), '相手の番には動けない')
const mine = players[actor(cur)]; mine.send({ type: 'action', action: { type: 'skill', target: 'nonexistent' } })
ok((await mine.next('error')).message.includes('選べません'), '選べない行動は断られる')
// 最後まで対戦(サーバーが数えた選べる行動から選ぶ=AI)
let end = null
while (!end && n < 3000) {
  const side = actor(cur)
  const act = reg.ai.chooseAction(cur, 3)
  players[side].send({ type: 'action', action: act })
  const u = await players[side].next('update').catch(() => null)
  if (!u) { end = await players[side].next('end'); players[side === 'A' ? 'B' : 'A'].inbox.length; break }
  cur = u.state; n++
  await players[side === 'A' ? 'B' : 'A'].next('update')
  if (cur.winner) end = true
}
ok(n > 3, `最後まで進む(${n}手)`)
const eo = await players[actor(cur) === 'A' ? 'B' : 'A'].next('end').catch(() => null)
ok(end && end.winner && eo && eo.winner === end.winner, '両者に終了が通知される ' + (end && end.winner))
for (const x of [a, b, c]) x.ws.close()
server.close()
console.log(failed ? `失敗 ${failed}` : '全部OK'); process.exit(failed ? 1 : 0)
