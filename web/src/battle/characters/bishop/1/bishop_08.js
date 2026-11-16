// 水の守護神・サレファ(ローテーション: 伝説の幕開け = フォルダ 1)
export default {
  id: 'bishop_08', name: '水の守護神・サレファ', class: 'ビショップ', rarity: 'legend',
  stats: { hp: 336, atk: 347, def: 90, spd: 63 },
  tags: ['回復', '確定ダメージ', '範囲攻撃', 'サポーター'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
  passives: [
    'guard', // 【守護】
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '自分の場のフォロワーすべてを150ヒールする。',
      effects: [{ type: 'heal', flat: 150, target: 'allies', followers: true }], // フォロワー = キャラクターと召喚物(アミュレットは含まない)。自分も含む
    },
    {
      name: '進化時', trigger: 'onEvolve',
      desc: '相手の場のフォロワーすべてに300の確定ダメージ。',
      effects: [{ type: 'damage', stat: 'atk', mult: 0, add: 300, dmgType: 'true', target: 'enemyFollowers' }],
    },
  ],
}
