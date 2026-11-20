// ベーシック(通常ガチャに入るキャラ)。basic フォルダに置く
export default {
  id: 'neutral_basic_05', name: 'キャラバン・マンモス', class: 'ニュートラル', rarity: 'bronze',
  stats: { hp: 1000, atk: 1000, def: 90, spd: 41 },
  tags: ['メインアタッカー'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
  passives: [],
}
