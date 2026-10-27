import annHero from './tokens/witch_token_04.js' // 召喚する「アンの大英霊」は witch_token_04.js のキャラです

export default {
  id: 'witch_10', name: 'マナリアフレンズ・アン&グレア', class: 'ウィッチ', rarity: 'legend', type: 'マナリア',
  stats: { hp: 402, atk: 400, def: 90, spd: 60 },
  skill: { name: '攻撃', stat: 'mag', type: 'magic', mult: 1.0 }, // 敵単体に魔力100%分の魔法ダメージ
  passives: [
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '「アンの大英霊」を1体召喚する。自分の場すべては3回スペルブーストする。',
      effects: [
        { type: 'summon', count: 1, unit: annHero },
        { type: 'boost', amount: 3, target: 'allyField' },
      ],
    },
    {
      name: '進化時', trigger: 'onEvolve',
      desc: '相手単体を選び、魔力30%分の魔法ダメージを与える。',
      effects: [{ type: 'damage', stat: 'mag', mult: 0.3, dmgType: 'magic', target: 'enemyOne', choose: true }],
    },
  ],
}
