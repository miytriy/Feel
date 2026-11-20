// トークンのスペル「成長したですぅ!」(witch_spell_04「宿題やるですぅ!」が変身してなる)。tokens フォルダに置く。スペルセットには入れられない(token: true なので)
export default {
  id: 'witch_spell_token_01', name: '成長したですぅ!', class: 'ウィッチ/スペル', rarity: 'gold', token: true, type: 'マナリア',
  cost: 1, // MP
  desc: '最も近い味方1体の行動順20%アップ。2回スペルブーストする。相手の場のキャラクターからランダム1体に200の魔法ダメージ。',
  effects: [
    { type: 'advance', pct: 20, target: 'nearestAlly' }, // 最も近い味方1体の行動順20%アップ
    { type: 'boost', amount: 2 },
    { type: 'damage', stat: 'mag', mult: 0, add: 200, dmgType: 'magic', target: 'enemyCharRandom' },
  ],
}
