// スペル(プレイヤー能力): 自分のキャラのターン中、MPを使って1ターンに1回まで使える。キャラの行動は消費しない
// 【スペルブースト時】これのコストを-1する: onBoost の cost: -1(MPは minCost の0より下がらない)。noX: Xはない
export default {
  id: 'witch_spell_10', name: 'オーバーディメンション', class: 'ウィッチ/スペル', rarity: 'legend',
  cost: 18, // MP
  desc: '【スペルブースト時】これのコストを-1する。すべてのスペルを有効化する。最も近い味方1体の行動順50%アップ。5回スペルブーストする。自分のMPを上限まで回復。',
  log: 'すべてのスペルを有効化する。最も近い味方1体の行動順50%アップ。5回スペルブーストする。自分のMPを上限まで回復。',
  onBoost: { noX: true, cost: -1, minCost: 0, maxCostUps: 18 },
  effects: [
    { type: 'refreshSpells' }, // 使用済みのスペルを、すべて使える状態に戻す
    { type: 'advance', pct: 50, target: 'nearestAlly' },
    { type: 'boost', amount: 5 }, // 5回スペルブースト(発動中のこのスペル自身は、ブーストされない)
    { type: 'mpFull' },
  ],
}
