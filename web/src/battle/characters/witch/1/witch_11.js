export default {
  id: 'witch_11', name: 'マナリアの学徒・ウィリアム', class: 'ウィッチ', rarity: 'silver', type: 'マナリア',
  stats: { hp: 550, atk: 510, def: 90, spd: 50 },
  skill: { name: '攻撃', stat: 'mag', type: 'magic', mult: 1.25 }, // 敵単体に魔力125%分の魔法ダメージ
  passives: [
    // Xは0から始まり、これがスペルブーストされるたびに+1される(数えるのはエンジンの「ブーストされた回数」。perBoost で使う)
    { name: 'スペルブースト時', trigger: 'onBoost', desc: 'これのXを+1する。(Xは0から始まる)', effects: [] },
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '相手の場のキャラクターすべてに30×Xダメージ。',
      effects: [{ type: 'damage', stat: 'atk', mult: 0, add: 0, perBoost: 30, dmgType: 'magic', target: 'enemies' }],
    },
    {
      name: '進化時', trigger: 'onEvolve',
      desc: '自分の場すべては2回スペルブーストする。',
      effects: [{ type: 'boost', amount: 2, target: 'allyField' }],
    },
  ],
}
