// 大海のオルカ(トークン。召喚されて出てくる。tokens フォルダの中は、キャラ一覧・ガチャには自動では入らない)
export default {
  id: 'dragon_token_02', name: '大海のオルカ', class: 'ドラゴン', rarity: 'bronze', type: 'トークン/海洋',
  stats: { hp: 200, atk: 200, def: 90, spd: 90 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: ['rush'], // 【突進】
}
