// イクシードアーティファクトΩ(トークン / キャラクター / タイプ: アーティファクト / ローテーション: ー)
export default {
  id: 'nemesis_exceed_omega', name: 'イクシードアーティファクトΩ', class: 'ネメシス', rarity: 'legend', type: 'アーティファクト', token: true,
  cost: 10, // 場に出すときのMP / 素材としてのコスト
  stats: { hp: 1000, atk: 1000, def: 90, spd: 10 },
  tags: [],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '相手の場のフォロワーすべてに500ダメージ。自分のキャラクターすべてに500のヒールを割り振る。',
      log: '相手の場のフォロワーすべてに500ダメージ。自分のキャラクターすべてに500のヒールを割り振る。',
      effects: [
        { type: 'damage', stat: 'atk', mult: 0, add: 500, dmgType: 'physical', target: 'enemyFollowers' },
        { type: 'heal', flat: 500, split: true, target: 'allies' },
      ],
    },
    'dash', // 【疾走】
    'guard', // 【守護】
    'aura', // 【オーラ】
  ],
}
