// 対人戦の通信(WebSocket)。メッセージ(JSON)は、最初に {type:'auth', token} を送って本人確認をしてから使える。
//   画面→サーバー: create{team} / join{code,team} / action{action} / surrender / leave / ping
//   サーバー→画面: authed / created{code} / start / update / end / closed / opp-offline / opp-online / error
import { WebSocketServer } from 'ws'
import { Room, buildTeam, makeCode } from './room.js'
import { randomBytes } from 'node:crypto'
import { loadRegistry } from './registry.js'
import { checkToken } from '../gate.js'
import { rankOf, applyResult, emptyRank, matchWindow } from '../../web/src/battle/rank.js'
import { saveRecords } from './record.js'

export function attachPvp({ server, auth, db, allowedOrigins = [], config, requireOwned = true, path = '/pvp', masterPassword = '' }) {
  const wss = new WebSocketServer({ server, path, maxPayload: 20 * 1024 })
  const rooms = new Map()      // code → Room
  const roomOfUid = new Map()  // uid → Room
  const sockets = new Map()    // uid → ws(いま使っている接続)
  let regErr = null
  const regP = loadRegistry().catch((e) => { regErr = e; console.error('[pvp] キャラ定義の読み込みに失敗', e); return null }) // 失敗してもサーバー全体は落とさない
  let connections = 0
  // マスターパスワードの機能「カジュアルで全キャラを使う」: 端末が持っている通行証を、サーバーが確かめる(ランクでは使えない)
  const allCharsOk = (m, ranked) => { try { return !ranked && !!masterPassword && typeof m.unlock === 'string' && m.unlock.length > 0 && checkToken(m.unlock, masterPassword) } catch { return false } }
  const ownErr = (msg, guest) => (guest && msg.startsWith('所持していないキャラ') ? 'アカウントがないため、使えるキャラがありません。ログインするか、設定のマスターパスワードで「カジュアルで全キャラを使う」をオンにしてください' : msg)
  const queue = new Map() // uid → { uid, name, built, bp, since }(ランクマッチの待ち行列)
  const QUEUE_MAX_MS = 10 * 60 * 1000

  const sendTo = (uid, msg) => { const ws = sockets.get(uid); if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)) }
  const roomSend = (room) => (side, msg) => { const p = room.players[side]; if (p) sendTo(p.uid, msg) }
  const dropRoom = (room) => {
    rooms.delete(room.code)
    for (const side of ['A', 'B']) { const p = room.players[side]; if (p && roomOfUid.get(p.uid) === room) roomOfUid.delete(p.uid) }
  }

  async function userData(uid) {
    const snap = await db.collection('users').doc(uid).get()
    if (!snap.exists) return null
    return snap.data() || {}
  }

  // ランクマッチの結果を、BP に反映して、Firestore に保存し、2人に知らせる
  async function settleRank(room, winner) {
    if (winner !== 'A' && winner !== 'B') return null // 引き分けは、動かさない
    const pA = room.players.A, pB = room.players.B
    if (!pA || !pB) return null
    const refA = db.collection('users').doc(pA.uid), refB = db.collection('users').doc(pB.uid)
    const [sa, sb] = await Promise.all([refA.get(), refB.get()])
    const rA = { ...emptyRank(), ...((sa.data() || {}).rank || {}) }
    const rB = { ...emptyRank(), ...((sb.data() || {}).rank || {}) }
    const resA = applyResult(rA, rB.bp, winner === 'A')
    const resB = applyResult(rB, rA.bp, winner === 'B')
    await Promise.all([refA.set({ rank: resA.rank }, { merge: true }), refB.set({ rank: resB.rank }, { merge: true })])
    for (const [p, res] of [[pA, resA], [pB, resB]]) sendTo(p.uid, { type: 'rank', ...res.rank, delta: res.delta, before: res.before, label: rankOf(res.rank.bp).label })
    return { A: resA, B: resB }
  }
  const roomEnd = (room, winner, reason) => {
    const settling = room.ranked ? settleRank(room, winner) : Promise.resolve(null)
    settling.catch((e) => { console.error('[pvp] ランクの保存に失敗', e); return null })
      .then((settled) => (room.random ? saveRecords(db, room, winner, reason, settled) : null))
      .catch((e) => console.error('[pvp] 戦績の保存に失敗', e))
  }

  // 待ち行列から、近い BP の2人を組み合わせる(待つほど、探す幅が広がる)
  function matchTick() {
    const now = Date.now()
    for (const [uid, q] of queue) { if (now - q.since > QUEUE_MAX_MS || !sockets.get(uid)) { queue.delete(uid); sendTo(uid, { type: 'queue-left', reason: '相手が見つかりませんでした' }) } }
    const list = [...queue.values()].sort((a, b) => a.since - b.since)
    const used = new Set()
    for (const a of list) {
      if (used.has(a.uid)) continue
      let best = null
      for (const b of list) {
        if (b.uid === a.uid || used.has(b.uid) || b.ranked !== a.ranked) continue // ランクはランク同士、カジュアルはカジュアル同士
        const w = Math.max(matchWindow((now - a.since) / 1000), matchWindow((now - b.since) / 1000))
        const d = a.ranked ? Math.abs(a.bp - b.bp) : 0 // カジュアルは、早く組み合わせる(BPは見ない)
        if (d <= w && (!best || d < best.d)) best = { b, d }
      }
      if (!best) continue
      used.add(a.uid); used.add(best.b.uid)
      queue.delete(a.uid); queue.delete(best.b.uid)
      let code; do { code = makeCode() } while (rooms.has(code))
      const room = new Room({ code, reg: a.reg, send: null, config, onClose: dropRoom, onEnd: roomEnd, ranked: a.ranked })
      room.random = true // 待ち行列で組まれた(=ランダムマッチ)。ルームコードで入る対戦は足跡に残さない
      room.send = roomSend(room)
      rooms.set(code, room)
      const first = Math.random() < 0.5 ? [a, best.b] : [best.b, a] // どちらが先に入る(A になる)かは、ランダム
      for (const q of first) { room.join(q.uid, q.name, q.built, q.ranked ? q.bp : null); roomOfUid.set(q.uid, room) }
    }
  }
  const matchTimer = setInterval(matchTick, 1000)
  matchTimer.unref?.()

  wss.on('connection', (ws, req) => {
    connections++
    const origin = req.headers.origin
    if (allowedOrigins.length && origin && !allowedOrigins.includes(origin)) { ws.close(1008, 'origin'); return }
    let uid = null, name = 'プレイヤー', alive = true, count = 0, guest = false
    const rate = setInterval(() => { count = 0 }, 1000)
    const hb = setInterval(() => { if (!alive) return ws.terminate(); alive = false; try { ws.ping() } catch { /* 切れている */ } }, 25000)
    ws.on('pong', () => { alive = true })
    const reply = (msg) => { if (ws.readyState === 1) ws.send(JSON.stringify(msg)) }
    const fail = (message) => reply({ type: 'error', message })

    ws.on('message', async (raw) => {
      if (++count > 30) { fail('送信が多すぎます'); return }
      let m
      try { m = JSON.parse(String(raw)) } catch { return fail('メッセージが正しくありません') }
      if (!m || typeof m.type !== 'string') return fail('メッセージが正しくありません')
      try {
        if (m.type === 'ping') return reply({ type: 'pong' })
        if (m.type === 'auth' && m.guest === true) { // アカウントなし(匿名プレイヤー): 一時的な ID で、カジュアルだけ遊べる
          if (uid) return
          uid = `guest-${randomBytes(8).toString('hex')}`; name = '匿名プレイヤー'; guest = true
          sockets.set(uid, ws)
          reply({ type: 'authed', guest: true })
          return
        }
        if (m.type === 'auth') {
          if (uid) return
          let dec
          try { dec = await auth.verifyIdToken(String(m.token || '')) } catch { return fail('認証に失敗しました') }
          const data = await userData(dec.uid)
          if (!data) return fail('アカウントがありません')
          uid = dec.uid; name = String(data.displayName || dec.name || 'プレイヤー').slice(0, 20)
          const old = sockets.get(uid)
          sockets.set(uid, ws)
          if (old && old !== ws) { try { old.close(4000, 'replaced') } catch { /* すでに閉じている */ } }
          reply({ type: 'authed' })
          const room = roomOfUid.get(uid)
          if (room) room.reconnect(uid) // 対戦中に切れていたなら、続きから
          return
        }
        if (!uid) return fail('先にログインしてください')
        const reg = await regP
        if (!reg) return fail('サーバー側でキャラ定義を読み込めていません')

        if (m.type === 'queue-cancel') { if (queue.delete(uid)) reply({ type: 'queue-left', reason: 'やめました' }); return }
        if (m.type === 'queue') {
          if (roomOfUid.has(uid)) return fail('すでに対戦ルームにいます')
          if (queue.has(uid)) return fail('すでに相手を探しています')
          const ranked = m.ranked === true
          if (ranked && guest) return fail('ランクマッチには、ログインが必要です')
          const data = guest ? {} : await userData(uid)
          const own = requireOwned && !allCharsOk(m, ranked) // 持っているキャラだけ(匿名プレイヤーは、持ちキャラなし)。マスターパスワードの機能がオンのカジュアルだけ、全キャラ
          const built = buildTeam(reg, m.team, { owned: own ? (data.owned || {}) : null, enh: data.enh || {}, relicData: data })
          if (built.error) return fail(ownErr(built.error, guest))
          built.owned = own ? (data.owned || {}) : null
          const bp = ({ ...emptyRank(), ...(data.rank || {}) }).bp
          queue.set(uid, { uid, name, built, bp, ranked, since: Date.now(), reg })
          reply({ type: 'queued', bp: ranked ? bp : null, ranked, count: queue.size })
          return
        }
        if (m.type === 'create' || m.type === 'join') {
          if (queue.has(uid)) return fail('相手を探している間は、部屋をつくれません')
          if (roomOfUid.has(uid)) return fail('すでに対戦ルームにいます')
          const data = guest ? {} : await userData(uid)
          const own = requireOwned && !allCharsOk(m, false)
          const built = buildTeam(reg, m.team, { owned: own ? (data.owned || {}) : null, enh: data.enh || {}, relicData: data })
          if (built.error) return fail(ownErr(built.error, guest))
          built.owned = own ? (data.owned || {}) : null
          let room
          if (m.type === 'create') {
            let code; do { code = makeCode() } while (rooms.has(code))
            room = new Room({ code, reg, send: null, config, onClose: dropRoom, onEnd: roomEnd })
            room.send = roomSend(room)
            rooms.set(code, room)
          } else {
            room = rooms.get(String(m.code || '').toUpperCase().trim())
            if (!room) return fail('ルームが見つかりません')
          }
          const r = room.join(uid, name, built)
          if (r.error) { if (m.type === 'create') dropRoom(room); return fail(r.error) }
          roomOfUid.set(uid, room)
          if (m.type === 'create') reply({ type: 'created', code: room.code })
          return
        }
        const room = roomOfUid.get(uid)
        if (!room) return fail('対戦ルームにいません')
        if (m.type === 'action') { const r = room.action(uid, m.action); if (r.error) fail(r.error); return }
        if (m.type === 'surrender') { const r = room.surrender(uid); if (r.error) fail(r.error); return }
        if (m.type === 'leave') {
          if (room.phase === 'battle') room.surrender(uid)
          else room.close('left')
          roomOfUid.delete(uid)
          return
        }
        fail('不明なメッセージです')
      } catch (e) {
        console.error('[pvp]', e)
        fail('サーバーでエラーが発生しました')
      }
    })

    ws.on('close', () => {
      clearInterval(rate); clearInterval(hb)
      if (!uid) return
      if (sockets.get(uid) === ws) queue.delete(uid)
      if (sockets.get(uid) === ws) {
        sockets.delete(uid)
        const room = roomOfUid.get(uid)
        if (room) room.disconnect(uid)
      }
    })
  })
  // 動作確認用: ブラウザで /api/pvp/status を開くと、対人戦が使える状態か分かる
  return { wss, rooms, queue, status: async () => { const r = await regP; return { ok: !!r, chars: r ? r.chars.length : 0, error: regErr ? String(regErr.message || regErr) : null, rooms: rooms.size, queue: queue.size, connections } } }
}
