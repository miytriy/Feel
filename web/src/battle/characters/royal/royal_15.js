// 「自分以外の場すべてのキャラクターは攻撃力・体力を+100」(ファンファーレと進化時で同じ能力)
const buffOthers = [
  { type: 'buff', stat: 'atk', flat: 100, target: 'otherAllyField' },
  { type: 'maxHp', flat: 100, target: 'otherAllyField' },
]

export default {
  id: 'royal_15', name: 'ピースディーラー・エルネスタ', class: 'ロイヤル', rarity: 'bronze',
  stats: { hp: 602, atk: 400, def: 203, spd: 50 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '自分以外の場すべてのキャラクターは「攻撃力・体力を+100」を行う。', effects: buffOthers },
    { name: '進化時', trigger: 'onEvolve', desc: '【ファンファーレ】と同じ能力が働く。', effects: buffOthers },
  ],
}
