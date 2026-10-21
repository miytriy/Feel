import grown from './tokens/witch_spell_token_01.js' // 変身先「成長したですぅ!」

// スペル(プレイヤー能力): 2回スペルブーストする。Xは0から始まる。
// 【スペルブースト時】Xを+1する。その後、Xが5以上なら、これは「成長したですぅ!」に変身する(onBoost.transform / engine.js の growSpell)
// MPは増えない(cost: 0)
export default {
  id: 'witch_spell_04', name: '宿題やるですぅ!', class: 'ウィッチ/スペル', rarity: 'gold', type: 'マナリア/スペル',
  cost: 3, // MP
  desc: '2回スペルブーストする。Xは0から始まる。【スペルブースト時】これのXを+1する。その後、Xが5以上なら、これは『成長したですぅ!』に変身する。',
  onBoost: { startX: 0, x: 1, cost: 0, transform: { at: 5, into: grown } },
  effects: [{ type: 'boost', amount: 2 }],
}
