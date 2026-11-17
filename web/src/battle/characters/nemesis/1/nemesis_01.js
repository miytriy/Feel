import pastCore from '../../../artifact/nemesis/tokens/nemesis_past_core.js' // 付与する『パスト・コア』は、artifact/nemesis/tokens のアーティファクトです

// ビビッドインベンター・イリス(ローテーション: 伝説の幕開け = フォルダ 1)。タイプなし(ー)・パッシブなし(ー)
export default {
  id: 'nemesis_01', name: 'ビビッドインベンター・イリス', class: 'ネメシス', rarity: 'bronze',
  stats: { hp: 119, atk: 164, def: 90, spd: 101 },
  tags: ['展開'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    {
      name: 'ラストワード', trigger: 'lastWord',
      desc: '『パスト・コア』1つを自分に付与する。',
      effects: [{ type: 'giveArtifact', artifact: pastCore, count: 1 }], // 手持ちのアーティファクトに加わる
    },
  ],
}
