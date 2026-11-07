// 対人戦の通信クライアント。サーバー(審判)と WebSocket でつなぐ。
// 切れたら自動でつなぎ直し、認証し直すと、サーバーが「続きの状態」(start resume)を送ってくれる。
import { auth } from './firebase.js'
import { getAllCharsToken } from './api.js'

const apiUrl = () => import.meta.env.VITE_API_URL || ''
export const pvpUrl = () => {
  const base = apiUrl() || window.location.origin
  return base.replace(/^http/, 'ws').replace(/\/$/, '') + '/pvp'
}

export function createPvpClient() {
  let ws = null
  let closedByUs = false
  let retry = 0
  let retryTimer = null
  let pingTimer = null
  const subs = new Set()
  let pendingFirst = null // つないだ直後に送る最初のメッセージ(create / join)
  let authed = false
  let guest = false
  let joined = false // 部屋に入ったか(入ったあとに切れたら、再接続する)

  const emit = (m) => subs.forEach((f) => { try { f(m) } catch (e) { console.error(e) } })
  const raw = (m) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)) }

  const open = async () => {
    authed = false
    try {
      guest = !auth.currentUser // ログインしていなければ、匿名プレイヤーとして入る
      ws = new WebSocket(pvpUrl())
    } catch (e) { emit({ type: 'error', message: e.message, fatal: true }); return }
    const sock = ws
    sock.onopen = async () => {
      retry = 0
      try { raw(guest ? { type: 'auth', guest: true } : { type: 'auth', token: await auth.currentUser.getIdToken() }) } catch (e) { emit({ type: 'error', message: e.message, fatal: true }) }
      clearInterval(pingTimer)
      pingTimer = setInterval(() => raw({ type: 'ping' }), 20000)
    }
    sock.onmessage = (ev) => {
      let m; try { m = JSON.parse(ev.data) } catch { return }
      if (m.type === 'authed') {
        authed = true
        if (pendingFirst) { raw(pendingFirst); joined = pendingFirst.type !== 'queue'; pendingFirst = null } // 待ち行列は、組み合わされるまでは、切れたら再接続しない
        emit({ type: 'online' })
        return
      }
      if (m.type === 'start') joined = true
      if (m.type === 'closed' || m.type === 'queue-left') joined = false
      emit(m)
    }
    sock.onclose = () => {
      clearInterval(pingTimer)
      if (sock !== ws) return
      emit({ type: 'offline' })
      if (closedByUs || !joined) return
      if (guest) { joined = false; emit({ type: 'error', message: '通信が切れました。匿名プレイヤーは、つなぎ直せません(退出してください)', fatal: true }); return } // 匿名プレイヤーは、新しい ID になるので、続きから戻れない
      const wait = Math.min(8000, 800 * 2 ** retry++)
      clearTimeout(retryTimer)
      retryTimer = setTimeout(open, wait)
    }
    sock.onerror = () => { /* onclose で扱う */ }
  }

  return {
    on(f) { subs.add(f); return () => subs.delete(f) },
    create(team) { pendingFirst = { type: 'create', team, unlock: getAllCharsToken() }; closedByUs = false; open() },
    join(code, team) { pendingFirst = { type: 'join', code, team, unlock: getAllCharsToken() }; closedByUs = false; open() },
    queue(team, ranked = false) { pendingFirst = { type: 'queue', team, ranked, unlock: ranked ? '' : getAllCharsToken() }; closedByUs = false; open() }, // ランダムマッチの待ち行列に入る(ranked=true がランク)
    cancelQueue() { raw({ type: 'queue-cancel' }) },
    action(action) { raw({ type: 'action', action }) },
    surrender() { raw({ type: 'surrender' }) },
    leave() { raw({ type: 'leave' }); this.close() },
    close() { closedByUs = true; joined = false; clearTimeout(retryTimer); clearInterval(pingTimer); try { ws && ws.close() } catch { /* 閉じられなくてもよい */ } ws = null },
    get ready() { return authed },
  }
}
