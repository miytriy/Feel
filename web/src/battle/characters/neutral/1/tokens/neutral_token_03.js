// 沈黙の魔将(トークン。召喚されて出てくる。キャラ一覧・ガチャには自動では入らない)
export default {
  id: 'neutral_token_03', name: '沈黙の魔将', class: 'ニュートラル', rarity: 'legend', token: true,
  stats: { hp: 1000, atk: 1000, def: 90, spd: 51 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
  passives: ['dash'], // 【疾走】
}
