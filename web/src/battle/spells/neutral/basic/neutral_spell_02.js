// スペル(プレイヤー能力): 自分のキャラのターン中、MPを使って1ターンに1回まで使える。キャラの行動は消費しない
export default {
  id: 'neutral_spell_02', name: '熾天使の福音', class: 'ニュートラル/スペル', rarity: 'silver', // ローテーション: ベーシック。タイプなし(ー)
  cost: 3, // MP
  desc: '最も近い味方1体の行動順20%アップ。',
  log: '最も近い味方1体の行動順20%アップ。',
  effects: [{ type: 'advance', pct: 20, target: 'nearestAlly' }],
}
