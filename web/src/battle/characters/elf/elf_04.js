export default {
  id: 'elf_04', name: 'ベビーカーバンクル', class: 'エルフ', rarity: 'silver',
  stats: { hp: 226, atk: 231, def: 128, spd: 80 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '自分の場の他単体を選ぶ。それを入場させ直す。',
      effects: [{ type: 'reenter', target: 'otherAllyOne', choose: true }] },
    { name: '進化時', trigger: 'onEvolve', desc: '自分の現在MPを3回復。',
      effects: [{ type: 'mp', amount: 3 }] },
  ],
}
