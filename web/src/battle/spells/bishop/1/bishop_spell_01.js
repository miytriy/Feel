import falcon from '../../../characters/bishop/1/tokens/bishop_token_02.js' // 召喚する「ホーリーファルコン」

// スペル(プレイヤー能力): 自分のキャラのターン中、MPを使って1ターンに1回まで使える。キャラの行動は消費しない
export default {
  id: 'bishop_spell_01', name: 'フィザーレイン', class: 'ビショップ/スペル', rarity: 'bronze', // ローテーション: 伝説の幕開け(フォルダ 1)。タイプなし(ー)
  cost: 6, // MP
  desc: '相手の場のフォロワーすべてに300の物理ダメージ。『ホーリーファルコン』1体を召喚する。',
  effects: [
    { type: 'damage', stat: 'atk', mult: 0, add: 300, dmgType: 'physical', target: 'enemyFollowers' },
    { type: 'summon', count: 1, unit: falcon },
  ],
}
