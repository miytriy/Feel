import oni from '../../../characters/witch/1/tokens/witch_token_06.js' // 召喚する「式神・暴鬼」

// スペル(プレイヤー能力): 自分のキャラのターン中、MPを使って1ターンに1回まで使える。キャラの行動は消費しない
// 【スペルブースト時】これのコストを-1する: onBoost の cost: -1(MPは minCost の0より下がらない)。noX: Xはない
export default {
  id: 'witch_spell_08', name: '鬼呼びの術', class: 'ウィッチ/スペル', rarity: 'gold',
  cost: 7, // MP
  desc: '【スペルブースト時】これのコストを-1する。『式神・暴鬼』1体を召喚する。',
  log: '『式神・暴鬼』1体を召喚する。', // スペルブースト時のログはなし
  onBoost: { noX: true, cost: -1, minCost: 0, maxCostUps: 7 },
  effects: [{ type: 'summon', count: 1, unit: oni }],
}
