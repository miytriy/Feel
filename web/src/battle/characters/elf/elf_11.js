export default {
  id: 'elf_11', name: 'フロストクリスタシア・エリン', class: 'エルフ', rarity: 'silver',
  stats: { hp: 800, atk: 621, def: 201, spd: 40 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    'guard', // 【守護】
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '相手の場のキャラクター1体を選ぶ。それに攻撃力100%分の物理ダメージ。',
      effects: [{ type: 'damage', stat: 'atk', mult: 1.0, dmgType: 'physical', target: 'enemyOne', choose: true }],
    },
  ],
}
