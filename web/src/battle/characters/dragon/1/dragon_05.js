export default {
  id: 'dragon_05', name: '駆け出しのドラゴンスレイヤー', class: 'ドラゴン', rarity: 'bronze',
  stats: { hp: 204, atk: 220, def: 90, spd: 70 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '相手の場のキャラクター1体を選ぶ。それに200の物理ダメージ。', effects: [{ type: 'damage', stat: 'atk', mult: 0, add: 200, dmgType: 'physical', target: 'enemyOne', choose: true }] },
  ],
}
