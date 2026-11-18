import golem from '../../../characters/witch/1/tokens/witch_token_01.js' // 召喚する「クレイゴーレム」

// スペル(プレイヤー能力): 自分のキャラのターン中、MPを使って1ターンに1回まで使える。キャラの行動は消費しない
export default {
  id: 'witch_spell_06', name: '真理の召喚', class: 'ウィッチ/スペル', rarity: 'bronze', // ローテーション: ベーシック(フォルダ basic)。タイプなし(ー)
  cost: 2, // MP
  desc: '『クレイゴーレム』1体を召喚する。',
  log: '『クレイゴーレム』1体を召喚する。',
  effects: [{ type: 'summon', count: 1, unit: golem }],
}
