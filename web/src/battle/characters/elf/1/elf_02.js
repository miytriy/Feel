export default {
  id: 'elf_02', name: '舞い踊る妖精', class: 'エルフ', rarity: 'bronze',
  stats: { hp: 113, atk: 236, def: 183, spd: 91 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [{
    name: 'ファンファーレ【コンボ_3】', trigger: 'fanfare', condition: { combo: 3 },
    desc: '【コンボ_3】自分の場の他のフォロワーすべては+100/+100する。',
    log: '自分の場の他のフォロワーすべては+100/+100する。', // 左のログに出す文
    effects: [
      { type: 'buff', stat: 'atk', flat: 100, target: 'otherAllyField' },
      { type: 'maxHp', flat: 100, target: 'otherAllyField' },
    ],
  }],
}
