export default {
  id: 'elf_09', name: '言の葉のエルダーウィードマン', class: 'エルフ', rarity: 'bronze',
  stats: { hp: 301, atk: 300, def: 90, spd: 73 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [{
    name: 'ファンファーレ', trigger: 'fanfare', usesCombo: true,
    desc: '相手の場のキャラクターからランダム1体に150の物理ダメージ。【コンボ_3】1体ではなく3体。',
    log: '相手の場からランダム1体に150の物理ダメージ。',
    logCombo: { combo: 3, log: '相手の場からランダム3体に150の物理ダメージ。' },
    effects: [{ type: 'damage', stat: 'atk', mult: 0, add: 150, dmgType: 'physical', target: 'enemyRandom', count: 1, comboCount: { combo: 3, count: 3 } }],
  }],
}
