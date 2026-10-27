export default {
  id: 'elf_07', name: '殺戮のリノセウス', class: 'エルフ', rarity: 'gold',
  stats: { hp: 202, atk: 0, def: 200, spd: 80 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    'dash', // 【疾走】
    {
      name: 'ファンファーレ', trigger: 'fanfare', usesCombo: true,
      desc: '自分の攻撃力+50×X。Xはコンボ数。',
      effects: [{ type: 'buff', stat: 'atk', perCombo: 50, target: 'self' }],
    },
  ],
}
