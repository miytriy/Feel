import fairy from '../characters/elf/elf_01.js' // 召喚する「フェアリー」

// スペル(プレイヤー能力): 自分のキャラのターン中、MPを使って1ターンに1回まで使える。キャラの行動は消費しない
export default {
  id: 'elf_spell_01', name: '妖精の招集', class: 'エルフ/スペル', rarity: 'bronze',
  cost: 1, // MP
  desc: '「フェアリー」2体を召喚する。',
  effects: [{ type: 'summon', count: 2, unit: fairy }],
}
