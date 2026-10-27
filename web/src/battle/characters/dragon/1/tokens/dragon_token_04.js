// 大翼のドラゴン(トークン。召喚されて出てくる。tokens フォルダの中は、キャラ一覧・ガチャには自動では入らない)
export default {
  id: 'dragon_token_04', name: '大翼のドラゴン', class: 'ドラゴン', rarity: 'bronze', type: 'トークン',
  stats: { hp: 500, atk: 500, def: 90, spd: 60 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: ['intimidate'], // 【威圧】
}
