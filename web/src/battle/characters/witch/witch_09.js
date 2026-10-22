import guardian from './tokens/witch_token_02.js' // 召喚する「ガーディアンゴーレム」は witch_token_02.js のキャラです

export default {
  id: 'witch_09', name: '黎明の錬金術師・ノノ', class: 'ウィッチ', rarity: 'gold',
  stats: { hp: 303, atk: 309, def: 90, spd: 60 },
  skill: { name: '攻撃', stat: 'mag', type: 'magic', mult: 1.25 }, // 敵単体に魔力125%分の魔法ダメージ
  passives: [
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '相手の場のキャラクター1体を選ぶ。それに50×Xダメージ。Xは自分の場の土の印の数である。',
      effects: [{ type: 'damage', stat: 'atk', mult: 0, add: 0, perEarth: 50, dmgType: 'magic', target: 'enemyOne', choose: true }],
    },
    {
      name: '進化時', trigger: 'onEvolve',
      desc: '自分は『クレスト:黎明の錬金術師・ノノ』を持つ。',
      effects: [{
        type: 'crest',
        crest: {
          name: '黎明の錬金術師・ノノ',
          desc: '【カウントダウン_3】自分のターン終了時、【土の秘術_1】『ガーディアンゴーレム』1体を召喚する。',
          countdown: 3,
          passives: [
            { name: 'ターン終了時', trigger: 'turnEnd', desc: '【土の秘術_1】『ガーディアンゴーレム』1体を召喚する。', effects: [{ type: 'summon', count: 1, unit: guardian, earthCost: 1 }] },
          ],
        },
      }],
    },
  ],
}
