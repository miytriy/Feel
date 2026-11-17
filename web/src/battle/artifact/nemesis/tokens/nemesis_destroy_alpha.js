// デストロイアーティファクトα(トークン / キャラクター / タイプ: アーティファクト / ローテーション: ー)
export default {
  id: 'nemesis_destroy_alpha', name: 'デストロイアーティファクトα', class: 'ネメシス', rarity: 'gold', type: 'アーティファクト', token: true,
  cost: 5, // 場に出すときのMP / 素材としてのコスト
  stats: { hp: 500, atk: 300, def: 200, spd: 60 },
  tags: [],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    {
      name: '常時', trigger: 'turnEnd',
      desc: '自分のターン終了時、自分の場のキャラクターすべてに300のヒールを割り振る。',
      log: '自分の場のキャラクターすべてに300のヒールを割り振る。',
      effects: [{ type: 'heal', flat: 300, split: true, target: 'allies' }],
    },
  ],
  // 【融合】『デストロイアーティファクトβ』や『デストロイアーティファクトγ』: 融合した種類が2なら『イクシードアーティファクトΩ』に変身する(βとγを1種類ずつ)
  fuse: { accept: { ids: ['nemesis_destroy_beta', 'nemesis_destroy_gamma'] } },
  desc: '【融合】『デストロイアーティファクトβ』や『デストロイアーティファクトγ』\nこれに【融合】したとき、これに【融合】した種類が2なら、これは『イクシードアーティファクトΩ』に変身する。',
  fusions: [{ when: { kindsMin: 2 }, into: 'イクシードアーティファクトΩ' }],
}
