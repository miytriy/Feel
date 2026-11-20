import featureCore from '../../../artifact/nemesis/tokens/nemesis_feature_core.js' // 『フューチャー・コア』
import pastCore from '../../../artifact/nemesis/tokens/nemesis_past_core.js' // 『パスト・コア』

// スペル(プレイヤー能力): ローテーション: 伝説の幕開け(フォルダ 1)。タイプなし(ー)
export default {
  id: 'nemesis_spell_02', name: 'アーティファクトチャージ', class: 'ネメシス/スペル', rarity: 'bronze',
  cost: 1, // MP
  desc: '『フューチャー・コア』1つと『パスト・コア』1つを加える。',
  log: '『フューチャー・コア』1つと『パスト・コア』1つを加える。',
  effects: [
    { type: 'giveArtifact', artifact: featureCore, count: 1 },
    { type: 'giveArtifact', artifact: pastCore, count: 1 },
  ],
}
