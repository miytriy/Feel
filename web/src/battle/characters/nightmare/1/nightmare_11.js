export default {
  id: 'nightmare_11', name: '禁約の悪魔', class: 'ナイトメア', rarity: 'bronze',
  stats: { hp: 494, atk: 442, def: 90, spd: 54 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
  passives: [
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '自分の場に200の物理ダメージを割り振る。最も近い味方1体の行動順+20%。',
      effects: [
        { type: 'damage', stat: 'atk', mult: 0, add: 200, split: true, dmgType: 'physical', target: 'allyField' },
        { type: 'advance', pct: 20, target: 'nearestAlly' },
      ] },
    { name: '進化時', trigger: 'onEvolve', desc: '相手の場のキャラクター1体を選ぶ。それに300の物理ダメージ。',
      effects: [{ type: 'damage', stat: 'atk', mult: 0, add: 300, dmgType: 'physical', target: 'enemyOne' }] },
  ],
}
