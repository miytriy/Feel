// ホーリーファルコン(トークン。召喚されて出てくる。tokens フォルダの中は、キャラ一覧・ガチャには自動では入らない)
export default {
  id: 'bishop_token_02', name: 'ホーリーファルコン', class: 'ビショップ', rarity: 'bronze', token: true,
  stats: { hp: 200, atk: 200, def: 90, spd: 80 },
  passives: [
    'dash', // 【疾走】
  ],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
}
