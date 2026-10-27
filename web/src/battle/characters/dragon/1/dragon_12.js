export default {
  id: 'dragon_12', name: '灼熱のアナテマ・バーンドナイト', class: 'ドラゴン', rarity: 'legend', type: 'アナテマ',
  stats: { hp: 710, atk: 700, def: 90, spd: 40 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: 'MPを好きな数だけ消費する。相手すべてに攻撃力10%分×X%ダメージ。Xは消費したMP数である。',
      effects: [
        { type: 'spendMp' }, // 消費するMPの数Xを選ぶ(画面では数字ボタン)
        { type: 'damage', stat: 'atk', mult: 0, perMpSpent: 0.1, dmgType: 'physical', target: 'enemies' }, // 攻撃力の10%×X
      ],
    },
    {
      name: '進化時', trigger: 'onEvolve',
      desc: '相手は『クレスト:灼熱のアナテマ・バーンドナイト』を持つ。',
      effects: [{
        type: 'crest', onEnemy: true, // 相手が持つクレスト(そのため「自分の」は、クレストを持つ相手側のこと)
        crest: {
          name: '灼熱のアナテマ・バーンドナイト',
          desc: '自分のターン開始時、キャラクターすべてに50ダメージ。自分のキャラクターが回復したとき、自分のターンごとに1回、自分のキャラクターすべてに50ダメージ。',
          passives: [
            { name: 'ターン開始時', trigger: 'allyTurnStart', desc: 'キャラクターすべてに50ダメージ。', effects: [{ type: 'damage', stat: 'atk', mult: 0, add: 50, dmgType: 'true', target: 'allies' }] },
            { name: '回復したとき', trigger: 'allyHeal', oncePerTurn: true, desc: '自分のターンごとに1回、自分のキャラクターすべてに50ダメージ。', effects: [{ type: 'damage', stat: 'atk', mult: 0, add: 50, dmgType: 'true', target: 'allies' }] },
          ],
        },
      }],
    },
  ],
}
