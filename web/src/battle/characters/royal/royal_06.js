export default {
  id: 'royal_06', name: '愛の騎士・イアン', class: 'ロイヤル', rarity: 'bronze',
  stats: { hp: 264, atk: 211, def: 103, spd: 80 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    'guard', // 【守護】
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '自分の場の他のキャラクター1体を選ぶ。それは攻撃力+20%、体力+20%。',
      effects: [
        { type: 'buff', stat: 'atk', pct: 20, target: 'otherAllyOne', choose: true }, // ここで対象を選ぶ(次の効果も同じ対象)
        { type: 'maxHp', pct: 20, target: 'otherAllyOne' },
      ],
    },
  ],
}
