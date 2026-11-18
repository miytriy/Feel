// スペル(プレイヤー能力): 自分のキャラのターン中、MPを使って1ターンに1回まで使える。キャラの行動は消費しない
export default {
  id: 'dragon_spell_03', name: '竜の啓示', class: 'ドラゴン/スペル', rarity: 'silver', // ローテーション: ベーシック(フォルダ basic)。タイプなし(ー)
  cost: 3, // MP
  desc: '自分のMP最大値を+1する。その後、自分のMP最大値が10なら、最も近い味方1体の行動順10%アップ。',
  log: '自分のMP最大値を+1する。',
  logIf: [{ condition: { mpMax: 10 }, log: '自分のMP最大値を+1する。最も近い味方1体の行動順10%アップ。' }], // MP最大値が10になるとき
  effects: [
    { type: 'mpMax', amount: 1 },
    { type: 'advance', pct: 10, target: 'nearestAlly', condition: { mpMax: 10 } }, // 「その後」なので、+1したあとのMP最大値で見る
  ],
}
