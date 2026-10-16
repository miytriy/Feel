import steelKnight from '../characters/royal/royal_02.js' // 召喚する「スティールナイト」

// スペル(プレイヤー能力): 相手の場のキャラ1体を選んで物理ダメージ → 「スティールナイト」を召喚
export default {
  id: 'royal_spell_02', name: '剣士の斬撃', class: 'ロイヤル/スペル', rarity: 'bronze',
  cost: 4, // MP
  desc: '相手の場のキャラクター1体を選ぶ。それに200の物理ダメージ。『スティールナイト』1体を召喚する。',
  effects: [
    { type: 'damage', stat: 'atk', mult: 0, add: 200, dmgType: 'physical', target: 'enemyOne', choose: true },
    { type: 'summon', count: 1, unit: steelKnight },
  ],
}
