// 時間切れ(自動行動)と切断(負け・復帰)のテスト。時計を偽物にして、待たずに確かめる
import { loadRegistry } from '../pvp/registry.js'
import { Room, buildTeam, CONFIG } from '../pvp/room.js'
const reg = await loadRegistry()
const mains = reg.chars.filter((c) => !c.amulet && !c.id.startsWith('test_') && c.class === 'ニュートラル')
const mk = (a, b) => buildTeam(reg, { ids: mains.slice(a, b).map((c) => c.id), spells: [] })
let t = 0; const timers = []
const setTimer = (fn, ms) => { const h = { fn, at: t + ms, dead: false }; timers.push(h); return h }
const clearTimer = (h) => { if (h) h.dead = true }
const advance = (ms) => { const to = t + ms; for (;;) { const nx = timers.filter((h) => !h.dead && h.at <= to).sort((x, y) => x.at - y.at)[0]; if (!nx) break; t = nx.at; nx.dead = true; nx.fn() } t = to }
let failed = 0; const ok = (c, m) => { if (!c) { failed++; console.log('NG', m) } else console.log('ok', m) }
const mkRoom = () => { const log = []; const r = new Room({ code: 'TEST22', reg, send: (s, m) => log.push([s, m]), now: () => t, setTimer, clearTimer }); r.join('u1', 'A', mk(0, 3)); r.join('u2', 'B', mk(3, 6)); return { r, log } }

{ const { r, log } = mkRoom(); const seq0 = r.seq; const first = r.actorSide()
  advance(CONFIG.TURN_MS + 200)
  ok(r.seq > seq0 || r.phase === 'done', '持ち時間を過ぎると、自動で行動する'); ok(log.some(([, m]) => m.type === 'update' && m.auto) || r.phase === 'done', '自動行動の印(auto)が付く') }
{ const { r, log } = mkRoom(); r.disconnect('u1')
  ok(log.some(([s, m]) => s === 'B' && m.type === 'opp-offline'), '切断が相手に伝わる')
  advance(CONFIG.GRACE_MS - 1000); r.reconnect('u1'); advance(CONFIG.GRACE_MS * 2)
  ok(r.phase === 'battle' || r.phase === 'done', '猶予内に戻れば、負けにならない(自動行動で進む)')
  ok(log.some(([s, m]) => s === 'A' && m.type === 'start' && m.resume), '復帰すると、いまの盤面が送られる') }
{ const { r, log } = mkRoom(); r.disconnect('u2'); advance(CONFIG.GRACE_MS + 500)
  const end = log.find(([, m]) => m.type === 'end')
  ok(end && end[1].winner === 'A' && end[1].reason === 'disconnect', '猶予を過ぎて戻らなければ、負け') }
{ const { r, log } = mkRoom(); r.surrender('u1'); const end = log.find(([, m]) => m.type === 'end'); ok(end && end[1].winner === 'B', '降参すると相手の勝ち') }
{ const log = []; const r = new Room({ code: 'WAIT22', reg, send: (s, m) => log.push(m), now: () => t, setTimer, clearTimer }); r.join('u1', 'A', mk(0, 3)); advance(CONFIG.WAIT_MS + 100)
  ok(r.phase === 'done' && log.some((m) => m.type === 'closed'), '誰も来ないルームは、一定時間で閉じる') }

// 人事画面で持たせた遺物が、サーバーのバトル用の定義に反映される(知らない遺物・編成にいないキャラは断る)
{ const ids = mains.slice(0, 3).map((c) => c.id)
  const a = buildTeam(reg, { ids, spells: [], relics: { [ids[0]]: '鬼の形相', [ids[1]]: '' } })
  ok(!a.error && a.defs[0].relic === '鬼の形相' && !a.defs[1].relic, '持たせた遺物がバトル用の定義に反映される(空は遺物なし)')
  ok(buildTeam(reg, { ids, spells: [], relics: { [ids[0]]: 'でたらめ' } }).error, '知らない遺物は断る')
  ok(buildTeam(reg, { ids, spells: [], relics: { 'nobody': '鬼の形相' } }).error, '編成にいないキャラの遺物は断る')
  ok(buildTeam(reg, { ids, spells: [], relics: ['鬼の形相'] }).error, '遺物の指定の形が違うものは断る')
  ok(!buildTeam(reg, { ids, spells: [], relics: { [ids[0]]: '鬼の形相' } }, { format: 'unlimited' }).error, 'アンリミテッドでは遺物を持たせられる')
  const saved = reg.engine.RELICS['鬼の形相'].rotation
  reg.engine.RELICS['鬼の形相'].rotation = 'unknown-rot'
  ok(buildTeam(reg, { ids, spells: [], relics: { [ids[0]]: '鬼の形相' } }).error, 'ローテーションに入らない遺物は断る')
  ok(!buildTeam(reg, { ids, spells: [], relics: { [ids[0]]: '鬼の形相' } }, { format: 'unlimited' }).error, '…でもアンリミテッドなら使える')
  reg.engine.RELICS['鬼の形相'].rotation = saved
  ok(!buildTeam(reg, { ids, spells: [] }).error, '遺物の指定がなくても、今までどおり通る') }
console.log(failed ? `失敗 ${failed}` : '全部OK'); process.exit(failed ? 1 : 0)
