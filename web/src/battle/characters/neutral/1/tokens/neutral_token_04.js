// ゴブリン(トークン。召喚されて出てくる。キャラ一覧・ガチャには自動では入らない)
export default {
  id: 'neutral_token_04', name: 'ゴブリン', class: 'ニュートラル', rarity: 'bronze', token: true,
  stats: { hp: 250, atk: 132, def: 100, spd: 100 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
  passives: [],
}
