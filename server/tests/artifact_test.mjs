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
// noField は場に出せない / fuse.accept に合う素材だけ / into が名前のときは、一覧にあるときだけ融合できる
const core = unit('core', 'コア', { cost: 1, noField: true, amulet: true, type: 'アーティファクト', fuse: { accept: { type: 'アーティファクト', amulet: true } }, fusions: [{ when: {}, into: '上位' }] })
const A = (id, type, amulet) => ({ id, name: id, cost: 1, type, amulet })
const mk2 = (cat) => E.createBattle([by('witch_09')], [by('witch_09')], { artifacts: { A: [core], B: [] }, materials: { A: [A('x', 'アーティファクト', true), A('y', null, false)], B: [] }, artifactCatalog: cat })
let s3 = settle(mk2([]))
assert.ok(!act(s3).some((a) => a.type === 'playArtifact'))
assert.ok(!act(s3).some((a) => a.type === 'fuse')) // 変身先がまだ無い
s3 = settle(mk2([unit('top2', '上位')]))
const f3 = act(s3).filter((a) => a.type === 'fuse')
assert.deepEqual(f3.map((a) => a.materials.join()), ['mt0']) // 「アーティファクト・アミュレット」だけ(mt1は不可)
s3 = E.applyAction(s3, f3[0])
assert.equal(s3.artifacts.A[0].name, '上位')
// ネメシスの実カード: フィーチャー・コア + アーティファクト・アミュレット → アタックアーティファクト。ユニットのコスト合計で次の段階が決まる
const fc = (await import('../../web/src/battle/artifact/nemesis/tokens/nemesis_feature_core.js')).default
const at = (await import('../../web/src/battle/artifact/nemesis/tokens/nemesis_attack_artifact.js')).default
const ca = (await import('../../web/src/battle/artifact/nemesis/tokens/nemesis_castle_artifact.js')).default
const mkN = (arts, mats, cat) => settle(E.createBattle([by('witch_09')], [by('witch_09')], { artifacts: { A: arts, B: [] }, materials: { A: mats, B: [] }, artifactCatalog: cat }))
let n1 = mkN([fc], [A('amu', 'アーティファクト', true)], [at, ca])
n1 = E.applyAction(n1, act(n1).find((a) => a.type === 'fuse'))
assert.equal(n1.artifacts.A[0].name, 'アタックアーティファクト')
const dest = (n) => unit('d' + n, 'デストロイアーティファクト' + n)
const U = (id, cost) => ({ id, name: id, cost, type: 'アーティファクト', amulet: false })
const cat2 = [dest('α'), dest('β'), dest('γ')]
for (const [mats, want] of [[[U('u1', 1)], 'α'], [[U('u2', 2)], 'β'], [[U('u1', 1), U('u2', 2)], 'γ'], [[U('u3', 3)], 'γ']]) {
  let n = mkN([at], mats, cat2)
  const f = act(n).filter((a) => a.type === 'fuse' && a.materials.length === mats.length)[0]
  n = E.applyAction(n, f)
  assert.equal(n.artifacts.A[0].name, 'デストロイアーティファクト' + want)
}
assert.ok(!act(mkN([at], [A('amu', 'アーティファクト', true)], cat2)).some((a) => a.type === 'fuse')) // アミュレットは「ユニット」の素材にできない
// CPUは、アーティファクトを使わない(行動を選んでもエラーにならない)
const AI = await import('../../web/src/battle/ai.js')
let s2 = mk([base], [M('m_a', 2), M('m_b', 3)])
for (let i = 0; i < 60 && !s2.winner; i++) { const a = AI.chooseAction(s2, 3); assert.ok(a.type !== 'fuse' && a.type !== 'playArtifact'); s2 = E.applyAction(s2, a) }
// 手持ちが無いとき(通常のバトル)は、何も増えない
const plain = E.createBattle([by('witch_09')], [by('witch_09')], {})
assert.ok(!E.legalActions(plain).some((a) => a.type === 'fuse' || a.type === 'playArtifact'))
console.log('artifact tests ok')
// ネメシスの連鎖: コア → アタック → デストロイα → (βとγを融合) → イクシードΩ
{
  const ld = async (n) => (await import(`../../web/src/battle/artifact/nemesis/tokens/nemesis_${n}.js`)).default
  const [al, be, ga, om] = [await ld('destroy_alpha'), await ld('destroy_beta'), await ld('destroy_gamma'), await ld('exceed_omega')]
  for (const d of [al, be, ga, om]) assert.deepEqual(validateArtifact(d), [])
  const cat = [al, be, ga, om]
  const mat = (d) => ({ id: d.id, name: d.name, cost: d.cost, type: d.type, amulet: false })
  let n = mkN([al], [mat(be), mat(ga)], cat)
  const fs = act(n).filter((a) => a.type === 'fuse')
  assert.deepEqual(fs.map((a) => a.materials.join()), ['mt0,mt1']) // βだけ・γだけでは融合できない(種類2のときだけ)
  n = E.applyAction(n, fs[0])
  assert.equal(n.artifacts.A[0].name, 'イクシードアーティファクトΩ')
  // Ωを場に出す: MP10。疾走・守護・オーラを持つ
  n.mp.A = 10
  n = E.applyAction(n, act(n).find((a) => a.type === 'playArtifact'))
  const om2 = n.units.find((x) => x.name === 'イクシードアーティファクトΩ')
  assert.ok(om2 && om2.keywords.includes('dash') && om2.keywords.includes('guard') && om2.keywords.includes('aura'))
  console.log('nemesis chain ok')
}
// イリス: 倒れると、パスト・コアが手持ちに付与される
{
  const iris = by('nemesis_01')
  assert.ok(iris, 'nemesis_01 が読み込まれていません')
  let n = settle(E.createBattle([iris, by('witch_09')], [by('witch_09'), by('witch_10')], {}))
  for (let i = 0; i < 400 && !n.winner && !n.artifacts.A.length; i++) { const a = AI.chooseAction(n, 3); n = settle(E.applyAction(n, a)) }
  assert.deepEqual(n.artifacts.A.map((x) => x.name), ['パスト・コア'])
  console.log('iris ok')
}
