export default {
  id: 'dragon_11', name: '覇道の竜翼・フォルテ', class: 'ドラゴン', rarity: 'legend',
  stats: { hp: 203, atk: 526, def: 303, spd: 50 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: ['dash', 'intimidate'], // 【疾走】【威圧】
}
