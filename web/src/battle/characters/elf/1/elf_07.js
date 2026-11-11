export default {
  id: 'elf_07', name: '殺戮のリノセウス', class: 'エルフ', rarity: 'gold',
  stats: { hp: 202, atk: 0, def: 200, spd: 82 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    'dash', // 【疾走】
  ],
  traits: [{
    id: 'active', name: 'アクティブ', cost: 1, target: 'self', usesCombo: true,
    desc: '【アクティブ】MPを1消費する。これは攻撃力+100×Xする。Xは【コンボ】である。',
    log: 'これは攻撃力+Xする。', // 左のログに出す文
    effects: [{ type: 'buff', stat: 'atk', perCombo: 100, target: 'self' }],
  }],
}
