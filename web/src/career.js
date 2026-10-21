// Feel - キャリア(対戦の記録)の計算。記録はアカウントに保存される(サーバー側。通信は api.js)
export const MAX_MATCHES = 20

// 対戦中のダメージの集計(1ラウンドごと・キャラごと)
export function newStats() {
  return { rounds: {}, units: {}, heal: { A: 0, B: 0 }, turns: { A: 0, B: 0 } }
}

// 1回の行動で起きたこと(events)を集計に足す。unitsOf(uid) → { name, team }
export function addEvents(stats, events, unitsOf) {
  for (const e of events) {
    if (e.type === 'turn') {
      if (e.team === 'A' || e.team === 'B') stats.turns[e.team]++ // 自分・相手それぞれの、行動した回数(ターン数)
    } else if (e.type === 'damage') {
      const src = unitsOf(e.src)
      if (!src) continue
      const r = (stats.rounds[e.round] ??= { A: 0, B: 0 })
      r[src.team] += e.amount
      const u = (stats.units[src.name + '|' + src.team] ??= { name: src.name, team: src.team, dealt: 0 })
      u.dealt += e.amount
    } else if (e.type === 'heal') {
      const t = unitsOf(e.target)
      if (t) stats.heal[t.team] += e.amount
    }
  }
}

export function buildMatch(state, level, stats, names) {
  const rounds = Object.keys(stats.rounds).map(Number).sort((a, b) => a - b).map((r) => ({ round: r, A: stats.rounds[r].A, B: stats.rounds[r].B }))
  const sum = (k) => rounds.reduce((n, r) => n + r[k], 0)
  return {
    id: Date.now(),
    t: Date.now(),
    result: state.winner === 'A' ? 'win' : state.winner === 'B' ? 'lose' : 'draw',
    level,
    rounds: state.round,
    names, // { A: [...], B: [...] }
    perRound: rounds,
    totals: { A: sum('A'), B: sum('B') },
    heal: stats.heal,
    turns: stats.turns,
    units: Object.values(stats.units).sort((a, b) => b.dealt - a.dealt),
    log: state.log.slice(-150).map((l) => String(l).slice(0, 120)), // サーバーに送れる大きさに収める
  }
}

// 勝率などのまとめ
export function summarize(matches) {
  const count = (list, r) => list.filter((m) => m.result === r).length
  const rate = (list) => (list.length ? Math.round((count(list, 'win') / list.length) * 100) : null)
  const recent = matches.slice(0, 10)
  let streak = 0
  for (const m of matches) { if (m.result === 'win') streak++; else break }
  const avgRounds = matches.length ? matches.reduce((n, m) => n + m.rounds, 0) / matches.length : 0
  let dealt = 0, rc = 0, taken = 0, tA = 0, tB = 0, dA = 0, dB = 0
  for (const m of matches) {
    dealt += m.totals.A; taken += m.totals.B; rc += Math.max(1, m.perRound.length)
    if (m.turns && m.turns.A > 0) { tA += m.turns.A; dA += m.totals.A }
    if (m.turns && m.turns.B > 0) { tB += m.turns.B; dB += m.totals.B }
  }
  return {
    total: matches.length, win: count(matches, 'win'), lose: count(matches, 'lose'), draw: count(matches, 'draw'),
    rate: rate(matches), recentRate: rate(recent), recentN: recent.length, streak, avgRounds,
    dpsDealt: rc ? dealt / rc : 0, dpsTaken: rc ? taken / rc : 0, // DPR = 1ラウンドあたりのダメージ
    dptDealt: tA ? dA / tA : 0, dptTaken: tB ? dB / tB : 0, hasTurns: tA > 0, // DPT = 1ターン(1回の行動)あたりのダメージ
  }
}
