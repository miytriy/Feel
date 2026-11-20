export default {
  id: 'neutral_2_01', name: '颶風の天業・グリームニル', class: 'ニュートラル', rarity: 'legend',
  stats: { hp: 332, atk: 230, def: 100, spd: 84 },
  tags: ['ダメージ軽減', '範囲攻撃'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
  passives: [
    'guard', // 【守護】
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '自分は『クレスト:颶風の天業・グリームニル』を持つ。',
      log: '自分は『クレスト:颶風の天業・グリームニル』を持つ。',
      effects: [{
        type: 'crest',
        crest: {
          name: '颶風の天業・グリームニル',
          desc: '味方キャラクターのターン終了時、自分の場に進化後のフォロワーがあるなら、相手の場のフォロワーすべてに200の確定ダメージ。2ターンに1回有効。',
          passives: [
            { name: 'ターン終了時', trigger: 'allyTurnEnd', everyTurns: 2, condition: { allyEvolved: true }, desc: '味方キャラクターのターン終了時、自分の場に進化後のフォロワーがあるなら、相手の場のフォロワーすべてに200の確定ダメージ。2ターンに1回有効。', log: '相手の場のフォロワーすべてに200の確定ダメージ。', effects: [{ type: 'damage', stat: 'atk', mult: 0, add: 200, dmgType: 'true', target: 'enemyFollowers' }] },
          ],
        },
      }],
    },
  ],
}
