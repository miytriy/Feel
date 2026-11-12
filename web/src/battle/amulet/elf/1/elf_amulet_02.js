export default {
  id: 'elf_amulet_02', name: '聖樹の杖', class: 'エルフ', rarity: 'gold', amulet: true,
  stats: { hp: 1, atk: 0, def: 0, spd: 80 },
  skill: { name: '-', stat: 'atk', type: 'physical', mult: 0 },
  passives: [
    { name: '味方のターン終了時', trigger: 'allyTurnEnd', desc: '【コンボ_3】最も近いキャラクター1体の行動順10%アップ。', log: '最も近いキャラクター1体の行動順10%アップ。',
      condition: { combo: 3 }, effects: [{ type: 'advance', pct: 10, target: 'nearestAlly' }] },
  ],
  traits: [{ id: 'act', name: 'アクト', cost: 0, target: 'otherAllyOne',
    desc: '【アクト】これを破壊。自分の場の他のフォロワー1体を選ぶ。それは再出場する。',
    log: 'これを破壊。自分の場の他のフォロワー1体を選ぶ。それは再出場する。',
    effects: [ { type: 'reenter', target: 'otherAllyOne' }, { type: 'destroy', target: 'self' } ] }],
}
