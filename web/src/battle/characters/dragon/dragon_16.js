export default {
  id: 'dragon_16', name: '再臨のジェネシスドラゴン', class: 'ドラゴン', rarity: 'gold',
  stats: { hp: 1000, atk: 910, def: 100, spd: 10 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: ['dash'], // 【疾走】
}
