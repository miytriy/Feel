import falcon from '../../../characters/bishop/1/tokens/bishop_token_04.js' // 召喚する「壮麗なる隼」

// 投影の鳥像(ローテーション: ベーシック = フォルダ basic)。タイプなし(ー)
export default {
  id: 'bishop_amulet_07', name: '投影の鳥像', class: 'ビショップ', rarity: 'bronze', amulet: true, countdown: 2, // 【カウントダウン_2】
  stats: { hp: 1, atk: 0, def: 0, spd: 70 }, // アミュレットには体力の概念がない(数字は使われません)
  skill: { name: '-', stat: 'atk', type: 'physical', mult: 0 },
  passives: [
    { name: 'ラストワード', trigger: 'lastWord', desc: '『壮麗なる隼』1体を召喚する。', effects: [{ type: 'summon', count: 1, unit: falcon }] },
  ],
  traits: [{
    id: 'act', name: 'アクト', cost: 2, target: 'self', // repeatable を付けない = 1ターンに1回まで
    desc: '【アクト】これのカウントを-2する。',
    effects: [{ type: 'countdown', amount: -2, target: 'self' }],
  }],
}
