import { newStats } from '../../web/src/career.js'
import { buildPvpRecord, addMatch } from '../career.js'

// ランダムマッチ(待ち行列で組まれた対戦)の戦績を、2人の「足跡」に残す
export async function saveRecords(db, room, winner, reason, settled) {
  const st = room.state
  if (!st) return
  const stats = room.stats || newStats()
  const real = (u) => !u.token && u.field !== 'summon' // 召喚物・トークンは編成に数えない
  const names = { A: st.units.filter((u) => u.team === 'A' && real(u)).map((u) => u.name), B: st.units.filter((u) => u.team === 'B' && real(u)).map((u) => u.name) }
  const t = Date.now()
  for (const side of ['A', 'B']) {
    const p = room.players[side], o = room.players[side === 'A' ? 'B' : 'A']
    if (!p || !o || String(p.uid).startsWith('guest-')) continue
    const r = settled?.[side]
    const rec = buildPvpRecord({ side, winner, reason, ranked: room.ranked, oppName: o.name, rounds: st.round, names, stats, bp: r ? { before: r.before, after: r.rank.bp, delta: r.delta } : null, t })
    const ref = db.collection('careers').doc(p.uid)
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref)
      tx.set(ref, { pvp: addMatch(snap.exists ? snap.data().pvp : [], rec) }, { merge: true })
    })
  }
}
