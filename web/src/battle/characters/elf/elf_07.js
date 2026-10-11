export default {
  id: 'elf_07', name: '働きバッタ', class: 'エルフ', rarity: 'bronze',
  stats: { hp: 110, atk: 207, def: 105, spd: 80 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [{
    name: 'ファンファーレ', trigger: 'fanfare', usesCombo: true,
    desc: '自分の所持キャラクターから、速度がX×10のキャラクターをランダムに1体召喚する。Xはコンボ数で、最大10まで。',
    effects: [{ type: 'summon', fromOwned: true, speedPerCombo: 10, maxCombo: 10 }],
  }],
}
