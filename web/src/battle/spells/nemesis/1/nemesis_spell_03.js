import pastCore from '../../../artifact/nemesis/tokens/nemesis_past_core.js' // 『パスト・コア』

// スペル(プレイヤー能力): ローテーション: 伝説の幕開け(フォルダ 1)。タイプなし(ー)
export default {
  id: 'nemesis_spell_03', name: '命の奔流', class: 'ネメシス/スペル', rarity: 'silver',
  cost: 2, // MP
  desc: '相手の場のフォロワー1体を選ぶ。それに300の物理ダメージ。『パスト・コア』1つを加える。',
  log: '相手の場のフォロワー1体を選ぶ。それに300の物理ダメージ。『パスト・コア』1つを加える。',
  effects: [
    { type: 'pick', target: 'enemyFollowerOne', choose: true },
    { type: 'damage', stat: 'atk', mult: 0, add: 300, dmgType: 'physical', target: 'enemyFollowerOne' },
    { type: 'giveArtifact', artifact: pastCore, count: 1 },
  ],
}
