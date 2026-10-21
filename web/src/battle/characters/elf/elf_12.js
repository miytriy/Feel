import fairy from './tokens/elf_token_01.js'

export default {
  id: 'elf_12', name: '深奥のフェアリービースト', class: 'エルフ', rarity: 'bronze',
  stats: { hp: 401, atk: 431, def: 90, spd: 30 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [{
    name: 'ファンファーレ', trigger: 'fanfare',
    desc: '自分の場に「フェアリー」を1体召喚する。自分以外の味方1体を最大HP10×X%ヒール。Xは現在の召喚物の数。',
    effects: [
      { type: 'summon', count: 1, unit: fairy },
      { type: 'heal', pctPerSummon: 10, target: 'otherAllyOne', choose: true },
    ],
  }],
}
