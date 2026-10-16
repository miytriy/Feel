// ※ elf_15 の番号は空けてあります(あとで使うため)
import fairy from './tokens/elf_token_01.js' // 召喚する「フェアリー」は elf_token_01.js のキャラです

export default {
  id: 'elf_10', name: '自然の妖精姫・アリア', class: 'エルフ', rarity: 'legend',
  stats: { hp: 410, atk: 408, def: 92, spd: 50 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '自分は『クレスト:自然の妖精姫・アリア』を持つ。',
      effects: [{
        type: 'crest',
        crest: {
          name: '自然の妖精姫・アリア',
          desc: '自分の妖精・フォロワーが場に出たとき、それは【疾走】を持つ。',
          passives: [],
          onEnter: { type: '妖精', gainKeyword: 'dash' },
        },
      }],
    },
    {
      name: '進化時', trigger: 'onEvolve',
      desc: '『フェアリー』3体を召喚する。',
      effects: [{ type: 'summon', count: 3, unit: fairy }],
    },
  ],
}
