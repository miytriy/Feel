import bigWing from './tokens/dragon_token_04.js' // 召喚する「大翼のドラゴン」は dragon_token_04.js のキャラです

export default {
  id: 'dragon_10', name: '荒波のドラグーン・ハザール', class: 'ドラゴン', rarity: 'gold',
  stats: { hp: 330, atk: 310, def: 90, spd: 50 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    'guard', // 【守護】
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '『大翼のドラゴン』1体を召喚する。', effects: [{ type: 'summon', count: 1, unit: bigWing }] },
  ],
}
