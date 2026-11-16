import tiger from '../../../characters/bishop/1/tokens/bishop_token_03.js' // 召喚する「ホーリーフレイムタイガー」

// 獣姫の誓約(ローテーション: 伝説の幕開け = フォルダ 1)。タイプなし(ー)
export default {
  id: 'bishop_amulet_03', name: '獣姫の誓約', class: 'ビショップ', rarity: 'gold', amulet: true, countdown: 2, // 【カウントダウン_2】
  stats: { hp: 1, atk: 0, def: 0, spd: 90 }, // アミュレットには体力の概念がない(数字は使われません)
  skill: { name: '-', stat: 'atk', type: 'physical', mult: 0 },
  passives: [
    { name: 'ラストワード', trigger: 'lastWord', desc: '『ホーリーフレイムタイガー』1体を召喚する。', effects: [{ type: 'summon', count: 1, unit: tiger }] },
  ],
  traits: [{
    id: 'act', name: 'アクト', cost: 1, target: 'self', // repeatable を付けない = 1ターンに1回まで
    desc: '【アクト】これのカウントを-1する。',
    effects: [{ type: 'countdown', amount: -1, target: 'self' }],
  }],
}
