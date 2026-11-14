export default {
  id: 'elf_20', name: '薫交の天宮・バックウッド', class: 'エルフ', rarity: 'gold',
  stats: { hp: 304, atk: 317, def: 90, spd: 63 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    { name: 'ファンファーレ', trigger: 'fanfare',
      desc: '自分の場の最も近いキャラクター1体の行動順20%アップ。',
      log: '自分の場の最も近いキャラクター1体の行動順20%アップ。',
      effects: [{ type: 'advance', pct: 20, target: 'nearestAlly' }] },
    { name: '進化時', trigger: 'onEvolve',
      desc: '相手の場のフォロワーすべてにX×80の物理ダメージ。Xは自分の場のフォロワーの数である。',
      log: '相手の場のフォロワーすべてにX×80の物理ダメージ。Xは自分の場のフォロワーの数である。',
      effects: [{ type: 'damage', stat: 'atk', mult: 0, perFollower: 80, dmgType: 'physical', target: 'enemyFollowers' }] },
  ],
}
