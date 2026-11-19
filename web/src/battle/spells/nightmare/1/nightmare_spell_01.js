// スペル(プレイヤー能力): 自分のキャラのターン中、MPを使って1ターンに1回まで使える。キャラの行動は消費しない
export default {
  id: 'nightmare_spell_01', name: '死神の一振り', class: 'ナイトメア/スペル', rarity: 'bronze', // ローテーション: 伝説の幕開け(フォルダ 1)。タイプなし(ー)
  cost: 1, // MP
  desc: '自分の場のフォロワー1体と相手の場のフォロワー1体を選ぶ。それを破壊。',
  effects: [
    { type: 'pick', target: 'allyFollowerOne', choose: true }, // 自分の場のフォロワー1体(キャラ + 召喚物)
    { type: 'pick', target: 'enemyFollowerOne', choose: true }, // 相手の場のフォロワー1体
    { type: 'destroy', target: 'allyFollowerOne' },
    { type: 'destroy', target: 'enemyFollowerOne' },
  ],
}
