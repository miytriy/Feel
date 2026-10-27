import knight from './tokens/royal_token_01.js' // 召喚する「ナイト」

export default {
  id: 'royal_03', name: '勇猛のルミナスランサー', class: 'ロイヤル', rarity: 'silver', type: 'ルミナス',
  stats: { hp: 291, atk: 121, def: 170, spd: 90 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    {
      name: '常時', trigger: 'allyEnter', enterType: '兵士',
      desc: '自分の場に「タイプ:兵士」のキャラクターが出たとき、それは【突進】を持つ。',
      effects: [{ type: 'gainKeyword', keyword: 'rush', target: 'entered' }],
    },
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '「ナイト」1体を召喚する。', effects: [{ type: 'summon', count: 1, unit: knight }] },
  ],
}
