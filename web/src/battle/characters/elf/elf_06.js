import fairy from './elf_01.js' // 召喚する「フェアリー」は elf_01.js のキャラです

// 「フェアリー1体を召喚。MPを追加で1消費すると、もう1体召喚」(ファンファーレと進化時で同じ能力)
// optional: true … 使うか使わないかを、プレイヤーが選べる(CPUは使う)
const summonFairies = [
  { type: 'summon', count: 1, unit: fairy },
  { type: 'summon', count: 1, unit: fairy, mpCost: 1, optional: true, prompt: 'MPを1消費して、フェアリーをもう1体召喚しますか?' },
]

export default {
  id: 'elf_06', name: 'コンタクトフェアリー', class: 'エルフ', rarity: 'bronze',
  stats: { hp: 131, atk: 122, def: 90, spd: 80 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '「フェアリー」1体を召喚する。MPを追加で1消費すると、「フェアリー」1体を追加召喚する。', effects: summonFairies },
    { name: '進化時', trigger: 'onEvolve', desc: '【ファンファーレ】と同じ能力が働く。', effects: summonFairies },
  ],
}
