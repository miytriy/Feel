// スペル(プレイヤー能力): 自分のキャラのターン中、MPを使って1ターンに1回まで使える。キャラの行動は消費しない
export default {
  id: 'royal_spell_04', name: 'メイドの作法', class: 'ロイヤル/スペル', rarity: 'bronze', // ローテーション: ベーシック(フォルダ basic)。タイプなし(ー)
  cost: 2, // MP
  desc: '自分の場のフォロワー1体を選ぶ。それを再出場させる。自分の場のロイヤル・フォロワーランダム2体の行動順20%アップ。',
  log: '自分の場のフォロワー1体を選ぶ。それを再出場させる。自分の場のロイヤル・フォロワーランダム2体の行動順20%アップ。',
  effects: [
    { type: 'reenter', target: 'allyFieldOne', choose: true, filter: { follower: true } }, // フォロワー(キャラ + 召喚物)。アミュレットは選べない
    { type: 'advance', pct: 20, target: 'allyFollowerRandom', count: 2, filter: { class: 'ロイヤル' } }, // 再出場したあとの状態で、ロイヤルのフォロワーからランダム2体(重ならない)
  ],
}
