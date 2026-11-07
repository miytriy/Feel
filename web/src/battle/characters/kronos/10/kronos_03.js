// 超可愛の使い・リーノ(レジェンド / ローテーション: ニーゲルヘリア神殺事件 = フォルダ 10)
export default {
  id: 'kronos_03', name: '超可愛の使い・リーノ', class: 'クロノス', rarity: 'legend', type: '超可愛',
  stats: { hp: 500, atk: 534, def: 90, spd: 60 },
  skill: { name: '攻撃', stat: 'mag', type: 'magic', mult: 1.0 }, // 相手単体に、自身の魔力100%分の魔法ダメージ
  passives: [
    'aura', // 【オーラ】
  ],
  traits: [
    {
      id: 'cute_heal', name: 'アクティブ', cost: 3, target: 'self', // MPを3消費
      desc: 'MPを3消費。自分の場のすべてに自身の最大HP20%分のヒールを行い、対象の攻撃力+10%。1ターン継続。',
      effects: [
        { type: 'heal', stat: 'maxHp', mult: 0.2, target: 'allyField' },
        { type: 'buff', stat: 'atk', pct: 10, turns: 1, target: 'allyField' },
      ],
    },
  ],
}
