import bat from './tokens/nightmare_token_03.js' // 召喚する「バット」は nightmare_token_03.js のキャラです

export default {
  id: 'nightmare_01', name: '無名の悪魔', class: 'ナイトメア', rarity: 'bronze',
  stats: { hp: 200, atk: 220, def: 90, spd: 90 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    { name: '進化時', trigger: 'onEvolve', desc: '『バット』2体を召喚する。', effects: [{ type: 'summon', count: 2, unit: bat }] },
  ],
}
