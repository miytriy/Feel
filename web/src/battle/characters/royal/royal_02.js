export default {
  id: 'royal_02', name: '異端の侍', class: 'ロイヤル', rarity: 'bronze',
  stats: { hp: 164, atk: 243, def: 130, spd: 90 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    'rush', // 【突進】
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '進化可能ターン(EPが配られたラウンドから戦闘終了まで)なら、これは【必殺】を持つ。',
      effects: [{ type: 'gainKeyword', keyword: 'finisher', target: 'self', condition: { evolveTurn: true } }],
    },
  ],
}
