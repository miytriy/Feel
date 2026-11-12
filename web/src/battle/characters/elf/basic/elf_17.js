export default {
  id: 'elf_17', name: 'ストレイビーストマン', class: 'エルフ', rarity: 'bronze',
  stats: { hp: 241, atk: 264, def: 90, spd: 94 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [{
    name: 'ファンファーレ', trigger: 'fanfare', desc: '自分の【コンボ】を+1する。',
    effects: [{ type: 'gainCombo', amount: 1, target: 'self' }],
  }],
}
