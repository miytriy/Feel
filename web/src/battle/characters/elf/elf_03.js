export default {
  id: 'elf_03', name: '舞い踊る妖精', class: 'エルフ', rarity: 'bronze',
  stats: { hp: 113, atk: 236, def: 183, spd: 80 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [{
    name: 'ファンファーレ【コンボ_3】', trigger: 'fanfare', condition: { combo: 3 },
    desc: 'コンボ3以上のとき、自分の場すべて(召喚物も含む)は攻撃力・HP+100%。',
    effects: [
      { type: 'buff', stat: 'atk', pct: 100, target: 'allyField' },
      { type: 'maxHp', pct: 100, target: 'allyField' },
    ],
  }],
}
