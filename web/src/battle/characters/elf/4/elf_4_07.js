// 愛憎の舞手・コウ&ヨウ(ブロンズ / ローテーション: 蒼空の六竜 = フォルダ 4)。タイプなし(ー)
export default {
  id: 'elf_4_07', name: '愛憎の舞手・コウ&ヨウ', class: 'エルフ', rarity: 'bronze',
  stats: { hp: 678, atk: 876, def: 196, spd: 47 },
  tags: ['連続攻撃', '治療', 'メインアタッカー'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
  passives: [
    { name: '攻撃時', trigger: 'onAttack', desc: '自分の場のフォロワーすべてを300ヒール。', log: '自分の場のフォロワーすべてを300ヒール。',
      effects: [{ type: 'heal', flat: 300, target: 'allyFollowers' }] },
  ],
  // 【アクティブ】MPを1消費する。そのターン中、2回スキルを発動できる(2回目のMPは消費しない)
  traits: [{
    id: 'active', name: 'アクティブ', cost: 1, target: 'self',
    desc: '【アクティブ】MPを1消費する。そのターン中、2回スキルを発動できる。',
    log: 'そのターン中、2回スキルを発動できる。',
    effects: [{ type: 'gainDoubleSkill', mpCost: 0, turnOnly: true, target: 'self' }],
  }],
}
