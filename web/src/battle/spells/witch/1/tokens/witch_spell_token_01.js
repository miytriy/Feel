// トークンのスペル「成長したですぅ!」(witch_spell_04「宿題やるですぅ!」が変身してなる)。tokens フォルダに置く。スペルセットには入れられない(タイプが「トークン」で始まる)
export default {
  id: 'witch_spell_token_01', name: '成長したですぅ!', class: 'ウィッチ/スペル', rarity: 'gold', type: 'トークン/マナリア/スペル',
  cost: 1, // MP
  desc: '2回スペルブーストする。相手の場のキャラクターからランダム1体に120の魔法ダメージ。',
  effects: [
    { type: 'boost', amount: 2 },
    { type: 'damage', stat: 'mag', mult: 0, add: 120, dmgType: 'magic', target: 'enemyRandom' },
  ],
}
