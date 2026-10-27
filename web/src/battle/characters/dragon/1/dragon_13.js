import bigWing from './tokens/dragon_token_04.js' // 召喚する「大翼のドラゴン」は dragon_token_04.js のキャラです

export default {
  id: 'dragon_13', name: '雲海の騎竜兵', class: 'ドラゴン', rarity: 'bronze',
  stats: { hp: 604, atk: 606, def: 90, spd: 30 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    'guard', // 【守護】
    { name: 'ラストワード', trigger: 'lastWord', desc: '『大翼のドラゴン』1体を召喚する。', effects: [{ type: 'summon', count: 1, unit: bigWing }] },
  ],
}
