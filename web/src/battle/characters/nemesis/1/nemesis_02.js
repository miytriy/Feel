import featureCore from '../../../artifact/nemesis/tokens/nemesis_feature_core.js' // 付与する『フィーチャー・コア』

// アンストッパブルガンナー(ローテーション: 伝説の幕開け = フォルダ 1)。タイプなし(ー)・パッシブなし(ー)
export default {
  id: 'nemesis_02', name: 'アンストッパブルガンナー', class: 'ネメシス', rarity: 'bronze',
  stats: { hp: 242, atk: 223, def: 90, spd: 92 },
  tags: ['展開', 'サブアタッカー'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '『フィーチャー・コア』1つを自分に付与する。',
      effects: [{ type: 'giveArtifact', artifact: featureCore, count: 1 }], // 手持ちのアーティファクトに加わる
    },
    {
      name: '進化時', trigger: 'onEvolve',
      desc: '相手の場のキャラクター1体を選ぶ。それに150の物理ダメージ。',
      effects: [{ type: 'damage', stat: 'atk', mult: 0, add: 150, dmgType: 'physical', target: 'enemyOne', choose: true }],
    },
  ],
}
