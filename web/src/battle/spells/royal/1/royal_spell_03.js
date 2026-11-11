// スペル(プレイヤー能力): 相手1体を選んで物理ダメージ → 自分の場すべてを300ヒール(割り振らず、全員が300回復)
export default {
  id: 'royal_spell_03', name: 'テンタクルバイト', class: 'ロイヤル/スペル', rarity: 'gold', type: 'レヴィオン',
  cost: 7, // MP
  desc: '相手の場のフォロワー1体を選ぶ。それに250の物理ダメージ。自分の場すべてを300ヒール。',
  log: '相手の場のフォロワー1体を選ぶ。それに250の物理ダメージ。自分の場すべてを300ヒール。',
  effects: [
    { type: 'damage', stat: 'atk', mult: 0, add: 250, dmgType: 'physical', target: 'enemyOne', choose: true },
    { type: 'heal', flat: 300, target: 'allyField' }, // 場の全員が、それぞれ300回復する
  ],
}
