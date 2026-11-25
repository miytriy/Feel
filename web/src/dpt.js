// DPT(1ターンあたりのダメージ)の測定。動かない「的」を相手に、自分のチームをCPU(AI)の操作で自動で戦わせ、ダメージを集計する。
// ・1ターン = 自分のキャラの行動1回(その間に起きたダメージは、召喚物・効果ぶんも、そのターンに数える)
// ・的は攻撃せず、ターンはすぐ終える。HP は行動のたびに満タンへ戻す(倒れて戦闘が終わらないように)
// 時間がかかるので async(1手ごとに画面へ制御を返す)。画面から使う(DptScreen.jsx)。ブラウザに依存しないので、node でも動く。
import { createBattle, applyAction, legalActions } from './battle/engine.js'
import { chooseAction } from './battle/ai.js'

export const DPT_DEFAULTS = { rounds: 10, level: 5, runs: 1, enemyAttack: false, enemyLevel: 3, refill: true, enemies: [{ kind: 'dummy' }] }
export const DUMMY_BASE = { hp: 100000, atk: 0, def: 0, spd: 60, cls: 'ニュートラル' }

export function makeDummy(slot = {}) {
  const num = (v, d) => (v === '' || v == null || Number.isNaN(+v) ? d : +v)
  return { id: 'dpt_dummy', name: '的', class: slot.cls || DUMMY_BASE.cls, stats: { hp: num(slot.hp, DUMMY_BASE.hp), atk: num(slot.atk, DUMMY_BASE.atk), def: num(slot.def, DUMMY_BASE.def), spd: num(slot.spd, DUMMY_BASE.spd) }, skill: { name: 'なし', stat: 'atk', type: 'physical', mult: 0 } }
}
// 画面の「敵の1枠」から、キャラ定義を作る。kind='dummy' は的、それ以外はキャラのid(能力・スキルはそのまま。空でない数字だけ、ステータスを上書き)
export function enemyDef(slot, charById) {
  if (!slot || slot.kind === 'dummy') return makeDummy(slot)
  const c = charById(slot.kind)
  if (!c) return makeDummy(slot)
  const st = { ...c.stats }
  for (const k of ['hp', 'atk', 'def', 'spd']) if (slot[k] !== '' && slot[k] != null && !Number.isNaN(+slot[k])) st[k] = +slot[k]
  return { ...c, stats: st }
}

// 1回だけ測る。team: キャラ定義の配列(強化・遺物を反映ずみ) / spells: スペル定義 / opts: { pool, catalog, artifactCatalog }
export async function measureDpt({ team, spells = [], pool = [], catalog = [], artifactCatalog = [], enemies, enemyAttack = false, enemyLevel = 3, refill = true, rounds, level, onProgress = null, isCancelled = null }) {
  const o = { ...DPT_DEFAULTS, ...Object.fromEntries(Object.entries({ rounds, level }).filter(([, v]) => v != null)) }
  let s = createBattle(team, enemies && enemies.length ? enemies : [makeDummy({})], { catalog, artifactCatalog, pool: { A: pool, B: [] }, spells: { A: spells, B: [] } })
  const turns = [] // 自分のターンごと { n, round, uid, name, dmg }
  const perChar = {} // uid -> { name, dmg, turns }
  const roundDmg = {} // ラウンド -> { dmg, turns }
  const byTurn = new Map()
  let steps = 0
  let ended = 'rounds'
  while (!s.winner && s.round <= o.rounds) {
    if (steps++ > 6000) { ended = 'guard'; break }
    if (isCancelled && isCancelled()) { ended = 'cancel'; break }
    if (onProgress) onProgress(Math.min(s.round, o.rounds), o.rounds)
    await new Promise((r) => setTimeout(r, 0)) // 画面を固めない(Lv.5のAIは、1手に時間がかかる)
    const actor = s.units.find((u) => u.uid === s.active)
    const acts = legalActions(s)
    const act = actor && actor.team === 'B' && !enemyAttack ? acts.find((a) => a.type === 'endTurn') || acts[0] : chooseAction(s, actor && actor.team === 'B' ? enemyLevel : o.level)
    if (!act) { ended = 'stuck'; break }
    const turnId = s.turns
    const round = s.round
    const isMine = !!actor && actor.team === 'A'
    s = applyAction(s, act)
    let dmg = 0
    for (const ev of s.events) {
      if (ev.type !== 'damage') continue
      const t = s.units.find((u) => u.uid === ev.target)
      if (!t || t.team !== 'B') continue
      dmg += ev.amount
      const src = s.units.find((u) => u.uid === ev.src)
      if (src && src.team === 'A') {
        const nm = src.name + (src.field === 'main' ? '' : '(召喚物)') // 同じ名前は1行にまとめる
        ;(perChar[nm] ||= { name: nm, dmg: 0, turns: 0 }).dmg += ev.amount
      }
    }
    if (isMine) {
      let rec = byTurn.get(turnId)
      if (!rec) { rec = { n: turns.length + 1, round, uid: actor.uid, name: actor.name, dmg: 0 }; byTurn.set(turnId, rec); turns.push(rec); (perChar[actor.name] ||= { name: actor.name, dmg: 0, turns: 0 }).turns++ }
      rec.dmg += dmg
    }
    const rd = (roundDmg[round] ||= { dmg: 0, turns: 0 })
    rd.dmg += dmg
    if (refill) for (const u of s.units) if (u.team === 'B') { if (!u.alive) { u.alive = true; u.vanished = false } u.hp = u.maxHp } // 的は、いつも満タン
    if (s.winner) { ended = s.winner === 'A' ? 'dummy' : 'lost'; break }
  }
  for (const t of turns) roundDmg[t.round].turns++
  const total = turns.reduce((a, t) => a + t.dmg, 0)
  const all = Object.values(roundDmg).reduce((a, r) => a + r.dmg, 0)
  const rows = Object.entries(roundDmg).map(([r, v]) => ({ round: +r, ...v, dpt: v.turns ? v.dmg / v.turns : 0 })).filter((r) => r.round <= o.rounds)
  const chars = Object.values(perChar).map((c) => ({ ...c, dpt: c.turns ? c.dmg / c.turns : 0 })).filter((c) => c.dmg > 0 || c.turns > 0).sort((a, b) => b.dmg - a.dmg)
  const sumTotal = rows.reduce((a, r) => a + r.dmg, 0)
  return { total: sumTotal, myTurns: turns.length, dpt: turns.length ? sumTotal / turns.length : 0, perRound: rows.length ? sumTotal / rows.length : 0, rows, chars, turns, ended, steps, all }
}

// 複数回測って、平均・最小・最大を出す。結果の形は measureDpt と同じ(キャラ別・ラウンド別は平均)。runs 回のあいだ、進み具合は全体で出す
export async function measureMany(args, runs = 1) {
  const list = []
  for (let i = 0; i < runs; i++) {
    const r = await measureDpt({ ...args, onProgress: args.onProgress ? (a, n) => args.onProgress((i + a / n) / runs, 1) : null })
    list.push(r)
    if (r.ended === 'cancel') break
  }
  const n = list.length
  const mean = (f) => list.reduce((a, r) => a + f(r), 0) / n
  const first = list[0]
  const avgBy = (pick, key) => { const m = new Map(); for (const r of list) for (const x of pick(r)) { const e = m.get(x[key]); if (!e) m.set(x[key], { ...x }); else { e.dmg += x.dmg; e.turns += x.turns } } return [...m.values()].map((x) => ({ ...x, dmg: x.dmg / n, turns: x.turns / n })) }
  const rows = avgBy((r) => r.rows, 'round').map((x) => ({ ...x, dpt: x.turns ? x.dmg / x.turns : 0 })).sort((a, b) => a.round - b.round)
  const chars = avgBy((r) => r.chars, 'name').map((x) => ({ ...x, dpt: x.turns ? x.dmg / x.turns : 0 })).sort((a, b) => b.dmg - a.dmg)
  const dpts = list.map((r) => r.dpt)
  return { ...first, runs: n, total: mean((r) => r.total), myTurns: mean((r) => r.myTurns), dpt: mean((r) => r.dpt), perRound: mean((r) => r.perRound), dptMin: Math.min(...dpts), dptMax: Math.max(...dpts), rows, chars, ended: list.find((r) => r.ended !== 'rounds')?.ended || 'rounds' }
}
