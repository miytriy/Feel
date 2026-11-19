import ghost from '../../../characters/nightmare/tokens/nightmare_token_02.js' // 召喚する「ゴースト」

// 暝地の霊園(ローテーション: 伝説の幕開け = フォルダ 1)。タイプなし(ー)
export default {
  id: 'nightmare_amulet_01', name: '暝地の霊園', class: 'ナイトメア', rarity: 'silver', amulet: true,
  stats: { hp: 1, atk: 0, def: 0, spd: 70 }, // アミュレットには体力の概念がない(数字は使われません)
  skill: { name: '-', stat: 'atk', type: 'physical', mult: 0 },
  passives: [
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '自分の墓場を+2する。', effects: [{ type: 'graveyard', amount: 2 }] },
  ],
  traits: [{
    id: 'act', name: 'アクト', cost: 0, target: 'self', // repeatable を付けない = 1ターンに1回まで
    desc: '【アクト】これを破壊。『ゴースト』2体を召喚する。',
    effects: [
      { type: 'destroy', target: 'self' },
      { type: 'summon', count: 2, unit: ghost },
    ],
  }],
}
