import steelKnight from './tokens/royal_token_02.js' // 召喚する「スティールナイト」

export default {
  id: 'royal_06', name: '救援のルミナスヒーラー', class: 'ロイヤル', rarity: 'bronze', type: 'ルミナス',
  stats: { hp: 219, atk: 114, def: 102, spd: 81 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '『スティールナイト』1体を召喚する。',
      log: '『スティールナイト』1体を召喚する。',
      effects: [{ type: 'summon', count: 1, unit: steelKnight }],
    },
    {
      name: '常時', trigger: 'allyEnter', enterType: '兵士',
      desc: '自分の兵士・ユニットが場に出たとき、自分の場すべてを100ヒール。',
      log: '自分の場すべてを100ヒール。',
      effects: [{ type: 'heal', flat: 100, target: 'allyField' }],
    },
  ],
}
