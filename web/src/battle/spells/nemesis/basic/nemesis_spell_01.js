import featureCore from '../../../artifact/nemesis/tokens/nemesis_feature_core.js' // 付与する『フューチャー・コア』
import pastCore from '../../../artifact/nemesis/tokens/nemesis_past_core.js' // 付与する『パスト・コア』

// スペル(プレイヤー能力): 相手の場の1枚を選ぶ。召喚物なら破壊、キャラクターなら物理ダメージ → コアを手持ちに加える
// ローテーション: ベーシック(フォルダ basic)。タイプなし(ー)
export default {
  id: 'nemesis_spell_01', name: '異次元からの射撃', class: 'ネメシス/スペル', rarity: 'bronze',
  cost: 4, // MP
  desc: '相手の場の1枚を選ぶ。それが召喚物ならば破壊。それがキャラクターならば、300の物理ダメージ。『フューチャー・コア』1つと『パスト・コア』1つを加える。',
  log: false, // 選んだ相手(召喚物 / キャラクター)に合わせたログを出す
  effects: [
    { type: 'damage', stat: 'atk', mult: 0, add: 300, dmgType: 'physical', target: 'enemyFieldOne', choose: true, summonDestroy: true,
      logSummon: '相手の場の1枚を選ぶ。それを破壊。『フューチャー・コア』1つと『パスト・コア』1つを加える。', logChar: '相手の場の1枚を選ぶ。それに300の物理ダメージ。『フューチャー・コア』1つと『パスト・コア』1つを加える。' },
    { type: 'giveArtifact', artifact: featureCore, count: 1 },
    { type: 'giveArtifact', artifact: pastCore, count: 1 },
  ],
}
