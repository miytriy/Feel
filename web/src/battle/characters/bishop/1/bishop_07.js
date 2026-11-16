// 標を与えるレディアンスエンジェル(ローテーション: 伝説の幕開け = フォルダ 1)
export default {
  id: 'bishop_07', name: '標を与えるレディアンスエンジェル', class: 'ビショップ', rarity: 'bronze',
  stats: { hp: 318, atk: 224, def: 101, spd: 61 },
  tags: ['行動促進', '回復', 'サポーター'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '最も近い味方1体の行動順20%アップ。自分の場のフォロワーすべてを100ヒールする。',
      effects: [
        { type: 'advance', pct: 20, target: 'nearestAlly' }, // 自分以外の場のキャラのうち、行動値が最も小さい1体
        { type: 'heal', flat: 100, target: 'allies', followers: true }, // フォロワー = キャラクターと召喚物(アミュレットは含まない)。自分も含む
      ],
    },
  ],
}
