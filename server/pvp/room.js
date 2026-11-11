// 対人戦のルーム(サーバーが審判): バトルの計算はすべてここ(サーバー)で行う。
// 画面からは「行動」だけが届き、サーバーが「その人の番か」「選べる行動か」を確かめてから進める。
// 通信(WebSocket)とは切り離してあり、send(side, message) を渡せば、そのままテストできる。

export const CONFIG = {
  TURN_MS: 45000,        // 1ターン(同じ人の連続した行動のまとまり)の持ち時間。超えたら自動で行動する
  GRACE_MS: 60000,       // 切断してから、この時間のうちに戻らなければ負け
  WAIT_MS: 10 * 60000,   // 相手が入ってこないルームを残しておく時間
  AUTO_LEVEL: 3,         // 時間切れの自動行動の強さ(CPUのレベル)
}

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // 紛らわしい文字(0/O・1/I/L)を除く
export const makeCode = (rng = Math.random) => Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(rng() * CODE_CHARS.length)]).join('')

// 画面から届いた編成 { ids: [...], spells: [...] } を、サーバー側で検査して、バトル用の定義にする。
// owned: そのユーザーの所持 { キャラid: 数 }(null なら所持は確かめない) / enh: 強化レベル { キャラid: Lv }
export function buildTeam(reg, team, { owned = null, enh = {}, format = reg.rotations.DEFAULT_FORMAT } = {}) {
  const ids = Array.isArray(team?.ids) ? team.ids : null
  const spellIds = Array.isArray(team?.spells) ? team.spells : []
  if (!ids || !ids.length || ids.length > 7 || ids.some((x) => typeof x !== 'string')) return { error: '編成が正しくありません' }
  if (spellIds.length > 20 || spellIds.some((x) => typeof x !== 'string')) return { error: 'スペルの指定が正しくありません' }
  // 人事画面で持たせた遺物 { キャラid: 遺物の名前 | '' }('' は遺物なし)。編成に入っているキャラの、知っている遺物だけ受け付ける
  const relicsIn = team?.relics ?? {}
  if (typeof relicsIn !== 'object' || Array.isArray(relicsIn) || Object.keys(relicsIn).length > 20) return { error: '遺物の指定が正しくありません' }
  for (const [rid, rname] of Object.entries(relicsIn)) {
    if (!ids.includes(rid)) return { error: '編成にいないキャラの遺物が指定されています' }
    if (typeof rname !== 'string' || (rname !== '' && !Object.prototype.hasOwnProperty.call(reg.engine.RELICS, rname))) return { error: `知らない遺物です(${String(rname).slice(0, 20)})` }
    if (rname !== '' && !reg.rotations.rotationAllowed(format, reg.engine.RELICS[rname].rotation, rname)) return { error: `遺物「${rname}」は、${reg.rotations.FORMATS[format]?.name ?? format}では使えません` }
  }
  const withRelic = (d) => {
    if (!Object.prototype.hasOwnProperty.call(relicsIn, d.id)) return d
    const { relic: _old, ...rest } = d
    return relicsIn[d.id] ? { ...rest, relic: relicsIn[d.id] } : rest
  }
  const chars = []
  for (const id of ids) {
    const c = reg.charById.get(id)
    if (!c || id.startsWith('test_')) return { error: `使えないキャラです(${String(id).slice(0, 40)})` }
    if (owned && !c.amulet && !(owned[id] > 0)) return { error: `所持していないキャラです(${c.name})` }
    chars.push(c)
  }
  const v = reg.formation.validateFormation(chars)
  if (!v.ok) return { error: v.reason }
  const spells = []
  for (const id of spellIds) {
    const s = reg.spellById.get(id)
    if (!s) return { error: `使えないスペルです(${String(id).slice(0, 40)})` }
    spells.push(s)
  }
  const sv = reg.formation.validateSpellSet(spells, chars)
  if (!sv.ok) return { error: sv.reason }
  return { defs: chars.map((d) => reg.enhance.enhanceDef(withRelic(d), enh[d.id] || 0)), spells, chars }
}

export class Room {
  constructor({ code, reg, send, now = () => Date.now(), setTimer = setTimeout, clearTimer = clearTimeout, rng = Math.random, onClose = () => {}, onEnd = null, ranked = false, config = CONFIG }) {
    Object.assign(this, { code, reg, send, now, setTimer, clearTimer, rng, onClose, onEnd, ranked, cfg: config })
    this.players = { A: null, B: null } // { uid, name, team, online, offlineSince }
    this.phase = 'waiting' // waiting → battle → done
    this.state = null
    this.seq = 0
    this.deadline = null
    this.timers = {}
    this.createdAt = now()
    this.timers.wait = setTimer(() => { if (this.phase === 'waiting') this.close('timeout') }, config.WAIT_MS)
  }

  sideOf(uid) { return this.players.A?.uid === uid ? 'A' : this.players.B?.uid === uid ? 'B' : null }

  // 入室。最初の人が A(ホスト)、次の人が B。2人そろったら、すぐに始まる
  join(uid, name, built, bp = null) {
    if (this.phase === 'done') return { error: 'この対戦は終わっています' }
    const existing = this.sideOf(uid)
    if (existing) return { error: 'すでにこのルームにいます' }
    if (this.players.A && this.players.B) return { error: 'このルームは満員です' }
    const side = this.players.A ? 'B' : 'A'
    this.players[side] = { uid, name: name || 'プレイヤー', built, bp, online: true, offlineSince: null }
    if (side === 'B') this.start()
    return { side }
  }

  start() {
    const { engine } = this.reg
    const A = this.players.A, B = this.players.B
    const pool = (p) => this.reg.chars.filter((c) => !c.amulet && !c.id.startsWith('test_') && (p.built.owned ? p.built.owned[c.id] > 0 : true))
    this.state = engine.createBattle(A.built.defs, B.built.defs, { comboMode: 'reset', pool: { A: pool(A), B: pool(B) }, spells: { A: A.built.spells, B: B.built.spells } })
    this.phase = 'battle'
    this.clearTimer(this.timers.wait)
    this.seq = 0
    this.resetDeadline(true)
    for (const side of ['A', 'B']) {
      this.send(side, { type: 'start', side, ranked: this.ranked, opp: { name: this.players[side === 'A' ? 'B' : 'A'].name, bp: this.players[side === 'A' ? 'B' : 'A'].bp }, ...this.snapshot() })
    }
    this.armTimer()
  }

  snapshot() { return { state: this.state, seq: this.seq, deadline: this.deadline, left: this.deadline == null ? null : Math.max(0, this.deadline - this.now()), turnMs: this.cfg.TURN_MS } }

  actorSide() {
    if (!this.state || this.state.winner) return null
    const u = this.reg.engine.getActiveUnit(this.state)
    return u ? u.team : null
  }

  // 持ち時間は、番(担当する人 or ターンの数)が変わったときに数え直す
  resetDeadline(force = false) {
    const key = `${this.actorSide()}:${this.state?.turns}:${this.state?.activeKind}`
    if (force || key !== this.turnKey) { this.turnKey = key; this.deadline = this.now() + this.cfg.TURN_MS }
  }

  armTimer() {
    this.clearTimer(this.timers.turn)
    if (this.phase !== 'battle') return
    const wait = Math.max(0, this.deadline - this.now()) + 50
    this.timers.turn = this.setTimer(() => this.onTimeout(), wait)
  }

  onTimeout() {
    if (this.phase !== 'battle' || this.now() < this.deadline) return this.armTimer()
    const side = this.actorSide()
    if (!side) return
    try {
      const a = this.reg.ai.chooseAction(this.state, this.cfg.AUTO_LEVEL, this.rng)
      this.step(side, a, true)
    } catch (e) {
      const acts = this.reg.engine.legalActions(this.state)
      const fallback = acts.find((x) => x.type === 'skill') || acts.find((x) => x.type === 'endTurn') || acts[0] // 時間切れは、攻撃できるなら攻撃する
      if (fallback) this.step(side, fallback, true)
    }
  }

  action(uid, action) {
    if (this.phase !== 'battle') return { error: '対戦中ではありません' }
    const side = this.sideOf(uid)
    if (!side) return { error: 'このルームの参加者ではありません' }
    if (this.actorSide() !== side) return { error: 'あなたの番ではありません' }
    return this.step(side, action, false)
  }

  step(side, action, auto) {
    const { engine } = this.reg
    if (!action || typeof action !== 'object') return { error: '行動が正しくありません' }
    const legal = engine.legalActions(this.state)
    const same = legal.find((a) => JSON.stringify(a) === JSON.stringify(action)) // クライアントの送った形そのままではなく、サーバーが数えた「選べる行動」のほうを使う
    if (!same) return { error: 'その行動は選べません' }
    let next
    try { next = engine.applyAction(this.state, same, { rng: this.rng }) } catch (e) { return { error: 'その行動は選べません' } }
    this.state = next
    this.seq += 1
    if (next.winner) return this.finish(next.winner, 'battle', { auto })
    this.resetDeadline()
    this.broadcast({ type: 'update', auto: !!auto, by: side, ...this.snapshot() })
    this.armTimer()
    return { ok: true }
  }

  broadcast(msg) { for (const side of ['A', 'B']) this.send(side, msg) }

  finish(winner, reason, extra = {}) {
    if (this.phase === 'done') return { ok: true }
    this.phase = 'done'
    for (const t of Object.values(this.timers)) this.clearTimer(t)
    this.broadcast({ type: 'end', winner, reason, ranked: this.ranked, ...(this.state ? this.snapshot() : {}), ...extra })
    try { if (this.onEnd) this.onEnd(this, winner, reason) } catch (e) { console.error('[pvp] onEnd', e) }
    this.onClose(this, reason)
    return { ok: true }
  }

  surrender(uid) {
    const side = this.sideOf(uid)
    if (!side || this.phase !== 'battle') return { error: '対戦中ではありません' }
    return this.finish(side === 'A' ? 'B' : 'A', 'surrender')
  }

  // 切断・復帰
  disconnect(uid) {
    const side = this.sideOf(uid)
    const p = side && this.players[side]
    if (!p) return
    p.online = false; p.offlineSince = this.now()
    if (this.phase === 'waiting' && side === 'A') return this.close('host-left')
    if (this.phase !== 'battle') return
    this.send(side === 'A' ? 'B' : 'A', { type: 'opp-offline', until: this.now() + this.cfg.GRACE_MS })
    this.clearTimer(this.timers[`grace${side}`])
    this.timers[`grace${side}`] = this.setTimer(() => { if (!this.players[side].online && this.phase === 'battle') this.finish(side === 'A' ? 'B' : 'A', 'disconnect') }, this.cfg.GRACE_MS)
  }

  reconnect(uid) {
    const side = this.sideOf(uid)
    const p = side && this.players[side]
    if (!p) return { error: 'このルームの参加者ではありません' }
    p.online = true; p.offlineSince = null
    this.clearTimer(this.timers[`grace${side}`])
    if (this.phase === 'battle') {
      this.send(side, { type: 'start', side, resume: true, ranked: this.ranked, opp: { name: this.players[side === 'A' ? 'B' : 'A'].name, bp: this.players[side === 'A' ? 'B' : 'A'].bp }, ...this.snapshot() })
      this.send(side === 'A' ? 'B' : 'A', { type: 'opp-online' })
    }
    return { side }
  }

  close(reason) {
    if (this.phase === 'done') return
    this.phase = 'done'
    for (const t of Object.values(this.timers)) this.clearTimer(t)
    this.broadcast({ type: 'closed', reason })
    this.onClose(this, reason)
  }
}
