import knight from '../1/tokens/royal_token_01.js' // 召喚する「ナイト」(既存のトークン。伝説の幕開けと共通)

// 焦がれし炎将・マーズ(ローテーション: クロニクル・オブ・デスティニー = フォルダ 8)。ID: royal_8_07。タイプ: ー
// 『兵士・フォロワー』= 「タイプ:兵士」のフォロワーと解釈(enterType: '兵士')
export default {
  id: 'royal_8_07', name: '焦がれし炎将・マーズ', class: 'ロイヤル', rarity: 'legend',
  stats: { hp: 541, atk: 100, def: 400, spd: 34 },
  tags: ['展開', '自己強化', 'サポーター'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
  passives: [
    'dash', // 【疾走】
    'finisher', // 【必殺】
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '『ナイト』3体を召喚する。', log: '『ナイト』3体を召喚する。',
      effects: [{ type: 'summon', count: 3, unit: knight }],
    },
    {
      name: '常時', trigger: 'allyEnter', enterType: '兵士',
      desc: '自分の兵士・フォロワーが場に出たとき、それは+200/+0して、【突進】を持つ。これは+100/+0する。',
      log: 'それは+200/+0して、【突進】を持つ。これは+100/+0する。',
      effects: [
        { type: 'buff', stat: 'atk', flat: 200, target: 'entered' },
        { type: 'gainKeyword', keyword: 'rush', target: 'entered' },
        { type: 'buff', stat: 'atk', flat: 100, target: 'self' },
      ],
    },
    {
      name: '進化時', trigger: 'onEvolve',
      desc: '『ナイト』1体を召喚する。', log: '『ナイト』1体を召喚する。',
      effects: [{ type: 'summon', count: 1, unit: knight }],
    },
  ],
}
