import steelKnight from './tokens/royal_token_02.js' // 召喚する「スティールナイト」

export default {
  id: 'royal_11', name: '卓越のルミナスメイジ', class: 'ロイヤル', rarity: 'silver', type: 'ルミナス',
  stats: { hp: 304, atk: 111, def: 200, spd: 60 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    {
      name: '常時', trigger: 'allyEnter', enterType: '兵士',
      desc: '自分の場に「タイプ:兵士」のキャラクターが出たとき、それは【守護】を持つ。',
      effects: [{ type: 'gainKeyword', keyword: 'guard', target: 'entered' }],
    },
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '「スティールナイト」3体を召喚する。', effects: [{ type: 'summon', count: 3, unit: steelKnight }] },
  ],
}
