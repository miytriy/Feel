// スペル(プレイヤー能力): 自分のキャラのターン中、MPを使って1ターンに1回まで使える。キャラの行動は消費しない
// 【スペルブースト時】これのコストを-1する: onBoost の cost: -1(MPは minCost の0より下がらない)。noX: Xはない
export default {
  id: 'witch_spell_09', name: 'スノーアウェイク', class: 'ウィッチ/スペル', rarity: 'silver',
  cost: 8, // MP
  desc: '【スペルブースト時】これのコストを-1する。\n相手の場のフォロワー1体を選ぶ。それはHP100になる。相手のターン終了時まで、それは「スキルを発動できない」を持つ。',
  log: '相手の場のフォロワー1体を選ぶ。それはHP100になる。相手のターン終了時まで、それは「スキルを発動できない」を持つ。',
  onBoost: { noX: true, cost: -1, minCost: 0, maxCostUps: 8 },
  effects: [
    { type: 'setHp', value: 100, target: 'enemyOne', choose: true, followers: true }, // 相手の場のフォロワー(キャラ + 召喚物)から1体を選ぶ
    { type: 'gainKeyword', keyword: 'silence', target: 'enemyOne', untilTurnEnd: true }, // 選んだ1体が、そのターンが終わるまでスキルを発動できない
  ],
}
