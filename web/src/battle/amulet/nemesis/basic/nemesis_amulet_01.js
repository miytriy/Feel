import puppet from '../../../characters/nemesis/1/tokens/nemesis_token_01.js' // 召喚する「操り人形」

// ドールズシアター(ローテーション: ベーシック = フォルダ basic)。タイプなし(ー)
export default {
  id: 'nemesis_amulet_01', name: 'ドールズシアター', class: 'ネメシス', rarity: 'silver', amulet: true, countdown: 2, // 【カウントダウン_2】
  stats: { hp: 1, atk: 0, def: 0, spd: 90 }, // アミュレットには体力の概念がない(数字は使われません)
  skill: { name: '-', stat: 'atk', type: 'physical', mult: 0 },
  passives: [
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '『操り人形』1体を召喚する。', effects: [{ type: 'summon', count: 1, unit: puppet }] },
    { name: '味方のターン終了時', trigger: 'allyTurnEnd', desc: '『操り人形』1体を召喚する。', effects: [{ type: 'summon', count: 1, unit: puppet }] },
  ],
}
