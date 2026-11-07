// 天秤の旧金・レインドット(☆5 / ローテーション: ニーゲルヘリア神殺事件 = フォルダ 10)
export default {
  id: 'kronos_01', name: '天秤の旧金・レインドット', class: 'クロノス', rarity: 'legend',
  stats: { hp: 396, atk: 349, def: 191, spd: 80 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    'aura', // 【オーラ】
  ],
  traits: [
    {
      id: 'chrono_boost', name: 'アクティブ', cost: 6, cooldown: 3, target: 'allyOne', // 3ターンに一度有効
      desc: '3ターンに一度有効。味方単体の行動順+100%。そのターゲットの攻撃力+25%、2ターン継続。',
      effects: [
        { type: 'advance', pct: 100, target: 'allyOne' },
        { type: 'buff', stat: 'atk', pct: 25, turns: 2, target: 'allyOne' },
      ],
    },
  ],
}
