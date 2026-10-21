import steelKnight from './tokens/royal_token_02.js' // 召喚する「スティールナイト」

export default {
  id: 'royal_16', name: '煌刃の勇者・アマリア', class: 'ロイヤル', rarity: 'gold',
  stats: { hp: 600, atk: 580, def: 90, spd: 30 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '「スティールナイト」4体を召喚する。', effects: [{ type: 'summon', count: 4, unit: steelKnight }] },
    {
      name: '常時', trigger: 'allyEnter', enterType: '兵士',
      desc: '自分の場に「タイプ:兵士」のキャラクターが出たとき、それは「攻撃力を+100」を行い、【突進】と【守護】を持つ。',
      effects: [
        { type: 'buff', stat: 'atk', flat: 100, target: 'entered' },
        { type: 'gainKeyword', keyword: 'rush', target: 'entered' },
        { type: 'gainKeyword', keyword: 'guard', target: 'entered' },
      ],
    },
  ],
}
