// スペル(プレイヤー能力): 相手の場のキャラ1体を選んで、X×20 の魔法ダメージ。Xは1から始まる
// 【スペルブースト時】Xが+1される(Xは99まで。必要MPは増えない)。addX は「add = addX × いまのX」の意味(engine.js の refreshSpell)
export default {
  id: 'witch_spell_01', name: 'ストームブラスト', class: 'ウィッチ/スペル', rarity: 'bronze',
  cost: 1, // MP
  desc: '相手の場のフォロワー1体を選ぶ。それにX×20の魔法ダメージ。Xは1から始まる。【スペルブースト時】これのXを+1する。',
  log: '相手の場のフォロワー1体を選ぶ。それにXの魔法ダメージ。', // スペルブースト時のログはなし
  onBoost: { startX: 1, x: 1, maxX: 99 }, // Xは+1ずつ(99まで)。必要MPは増えない
  effects: [
    { type: 'damage', stat: 'mag', mult: 0, addX: 20, dmgType: 'magic', target: 'enemyOne', choose: true },
  ],
}
