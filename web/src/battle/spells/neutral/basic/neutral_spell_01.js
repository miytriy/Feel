// スペル(プレイヤー能力): 自分のキャラのターン中、MPを使って1ターンに1回まで使える。キャラの行動は消費しない
export default {
  id: 'neutral_spell_01', name: '神の雷霆', class: 'ニュートラル/スペル', rarity: 'gold', // ローテーション: ベーシック。タイプなし(ー)
  cost: 4, // MP
  desc: '相手の場の攻撃力最大の召喚物からランダム1体を破壊。相手の場のキャラクターすべてに100の物理ダメージ。',
  log: '相手の場の攻撃力最大の召喚物からランダム1体を破壊。相手の場のキャラクターすべてに100の物理ダメージ。',
  effects: [
    { type: 'destroy', target: 'enemySummonTopAtk', settle: true },
    { type: 'damage', stat: 'atk', mult: 0, add: 100, dmgType: 'physical', target: 'enemies' },
  ],
}
