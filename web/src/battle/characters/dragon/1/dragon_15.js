export default {
  id: 'dragon_15', name: 'ナイトフォールドラゴン', class: 'ドラゴン', rarity: 'gold',
  stats: { hp: 900, atk: 901, def: 90, spd: 26 },
  tags: ['範囲攻撃', '弱体化', '促進', 'メインアタッカー'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    // -0/-400 = 攻撃力は変わらず、体力だけ-400。現在体力を直接減らす(ダメージではないので、防御・アーマー・バリアは関係ない)
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '相手の場のフォロワーすべては-0/-400する。', effects: [{ type: 'loseHp', amount: 400, target: 'enemies' }] },
    // 最も近い味方1体 = 自分以外の場のキャラのうち、いまの行動値が最も小さい1体(召喚物は含まない)
    { name: '進化時', trigger: 'onEvolve', desc: '最も近い味方1体の行動順30%アップ。', effects: [{ type: 'advance', pct: 30, target: 'nearestAlly' }] },
  ],
}