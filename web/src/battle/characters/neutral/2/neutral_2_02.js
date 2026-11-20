export default {
  id: 'neutral_2_02', name: '運命の黄昏・オーディン', class: 'ニュートラル', rarity: 'legend',
  stats: { hp: 210, atk: 400, def: 180, spd: 42 },
  tags: ['奇策', 'メインアタッカー'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
  passives: [
    'dash', // 【疾走】
    {
      name: 'ファンファーレ', trigger: 'fanfare', desc: '相手の場のユニット1つを選ぶ。それを消滅。',
      effects: [{ type: 'vanish', target: 'enemyFieldOne', choose: true }],
    },
  ],
}
