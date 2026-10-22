export default {
  id: 'witch_07', name: 'ルーンブレイドコンダクター', class: 'ウィッチ', rarity: 'bronze',
  stats: { hp: 100, atk: 100, def: 90, spd: 60 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '相手の場のキャラクター1体を選ぶ。それにXの物理ダメージ。Xはこれの攻撃力である。',
      effects: [{ type: 'damage', stat: 'atk', mult: 1, dmgType: 'physical', target: 'enemyOne', choose: true }],
    },
    {
      name: 'スペルブースト時', trigger: 'onBoost',
      desc: 'これは攻撃力・体力+50する。',
      effects: [
        { type: 'buff', stat: 'atk', flat: 50, target: 'self' },
        { type: 'maxHp', flat: 50, target: 'self' },
      ],
    },
  ],
}
