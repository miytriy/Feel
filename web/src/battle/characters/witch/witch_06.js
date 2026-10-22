export default {
  id: 'witch_06', name: '理光の天宮・エーデルワイス', class: 'ウィッチ', rarity: 'gold',
  stats: { hp: 203, atk: 200, def: 90, spd: 70 },
  skill: { name: '攻撃', stat: 'mag', type: 'magic', mult: 1.25 }, // 敵単体に魔力125%分の魔法ダメージ
  passives: [
    // 【土の秘術_2】= earthCost: 2(土の印を2消費して働く。足りないときは進化しない)
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '【土の秘術_2】これは進化する。', effects: [{ type: 'evolve', earthCost: 2 }] },
    {
      name: '進化したとき', trigger: 'onEvolved', // これが進化したとき(EPを使わない進化でも働く。【進化時】はEP進化のときだけ)
      desc: '相手の場のキャラクターからランダム1体に140ダメージ。自分の現在MPを2回復する。',
      effects: [
        { type: 'damage', stat: 'mag', mult: 0, add: 140, dmgType: 'magic', target: 'enemyRandom' },
        { type: 'mp', amount: 2 },
      ],
    },
  ],
}
