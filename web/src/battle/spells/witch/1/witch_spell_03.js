// スペル(プレイヤー能力): 【モード】1つを選んでその能力が働く。
// 【土の秘術_3】= earthCost: 3(土の印を3消費して働く。足りないときは働かない / engine.js)
export default {
  id: 'witch_spell_03', name: '理光の証明', class: 'ウィッチ/スペル', rarity: 'silver',
  cost: 3, // MP
  desc: '【モード】1つを選んでその能力が働く。(1)自分の場の土の印を+4する。(2)自分の場のキャラクターすべてを60ヒールする。(3)【土の秘術_3】相手の場のキャラクターすべてに140の魔法ダメージ。',
  effects: [{
    type: 'mode',
    prompt: '使うモードを選んでください',
    modes: [
      { name: '土の印', desc: '自分の場の土の印を+4する。', effects: [{ type: 'earth', amount: 4 }] },
      { name: 'ヒール', desc: '自分の場のキャラクターすべてを60ヒールする。', effects: [{ type: 'heal', flat: 60, target: 'allies' }] },
      { name: '土の秘術_3', desc: '【土の秘術_3】相手の場のキャラクターすべてに140の魔法ダメージ。', effects: [{ type: 'damage', stat: 'mag', mult: 0, add: 140, dmgType: 'magic', target: 'enemies', earthCost: 3 }] },
    ],
  }],
}
