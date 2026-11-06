// セイントシールド(ローテーション: 伝説の幕開け = フォルダ 1)
export default {
  id: 'bishop_04', name: 'セイントシールド', class: 'ビショップ', rarity: 'bronze',
  stats: { hp: 147, atk: 212, def: 100, spd: 71 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    'guard', // 【守護】
    {
      name: 'バリア_1', trigger: 'turnStart',
      desc: '【バリア_1】バリアを1ターンに1回獲得する。',
      effects: [{ type: 'barrier', target: 'self', everyTurns: 1 }],
    },
  ],
}
