// 禁密の天宮・ロナヴェロ(ローテーション: 伝説の幕開け = フォルダ 1)
export default {
  id: 'bishop_06', name: '禁密の天宮・ロナヴェロ', class: 'ビショップ', rarity: 'gold',
  stats: { hp: 336, atk: 141, def: 200, spd: 82 },
  tags: ['大ダメージ', 'メインアタッカー'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    'stealth_3', // 【潜伏_3】
    {
      name: '進化時', trigger: 'onEvolve',
      desc: '相手の場の1体を選ぶ。それがキャラクターだった場合250の物理ダメージ。それが召喚物だったとき、破壊する。',
      effects: [
        { type: 'pick', target: 'enemyFieldOne', choose: true }, // 相手の場の1体(キャラクターも召喚物も選べる。潜伏・オーラのものは選べない)
        { type: 'damage', stat: 'atk', mult: 0, add: 250, dmgType: 'physical', target: 'enemyFieldOne', onlyField: 'main' }, // 選んだのがキャラクターなら
        { type: 'destroy', target: 'enemyFieldOne', onlyField: 'summon' }, // 選んだのが召喚物なら
      ],
    },
  ],
}
