export default {
  id: 'witch_05', name: '夢想のペンギンウィザード', class: 'ウィッチ', rarity: 'bronze',
  stats: { hp: 209, atk: 200, def: 90, spd: 70 },
  tags: ['増幅', '自己強化', 'サポーター'],
  skill: { name: '攻撃', stat: 'mag', type: 'magic', mult: 1.25 }, // 相手単体に魔力125%分の魔法ダメージ
  passives: [
    { name: '進化時', trigger: 'onEvolve', desc: '2回スペルブーストする。', effects: [{ type: 'boost', amount: 2 }] },
  ],
}
