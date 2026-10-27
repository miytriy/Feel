import guards from '../../../characters/dragon/1/tokens/dragon_token_03.js' // 召喚する「乙姫お守り隊」は dragon_token_03.js のキャラです

// アミュレット: 編成に入れると、バトル開始時からアミュレット置き場にいる(スキル攻撃はできない)
export default {
  id: 'dragon_amulet_01', name: '乙姫の扇', class: 'ドラゴン', rarity: 'gold', type: 'アミュレット', amulet: true,
  stats: { hp: 1, atk: 0, def: 0, spd: 100 }, // アミュレットには体力の概念がない(数字は使われません)
  skill: { name: '-', stat: 'atk', type: 'physical', mult: 0 },
  traits: [{
    id: 'act', name: 'アクト', cost: 3, target: 'allyFieldOne',
    desc: '【アクト】自分の場の1体を選ぶ。それを破壊する。『乙姫お守り隊』1体を召喚する。',
    effects: [
      { type: 'destroy', target: 'allyFieldOne', settle: true }, // 先に破壊の処理を済ませる(場が満員でも、そのあとに召喚できる)
      { type: 'summon', count: 1, unit: guards },
    ],
  }],
}
