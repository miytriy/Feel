import assert from 'node:assert/strict'
import { createApp } from '../app.js'
import { CONFIG } from '../config.js'
import { dayKey, prevDayKey, loginBonusStatus, claimLoginBonus, normalizeCode, checkCode, checkGift, judgeBattleReward } from '../rewards.js'
import { makeFake } from './fake-firebase.mjs'

let passed = 0
const tests = []
const test = (name, fn) => tests.push([name, fn])

// 日本時間 2026-10-10 12:00 を基準にする
const JST = (y, m, d, h = 12, mi = 0) => Date.UTC(y, m - 1, d, h - 9, mi)
let clock = JST(2026, 10, 10)
const fake = makeFake(() => clock)
const app = createApp({ db: fake.db, auth: fake.auth, FieldValue: fake.FieldValue, now: () => clock, randomId: (() => { let n = 0; return () => `t${++n}` })() })
const server = await new Promise((r) => { const s = app.listen(0, () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
async function api(method, path, uid, body) {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(uid ? { Authorization: `Bearer uid:${uid}` } : {}) }, body: body ? JSON.stringify(body) : undefined })
  return { status: res.status, body: await res.json().catch(() => ({})) }
}
const gemsOf = (uid) => fake.read(`users/${uid}`).gems

// ---------- 純粋なルール ----------
test('日付: 日本時間で日付が切り替わる', () => {
  assert.equal(dayKey(Date.UTC(2026, 9, 9, 14, 59)), '2026-10-09') // 日本時間 23:59
  assert.equal(dayKey(Date.UTC(2026, 9, 9, 15, 0)), '2026-10-10') // 日本時間 0:00
  assert.equal(prevDayKey('2026-03-01'), '2026-02-28')
  assert.equal(dayKey(Date.UTC(2026, 9, 9, 19, 59), { ...CONFIG, RESET_HOUR: 5 }), '2026-10-09') // 朝5時切り替えなら、4:59は前日
})
test('ログインボーナス: 連続日数で増え、7日で一周し、途切れたら1日目に戻る', () => {
  let lb = null
  const amounts = []
  for (let d = 0; d < 8; d++) {
    const r = claimLoginBonus(lb, JST(2026, 10, 1 + d))
    assert.ok(r.ok)
    amounts.push(r.amount)
    lb = r.state
  }
  assert.deepEqual(amounts, [100, 100, 100, 100, 100, 100, 300, 100])
  assert.equal(lb.streak, 8)
  const skipped = claimLoginBonus(lb, JST(2026, 10, 12)) // 1日空いた(9日目の翌々日)
  assert.equal(skipped.state.streak, 1)
  assert.equal(claimLoginBonus(lb, JST(2026, 10, 8, 23)).ok, false) // 同じ日
  assert.equal(loginBonusStatus(null, JST(2026, 10, 1)).nextAmount, 100)
})
test('対戦報酬: 勝利・短すぎ・上限・敗北の判定', () => {
  const t0 = JST(2026, 10, 10)
  const ticket = { id: 'x', level: 3, startedAt: t0 }
  const j = (over, at = t0 + 60000) => judgeBattleReward({ ticket, ticketId: 'x', result: 'win', daily: null, ...over }, at)
  assert.equal(j({}).reward, 30)
  assert.equal(j({}, t0 + 5000).reward, 0) // 5秒で終わらせた
  assert.equal(j({ result: 'lose' }).reward, 0)
  assert.equal(j({ ticketId: 'y' }).ok, false)
  assert.equal(j({ daily: { day: dayKey(t0), count: 5 } }).reward, 0) // 上限
  assert.equal(j({ daily: { day: '2000-01-01', count: 5 } }).reward, 30) // 別の日の数は無関係
  assert.equal(j({}, t0 + 3 * 3600 * 1000).reward, 0) // 時間が経ちすぎ
})
test('合言葉・プレゼントの判定', () => {
  assert.equal(normalizeCode('  ｏｐｅｎ-2026 '), 'OPEN-2026')
  const now = JST(2026, 10, 10)
  assert.equal(checkCode({ gems: 500 }, false, now).ok, true)
  assert.equal(checkCode({ gems: 500, enabled: false }, false, now).ok, false)
  assert.equal(checkCode({ gems: 500, maxUses: 2, uses: 2 }, false, now).ok, false)
  assert.equal(checkCode({ gems: 500, expiresAt: new Date(now - 1) }, false, now).ok, false)
  assert.equal(checkCode({ gems: 500 }, true, now).used, true)
  assert.equal(checkCode({ gems: -5 }, false, now).ok, false) // 入力ミス
  assert.equal(checkCode({ gems: 999999999 }, false, now).ok, false) // 上限超え
  assert.equal(checkGift({ gems: 100, target: 'all' }, 'u', {}, now).ok, true)
  assert.equal(checkGift({ gems: 100, target: ['a'] }, 'u', {}, now).ok, false)
  assert.equal(checkGift({ gems: 100, target: ['u'] }, 'u', {}, now).ok, true)
  assert.equal(checkGift({ gems: 100, target: 'all', startAt: new Date(now + 1000) }, 'u', {}, now).ok, false)
  assert.equal(checkGift({ gems: 1.5, target: 'all' }, 'u', {}, now).ok, false)
})

// ---------- API ----------
test('API: ログインが必要', async () => {
  assert.equal((await api('GET', '/api/me')).status, 401)
  assert.equal((await api('POST', '/api/login-bonus/claim')).status, 401)
  assert.equal((await api('POST', '/api/codes/redeem', null, { code: 'ABC' })).status, 401)
  assert.equal((await api('GET', '/api/me', 'bad')).status, 200) // uid:形式ならOK(偽のトークンの確認は下)
})
test('API: 偽のトークンは通らない', async () => {
  const res = await fetch(base + '/api/me', { headers: { Authorization: 'Bearer nonsense' } })
  assert.equal(res.status, 401)
})
test('API: /api/me は初回に作られ、ログボの状態が出る', async () => {
  const r = await api('GET', '/api/me', 'u1')
  assert.equal(r.body.gems, CONFIG.INITIAL_GEMS)
  assert.equal(r.body.loginBonus.canClaim, true)
  assert.equal(r.body.loginBonus.nextAmount, 100)
})
test('API: ログインボーナスは1日1回、翌日は連続で増える', async () => {
  const a = await api('POST', '/api/login-bonus/claim', 'u1')
  assert.equal(a.status, 200)
  assert.equal(a.body.amount, 100)
  assert.equal(gemsOf('u1'), CONFIG.INITIAL_GEMS + 100)
  const again = await api('POST', '/api/login-bonus/claim', 'u1')
  assert.equal(again.status, 400)
  assert.equal(gemsOf('u1'), CONFIG.INITIAL_GEMS + 100) // 増えていない
  clock += 24 * 3600 * 1000
  const next = await api('POST', '/api/login-bonus/claim', 'u1')
  assert.equal(next.body.streak, 2)
  assert.equal(fake.all('gem_logs/').filter(([, v]) => v.uid === 'u1' && v.reason === 'login_bonus').length, 2) // 記録が残る
})
test('API: 対戦報酬(勝利・短すぎ・使い回し・上限)', async () => {
  const uid = 'u2'
  await api('GET', '/api/me', uid)
  const before = gemsOf(uid)
  assert.equal((await api('POST', '/api/battle/start', uid, { level: 9 })).status, 400)
  const { body: { ticketId } } = await api('POST', '/api/battle/start', uid, { level: 2 })
  clock += 5000
  const quick = await api('POST', '/api/battle/finish', uid, { ticketId, result: 'win' })
  assert.equal(quick.body.reward, 0) // 5秒では報酬なし
  assert.equal((await api('POST', '/api/battle/finish', uid, { ticketId, result: 'win' })).status, 400) // 券は使用済み
  // 普通に勝つ
  let total = 0
  for (let i = 0; i < 6; i++) {
    const s = await api('POST', '/api/battle/start', uid, { level: 2 })
    clock += 60000
    const f = await api('POST', '/api/battle/finish', uid, { ticketId: s.body.ticketId, result: 'win' })
    total += f.body.reward
  }
  assert.equal(total, 20 * CONFIG.BATTLE_REWARD_DAILY_LIMIT) // 6回勝っても5回分まで
  assert.equal(gemsOf(uid), before + total)
  // 負けは報酬なし
  const s = await api('POST', '/api/battle/start', uid, { level: 4 })
  clock += 60000
  assert.equal((await api('POST', '/api/battle/finish', uid, { ticketId: s.body.ticketId, result: 'lose' })).body.reward, 0)
  // 他人の券は使えない
  const mine = await api('POST', '/api/battle/start', 'u3', { level: 1 })
  clock += 60000
  assert.equal((await api('POST', '/api/battle/finish', uid, { ticketId: mine.body.ticketId, result: 'win' })).status, 400)
  // 翌日は上限がリセット
  clock += 24 * 3600 * 1000
  const n = await api('POST', '/api/battle/start', uid, { level: 1 })
  clock += 60000
  assert.equal((await api('POST', '/api/battle/finish', uid, { ticketId: n.body.ticketId, result: 'win' })).body.reward, 10)
})
test('API: 運営プレゼント(全員向け・個人宛て・期限・二重受け取り)', async () => {
  fake.put('gifts/all1', { title: 'お詫び', gems: 300, target: 'all', message: 'ごめんね' })
  fake.put('gifts/only_u4', { title: '個人', gems: 50, target: ['u4'] })
  fake.put('gifts/expired', { title: '期限切れ', gems: 999, target: 'all', expiresAt: new Date(clock - 1000) })
  fake.put('gifts/broken', { title: '壊れ', gems: 'たくさん', target: 'all' })
  const l4 = await api('GET', '/api/gifts', 'u4')
  assert.deepEqual(l4.body.gifts.map((g) => g.id).sort(), ['all1', 'only_u4'])
  const l5 = await api('GET', '/api/gifts', 'u5')
  assert.deepEqual(l5.body.gifts.map((g) => g.id), ['all1'])
  await api('GET', '/api/me', 'u4')
  const g0 = gemsOf('u4')
  assert.equal((await api('POST', '/api/gifts/claim', 'u4', { giftId: 'all1' })).body.amount, 300)
  assert.equal((await api('POST', '/api/gifts/claim', 'u4', { giftId: 'all1' })).status, 400) // 二重
  assert.equal((await api('POST', '/api/gifts/claim', 'u5', { giftId: 'only_u4' })).status, 400) // 他人宛て
  assert.equal((await api('POST', '/api/gifts/claim', 'u4', { giftId: 'expired' })).status, 400)
  assert.equal((await api('POST', '/api/gifts/claim', 'u4', { giftId: 'broken' })).status, 400)
  assert.equal((await api('POST', '/api/gifts/claim', 'u4', { giftId: 'a/b' })).status, 400)
  assert.equal(gemsOf('u4'), g0 + 300)
  assert.deepEqual((await api('GET', '/api/gifts', 'u4')).body.gifts.map((g) => g.id), ['only_u4']) // 受け取り済みは消える
})
test('API: 合言葉(受け取り・1人1回・回数制限・期限・間違いすぎ)', async () => {
  fake.put('gift_codes/OPEN2026', { gems: 500, maxUses: 2 })
  fake.put('gift_codes/OLD', { gems: 500, expiresAt: new Date(clock - 1) })
  await api('GET', '/api/me', 'c1')
  const g = gemsOf('c1')
  const ok = await api('POST', '/api/codes/redeem', 'c1', { code: ' open2026 ' }) // 小文字・空白でもOK
  assert.equal(ok.body.amount, 500)
  assert.equal(gemsOf('c1'), g + 500)
  assert.equal((await api('POST', '/api/codes/redeem', 'c1', { code: 'OPEN2026' })).status, 400) // 1人1回
  assert.equal(gemsOf('c1'), g + 500)
  assert.equal((await api('POST', '/api/codes/redeem', 'c2', { code: 'OPEN2026' })).status, 200)
  const third = await api('POST', '/api/codes/redeem', 'c3', { code: 'OPEN2026' }) // 2人まで
  assert.equal(third.status, 400)
  assert.equal(fake.read('gift_codes/OPEN2026').uses, 2)
  assert.equal((await api('POST', '/api/codes/redeem', 'c3', { code: 'OLD' })).status, 400)
  assert.equal((await api('POST', '/api/codes/redeem', 'c3', { code: 'a/b' })).status, 400)
  // 間違いを繰り返すと止められる(総当たり対策)
  let last
  for (let i = 0; i < CONFIG.CODE_FAIL_LIMIT_PER_DAY + 3; i++) last = await api('POST', '/api/codes/redeem', 'c4', { code: `WRONG${i}` })
  assert.equal(last.status, 429)
  fake.put('gift_codes/RIGHT', { gems: 10 })
  assert.equal((await api('POST', '/api/codes/redeem', 'c4', { code: 'RIGHT' })).status, 429) // 正しくても、その日は止まる
  clock += 24 * 3600 * 1000
  assert.equal((await api('POST', '/api/codes/redeem', 'c4', { code: 'RIGHT' })).status, 200) // 翌日は使える
})
test('API: ガチャは今までどおり動く(通貨が減り、足りなければエラー)', async () => {
  await api('GET', '/api/me', 'g1')
  const r = await api('POST', '/api/gacha', 'g1', { times: 10 })
  assert.equal(r.status, 200)
  assert.equal(r.body.gems, CONFIG.INITIAL_GEMS - CONFIG.COST_PER_PULL * 10)
  assert.equal((await api('POST', '/api/gacha', 'g1', { times: 3 })).status, 400)
})

test('API: キャリア(記録の保存・取得・整形・上限・二重登録・削除・本人だけ)', async () => {
  const mk = (id, extra = {}) => ({ id, t: clock, result: 'win', level: 2, rounds: 5, names: { A: ['a'], B: ['b'] }, perRound: [{ round: 1, A: 100, B: 50 }, { round: 2, A: 30, B: 0 }], totals: { A: 99999, B: 99999 }, heal: { A: 0, B: 0 }, units: [{ name: 'a', team: 'A', dealt: 130 }], log: ['x'], ...extra })
  assert.equal((await api('GET', '/api/career', null)).status, 401)
  assert.deepEqual((await api('GET', '/api/career', 'k1')).body.matches, [])
  assert.equal((await api('POST', '/api/career', 'k1', { match: mk('m1') })).status, 200)
  const got = (await api('GET', '/api/career', 'k1')).body.matches
  assert.equal(got.length, 1)
  assert.deepEqual(got[0].totals, { A: 130, B: 50 }) // 合計はラウンドごとの数字から計算し直す
  assert.equal((await api('POST', '/api/career', 'k1', { match: mk('m1') })).status, 200) // 同じidは二重に入らない
  assert.equal((await api('GET', '/api/career', 'k1')).body.matches.length, 1)
  assert.equal((await api('POST', '/api/career', 'k1', { match: { result: 'cheat' } })).status, 400)
  assert.equal((await api('POST', '/api/career', 'k1', {})).status, 400)
  // 長すぎる・多すぎる記録は切り詰める
  await api('POST', '/api/career', 'k1', { match: mk('big', { log: Array(300).fill('y'.repeat(150)), perRound: Array(200).fill({ round: 1, A: 1e15, B: -5 }) }) })
  const big = (await api('GET', '/api/career', 'k1')).body.matches[0]
  assert.equal(big.log.length, 150); assert.equal(big.log[0].length, 120); assert.equal(big.perRound.length, 100); assert.equal(big.perRound[0].A, 1e9); assert.equal(big.perRound[0].B, 0)
  // 20試合まで(新しい順)
  for (let i = 0; i < 25; i++) await api('POST', '/api/career', 'k2', { match: mk(`n${i}`) })
  const k2 = (await api('GET', '/api/career', 'k2')).body.matches
  assert.equal(k2.length, 20); assert.equal(k2[0].id, 'n24')
  // 他の人の記録は見えない・消えない
  assert.deepEqual((await api('GET', '/api/career', 'k3')).body.matches, [])
  assert.equal((await api('DELETE', '/api/career', 'k3')).status, 200)
  assert.equal((await api('GET', '/api/career', 'k2')).body.matches.length, 20)
  assert.equal((await api('DELETE', '/api/career', 'k2')).status, 200)
  assert.equal((await api('GET', '/api/career', 'k2')).body.matches.length, 0)
})

for (const [name, fn] of tests) {
  try { await fn(); passed++; console.log('✓', name) } catch (e) { console.log('✗', name, '\n  ', e.message); process.exitCode = 1 }
}
server.close()
console.log(`\n${passed}/${tests.length} 件成功`)

