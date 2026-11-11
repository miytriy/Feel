export default {
  id: 'royal_05', name: '愛の騎士・イアン', class: 'ロイヤル', rarity: 'bronze',
  stats: { hp: 264, atk: 211, def: 90, spd: 81 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    'guard', // 【守護】
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '自分の場の他のフォロワー1体を選ぶ。それは攻撃力+100、体力+100する。',
      log: '自分の場の他のフォロワー1体を選ぶ。それは+100/+100する。',
      effects: [
        { type: 'buff', stat: 'atk', flat: 100, target: 'otherAllyOne', choose: true }, // ここで対象を選ぶ(次の効果も同じ対象)
        { type: 'maxHp', flat: 100, target: 'otherAllyOne' },
      ],
    },
  ],
}
