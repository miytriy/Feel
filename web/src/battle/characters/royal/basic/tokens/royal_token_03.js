// 静かなるメイド・ノーニャ(トークン/キャラクター。ローテーション: ー)。召喚・設置専用(token: true)
export default {
  id: 'royal_token_03', name: '静かなるメイド・ノーニャ', class: 'ロイヤル', rarity: 'gold', token: true, type: '兵士',
  stats: { hp: 220, atk: 210, def: 90, spd: 94 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
  passives: [
    'guard', // 【守護】
    {
      name: 'ファンファーレ', trigger: 'fanfare', condition: { allyHasName: '休日の王女・プリム' },
      desc: '自分の場に『休日の王女・プリム』があるなら、これは+100/+100して【必殺】を持つ。',
      log: 'これは+100/+100して【必殺】を持つ。',
      effects: [
        { type: 'buff', stat: 'atk', flat: 100, target: 'self' },
        { type: 'maxHp', flat: 100, target: 'self' },
        { type: 'gainKeyword', keyword: 'finisher', target: 'self' },
      ],
    },
  ],
}
