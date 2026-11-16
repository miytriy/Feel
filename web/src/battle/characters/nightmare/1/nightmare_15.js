// 串刺し公・ヴラド(ローテーション: 伝説の幕開け = フォルダ 1)
export default {
  id: 'nightmare_15', name: '串刺し公・ヴラド', class: 'ナイトメア', rarity: 'silver',
  stats: { hp: 829, atk: 532, def: 300, spd: 33 },
  tags: ['治療', 'サポーター'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
  passives: [
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '相手の場のキャラクター1体を選ぶ。それに250の物理ダメージ。自分の場のキャラクターに500のヒールを割り振る。',
      effects: [
        { type: 'damage', stat: 'atk', mult: 0, add: 250, dmgType: 'physical', target: 'enemyOne', choose: true }, // 相手の場のキャラクター1体
        { type: 'heal', flat: 500, split: true, target: 'allies' }, // 「割り振る」= 合計500を、自分の場のキャラクターの人数で等分する
      ],
    },
  ],
}
