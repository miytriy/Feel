// ランダムマッチの戦績: 最後まで対戦して、2人の足跡に正しく残るか(Firestore は偽物)
import { loadRegistry } from '../pvp/registry.js'
import { Room, buildTeam } from '../pvp/room.js'
import { saveRecords } from '../pvp/record.js'
const reg = await loadRegistry()
const mains = reg.chars.filter((c) => !c.amulet && !c.id.startsWith('test_') && c.class === 'ニュートラル')
const mk = (a, b) => buildTeam(reg, { ids: mains.slice(a, b).map((c) => c.id), spells: [] })
let failed = 0; const ok = (c, m) => { if (!c) { failed++; console.log('NG', m) } else console.log('ok', m) }
const store = {}
const db = { collection: (n) => ({ doc: (id) => ({ _k: `${n}/${id}` }) }), runTransaction: async (fn) => fn({ get: async (r) => ({ exists: !!store[r._k], data: () => store[r._k] }), set: (r, d, o) => { store[r._k] = o?.merge ? { ...(store[r._k] || {}), ...d } : d } }) }
let ended = null
const room = new Room({ code: 'REC222', reg, send: () => {}, ranked: true, onEnd: (r, w, why) => { ended = { w, why } } })
room.random = true
room.join('u1', 'ミナ', mk(0, 3), 1000); room.join('u2', 'ケン', mk(3, 6), 1000)
for (let i = 0; i < 4000 && room.phase === 'battle'; i++) { const side = room.actorSide(); room.step(side, reg.ai.chooseAction(room.state, 2, Math.random), true) }
ok(room.phase === 'done' && ended, '最後まで対戦が終わる')
const tot = Object.values(room.stats.rounds).reduce((n, r) => n + r.A + r.B, 0)
ok(tot > 0, `ダメージの集計が、行動ごとに積み上がる(合計 ${tot})`)
store['careers/u1'] = { matches: [{ id: 'cpu1' }] } // CPU戦の記録を消さないか
await saveRecords(db, room, ended.w, ended.why, { A: { before: 1000, rank: { bp: 1015 }, delta: 15 }, B: { before: 1000, rank: { bp: 985 }, delta: -15 } })
const a = store['careers/u1'], b = store['careers/u2']
ok(a?.pvp?.length === 1 && b?.pvp?.length === 1, '2人の足跡に、1戦ずつ残る')
ok(a.matches?.length === 1, 'CPU戦の記録は消えない')
ok(a.pvp[0].opp === 'ケン' && b.pvp[0].opp === 'ミナ', '相手の名前')
ok(a.pvp[0].result !== b.pvp[0].result || a.pvp[0].result === 'draw', '勝ち負けが逆になる')
ok(a.pvp[0].totals.A === b.pvp[0].totals.B && a.pvp[0].totals.A > 0, 'ダメージが自分視点で入れ替わる')
ok(a.pvp[0].ranked === true && a.pvp[0].bp?.delta === 15, 'ランクならBPの増減が付く')
ok(a.pvp[0].names.A.length === 3, '編成の名前が入る')
console.log(failed ? `${failed}件NG` : '全部OK'); process.exit(failed ? 1 : 0)
