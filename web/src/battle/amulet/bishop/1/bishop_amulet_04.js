// セイクリッドインジェクション(ローテーション: 伝説の幕開け = フォルダ 1)。タイプなし(ー)
export default {
  id: 'bishop_amulet_04', name: 'セイクリッドインジェクション', class: 'ビショップ', rarity: 'silver', amulet: true,
  stats: { hp: 1, atk: 0, def: 0, spd: 70 }, // アミュレットには体力の概念がない(数字は使われません)
  skill: { name: '-', stat: 'atk', type: 'physical', mult: 0 },
  traits: [{
    id: 'act', name: 'アクト', cost: 0, target: 'enemyOne',
    desc: '【アクト】これを破壊。相手の場のキャラクター1体を選ぶ。それに150の物理ダメージ。自分の場に100のヒールを割り振る。',
    effects: [
      { type: 'destroy', target: 'self', settle: true }, // 先に自分を破壊して処理を済ませる(ヒールの割り振りの人数に、これが入らないように)
      { type: 'damage', stat: 'atk', mult: 0, add: 150, dmgType: 'physical', target: 'enemyOne' },
      { type: 'heal', flat: 100, split: true, target: 'allyField' }, // 割り振る = 合計100を、対象の人数で等分
    ],
  }],
}
