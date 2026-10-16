import knight from './tokens/royal_token_01.js' // 「ナイト」
import steelKnight from './tokens/royal_token_02.js' // 「スティールナイト」

export default {
  id: 'royal_16', name: '白銀の騎士団長・エミリア', class: 'ロイヤル', rarity: 'legend',
  stats: { hp: 403, atk: 400, def: 90, spd: 50 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '『ナイト』『スティールナイト』いずれかのランダム2体を召喚する。自分のMPを3回復。',
      effects: [
        { type: 'summon', count: 2, randomUnits: [knight, steelKnight] }, // 1体ごとにランダム
        { type: 'mp', amount: 3 },
      ],
    },
    {
      name: '進化時', trigger: 'onEvolve',
      desc: '自身以外のすべての「クラス:ロイヤル」のキャラクターは【バリア】を持つ。',
      effects: [{ type: 'gainKeyword', keyword: 'barrier', target: 'otherAllyField', onlyClass: 'ロイヤル' }],
    },
  ],
}
