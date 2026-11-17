import featureCore from '../../../artifact/nemesis/tokens/nemesis_feature_core.js' // 付与する『フィーチャー・コア』
import pastCore from '../../../artifact/nemesis/tokens/nemesis_past_core.js' // 付与する『パスト・コア』
import attackArtifact from '../../../artifact/nemesis/tokens/nemesis_attack_artifact.js' // 召喚する『アタックアーティファクト』

// ストラグルリーダー・ルキナ(ローテーション: 伝説の幕開け = フォルダ 1)。タイプなし(ー)・パッシブなし(ー)
export default {
  id: 'nemesis_07', name: 'ストラグルリーダー・ルキナ', class: 'ネメシス', rarity: 'silver',
  stats: { hp: 364, atk: 339, def: 90, spd: 73 },
  tags: ['展開'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    {
      name: 'ファンファーレ', trigger: 'fanfare', desc: '『フィーチャー・コア』・『パスト・コア』1つを自分に付与する。',
      effects: [
        { type: 'giveArtifact', artifact: featureCore, count: 1 },
        { type: 'giveArtifact', artifact: pastCore, count: 1 },
      ],
    },
    { name: '進化時', trigger: 'onEvolve', desc: '『アタックアーティファクト』1体を召喚する。', effects: [{ type: 'summon', count: 1, unit: attackArtifact }] },
  ],
}
