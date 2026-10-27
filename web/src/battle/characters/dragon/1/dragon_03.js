export default {
  id: 'dragon_03', name: '風を読む者・ゼル', class: 'ドラゴン', rarity: 'silver',
  stats: { hp: 308, atk: 320, def: 90, spd: 80 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    { name: '進化時', trigger: 'onEvolve', desc: '自分の場のキャラクター1体を選ぶ。それは【疾走】を持つ。', effects: [{ type: 'gainKeyword', keyword: 'dash', target: 'allyFieldOne', choose: true }] },
  ],
}
