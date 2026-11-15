export default {
  id: 'royal_02', name: '異端の侍', class: 'ロイヤル', rarity: 'bronze',
  stats: { hp: 164, atk: 243, def: 100, spd: 91 },
  tags: ['強襲', '必殺', 'アタッカー'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    'rush', // 【突進】
    'finisher', // 【必殺】
  ],
}
