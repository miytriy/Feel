// 聖騎兵(トークン。召喚されて出てくる。tokens フォルダの中は、キャラ一覧・ガチャには自動では入らない)
export default {
  id: 'bishop_token_01', name: '聖騎兵', class: 'ビショップ', rarity: 'legend', token: true,
  stats: { hp: 200, atk: 100, def: 100, spd: 100 },
  passives: [
    'guard', // 【守護】
  ],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
}
