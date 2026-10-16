import knight from './tokens/royal_token_01.js' // 召喚する「ナイト」

export default {
  id: 'royal_17', name: 'レヴィオンアックス・ジェノ', class: 'ロイヤル', rarity: 'gold', type: 'レヴィオン',
  stats: { hp: 600, atk: 690, def: 100, spd: 40 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    'rush', // 【突進】
    {
      name: '攻撃時', trigger: 'onAttack',
      desc: 'これは【バリア】を持つ。「ナイト」1体を召喚する。',
      effects: [
        { type: 'gainKeyword', keyword: 'barrier', target: 'self' },
        { type: 'summon', count: 1, unit: knight },
      ],
    },
  ],
}
