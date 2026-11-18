// 王統なる王冠(ローテーション: ベーシック = フォルダ basic)。タイプなし(ー)
export default {
  id: 'royal_amulet_01', name: '王統なる王冠', class: 'ロイヤル', rarity: 'silver', amulet: true, countdown: 4, // 【カウントダウン_4】
  stats: { hp: 1, atk: 0, def: 0, spd: 70 }, // アミュレットには体力の概念がない(数字は使われません)
  skill: { name: '-', stat: 'atk', type: 'physical', mult: 0 },
  passives: [
    {
      name: '王統なる王冠', trigger: 'allyEnter', enterFollower: true,
      desc: '自分のフォロワーが場に出たとき、それは+100/+100する。',
      log: 'それは+100/+100する。',
      effects: [
        { type: 'buff', stat: 'atk', flat: 100, target: 'entered' },
        { type: 'maxHp', flat: 100, target: 'entered' }, // +100/+100 = 攻撃力+100 / 体力+100
      ],
    },
  ],
}
