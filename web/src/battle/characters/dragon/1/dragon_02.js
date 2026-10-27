export default {
  id: 'dragon_02', name: '風を駆る者・エイファ', class: 'ドラゴン', rarity: 'silver',
  stats: { hp: 100, atk: 208, def: 100, spd: 80 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    'dash', // 【疾走】
    // 【覚醒】= condition: { awaken: true }(自分のMP最大値が7以上。数字は engine.js の AWAKEN_MP)
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '【覚醒】ならこれは【威圧】を持つ。', effects: [{ type: 'gainKeyword', keyword: 'intimidate', target: 'self', condition: { awaken: true } }] },
  ],
}
