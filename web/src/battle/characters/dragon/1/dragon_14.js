import goldDragon from './tokens/dragon_token_05.js' // 召喚する「覇道の金龍」は dragon_token_05.js のキャラです
import silverDragon from './tokens/dragon_token_06.js' // 召喚する「覇道の銀龍」は dragon_token_06.js のキャラです

export default {
  id: 'dragon_14', name: '龍人演義・ガリュウ', class: 'ドラゴン', rarity: 'legend',
  stats: { hp: 550, atk: 505, def: 90, spd: 30 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '『覇道の金龍』1体と『覇道の銀龍』1体を召喚する。', effects: [{ type: 'summon', count: 1, unit: goldDragon }, { type: 'summon', count: 1, unit: silverDragon }] },
    {
      name: '進化時', trigger: 'onEvolve',
      desc: '自分の場の『覇道の金龍』すべては【疾走】を持つ。自分の場の『覇道の銀龍』すべては【バリア】を持つ。',
      effects: [
        { type: 'gainKeyword', keyword: 'dash', target: 'allyField', onlyName: '覇道の金龍' },
        { type: 'gainKeyword', keyword: 'barrier', target: 'allyField', onlyName: '覇道の銀龍' },
      ],
    },
  ],
}
