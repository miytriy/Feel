import falcon from '../../../characters/bishop/1/tokens/bishop_token_02.js' // 召喚する「ホーリーファルコン」

// 有翼の石像(ローテーション: ベーシック = フォルダ basic)。タイプなし(ー)
export default {
  id: 'bishop_amulet_06', name: '有翼の石像', class: 'ビショップ', rarity: 'silver', amulet: true, countdown: 4, // 【カウントダウン_4】
  stats: { hp: 1, atk: 0, def: 0, spd: 100 }, // 速度は未記入だったので、仮に100(アミュレットは行動しないので、場に出た順などの並びにだけ影響します)
  skill: { name: '-', stat: 'atk', type: 'physical', mult: 0 },
  passives: [
    { name: 'ラストワード', trigger: 'lastWord', desc: '『ホーリーファルコン』1体を召喚する。', effects: [{ type: 'summon', count: 1, unit: falcon }] },
  ],
  traits: [{
    id: 'act', name: 'アクト', cost: 1, target: 'self', // repeatable を付けない = 1ターンに1回まで
    desc: '【アクト】これのカウントを-1する。',
    effects: [{ type: 'countdown', amount: -1, target: 'self' }],
  }],
}
