export default {
  id: 'nightmare_07', name: '闇の賞金稼ぎ・バルト', class: 'ナイトメア', rarity: 'gold',
  stats: { hp: 120, atk: 320, def: 200, spd: 70 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '自分は『クレスト:闇の賞金稼ぎ・バルト』を持つ。',
      effects: [{
        type: 'crest',
        crest: {
          name: '闇の賞金稼ぎ・バルト',
          desc: '【カウントダウン_4】味方のターン終了時、場のすべてに50の物理ダメージ。',
          countdown: 4,
          passives: [
            // 「場のすべて」= 両チームのキャラ・召喚物・アミュレット(fieldAll)。ダメージを出すのは、クレストを置いたキャラ
            { name: '味方のターン終了時', trigger: 'allyTurnEnd', desc: '場のすべてに50の物理ダメージ。', effects: [{ type: 'damage', stat: 'atk', mult: 0, add: 50, dmgType: 'physical', target: 'fieldAll' }] },
          ],
        },
      }],
    },
  ],
}
