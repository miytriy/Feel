// スペル(プレイヤー能力): 「豊麗なるローズクイーン」のファンファーレで使えるようになる。タイプ「トークン」は編成(スペルセット)に入れられない
export default {
  id: 'elf_spell_04', name: '薔薇の閃撃', class: 'エルフ/スペル', rarity: 'legend', type: 'トークン',
  cost: 0, // MP
  desc: '相手の場のキャラクター1体を選ぶ。それに130の物理ダメージ。',
  effects: [{ type: 'damage', stat: 'atk', mult: 0, add: 130, dmgType: 'physical', target: 'enemyOne', choose: true }],
}
