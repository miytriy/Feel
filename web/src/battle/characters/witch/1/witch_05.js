export default {
  id: 'witch_05', name: '夢想のペンギンウィザード', class: 'ウィッチ', rarity: 'bronze',
  stats: { hp: 209, atk: 200, def: 90, spd: 71 },
  tags: ['増幅', '自己強化', 'サポーター'],
  skill: { name: '攻撃', stat: 'mag', type: 'magic', mult: 1.25 }, // 相手単体に魔力125%分の魔法ダメージ
  passives: [
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '最も近い味方1体の行動順20%アップ。', effects: [{ type: 'advance', pct: 20, target: 'nearestAlly' }] },
    { name: '進化時', trigger: 'onEvolve', desc: '2回スペルブーストする。', effects: [{ type: 'boost', amount: 2 }] },
  ],
}
