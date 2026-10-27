export default {
  id: 'witch_03', name: '魔法の薬剤師・ペネロピー', class: 'ウィッチ', rarity: 'gold',
  stats: { hp: 220, atk: 201, def: 90, spd: 80 },
  skill: { name: '攻撃', stat: 'mag', type: 'magic', mult: 1.25 }, // 相手単体に魔力125%分の魔法ダメージ
  passives: [
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '自分の場の土の印を+2する。', effects: [{ type: 'earth', amount: 2 }] },
    {
      name: '進化時', trigger: 'onEvolve',
      desc: '味方すべてを200ヒール。自分の場の土の印を+2する。',
      effects: [
        { type: 'heal', flat: 200, target: 'allies' },
        { type: 'earth', amount: 2 },
      ],
    },
  ],
}
