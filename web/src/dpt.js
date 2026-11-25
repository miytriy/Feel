// DPT(1ターンあたりのダメージ)の測定。動かない「的」を相手に、自分のチームをCPU(AI)の操作で自動で戦わせ、ダメージを集計する。
// ・1ターン = 自分のキャラの行動1回(その間に起きたダメージは、召喚物・効果ぶんも、そのターンに数える)
// ・的は攻撃せず、ターンはすぐ終える。HP は行動のたびに満タンへ戻す(倒れて戦闘が終わらないように)
// 時間がかかるので async(1手ごとに画面へ制御を返す)。画面から使う(DptScreen.jsx)。ブラウザに依存しないので、node でも動く。
import { createBattle, applyAction, legalActions } from './battle/engine.js'
import { chooseAction } from './battle/ai.js'

export const DPT_DEFAULTS = { count: 1, hp: 100000, def: 0, rounds: 10, level: 5 }

export function makeDummy({ hp, def }) {
  return { id: 'dpt_dummy', name: '的', class: 'ニュートラル', stats: { hp, atk: 0, def, spd: 60 }, skill: { name: 'なし', stat: 'atk', type: 'physical', mult: 0 } }
}

// team: キャラ定義の配列(強化・遺物を反映ずみ) / spells: スペル定義 / opts: { pool, catalog, artifactCatalog }
export async function measureDpt({ team, spells = [], pool = [], catalog = [], artifactCatalog = [], count, hp, def, rounds, level, onProgress = null, isCancelled = null }) {
  const o = { ...DPT_DEFAULTS, ...Object.fromEntries(Object.entries({ count, hp, def, rounds, level }).filter(([, v]) => v != null)) }
  let s = createBattle(team, Array.from({ length: o.count }, () => makeDummy(o)), { catalog, artifactCatalog, pool: { A: pool, B: [] }, spells: { A: spells, B: [] } })
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
    const act = actor && actor.team === 'B' ? acts.find((a) => a.type === 'endTurn') || acts[0] : chooseAction(s, o.level)
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
    for (const u of s.units) if (u.team === 'B') { if (!u.alive) { u.alive = true; u.vanished = false } u.hp = u.maxHp } // 的は、いつも満タン
    if (s.winner) { ended = 'dummy'; break }
  }
  for (const t of turns) roundDmg[t.round].turns++
  const total = turns.reduce((a, t) => a + t.dmg, 0)
  const all = Object.values(roundDmg).reduce((a, r) => a + r.dmg, 0)
  const rows = Object.entries(roundDmg).map(([r, v]) => ({ round: +r, ...v, dpt: v.turns ? v.dmg / v.turns : 0 })).filter((r) => r.round <= o.rounds)
  const chars = Object.values(perChar).map((c) => ({ ...c, dpt: c.turns ? c.dmg / c.turns : 0 })).filter((c) => c.dmg > 0 || c.turns > 0).sort((a, b) => b.dmg - a.dmg)
  const sumTotal = rows.reduce((a, r) => a + r.dmg, 0)
  return { total: sumTotal, myTurns: turns.length, dpt: turns.length ? sumTotal / turns.length : 0, perRound: rows.length ? sumTotal / rows.length : 0, rows, chars, turns, ended, steps, all }
}
