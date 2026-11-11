import steelKnight from '../../../characters/royal/1/tokens/royal_token_02.js' // 召喚する「スティールナイト」

// スペル(プレイヤー能力): 相手の場のユニット1体を選ぶ。召喚物なら破壊、キャラクターなら物理ダメージ → 「スティールナイト」を召喚
export default {
  id: 'royal_spell_02', name: '剣士の斬撃', class: 'ロイヤル/スペル', rarity: 'bronze',
  cost: 4, // MP
  desc: '相手の場のユニット1体を選ぶ。それが召喚物ならば破壊。キャラクターならば、200の物理ダメージ。『スティールナイト』1体を召喚する。',
  log: false, // 使った瞬間のログは出さず、選んだ相手(召喚物 / キャラクター)に合わせたログを出す
  effects: [
    { type: 'damage', stat: 'atk', mult: 0, add: 200, dmgType: 'physical', target: 'enemyFieldOne', choose: true, summonDestroy: true,
      logSummon: '相手の場のユニット1体を選ぶ。それを破壊。『スティールナイト』1体を召喚する。', logChar: '相手の場のユニット1体を選ぶ。それに200の物理ダメージ。『スティールナイト』1体を召喚する。' },
    { type: 'summon', count: 1, unit: steelKnight },
  ],
}
