// 対人戦の通信(WebSocket)。メッセージ(JSON)は、最初に {type:'auth', token} を送って本人確認をしてから使える。
//   画面→サーバー: create{team} / join{code,team} / action{action} / surrender / leave / ping
//   サーバー→画面: authed / created{code} / start / update / end / closed / opp-offline / opp-online / error
import { WebSocketServer } from 'ws'
import { Room, buildTeam, makeCode } from './room.js'
import { loadRegistry } from './registry.js'

export function attachPvp({ server, auth, db, allowedOrigins = [], config, requireOwned = true, path = '/pvp' }) {
  const wss = new WebSocketServer({ server, path, maxPayload: 20 * 1024 })
  const rooms = new Map()      // code → Room
  const roomOfUid = new Map()  // uid → Room
  const sockets = new Map()    // uid → ws(いま使っている接続)
  const regP = loadRegistry()

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

  wss.on('connection', (ws, req) => {
    const origin = req.headers.origin
    if (allowedOrigins.length && origin && !allowedOrigins.includes(origin)) { ws.close(1008, 'origin'); return }
    let uid = null, name = 'プレイヤー', alive = true, count = 0
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

        if (m.type === 'create' || m.type === 'join') {
          if (roomOfUid.has(uid)) return fail('すでに対戦ルームにいます')
          const data = await userData(uid)
          const built = buildTeam(reg, m.team, { owned: requireOwned ? (data.owned || {}) : null, enh: data.enh || {} })
          if (built.error) return fail(built.error)
          built.owned = requireOwned ? (data.owned || {}) : null
          let room
          if (m.type === 'create') {
            let code; do { code = makeCode() } while (rooms.has(code))
            room = new Room({ code, reg, send: null, config, onClose: dropRoom })
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
      if (sockets.get(uid) === ws) {
        sockets.delete(uid)
        const room = roomOfUid.get(uid)
        if (room) room.disconnect(uid)
      }
    })
  })
  return { wss, rooms }
}
