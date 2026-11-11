// スペル(プレイヤー能力): 「豊麗なるローズクイーン」のファンファーレで使えるようになる。token: true のスペルは編成(スペルセット)に入れられない
export default {
  id: 'elf_spell_04', name: '薔薇の閃撃', class: 'エルフ/スペル', rarity: 'legend', token: true,
  cost: 0, // MP
  desc: '相手の場のフォロワー1体を選ぶ。それに200の物理ダメージ。',
  log: '相手の場のフォロワー1体を選ぶ。それに200の物理ダメージ。',
  effects: [{ type: 'damage', stat: 'atk', mult: 0, add: 200, dmgType: 'physical', target: 'enemyOne', choose: true }],
}
