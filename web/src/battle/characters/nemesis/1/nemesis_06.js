// 新たなる少女・エース(ローテーション: 伝説の幕開け = フォルダ 1)。タイプなし(ー)・パッシブなし(ー)
export default {
  id: 'nemesis_06', name: '新たなる少女・エース', class: 'ネメシス', rarity: 'legend',
  stats: { hp: 372, atk: 321, def: 90, spd: 83 },
  tags: ['促進', '治療'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '最も近い味方1体の行動順+10%。', effects: [{ type: 'advance', pct: 10, target: 'nearestAlly' }] },
    {
      name: '進化時', trigger: 'onEvolve',
      desc: '自分は『クレスト:新たなる少女・エース』を持つ。',
      effects: [{
        type: 'crest',
        crest: {
          name: '新たなる少女・エース', countdown: 3, // 【カウントダウン_3】
          desc: '【カウントダウン_3】自分のターン終了時、自分の場の生存しているキャラクターが5体未満なら、最も近い味方1体の行動順+10%。5体なら、自分の場のキャラクターすべてに100のヒールを割り振る。',
          passives: [
            {
              name: 'ターン終了時', trigger: 'turnEnd',
              desc: '自分の場の生存しているキャラクターが5体未満なら、最も近い味方1体の行動順+10%。5体なら、自分の場のキャラクターすべてに100のヒールを割り振る。',
              effects: [
                { type: 'advance', pct: 10, target: 'nearestAlly', condition: { fieldCharsBelow: 5 } },
                { type: 'heal', flat: 100, split: true, target: 'allies', condition: { fieldCharsAtLeast: 5 } }, // 割り振る = 合計100を、場のキャラクターの人数で等分
              ],
            },
          ],
        },
      }],
    },
  ],
}
