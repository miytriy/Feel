export default {
  id: 'elf_09', name: '言の葉のエルダーウィードマン', class: 'エルフ', rarity: 'bronze',
  stats: { hp: 301, atk: 300, def: 90, spd: 70 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [{
    name: 'ファンファーレ【コンボ_3】', trigger: 'fanfare', usesCombo: true,
    desc: '相手の場からランダム1体に150の物理ダメージ。コンボ3以上のときは、1体ではなく3体(重ならない)。',
    effects: [{ type: 'damage', stat: 'atk', mult: 0, add: 150, dmgType: 'physical', target: 'enemyRandom', count: 1, comboCount: { combo: 3, count: 3 } }],
  }],
}
