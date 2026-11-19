// スペル(プレイヤー能力): 自分のキャラのターン中、MPを使って1ターンに1回まで使える。キャラの行動は消費しない
export default {
  id: 'nightmare_spell_02', name: '蛇神の怒り', class: 'ナイトメア/スペル', rarity: 'gold', // ローテーション: 伝説の幕開け(フォルダ 1)。タイプなし(ー)
  cost: 2, // MP
  desc: '相手の場のフォロワー1体を選ぶ。それに300の物理ダメージ。自分の場のフォロワーすべてに200の物理ダメージを割り振る。',
  effects: [
    { type: 'pick', target: 'enemyFollowerOne', choose: true },
    { type: 'damage', stat: 'atk', mult: 0, add: 300, dmgType: 'physical', target: 'enemyFollowerOne' },
    { type: 'damage', stat: 'atk', mult: 0, add: 200, dmgType: 'physical', split: true, target: 'allyFollowers' }, // 自分の場のフォロワーすべてに割り振る
  ],
}
