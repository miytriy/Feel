// 改境の再動(手持ち・場のフォロワーのコピー)と、操り人形の「自身の行動終了後の相手のターン終了時に破壊」: node server/tests/copy_test.mjs
import assert from 'node:assert/strict'
import { loadRegistry } from '../pvp/registry.js'
const reg = await loadRegistry(); const E = reg.engine
const by = (id) => reg.chars.find((c) => c.id === id)
const unit = (id, name, cost, extra = {}) => ({ id, name, class: 'ネメシス', rarity: 'bronze', stats: { hp: 200, atk: 100, def: 50, spd: 30 }, tags: [], skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1 }, passives: [], cost, ...extra })
const sp = reg.spells.find((s) => s.id === 'nemesis_spell_05'); assert.ok(sp)
const settle = (s) => { for (let i = 0; i < 20 && s.pending && !s.pending.spell; i++) s = E.applyAction(s, E.legalActions(s)[0]); return s }
let st = settle(E.createBattle([by('witch_09'), by('witch_10')], [by('witch_09')], { spells: { A: [sp], B: [] }, artifacts: { A: [unit('af_a', '小', 3), unit('af_b', '大', 7), unit('af_c', '素材', 1, { noField: true })], B: [] } }))
for (let i = 0; i < 20 && E.getActiveUnit(st).team !== 'A'; i++) st = settle(E.applyAction(st, { type: 'endTurn' }))
st.mp.A = 10
st = E.applyAction(st, E.legalActions(st).find((a) => a.type === 'spell'))
assert.ok(st.pending?.modes, '選択が出る')
const names = st.pending.modes.map((m) => m.name)
assert.ok(names.includes('[手持ち] 小')); assert.ok(!names.includes('[手持ち] 大'), 'コスト5超は出ない'); assert.ok(!names.includes('[手持ち] 素材'), '場に出せないものは出ない')
st = E.applyAction(st, { type: 'choose', target: 'mode' + names.indexOf('[手持ち] 小') })
assert.ok(st.pending, '2体目を選べる')
st = E.applyAction(st, { type: 'choose', target: st.pending.candidates.at(-1) }) // やめる(最後の項目)
assert.ok(!st.pending)
const copies = st.units.filter((u) => u.alive && u.name === '小')
assert.equal(copies.length, 1)
assert.equal(st.artifacts.A.length, 3, '手持ちは減らない')
console.log('copy ok')
// 操り人形: 召喚されただけでは壊れず、自身が行動したあとの相手のターン終了時に壊れる
{
  const sp4 = reg.spells.find((s) => s.id === 'nemesis_spell_04')
  let s = settle(E.createBattle([by('witch_09'), by('witch_10')], [by('witch_09'), by('witch_10')], { spells: { A: [sp4], B: [] } }))
  for (let i = 0; i < 20 && E.getActiveUnit(s).team !== 'A'; i++) s = settle(E.applyAction(s, { type: 'endTurn' }))
  s.mp.A = 10
  s = E.applyAction(s, E.legalActions(s).find((a) => a.type === 'spell'))
  const pup = () => s.units.filter((u) => u.name === '改良型・操り人形')
  assert.equal(pup().filter((u) => u.alive).length, 2)
  let diedActed = null
  for (let i = 0; i < 40 && pup().some((u) => u.alive); i++) {
    const act = E.getActiveUnit(s)
    const before = pup().filter((u) => u.alive).length
    s = settle(E.applyAction(s, { type: 'endTurn' }))
    const after = pup().filter((u) => u.alive).length
    if (after < before && diedActed === null) diedActed = pup().filter((u) => !u.alive).every((u) => u.hasActed)
    if (s.winner) break
  }
  assert.notEqual(diedActed, false, '行動前に壊れてはいけない')
  console.log('puppet ok', diedActed)
}
// アタック・キャッスルは、場に出せないアミュレット(コア)も素材にできる。素材のコスト合計 1→α / 2→β / 3→γ。コア同士の融合も、そのまま
{
  const fs = await import('node:fs')
  const dir = new URL('../../web/src/battle/artifact/nemesis/tokens/', import.meta.url)
  const cat = []
  for (const f of fs.readdirSync(dir)) cat.push((await import(new URL(f, dir))).default)
  const by = (id) => cat.find((a) => a.id === id)
  const art = (id, i) => ({ slot: 'x' + i, id, name: by(id).name, cost: by(id).cost, type: by(id).type, amulet: !!by(id).amulet, noField: !!by(id).noField, def: by(id) })
  const f = (a, m) => E.fusionFor(art(a, 0), m.map((x, i) => art(x, i + 1)), cat)?.name
  assert.equal(f('nemesis_feature_core', ['nemesis_past_core']), 'アタックアーティファクト')
  assert.equal(f('nemesis_attack_artifact', ['nemesis_feature_core']), 'デストロイアーティファクトα')
  assert.equal(f('nemesis_castle_artifact', ['nemesis_feature_core', 'nemesis_past_core']), 'デストロイアーティファクトβ')
  assert.equal(f('nemesis_attack_artifact', ['nemesis_feature_core', 'nemesis_past_core', 'nemesis_past_core']), 'デストロイアーティファクトγ')
  console.log('fusion chain ok')
}
