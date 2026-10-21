// 【進化時】に【ファンファーレ】と同じ能力が働く、という書き方: 同じ効果を2つのパッシブ(fanfare と onEvolve)に使っています
const blast = [{ type: 'damage', stat: 'atk', mult: 1.0, dmgType: 'physical', target: 'enemies' }]

export default {
  id: 'neutral_04', name: '迸る光明・アポロン', class: 'ニュートラル', rarity: 'silver',
  stats: { hp: 209, atk: 117, def: 131, spd: 80 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '相手すべてに攻撃力100%の物理ダメージ。', effects: blast },
    { name: '進化時', trigger: 'onEvolve', desc: '【ファンファーレ】と同じ能力が働く(相手すべてに攻撃力100%の物理ダメージ)。', effects: blast },
  ],
}
