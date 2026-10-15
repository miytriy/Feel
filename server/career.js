// Feel サーバー - キャリア(対戦の記録)のルール(Firebaseに依存しない部分)
// 記録は画面が送ってくるので、そのまま信用せず、形・長さ・数字の範囲を整えてから保存する。報酬(ジェム)とは無関係
export const MAX_MATCHES = 20 // 1人につき残す試合数(新しい順)
const MAX_ROUNDS = 100
const MAX_NAMES = 10
const MAX_UNITS = 40
const MAX_LOG = 150
const MAX_DMG = 1e9

const str = (v, n) => String(v ?? '').slice(0, n)
const num = (v, max = MAX_DMG) => (Number.isFinite(Number(v)) ? Math.max(0, Math.min(max, Math.round(Number(v)))) : 0)
const list = (v, n) => (Array.isArray(v) ? v.slice(0, n) : [])

// 受け取った試合の記録を、保存してよい形にする。使えない形なら null
export function sanitizeMatch(m, nowMs) {
  if (!m || typeof m !== 'object') return null
  if (!['win', 'lose', 'draw'].includes(m.result)) return null
  const level = num(m.level, 10)
  if (level < 1) return null
  const t = Number.isFinite(Number(m.t)) && Number(m.t) > 0 && Number(m.t) <= nowMs + 60000 ? Math.round(Number(m.t)) : nowMs
  const perRound = list(m.perRound, MAX_ROUNDS).map((r) => ({ round: num(r?.round, 10000), A: num(r?.A), B: num(r?.B) }))
  const sum = (k) => perRound.reduce((n, r) => n + r[k], 0)
  return {
    id: str(m.id, 40) || String(t),
    t,
    result: m.result,
    level,
    rounds: num(m.rounds, 10000),
    names: { A: list(m.names?.A, MAX_NAMES).map((x) => str(x, 40)), B: list(m.names?.B, MAX_NAMES).map((x) => str(x, 40)) },
    perRound,
    totals: { A: sum('A'), B: sum('B') }, // 合計は、ラウンドごとの数字から計算し直す
    heal: { A: num(m.heal?.A), B: num(m.heal?.B) },
    units: list(m.units, MAX_UNITS).map((u) => ({ name: str(u?.name, 40), team: u?.team === 'B' ? 'B' : 'A', dealt: num(u?.dealt) })),
    log: list(m.log, MAX_LOG).map((l) => str(l, 120)),
  }
}

// いまの記録の一覧(新しい順)に1試合を足す。同じidはすでにあれば足さない
export function addMatch(existing, match) {
  const cur = Array.isArray(existing) ? existing : []
  if (cur.some((x) => x.id === match.id)) return cur
  return [match, ...cur].slice(0, MAX_MATCHES)
}
