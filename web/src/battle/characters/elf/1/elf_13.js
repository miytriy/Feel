export default {
  id: 'elf_13', name: '煌撃の戦士・ベイル', class: 'エルフ', rarity: 'gold',
  stats: { hp: 410, atk: 400, def: 90, spd: 20 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '相手のキャラクター1体を選ぶ。それに攻撃力100%分の物理ダメージ。',
      effects: [{ type: 'damage', stat: 'atk', mult: 1.0, dmgType: 'physical', target: 'enemyOne', choose: true }],
    },
    {
      name: '常時', trigger: 'allyDeath',
      desc: '味方が戦闘不能になったとき、自身の速度+10。(重なる)',
      effects: [{ type: 'buff', stat: 'spd', flat: 10, target: 'self' }],
    },
  ],
}
