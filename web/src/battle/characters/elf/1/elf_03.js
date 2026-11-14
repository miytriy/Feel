export default {
  id: 'elf_03', name: 'ベビーカーバンクル', class: 'エルフ', rarity: 'silver',
  stats: { hp: 226, atk: 231, def: 128, spd: 86 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '自分の場の他のユニット1体を選ぶ。それを再出場させる。', log: '自分の場の他のユニット1体を選ぶ。それを再出場させる。',
      effects: [{ type: 'reenter', target: 'otherAllyOne', choose: true, units: true }] },
    { name: '進化時', trigger: 'onEvolve', desc: '自分のMPを3回復。', log: '自分のMPを3回復。',
      effects: [{ type: 'mp', amount: 3 }] },
  ],
}
