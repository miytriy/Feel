import forestMystery from './elf_spell_02.js' // 有効化する「森の神秘」

// スペル(プレイヤー能力)
export default {
  id: 'elf_spell_03', name: '薫交の思慕', class: 'エルフ/スペル', rarity: 'silver',
  cost: 3, // MP
  desc: '「森の神秘」1回を有効化する。',
  effects: [{ type: 'enableSpell', spell: forestMystery }],
}
