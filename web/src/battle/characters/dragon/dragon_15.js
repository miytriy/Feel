export default {
  id: 'dragon_15', name: 'ナイトフォールドラゴン', class: 'ドラゴン', rarity: 'gold',
  stats: { hp: 900, atk: 901, def: 90, spd: 20 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    // 体力-190 = 現在体力を直接減らす(ダメージではないので、防御・アーマー・バリアは関係ない)
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '相手の場のキャラクターすべては体力-190する。', effects: [{ type: 'loseHp', amount: 190, target: 'enemies' }] },
    { name: '進化時', trigger: 'onEvolve', desc: '自分の現在MPを3回復する。', effects: [{ type: 'mp', amount: 3 }] },
  ],
}
