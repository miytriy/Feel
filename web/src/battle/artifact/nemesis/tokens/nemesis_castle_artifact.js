// キャッスルアーティファクト(トークン / キャラクター / タイプ: アーティファクト / ローテーション: ー)
export default {
  id: 'nemesis_castle_artifact', name: 'キャッスルアーティファクト', class: 'ネメシス', rarity: 'silver', type: 'アーティファクト', token: true,
  cost: 3, // 場に出すときのMP
  fuse: { accept: { type: 'アーティファクト' } }, // 【融合】アーティファクト・ユニット(「ユニット」はアミュレットも含む。コアも素材にできる)
  stats: { hp: 500, atk: 100, def: 400, spd: 70 },
  tags: [],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    'guard', // 【守護】
  ],
  desc: '【融合】アーティファクト・ユニット\nこれに【融合】したユニットのコストの合計によって変身する。\n1→『デストロイアーティファクトα』\n2→『デストロイアーティファクトβ』\n3以上→『デストロイアーティファクトγ』',
  // 融合した素材(ユニット)のコストの合計で変身先が変わる。変身先のカードは、これから追加する(できるまでは融合できない)
  fusions: [
    { when: { costMin: 1, costMax: 1 }, into: 'デストロイアーティファクトα' },
    { when: { costMin: 2, costMax: 2 }, into: 'デストロイアーティファクトβ' },
    { when: { costMin: 3 }, into: 'デストロイアーティファクトγ' },
  ],
}
