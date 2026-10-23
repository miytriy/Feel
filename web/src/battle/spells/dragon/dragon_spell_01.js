// スペル(プレイヤー能力): 自分のキャラのターン中、MPを使って1ターンに1回まで使える。キャラの行動は消費しない
export default {
  id: 'dragon_spell_01', name: 'ディザスターブレス', class: 'ドラゴン/スペル', rarity: 'bronze',
  cost: 6, // MP
  desc: '場のすべてに250ダメージ。(自分の場も、相手の場も、すべて。)',
  effects: [
    { type: 'damage', stat: 'atk', mult: 0, add: 250, dmgType: 'physical', target: 'enemies' }, // 相手の場すべて
    { type: 'damage', stat: 'atk', mult: 0, add: 250, dmgType: 'physical', target: 'allies' }, // 自分の場すべて
  ],
}
