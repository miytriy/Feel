// スペル(プレイヤー能力): 自分のキャラのターン中、MPを使って1ターンに1回まで使える。キャラの行動は消費しない
export default {
  id: 'witch_spell_05', name: '知恵の輝き', class: 'ウィッチ/スペル', rarity: 'bronze', // ローテーション: ベーシック(フォルダ basic)。タイプなし(ー)
  cost: 1, // MP
  desc: '最も近い味方1体の行動順10%アップ。',
  log: '最も近い味方1体の行動順10%アップ。',
  effects: [{ type: 'advance', pct: 10, target: 'nearestAlly' }], // 自分(スペルを使ったキャラ)以外の場のキャラのうち、行動値が最も小さい1体
}
