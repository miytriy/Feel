// 蒼豹の銀氷・アレイ(レジェンド / ローテーション: ニーゲルヘリア神殺事件 = フォルダ 10)
export default {
  id: 'kronos_02', name: '蒼豹の銀氷・アレイ', class: 'クロノス', rarity: 'legend',
  stats: { hp: 401, atk: 462, def: 162, spd: 70 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    'dash', // 【疾走】
  ],
  traits: [
    {
      id: 'chrono_field_boost', name: 'アクティブ', cost: 2, cooldown: 5, target: 'self', // 5ターンに一度有効。MPを2消費
      desc: '5ターンに一度有効。MPを2消費する。自分の場のすべてのフォロワーの行動順+100%。そのターゲットの与ダメージ+15%、アレイのターン基準に2ターン継続。',
      effects: [
        { type: 'advance', pct: 100, target: 'allyField' },
        // turnsBy: 'source' = 2ターンを、アレイのターンで数える(アレイのターンが2回終わるまで)
        { type: 'buff', stat: 'dmgUp', flat: 15, turns: 2, turnsBy: 'source', target: 'allyField' },
      ],
    },
  ],
}
