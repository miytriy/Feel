export default {
  id: 'dragon_07', name: '艶麗なる竜人・マリオン', class: 'ドラゴン', rarity: 'silver',
  stats: { hp: 302, atk: 300, def: 90, spd: 70 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '自分の場の他のキャラクター1体を選ぶ。それは「攻撃力・体力+120」を行う。【覚醒】なら、+120ではなく、+130。',
      effects: [
        { type: 'buff', stat: 'atk', flat: 120, target: 'otherAllyOne', choose: true }, // ここで対象を選ぶ(以降の効果も同じ対象)
        { type: 'maxHp', flat: 120, target: 'otherAllyOne' },
        // 【覚醒】のときだけ、さらに+10(合計+130)
        { type: 'buff', stat: 'atk', flat: 10, target: 'otherAllyOne', condition: { awaken: true } },
        { type: 'maxHp', flat: 10, target: 'otherAllyOne', condition: { awaken: true } },
      ],
    },
  ],
}
