export default {
  id: 'elf_18', name: '温厚なるトレント', class: 'エルフ', rarity: 'bronze',
  stats: { hp: 431, atk: 480, def: 90, spd: 74 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    {
      name: 'ファンファーレ', trigger: 'fanfare', condition: { combo: 3 },
      desc: '【コンボ_3】これは進化する。',
      effects: [{ type: 'evolve' }],
    },
    {
      name: '攻撃時', trigger: 'onAttack', desc: '自分の場のフォロワーすべてを200ヒール。',
      effects: [{ type: 'heal', flat: 200, target: 'allyField' }],
    },
  ],
}
