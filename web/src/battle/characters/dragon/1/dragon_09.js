export default {
  id: 'dragon_09', name: '煌牙の義勇・キット', class: 'ドラゴン', rarity: 'silver',
  stats: { hp: 701, atk: 805, def: 100, spd: 50 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    'rush', // 【突進】
    { name: 'ラストワード', trigger: 'lastWord', desc: 'これが退場したとき、自分の場のキャラクターからランダム1体は「攻撃力+100」を行う。', effects: [{ type: 'buff', stat: 'atk', flat: 100, target: 'allyFieldRandom' }] },
  ],
}
