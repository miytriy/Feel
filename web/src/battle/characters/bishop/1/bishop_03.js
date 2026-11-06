// 聖心のプリズムブースト(ローテーション: 伝説の幕開け = フォルダ 1)
export default {
  id: 'bishop_03', name: '聖心のプリズムブースト', class: 'ビショップ', rarity: 'bronze',
  stats: { hp: 223, atk: 200, def: 90, spd: 70 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '自分の場にあるアミュレット1つを選ぶ。それと同名のアミュレット1つを場に出す。',
      effects: [{ type: 'copyAmulet', target: 'allyAmuletOne', choose: true }],
    },
    {
      name: '進化時', trigger: 'onEvolve',
      desc: '自分の場のアミュレット1つを選ぶ。それの速度を+10する。',
      effects: [{ type: 'buff', stat: 'spd', flat: 10, target: 'allyAmuletOne', choose: true }],
    },
  ],
}
