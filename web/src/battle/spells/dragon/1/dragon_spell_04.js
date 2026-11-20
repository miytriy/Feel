// スペル(プレイヤー能力): 自分のキャラのターン中、MPを使って1ターンに1回まで使える。キャラの行動は消費しない
// ローテーション: 伝説の幕開け(フォルダ 1)。タイプなし(ー)
export default {
  id: 'dragon_spell_04', name: '栄弦の奏楽', class: 'ドラゴン/スペル', rarity: 'silver',
  cost: 3, // MP
  desc: '最も近い味方1体の行動順20%アップ。【覚醒】なら、自分の場のフォロワーすべてに200のヒールを割り振る。',
  log: '最も近い味方1体の行動順20%アップ。',
  logIf: [{ condition: { awaken: true }, log: '最も近い味方1体の行動順20%アップ。自分の場のフォロワーすべてに200のヒールを割り振る。' }], // 【覚醒】のときは、ヒールも
  effects: [
    { type: 'advance', pct: 20, target: 'nearestAlly' },
    { type: 'heal', flat: 200, split: true, target: 'allyFollowers', condition: { awaken: true } }, // 200を人数で割り振る
  ],
}
