// スペル(プレイヤー能力): 相手の場のキャラ1体を選んで、10×X の魔法ダメージ。Xは1から始まる
// 【スペルブースト時】Xが+1され、必要MPも+1される(MPが増えるのは9回まで、Xは99まで)。addX は「add = addX × いまのX」の意味(engine.js の refreshSpell)
export default {
  id: 'witch_spell_01', name: 'ストームブラスト', class: 'ウィッチ/スペル', rarity: 'bronze',
  cost: 1, // MP
  desc: '相手の場のキャラクター1体を選ぶ。それに10×Xの魔法ダメージ。Xは1から始まる。【スペルブースト時】これのXを+1する。MP必要量+1する、このMP増加は9まで。',
  onBoost: { startX: 1, x: 1, cost: 1, maxX: 99, maxCostUps: 9 }, // Xは+1ずつ(99まで) / MPも+1ずつ(増えるのは9回まで)
  effects: [
    { type: 'damage', stat: 'mag', mult: 0, addX: 10, dmgType: 'magic', target: 'enemyOne', choose: true },
  ],
}
