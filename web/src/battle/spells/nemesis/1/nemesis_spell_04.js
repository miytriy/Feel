import improved from '../../../characters/nemesis/1/tokens/nemesis_token_02.js' // 召喚する『改良型・操り人形』

// スペル(プレイヤー能力): ローテーション: 伝説の幕開け(フォルダ 1)。タイプなし(ー)
export default {
  id: 'nemesis_spell_04', name: '人形の身代わり', class: 'ネメシス/スペル', rarity: 'bronze',
  cost: 3, // MP
  desc: '『改良型・操り人形』2体を召喚する。',
  log: '『改良型・操り人形』2体を召喚する。',
  effects: [{ type: 'summon', count: 2, unit: improved }],
}
