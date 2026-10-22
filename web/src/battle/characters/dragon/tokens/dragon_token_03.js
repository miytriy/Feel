// 乙姫お守り隊(トークン。召喚されて出てくる。tokens フォルダの中は、キャラ一覧・ガチャには自動では入らない)
export default {
  id: 'dragon_token_03', name: '乙姫お守り隊', class: 'ドラゴン', rarity: 'bronze', type: 'トークン/海洋',
  stats: { hp: 200, atk: 200, def: 90, spd: 80 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: ['dash', 'guard'], // 【疾走】【守護】
}
