// ホーリーフレイムタイガー(トークン。召喚されて出てくる。tokens フォルダの中は、キャラ一覧・ガチャには自動では入らない)
export default {
  id: 'bishop_token_03', name: 'ホーリーフレイムタイガー', class: 'ビショップ', rarity: 'bronze', type: 'トークン',
  stats: { hp: 400, atk: 400, def: 90, spd: 70 },
  passives: [
    'rush', // 【突進】
  ],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
}
