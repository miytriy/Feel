// ベーシック(通常ガチャに入るキャラ)。basic フォルダに置く
export default {
  id: 'neutral_basic_04', name: '激震のゴリアテ', class: 'ニュートラル', rarity: 'bronze',
  stats: { hp: 502, atk: 440, def: 100, spd: 70 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
  passives: ['guard'], // 【守護】
}
