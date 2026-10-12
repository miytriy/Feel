import steelKnight from './royal_02.js' // 召喚する「スティールナイト」

export default {
  id: 'royal_08', name: '救援のルミナスヒーラー', class: 'ロイヤル', rarity: 'bronze', type: 'ルミナス',
  stats: { hp: 219, atk: 114, def: 153, spd: 70 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    {
      name: '常時', trigger: 'allyEnter', enterType: '兵士',
      desc: '自分の場に「タイプ:兵士」のキャラクターが出たとき、味方すべての体力をHP10%分回復。',
      effects: [{ type: 'heal', pctMax: 10, target: 'allyField' }],
    },
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '「スティールナイト」1体を召喚する。', effects: [{ type: 'summon', count: 1, unit: steelKnight }] },
  ],
}
