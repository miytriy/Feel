// スペル(プレイヤー能力): 自分のキャラのターン中、MPを使って1ターンに1回まで使える。キャラの行動は消費しない
export default {
  id: 'dragon_spell_02', name: 'ドラゴニュートクラッシュ', class: 'ドラゴン/スペル', rarity: 'bronze', // ローテーション: ベーシック(フォルダ basic)。タイプなし(ー)
  cost: 1, // MP
  desc: '相手の場のフォロワー1体を選ぶ。それに200の物理ダメージ。【覚醒】なら、200ダメージではなく400ダメージ。',
  log: '相手の場のフォロワー1体を選ぶ。それに200の物理ダメージ。',
  logIf: [{ condition: { awaken: true }, log: '相手の場のフォロワー1体を選ぶ。それに400の物理ダメージ。' }], // 【覚醒】のときは、400に置き換わる
  effects: [
    { type: 'pick', target: 'enemyFollowerOne', choose: true },
    { type: 'damage', stat: 'atk', mult: 0, add: 200, dmgType: 'physical', target: 'enemyFollowerOne', condition: { notAwaken: true } },
    { type: 'damage', stat: 'atk', mult: 0, add: 400, dmgType: 'physical', target: 'enemyFollowerOne', condition: { awaken: true } },
  ],
}
