import servant from './tokens/neutral_token_01.js' // サタンズサーヴァント
import demon from './tokens/neutral_token_02.js' // 辺獄の悪鬼
import general from './tokens/neutral_token_03.js' // 沈黙の魔将

export default {
  id: 'neutral_06', name: '最果ての罪・サタン', class: 'ニュートラル', rarity: 'legend',
  stats: { hp: 1000, atk: 1000, def: 90, spd: 10 },
  tags: ['展開', 'メインアタッカー'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
  passives: [{
    name: 'ファンファーレ', trigger: 'fanfare', desc: '『サタンズサーヴァント』1体と『辺獄の悪鬼』1体と『沈黙の魔将』1体を召喚する。',
    log: '『サタンズサーヴァント』『辺獄の悪鬼』『沈黙の魔将』を1体ずつ召喚する。',
    effects: [
      { type: 'summon', count: 1, unit: servant },
      { type: 'summon', count: 1, unit: demon },
      { type: 'summon', count: 1, unit: general },
    ],
  }],
}
