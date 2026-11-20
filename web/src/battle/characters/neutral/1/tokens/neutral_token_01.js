// サタンズサーヴァント(トークン。召喚されて出てくる。キャラ一覧・ガチャには自動では入らない)
export default {
  id: 'neutral_token_01', name: 'サタンズサーヴァント', class: 'ニュートラル', rarity: 'legend', token: true,
  stats: { hp: 1300, atk: 1300, def: 90, spd: 11 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
  passives: [],
}
