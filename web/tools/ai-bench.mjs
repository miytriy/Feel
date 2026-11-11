// CPUの強さを測る自動対戦。使い方: 比べたい旧版を src/battle/ai_old.js にコピーしてから、 N=40 X_LV=5 Y_LV=5 node web/tools/ai-bench.mjs
// 同じ編成を、先攻・後攻を入れ替えて2戦する。X = src/battle/ai.js(新)、Y = ai_old.js(旧)。勝率の差が小さいときは、SEED を変えて何度か測る(80戦で ±10勝くらいはぶれる)
import { loadRegistry } from '../../server/pvp/registry.js'
import path from 'node:path'
const reg = await loadRegistry()
const { engine } = reg
const B = new URL('../src/battle/', import.meta.url).href
const X = await import(B + (process.env.X_AI || 'ai.js'))
const Y = await import(B + (process.env.Y_AI || 'ai_old.js'))
const LX = +(process.env.X_LV || 5), LY = +(process.env.Y_LV || 5)
const N = +(process.env.N || 20)
const pool = reg.chars.filter((c) => !c.amulet && !c.id.startsWith('test_') && !c.id.includes('_token_'))
let seed = +(process.env.SEED || 1)
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 }
const pick5 = () => { const a = [...pool]; const out = []; while (out.length < 5) out.push(a.splice(Math.floor(rnd() * a.length), 1)[0]); return out }
function play(defsA, defsB, aiA, lvA, aiB, lvB) {
  let s = engine.createBattle(defsA, defsB, { comboMode: 'reset', pool: { A: pool, B: pool }, spells: { A: [], B: [] } })
  let n = 0
  while (!s.winner && n++ < 600) {
    const u = engine.getActiveUnit(s)
    const team = (s.pending && s.pending.team) || (u && u.team) || 'A'
    const mod = team === 'A' ? aiA : aiB, lv = team === 'A' ? lvA : lvB
    let act; try { act = mod.chooseAction(s, lv) } catch (e) { return 'err:' + e.message }
    if (!act) return 'stuck'
    s = engine.applyAction(s, act)
  }
  return s.winner || 'timeout'
}
let xw = 0, yw = 0, dr = 0, bad = 0
const t0 = Date.now()
for (let g = 0; g < N; g++) {
  const a = pick5(), b = pick5()
  for (const swap of [false, true]) {
    const r = swap ? play(b, a, Y, LY, X, LX) : play(a, b, X, LX, Y, LY)
    const xSide = swap ? 'B' : 'A'
    if (r === 'A' || r === 'B') (r === xSide ? xw++ : yw++)
    else if (r === 'draw' || r === 'timeout') dr++
    else { bad++; if (bad < 4) console.log('問題:', r) }
  }
}
console.log(`X(新) ${xw}勝 / Y(旧) ${yw}勝 / 引き分け等 ${dr} / 異常 ${bad}  (${N * 2}戦, ${((Date.now() - t0) / 1000).toFixed(0)}秒)`)
