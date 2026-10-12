import knight from './royal_01.js' // 召喚する「ナイト」

export default {
  id: 'royal_12', name: '王断の天宮・スタチウム', class: 'ロイヤル', rarity: 'gold',
  stats: { hp: 403, atk: 410, def: 90, spd: 70 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    {
      name: '進化時', trigger: 'onEvolve',
      desc: '『ナイト』2体を召喚する。自分以外の場すべてのキャラクターは「攻撃力+100、体力+100」をする。',
      effects: [
        { type: 'summon', count: 2, unit: knight },
        // 召喚したナイトも含めて、自分以外の場(場のキャラ+召喚物)すべて
        { type: 'buff', stat: 'atk', flat: 100, target: 'otherAllyField' },
        { type: 'maxHp', flat: 100, target: 'otherAllyField' },
      ],
    },
  ],
}
