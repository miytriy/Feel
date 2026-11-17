// 青薔薇の令嬢・セレス(ローテーション: 伝説の幕開け = フォルダ 1)
export default {
  id: 'nightmare_09', name: '青薔薇の令嬢・セレス', class: 'ナイトメア', rarity: 'gold',
  stats: { hp: 400, atk: 111, def: 300, spd: 70 },
  tags: ['大ダメージ', 'ダメージ軽減', '治療', 'タンク'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    'finisher', // 【必殺】
    'barrier', // 【バリア】(特性の「これは【バリア】を持つ」)
    {
      name: '常時', trigger: 'turnEnd',
      desc: '自分のターン終了時、自分の場のキャラクターからランダム1体を150ヒール。これが進化後なら、150ヒールではなく250ヒール。これは【バリア】を持つ。',
      log: '自分の場のキャラクターからランダム1体を150ヒール。',
      logIf: [{ condition: { evolved: true }, log: '自分の場のキャラクターからランダム1体を250ヒール。これは【バリア】を持つ。' }], // 進化後は、250ヒールに置き換わる
      effects: [
        { type: 'heal', flat: 150, target: 'allyFieldRandom', condition: { evolved: false } },
        { type: 'heal', flat: 250, target: 'allyFieldRandom', condition: { evolved: true } },
      ],
    },
  ],
}
