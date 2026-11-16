// 煌槍のアルミラージ・サリッサ(ローテーション: 伝説の幕開け = フォルダ 1)
export default {
  id: 'bishop_02', name: '煌槍のアルミラージ・サリッサ', class: 'ビショップ', rarity: 'silver',
  stats: { hp: 206, atk: 220, def: 90, spd: 80 },
  tags: ['自己強化', '増幅', 'メインアタッカー'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    {
      name: '常時', trigger: 'allyDeath', deathKeyword: 'guard',
      desc: '自分の【守護】を持つキャラクターが破壊されたとき、これは+100/+100する。',
      effects: [
        { type: 'buff', stat: 'atk', flat: 100, target: 'self' },
        { type: 'maxHp', flat: 100, target: 'self' },
      ],
    },
  ],
}