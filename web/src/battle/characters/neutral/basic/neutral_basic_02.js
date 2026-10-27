// ベーシック(通常ガチャに入るキャラ)。basic フォルダに置く
// 『最も近い味方1体』: 自分以外の場のキャラのうち、行動順が最も近い(いまの行動値が最も小さい)1体
const hasten = [{ type: 'advance', pct: 10, target: 'nearestAlly' }] // 行動順+10%

export default {
  id: 'neutral_basic_02', name: 'ベルエンジェル・リア', class: 'ニュートラル', rarity: 'bronze',
  stats: { hp: 200, atk: 0, def: 200, spd: 90 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
  passives: [
    'guard', // 【守護】
    { name: 'ラストワード', trigger: 'lastWord', desc: '最も近い味方1体の行動順+10%。', effects: hasten },
    { name: '進化時', trigger: 'onEvolve', desc: '最も近い味方1体の行動順+10%。', effects: hasten },
  ],
}
