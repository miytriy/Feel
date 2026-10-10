import fairy from './elf_01.js' // 召喚する「フェアリー」は、elf_01.js のキャラです(数字を直すときは elf_01.js だけ直せば両方に反映されます)

export default {
  id: 'elf_02', name: '純粋なるウォーターフェアリー', class: 'エルフ', rarity: 'silver',
  stats: { hp: 102, atk: 100, def: 90, spd: 100 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [{ name: 'ラストワード', trigger: 'lastWord', desc: '「フェアリー」1体を召喚する。',
    effects: [{ type: 'summon', count: 1, unit: fairy }] }],
}
