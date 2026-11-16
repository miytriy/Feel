// 邪教の器(ローテーション: 伝説の幕開け = フォルダ 1)。タイプなし(ー)
export default {
  id: 'bishop_amulet_05', name: '邪教の器', class: 'ビショップ', rarity: 'gold', amulet: true,
  stats: { hp: 1, atk: 0, def: 0, spd: 50 }, // アミュレットには体力の概念がない(数字は使われません)
  skill: { name: '-', stat: 'atk', type: 'physical', mult: 0 },
  traits: [{
    id: 'act', name: 'アクト', cost: 0, target: 'self',
    desc: '【アクト】これを破壊。場のすべてに300の物理ダメージ。',
    effects: [
      { type: 'destroy', target: 'self', settle: true }, // 先に自分を破壊する
      { type: 'damage', stat: 'atk', mult: 0, add: 300, dmgType: 'physical', target: 'fieldAll' }, // 場のすべて = 敵味方すべて
    ],
  }],
}
