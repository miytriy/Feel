export default {
  id: 'witch_07', name: 'ルーンブレイドコンダクター', class: 'ウィッチ', rarity: 'bronze',
  stats: { hp: 100, atk: 100, def: 90, spd: 61 },
  tags: ['増幅', '自己強化', 'メインアタッカー'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '相手の場のフォロワー1体を選ぶ。それにXの物理ダメージ。Xはこれの攻撃力である。',
      effects: [{ type: 'damage', stat: 'atk', mult: 1, dmgType: 'physical', target: 'enemyFollowerOne', choose: true }],
    },
    {
      name: 'スペルブースト時', trigger: 'onBoost',
      desc: 'これは+100/+100する。',
      effects: [
        { type: 'buff', stat: 'atk', flat: 100, target: 'self' },
        { type: 'maxHp', flat: 100, target: 'self' },
      ],
    },
  ],
}
