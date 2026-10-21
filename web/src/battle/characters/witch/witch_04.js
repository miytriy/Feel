export default {
  id: 'witch_04', name: 'オウルサモナー', class: 'ウィッチ', rarity: 'bronze',
  stats: { hp: 300, atk: 321, def: 90, spd: 70 },
  skill: { name: '攻撃', stat: 'mag', type: 'magic', mult: 1.25 }, // 相手単体に魔力125%分の魔法ダメージ
  passives: [
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '自分の場の土の印を+1する。', effects: [{ type: 'earth', amount: 1 }] },
    {
      name: '進化時', trigger: 'onEvolve',
      desc: '相手の場のキャラクター1体を選ぶ。それに250の物理ダメージ。',
      effects: [{ type: 'damage', stat: 'atk', mult: 0, add: 250, dmgType: 'physical', target: 'enemyOne', choose: true }],
    },
  ],
}
