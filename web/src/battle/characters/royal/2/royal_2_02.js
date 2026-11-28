// トリガーメイド・セリエ(ローテーション: インフィニティ・エボルヴ = フォルダ 2)。ブロンズ・ロイヤル
export default {
  id: 'royal_2_02', name: 'トリガーメイド・セリエ', class: 'ロイヤル', rarity: 'bronze',
  stats: { hp: 110, atk: 200, def: 100, spd: 92 },
  tags: ['範囲攻撃'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
  passives: [
    {
      name: 'ファンファーレ', trigger: 'fanfare', desc: '相手の場のフォロワーからランダム2体に100の物理ダメージ。',
      log: '相手の場のフォロワーからランダム2体に100の物理ダメージ。',
      effects: [{ type: 'damage', stat: 'atk', mult: 0, add: 100, dmgType: 'physical', target: 'enemyFollowerRandom', count: 2 }], // 重ならないランダム2体(相手が1体なら1体だけ)
    },
  ],
}
