// スケルトン(トークン。召喚されて出てくる。tokens フォルダの中は、キャラ一覧・ガチャには自動では入らない)
export default {
  id: 'nightmare_token_01', name: 'スケルトン', class: 'ナイトメア', rarity: 'bronze', type: 'トークン/死者',
  stats: { hp: 100, atk: 100, def: 90, spd: 110 },
  passives: [],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
}
