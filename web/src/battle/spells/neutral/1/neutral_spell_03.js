import goblin from '../../../characters/neutral/1/tokens/neutral_token_04.js' // 召喚する「ゴブリン」

// スペル(プレイヤー能力): 自分のキャラのターン中、MPを使って1ターンに1回まで使える。キャラの行動は消費しない
export default {
  id: 'neutral_spell_03', name: 'ゴブリンの襲撃', class: 'ニュートラル/スペル', rarity: 'bronze', // ローテーション: 伝説の幕開け。タイプなし(ー)
  cost: 5, // MP
  desc: '『ゴブリン』5体を召喚する。',
  log: '『ゴブリン』5体を召喚する。',
  effects: [{ type: 'summon', count: 5, unit: goblin }],
}
