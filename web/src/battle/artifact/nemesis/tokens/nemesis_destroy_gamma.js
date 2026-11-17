// デストロイアーティファクトγ(トークン / キャラクター / タイプ: アーティファクト / ローテーション: ー)
export default {
  id: 'nemesis_destroy_gamma', name: 'デストロイアーティファクトγ', class: 'ネメシス', rarity: 'gold', type: 'アーティファクト', token: true,
  cost: 5, // 場に出すときのMP / 素材としてのコスト
  stats: { hp: 300, atk: 500, def: 200, spd: 60 },
  tags: [],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    {
      name: '常時', trigger: 'turnEnd',
      desc: '自分のターン終了時、相手の場のフォロワーすべてに300の物理ダメージ。',
      log: '相手の場のフォロワーすべてに300の物理ダメージ。',
      effects: [{ type: 'damage', stat: 'atk', mult: 0, add: 300, dmgType: 'physical', target: 'enemyFollowers' }],
    },
  ],
}
