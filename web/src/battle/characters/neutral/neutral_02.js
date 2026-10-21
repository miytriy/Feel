export default {
  id: 'neutral_02', name: '楽郎の天宮・フィルドア', class: 'ニュートラル', rarity: 'gold',
  stats: { hp: 202, atk: 219, def: 105, spd: 90 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [{ name: '進化時ダメージ', trigger: 'onEvolve', desc: '進化時、相手単体に攻撃力110%分の物理ダメージ。',
    effects: [{ type: 'damage', stat: 'atk', mult: 1.1, dmgType: 'physical', target: 'enemyOne' }] }],
}
