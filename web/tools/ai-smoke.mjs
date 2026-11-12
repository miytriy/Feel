// 全キャラのAI動作チェック。新しいキャラを追加したら実行: node web/tools/ai-smoke.mjs
// 各キャラを入れた編成で、Lv.5 同士を戦わせ、エラー・行動できなくなる・決着がつかない(600手)がないかを見る。キャラは自動で全員対象(追加のたびに書き換え不要)
import { loadRegistry } from '../../server/pvp/registry.js'
const reg = await loadRegistry()
const { engine, ai } = reg
const pool = reg.chars.filter((c) => !c.amulet && !c.id.startsWith('test_') && !c.id.includes('_token_'))
let seed = 1
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 }
const others = () => { const a = [...pool]; const out = []; while (out.length < 4) out.push(a.splice(Math.floor(rnd() * a.length), 1)[0]); return out }
let bad = 0
const t0 = Date.now()
const ONLY = process.env.ONLY // 1体だけ調べる(編成の乱数は、全員のときと同じ順で進める)
for (const c of pool) {
  const A = [c, ...others().filter((x) => x.id !== c.id)].slice(0, 5)
  const B = others()
  if (ONLY && c.id !== ONLY) continue
  let s, n = 0, why = null
  const log = []
  try {
    s = engine.createBattle(A, B, { pool: { A: pool, B: pool }, spells: { A: [], B: [] } })
    while (!s.winner && n++ < 600) {
      const act = ai.chooseAction(s, 5)
      if (!act) { why = '行動を選べない'; break }
      log.push(act.type + ':' + (act.target || ''))
      s = engine.applyAction(s, act)
    }
    if (!why && !s.winner) why = '600手で決着しない'
  } catch (e) { why = 'エラー: ' + e.message }
  if (why) { bad++; console.log(`× ${c.id} (${c.name}): ${why}`); if (ONLY) console.log('A:', A.map((x) => x.id).join(','), ' B:', B.map((x) => x.id).join(','), '\n最後の行動:', log.slice(-12).join(' '), '\n生存:', s && s.units.filter((u) => u.alive).map((u) => `${u.team}:${u.id}(hp${Math.round(u.hp)})`).join(' ')) }
}
console.log(`${pool.length}体を確認: 問題 ${bad}体 (${((Date.now() - t0) / 1000).toFixed(0)}秒)`)
process.exit(bad ? 1 : 0)
