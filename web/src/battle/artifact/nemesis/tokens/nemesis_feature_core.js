// フィーチャー・コア(トークン / アミュレット / タイプ: アーティファクト / ローテーション: ー)
// 【融合】アーティファクト・アミュレット: これに【融合】したとき、これは『アタックアーティファクト』に変身する。フィールドに存在できない。
export default {
  id: 'nemesis_feature_core', name: 'フィーチャー・コア', class: 'ネメシス', rarity: 'bronze', type: 'アーティファクト', token: true, amulet: true,
  cost: 1, noField: true, // cost = 素材としてのコスト / noField = 場に出せない(フィールドに存在できない)
  stats: { hp: 1, atk: 0, def: 0, spd: 100 }, // アミュレットには体力の概念がない(数字は使われません)
  tags: [],
  skill: { name: '-', stat: 'atk', type: 'physical', mult: 0 },
  passives: [],
  desc: '【融合】アーティファクト・アミュレット\nこれに【融合】したとき、これは『アタックアーティファクト』に変身する。\nフィールドに存在できない。',
  fuse: { accept: { type: 'アーティファクト', amulet: true } }, // 素材にできるのは「アーティファクト・アミュレット」
  fusions: [{ when: {}, into: 'アタックアーティファクト' }], // 変身先のカードは、これから追加する(できるまでは融合できない)
}
