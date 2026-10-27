export default {
  id: 'witch_02', name: 'アドラブルティーチャー・ミラ', class: 'ウィッチ', rarity: 'silver', type: 'マナリア',
  stats: { hp: 200, atk: 200, def: 90, spd: 80 },
  skill: { name: '攻撃', stat: 'mag', type: 'magic', mult: 1.0 }, // 魔力100%分の魔法ダメージ
  passives: [
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '1回スペルブーストする。', effects: [{ type: 'boost', amount: 1 }] },
    {
      name: '進化時', trigger: 'onEvolve',
      desc: '相手の場のキャラクター1体を選ぶ。それに150の魔法ダメージ。自分の場すべては1回スペルブーストする。',
      effects: [
        { type: 'damage', stat: 'mag', mult: 0, add: 150, dmgType: 'magic', target: 'enemyOne', choose: true },
        { type: 'boost', amount: 1, target: 'allyField' },
      ],
    },
  ],
}
