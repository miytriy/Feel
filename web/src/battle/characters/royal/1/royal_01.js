import knight from './tokens/royal_token_01.js' // 召喚する「ナイト」

export default {
  id: 'royal_01', name: '統率のルミナスナイト', class: 'ロイヤル', rarity: 'silver', type: 'ルミナス',
  stats: { hp: 134, atk: 175, def: 90, spd: 100 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    {
      name: '常時', trigger: 'allyEnter', enterType: '兵士',
      desc: '自分の「兵士タイプ」ユニットが、場に出たとき、これは攻撃力+50する。',
      log: 'これは攻撃力+50する。',
      effects: [{ type: 'buff', stat: 'atk', flat: 50, target: 'self' }],
    },
    { name: '進化時', trigger: 'onEvolve', desc: '『ナイト』1体を召喚する。', log: '『ナイト』1体を召喚する。', effects: [{ type: 'summon', count: 1, unit: knight }] },
  ],
}
