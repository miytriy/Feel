// 薔薇の閃撃(ファンファーレで使えるようになる特性)。MPは0。1ターンに何回でも使える
const roseStrike = {
  id: 'rose_strike', name: '薔薇の閃撃', cost: 0, repeatable: true, target: 'enemyOne',
  desc: '【薔薇の閃撃】相手のキャラクター1体を選ぶ。それに100の物理ダメージ。',
  effects: [{ type: 'damage', stat: 'atk', mult: 0, add: 100, dmgType: 'physical', target: 'enemyOne' }],
}

export default {
  id: 'elf_16', name: '豊麗なるローズクイーン', class: 'エルフ', rarity: 'legend',
  stats: { hp: 608, atk: 601, def: 90, spd: 10 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    'guard', // 【守護】
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '速度100・90の味方(自分以外)の数だけ、「薔薇の閃撃」を使えるようにする(X回)。',
      effects: [{ type: 'enableTrait', perAllySpeed: [100, 90], trait: roseStrike, target: 'self' }],
    },
  ],
}
