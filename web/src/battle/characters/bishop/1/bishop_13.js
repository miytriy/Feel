// 大いなる熾天使・ラピス(ローテーション: 伝説の幕開け = フォルダ 1)。タイプなし(ー)・パッシブなし(ー)
export default {
  id: 'bishop_13', name: '大いなる熾天使・ラピス', class: 'ビショップ', rarity: 'gold',
  stats: { hp: 676, atk: 721, def: 100, spd: 31 },
  tags: ['再展開', 'アタッカー'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
  passives: [
    {
      name: 'ラストワード', trigger: 'lastWord',
      desc: '自分は『クレスト:大いなる熾天使・ラピス』を持つ。',
      effects: [{
        type: 'crest',
        crest: {
          name: '大いなる熾天使・ラピス', countdown: 2, // 【カウントダウン_2】
          desc: '【カウントダウン_2】【ラストワード】『大いなる熾天使・ラピス』1体を召喚する。それは【疾走】を持つ。',
          passives: [
            // fromCrest: このクレストを置いたキャラ(ラピス)と同じキャラを召喚する。gainKeyword: 召喚したキャラが【疾走】を持つ
            { name: 'ラストワード', trigger: 'lastWord', effects: [{ type: 'summon', count: 1, fromCrest: true, gainKeyword: 'dash' }] },
          ],
        },
      }],
    },
  ],
}
