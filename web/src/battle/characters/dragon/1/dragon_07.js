export default {
  id: 'dragon_07', name: '艶麗なる竜人・マリオン', class: 'ドラゴン', rarity: 'silver',
  stats: { hp: 302, atk: 300, def: 90, spd: 73 },
  tags: ['バフ', 'サポート', 'バッファー'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '自分の場の他のキャラクター1体を選ぶ。それは+200/+200する。【覚醒】なら、+200/+200ではなく、+300/+300。',
      log: '自分の場の他のフォロワー1体を選ぶ。それは+200/+200する。',
      logIf: [{ condition: { awaken: true }, log: '自分の場の他のフォロワー1体を選ぶ。それは+300/+300する。' }], // 【覚醒】のとき
      effects: [
        { type: 'buff', stat: 'atk', flat: 200, target: 'otherAllyOne', choose: true }, // ここで対象を選ぶ(以降の効果も同じ対象)
        { type: 'maxHp', flat: 200, target: 'otherAllyOne' },
        // 【覚醒】のときだけ、さらに+100(合計+300)
        { type: 'buff', stat: 'atk', flat: 100, target: 'otherAllyOne', condition: { awaken: true } },
        { type: 'maxHp', flat: 100, target: 'otherAllyOne', condition: { awaken: true } },
      ],
    },
  ],
}
