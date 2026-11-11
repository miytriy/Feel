export default {
  id: 'elf_04', name: 'ピュアクリスタリア・リリィ', class: 'エルフ', rarity: 'gold',
  stats: { hp: 353, atk: 107, def: 200, spd: 90 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    { name: 'ファンファーレ【コンボ_3】', trigger: 'fanfare', condition: { combo: 3 },
      desc: 'コンボ3以上のとき、相手の場のフォロワー1体を選ぶ。それは現在体力100になる。',
      log: '相手の場のフォロワー1体を選ぶ。それは現在体力100になる。',
      effects: [{ type: 'loseHp', to: 100, target: 'enemyOne', choose: true }] },
    { name: '進化時', trigger: 'onEvolve', desc: '最も近い味方1体の行動順-10%。相手の場のフォロワー1体を選ぶ。それに100の物理ダメージ。',
      log: '最も近い味方1体の行動順-10%。相手の場のフォロワー1体を選ぶ。それに100の物理ダメージ。',
      effects: [
        { type: 'advance', pct: 10, target: 'nearestAlly' },
        { type: 'damage', stat: 'atk', mult: 0, add: 100, dmgType: 'physical', target: 'enemyOne', choose: true },
      ] },
  ],
}
