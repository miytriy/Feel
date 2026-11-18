// スペル(プレイヤー能力): 自分のキャラのターン中、MPを使って1ターンに1回まで使える。キャラの行動は消費しない
// 【土の秘術_1】= earthCost: 1(土の印を1消費して働く。足りないときは働かない / engine.js)
export default {
  id: 'witch_spell_07', name: 'イラプション', class: 'ウィッチ/スペル', rarity: 'silver', // ローテーション: ベーシック(フォルダ basic)。タイプなし(ー)
  cost: 4, // MP
  desc: '場のフォロワーすべてに200の魔法ダメージ。【土の秘術_1】最も近い味方1体の行動順10%アップ。',
  log: '場のフォロワーすべてに200の魔法ダメージ。',
  effects: [
    { type: 'damage', stat: 'mag', mult: 0, add: 200, dmgType: 'magic', target: 'fieldFollowers' },
    { type: 'advance', pct: 10, target: 'nearestAlly', earthCost: 1, desc: '【土の秘術_1】最も近い味方1体の行動順10%アップ。', log: '【土の秘術_1】最も近い味方1体の行動順10%アップ。' },
  ],
}
