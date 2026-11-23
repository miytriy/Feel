// 勇烈の兵士(ローテーション: アポカリプス・パクト = フォルダ 6)。ID: royal_6_01。タイプ: ー
// 凄烈の剣王・ロードノエル四世(royal_6_06)が場に出す『勇烈の兵士』も、このカード
export default {
  id: 'royal_6_01', name: '勇烈の兵士', class: 'ロイヤル', rarity: 'bronze',
  stats: { hp: 231, atk: 214, def: 90, spd: 92 },
  tags: ['自己強化'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
  passives: [
    'rush', // 【突進】
  ],
  traits: [
    {
      id: 'enhance_3', name: 'エンハンス_3', cost: 3, target: 'self',
      desc: '【エンハンス_3】これは+100/+100する。',
      log: 'これは+100/+100する。',
      effects: [
        { type: 'buff', stat: 'atk', flat: 100, target: 'self' },
        { type: 'maxHp', flat: 100, target: 'self' },
      ],
    },
  ],
}
