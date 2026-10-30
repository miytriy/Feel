import skeleton from './tokens/nightmare_token_01.js' // 召喚する「スケルトン」は nightmare_token_01.js のキャラです

export default {
  id: 'nightmare_06', name: 'ボーンガール', class: 'ナイトメア', rarity: 'bronze',
  stats: { hp: 240, atk: 110, def: 90, spd: 70 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    { name: 'ラストワード', trigger: 'lastWord', desc: '『スケルトン』2体を召喚する。', effects: [{ type: 'summon', count: 2, unit: skeleton }] },
  ],
}
