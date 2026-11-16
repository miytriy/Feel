// 禁密の聖地(ローテーション: 伝説の幕開け = フォルダ 1)。タイプなし(ー)・パッシブなし(ー)
export default {
  id: 'bishop_amulet_02', name: '禁密の聖地', class: 'ビショップ', rarity: 'silver', amulet: true,
  stats: { hp: 1, atk: 0, def: 0, spd: 90 }, // アミュレットには体力の概念がない(数字は使われません)
  skill: { name: '-', stat: 'atk', type: 'physical', mult: 0 },
  traits: [{
    id: 'act', name: 'アクト', cost: 1, target: 'allyOne', // 自分の場のキャラクター1体を選ぶ。repeatable を付けない = 1ターンに1回まで
    desc: '【アクト】自分の場のキャラクター1体を選ぶ。それは+30/+30する。自分の場のすべてを50ヒールする。',
    effects: [
      { type: 'buff', stat: 'atk', flat: 30, target: 'allyOne' },
      { type: 'maxHp', flat: 30, target: 'allyOne' },
      { type: 'heal', flat: 50, target: 'allyField' },
    ],
  }],
}
