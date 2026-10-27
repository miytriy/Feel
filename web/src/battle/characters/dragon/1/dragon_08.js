export default {
  id: 'dragon_08', name: '海溝の大剣竜', class: 'ドラゴン', rarity: 'bronze',
  stats: { hp: 618, atk: 429, def: 200, spd: 60 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    // 【覚醒】= condition: { awaken: true }(自分のMP最大値が7以上。数字は engine.js の AWAKEN_MP)
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '【覚醒】なら、これは【疾走】を持つ。', effects: [{ type: 'gainKeyword', keyword: 'dash', target: 'self', condition: { awaken: true } }] },
  ],
}
