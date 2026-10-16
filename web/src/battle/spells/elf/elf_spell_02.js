// スペル(プレイヤー能力): 「薫交の思慕」で有効化できる。タイプ「トークン」は編成(スペルセット)に入れられない
export default {
  id: 'elf_spell_02', name: '森の神秘', class: 'エルフ/スペル', rarity: 'bronze', type: 'トークン',
  cost: 0, // MP
  desc: '自分の場すべてに100のヒールを割り振る。',
  effects: [{ type: 'heal', flat: 100, split: true, target: 'allyField' }], // 100を、場の全員で等分する
}
