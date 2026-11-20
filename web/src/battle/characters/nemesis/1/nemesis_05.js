import featureCore from '../../../artifact/nemesis/tokens/nemesis_feature_core.js' // 付与する『フューチャー・コア』
import pastCore from '../../../artifact/nemesis/tokens/nemesis_past_core.js' // 付与する『パスト・コア』

// レゾリューション・ミリアム(ローテーション: 伝説の幕開け = フォルダ 1)。タイプなし(ー)・パッシブなし(ー)
const giveCores = [
  { type: 'giveArtifact', artifact: featureCore, count: 1 },
  { type: 'giveArtifact', artifact: pastCore, count: 1 },
]
export default {
  id: 'nemesis_05', name: 'レゾリューション・ミリアム', class: 'ネメシス', rarity: 'gold',
  stats: { hp: 313, atk: 219, def: 100, spd: 81 },
  tags: ['展開'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '『フューチャー・コア』1つと『パスト・コア』1つを自分に付与する。', effects: giveCores },
    { name: '進化時', trigger: 'onEvolve', desc: '【ファンファーレ】と同じ能力が働く。', log: '『フューチャー・コア』1つと『パスト・コア』1つを自分に付与する。', effects: giveCores },
  ],
}
