export default {
  id: 'royal_11', name: '常在戦場・カゲミツ', class: 'ロイヤル', rarity: 'legend',
  stats: { hp: 220, atk: 201, def: 90, spd: 80 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    {
      name: 'ラストワード', trigger: 'lastWord',
      desc: '自分は『クレスト:常在戦場・カゲミツ』を持つ。',
      effects: [{
        type: 'crest',
        crest: {
          name: '常在戦場・カゲミツ', countdown: 2, // 【カウントダウン_2】
          desc: '【カウントダウン_2】【ラストワード】『常在戦場・カゲミツ』1体を召喚する。',
          passives: [
            // fromCrest: このクレストを置いたキャラ(カゲミツ)と同じキャラを召喚する
            { name: 'ラストワード', trigger: 'lastWord', effects: [{ type: 'summon', count: 1, fromCrest: true }] },
          ],
        },
      }],
    },
    { name: '進化時', trigger: 'onEvolve', desc: 'これは【疾走】を持つ。', effects: [{ type: 'gainKeyword', keyword: 'dash', target: 'self' }] },
  ],
}
