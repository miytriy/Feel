import roseStrike from '../../../spells/elf/1/elf_spell_04.js' // 使えるようになるスペル「薔薇の閃撃」

export default {
  id: 'elf_14', name: '豊麗なるローズクイーン', class: 'エルフ', rarity: 'legend',
  stats: { hp: 608, atk: 601, def: 90, spd: 10 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    'guard', // 【守護】
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '速度100・90の味方(自分以外)の数だけ、スペル「薔薇の閃撃」を使えるようにする(X回)。',
      effects: [{ type: 'enableSpell', perAllySpeed: [100, 90], spell: roseStrike }],
    },
  ],
}
