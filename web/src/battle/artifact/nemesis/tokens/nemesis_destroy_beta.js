// デストロイアーティファクトβ(トークン / キャラクター / タイプ: アーティファクト / ローテーション: ー)
export default {
  id: 'nemesis_destroy_beta', name: 'デストロイアーティファクトβ', class: 'ネメシス', rarity: 'gold', type: 'アーティファクト', token: true,
  cost: 5, // 場に出すときのMP / 素材としてのコスト
  stats: { hp: 400, atk: 400, def: 90, spd: 60 },
  tags: [],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    {
      name: '常時', trigger: 'turnEnd',
      desc: '自分のターン終了時、相手のキャラクター1体に300の物理ダメージ。',
      log: '相手のキャラクター1体に300の物理ダメージ。',
      effects: [{ type: 'damage', stat: 'atk', mult: 0, add: 300, dmgType: 'physical', target: 'enemyOne', choose: true }],
    },
  ],
}
