export default {
  id: 'elf_15', name: 'アドベンチャーエルフ・メイ', class: 'エルフ', rarity: 'silver',
  stats: { hp: 114, atk: 153, def: 90, spd: 98 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [{
    name: 'ファンファーレ【コンボ_3】', trigger: 'fanfare', condition: { combo: 3 },
    desc: '相手の場のフォロワー1体を選ぶ。それに300の物理ダメージ。',
    effects: [{ type: 'damage', stat: 'atk', mult: 0, add: 300, dmgType: 'physical', target: 'enemyOne', choose: true }],
  }],
}
