export default {
  id: 'dragon_04', name: '栄弦の天宮・リュウフウ', class: 'ドラゴン', rarity: 'gold',
  stats: { hp: 361, atk: 331, def: 90, spd: 80 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    // 【覚醒】= condition: { awaken: true }(自分のMP最大値が7以上。数字は engine.js の AWAKEN_MP)
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '【覚醒】なら、これは進化する。', effects: [{ type: 'evolve', condition: { awaken: true } }] },
    // 【進化時】ではなく「これが進化したとき」: EPを使わない進化でも働く
    { name: '進化したとき', trigger: 'onEvolved', desc: '自分のMP最大値を+1する。', effects: [{ type: 'mpMax', amount: 1 }] },
  ],
}
