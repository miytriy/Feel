export default {
  id: 'elf_08', name: 'ビギンズブレイダー・アマツ', class: 'エルフ', rarity: 'legend',
  stats: { hp: 210, atk: 208, def: 90, spd: 80 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    'guard', // 【守護】
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '自分の攻撃力・体力+20×X。Xは自分の場の「タイプ:妖精」キャラクターの数。',
      effects: [
        { type: 'buff', stat: 'atk', perType: '妖精', perTypeFlat: 20, target: 'self' },
        { type: 'maxHp', perType: '妖精', perTypeFlat: 20, target: 'self' },
      ],
    },
    {
      name: '進化時', trigger: 'onEvolve',
      desc: '「相手の場のキャラクターからランダム1体に50の確定ダメージ」をX回行う。Xは自分の場の「タイプ:妖精」キャラクターの数。',
      effects: [{ type: 'damage', stat: 'atk', mult: 0, add: 50, dmgType: 'true', target: 'enemyRandom', timesPerType: '妖精' }],
    },
  ],
}
