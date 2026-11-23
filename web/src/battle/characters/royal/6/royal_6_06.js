import soldier from './tokens/royal_6_01.js' // 召喚する「勇烈の兵士」

// 凄烈の剣王・ロードノエル四世(ローテーション: アポカリプス・パクト = フォルダ 6)。タイプ: ー
// 【エンハンス】は、上位を発動すると、下位もすべて発動する(汎用の仕様。engine の doTrait)
export default {
  id: 'royal_6_06', name: '凄烈の剣王・ロードノエル四世', class: 'ロイヤル', rarity: 'legend',
  stats: { hp: 511, atk: 407, def: 100, spd: 54 },
  tags: ['展開', '自己強化', 'メインアタッカー'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
  passives: [
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '『勇烈の兵士』1枚を自分の場に出す。それは【必殺】を持つ。',
      log: '『勇烈の兵士』1枚を自分の場に出す。それは【必殺】を持つ。',
      effects: [{ type: 'summon', count: 1, unit: soldier, gainKeyword: 'finisher' }],
    },
    {
      name: '進化時', trigger: 'onEvolve',
      desc: '自分の場の他のフォロワーすべては+100/+100する。',
      log: '自分の場の他のフォロワーすべては+100/+100する。',
      effects: [
        { type: 'buff', stat: 'atk', flat: 100, target: 'otherAllies' },
        { type: 'maxHp', flat: 100, target: 'otherAllies' },
      ],
    },
  ],
  traits: [
    {
      id: 'enhance_7', name: 'エンハンス_7', cost: 7, target: 'self',
      desc: '【エンハンス_7】『勇烈の兵士』1枚を自分の場に出す。それは【ドレイン】を持つ。',
      log: '『勇烈の兵士』1枚を自分の場に出す。それは【ドレイン】を持つ。',
      effects: [{ type: 'summon', count: 1, unit: soldier, gainKeyword: 'drain' }],
    },
    {
      id: 'enhance_8', name: 'エンハンス_8', cost: 8, target: 'self',
      desc: '【エンハンス_8】『勇烈の兵士』1枚を自分の場に出す。それは【疾走】を持つ。',
      log: '『勇烈の兵士』1枚を自分の場に出す。それは【疾走】を持つ。',
      effects: [{ type: 'summon', count: 1, unit: soldier, gainKeyword: 'dash' }],
    },
  ],
}
