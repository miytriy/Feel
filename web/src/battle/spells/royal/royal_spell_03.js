// スペル(プレイヤー能力): 相手1体を選んで物理ダメージ → 自分の場すべてに、ヒールを割り振る
export default {
  id: 'royal_spell_03', name: 'テンタクルバイト', class: 'ロイヤル/スペル', rarity: 'gold',
  cost: 7, // MP
  desc: '相手の場のキャラクター1体を選ぶ。それに250の物理ダメージ。自分の場すべてに300のヒールを割り振る。',
  effects: [
    { type: 'damage', stat: 'atk', mult: 0, add: 250, dmgType: 'physical', target: 'enemyOne', choose: true },
    { type: 'heal', flat: 300, split: true, target: 'allyField' }, // 300を、場の全員で等分する
  ],
}
