// アーティファクト(手持ち・【融合】・場に出す)の骨格: node server/tests/artifact_test.mjs
import assert from 'node:assert/strict'
import { loadRegistry } from '../pvp/registry.js'
import { validateArtifact, validateMaterial } from '../../web/src/battle/artifact/validate.js'

const reg = await loadRegistry()
const E = reg.engine
const by = (id) => reg.chars.find((c) => c.id === id)
const unit = (id, name, extra = {}) => ({ id, name, class: 'ウィッチ', rarity: 'bronze', stats: { hp: 200, atk: 100, def: 50, spd: 30 }, tags: [], skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1 }, passives: [], ...extra })
const top = unit('af_top', '頂点', { cost: 1 })
const mid = unit('af_mid', '中段', { cost: 1, fusions: [{ when: { countMin: 2 }, into: top }] })
const base = unit('af_base', '基礎', { cost: 1, fusions: [{ when: { costMin: 5 }, into: mid }, { when: { kindsMin: 2 }, into: unit('af_alt', '分岐', { cost: 1 }) }] })
const M = (id, cost) => ({ id, name: id, cost })

// チェック
assert.deepEqual(validateArtifact(base, { expectedId: 'af_base' }), [])
assert.ok(validateArtifact({ ...base, fusions: [{ when: { foo: 1 }, into: top }] }).length)
assert.ok(validateArtifact({ ...base, fusions: [{ when: {} }] }).length)
assert.deepEqual(validateMaterial(M('m1', 2)), [])
assert.ok(validateMaterial({ id: 'x', name: 'x' }).length)

const mk = (arts, mats) => E.createBattle([by('witch_09'), by('witch_10')], [by('witch_09'), by('witch_10')], { artifacts: { A: arts, B: [] }, materials: { A: mats, B: [] } })
const act = (st) => E.legalActions(st)
let st = mk([base], [M('m_a', 2), M('m_b', 3), M('m_c', 1)])
// 先頭のキャラが、自分のチームの番になるまで進める
const settle = (s) => { for (let i = 0; i < 20 && s.pending; i++) s = E.applyAction(s, E.legalActions(s)[0]); return s }
st = settle(st)
for (let i = 0; i < 20 && E.getActiveUnit(st).team !== 'A'; i++) st = settle(E.applyAction(st, { type: 'endTurn' }))
assert.equal(E.getActiveUnit(st).team, 'A')
const fuses = act(st).filter((a) => a.type === 'fuse')
// コスト合計5以上(a+b=5, a+b+c=6, b+c=4は不可 → 2種類以上なら分岐)。合う組み合わせだけが行動になる
assert.ok(fuses.length > 0)
const sums = (a) => a.materials.map((sl) => st.materials.A.find((m) => m.slot === sl).cost).reduce((x, y) => x + y, 0)
for (const f of fuses) { const kinds = f.materials.length; assert.ok(sums(f) >= 5 || kinds >= 2) }
// 素材 a+b(合計5)→ 中段
const ab = fuses.find((a) => a.materials.join() === 'mt0,mt1')
st = E.applyAction(st, ab)
assert.equal(st.artifacts.A[0].name, '中段')
assert.equal(st.materials.A.length, 1) // 使った素材は無くなる
assert.equal(st.artifacts.A[0].slot, 'af0') // 枠は同じ
assert.equal(E.getActiveUnit(st).team, 'A') // 融合しても、キャラのターンは続く
// 中段は「2枚以上」で頂点へ。素材が1枚だけなら融合できない
assert.equal(act(st).filter((a) => a.type === 'fuse').length, 0)
// 場に出す(MPが足りているとき): 召喚物のユニットになり、手持ちから無くなる
st.mp.A = 5
const play = act(st).find((a) => a.type === 'playArtifact')
assert.ok(play)
st = E.applyAction(st, play)
assert.equal(st.artifacts.A.length, 0)
const u = st.units.find((x) => x.name === '中段')
assert.ok(u && u.alive && u.field === 'summon' && u.artifact === true)
assert.equal(st.mp.A, 4)
// CPUは、アーティファクトを使わない(行動を選んでもエラーにならない)
const AI = await import('../../web/src/battle/ai.js')
let s2 = mk([base], [M('m_a', 2), M('m_b', 3)])
for (let i = 0; i < 60 && !s2.winner; i++) { const a = AI.chooseAction(s2, 3); assert.ok(a.type !== 'fuse' && a.type !== 'playArtifact'); s2 = E.applyAction(s2, a) }
// 手持ちが無いとき(通常のバトル)は、何も増えない
const plain = E.createBattle([by('witch_09')], [by('witch_09')], {})
assert.ok(!E.legalActions(plain).some((a) => a.type === 'fuse' || a.type === 'playArtifact'))
console.log('artifact tests ok')
