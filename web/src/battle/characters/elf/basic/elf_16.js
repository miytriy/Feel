import fairy from '../1/tokens/elf_token_01.js' // 『フェアリー』

export default {
  id: 'elf_16', name: 'フェアリーテイマー', class: 'エルフ', rarity: 'bronze',
  stats: { hp: 164, atk: 131, def: 90, spd: 94 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [{
    name: 'ファンファーレ', trigger: 'fanfare', desc: '『フェアリー』2体を召喚する。',
    effects: [{ type: 'summon', count: 2, unit: fairy }],
  }],
}
