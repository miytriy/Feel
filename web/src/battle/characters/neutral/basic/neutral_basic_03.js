// ベーシック(通常ガチャに入るキャラ)。basic フォルダに置く
export default {
  id: 'neutral_basic_03', name: '煌響の使者・アンリエット', class: 'ニュートラル', rarity: 'silver',
  stats: { hp: 300, atk: 303, def: 90, spd: 80 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
  passives: [
    { name: '進化時', trigger: 'onEvolve', desc: '自分の場のキャラクターすべてに200のヒール。', effects: [{ type: 'heal', flat: 200, target: 'allies' }] },
  ],
}
