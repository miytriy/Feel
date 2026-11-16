export default {
  id: 'elf_19', name: 'ソニックアーチャー・セルウェン', class: 'エルフ', rarity: 'silver',
  stats: { hp: 666, atk: 444, def: 200, spd: 42 },
  tags: ['奇策', '展開', '牽制', 'サブアタッカー'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    'dash', // 【疾走】
    {
      name: '進化時', trigger: 'onEvolve',
      desc: '相手の場のフォロワー1体を選ぶ。それは「再出場」する。',
      effects: [{ type: 'reenter', target: 'enemyOne', choose: true }],
    },
  ],
}
