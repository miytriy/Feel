// 部位つき遺物のテスト: node web/tools/relic-test.mjs
import { generateRelic, levelUp, relicTotals, RELIC_PARTS, RELIC_RARITIES, PART_IDS, SUB_STATS, mainValue, relicLines } from '../src/battle/relicRules.js'
import { loadRegistry } from '../../server/pvp/registry.js'
let bad = 0
const ok = (c, m) => { if (!c) { bad++; console.log('NG', m) } }
let seed = 1; const rng = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32)
for (let i = 0; i < 3000; i++) {
  const part = PART_IDS[i % 6], stars = [2, 3, 4, 5][i % 4], R = RELIC_RARITIES[stars]
  const r = generateRelic(part, stars, rng)
  ok(RELIC_PARTS[part].mains.includes(r.main), `${part} main ${r.main}`)
  ok(r.subs.length >= R.subs[0] && r.subs.length <= R.subs[1], `初期サブ数 ★${stars}: ${r.subs.length}`)
  ok(r.subs.every((s) => SUB_STATS.includes(s.stat) && s.stat !== r.main), `サブの種類 ${JSON.stringify(r)}`)
  ok(new Set(r.subs.map((s) => s.stat)).size === r.subs.length, 'サブの重複')
  const init = r.subs.length
  while (levelUp(r, rng));
  ok(r.level === R.maxLevel, 'レベル上限')
  ok(r.subs.length === Math.min(4, init + Math.floor(R.maxLevel / 3)), `最終サブ数 ★${stars}: ${init}→${r.subs.length}`)
  ok(mainValue(r.main, stars, R.maxLevel) >= mainValue(r.main, stars, 0), 'メインはレベルで増える')
}
ok(RELIC_PARTS.head.mains.join() === 'hp' && RELIC_PARTS.hand.mains.join() === 'atk', '頭=HP固定・手=攻撃力固定')
// バトルへの反映
const r = await loadRegistry(), e = r.engine
const def = r.chars.find((c) => c.id === 'royal_17'), foe = r.chars.find((c) => c.id === 'royal_03')
const pieces = [{ part: 'head', stars: 5, level: 15, main: 'hp', subs: [{ stat: 'atkPct', value: 10 }, { stat: 'spd', value: 2 }, { stat: 'critRate', value: 5 }] }, { part: 'sphere', stars: 5, level: 15, main: 'physDmg', subs: [] }]
const t = relicTotals(pieces); console.log('合計', JSON.stringify(t), relicLines(pieces[0]).map((l) => l.text).join(' / '))
const st = e.createBattle([{ ...def, relicPieces: pieces }, foe], [foe, foe], {})
const u = st.units.find((x) => x.name === def.name && x.team === 'A')
console.log(`HP ${def.stats.hp}→${u.maxHp} 攻撃 ${def.stats.atk}→${u.atk} 速度 ${def.stats.spd}→${u.spd} CR ${u.critRate} 物理+${u.physUp}%`)
ok(u.maxHp === def.stats.hp + 400 && u.atk === Math.round(def.stats.atk * 1.1) && u.spd === def.stats.spd + 2 && u.critRate === 10 && u.physUp === 38.8, '反映')
console.log(bad ? `NG ${bad}件` : 'OK: すべて合格')
process.exit(bad ? 1 : 0)
