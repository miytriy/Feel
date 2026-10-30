export default {
  id: 'nightmare_03', name: 'ナイトメア・ヴェリィ', class: 'ナイトメア', rarity: 'silver',
  stats: { hp: 350, atk: 380, def: 90, spd: 90 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    // 「割りふる」= 合計を、対象の人数で等分する(split: true)。ダメージは物理ダメージ
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '味方すべてに300ダメージを割りふる。', effects: [{ type: 'damage', stat: 'atk', mult: 0, add: 300, split: true, dmgType: 'physical', target: 'allies' }] },
    { name: '進化時', trigger: 'onEvolve', desc: '味方すべてに500のヒールを割りふる。', effects: [{ type: 'heal', flat: 500, split: true, target: 'allies' }] },
  ],
}
