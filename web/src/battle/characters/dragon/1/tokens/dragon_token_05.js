// 覇道の金龍(トークン。召喚されて出てくる。tokens フォルダの中は、キャラ一覧・ガチャには自動では入らない)
export default {
  id: 'dragon_token_05', name: '覇道の金龍', class: 'ドラゴン', rarity: 'legend', type: 'トークン',
  stats: { hp: 500, atk: 400, def: 100, spd: 70 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: ['guard'], // 【守護】
}
