// アーティファクトの書き方(コピーして使う。「_」で始まるファイルは読み込まれません)
// 置き場所: artifact/クラス名/ピックアップ/id.js (ファイル名 = id)
// 場に出したときは、「召喚物」のユニットになる(キャラと同じ書き方で、stats / skill / passives を書く)
import stage2 from '../tokens/artifact_example_02.js' // 変身先は、tokens フォルダに置く

export default {
  id: 'artifact_example_01', name: 'アーティファクト(例)', class: 'ウィッチ', rarity: 'bronze',
  cost: 2,              // 場に出すときのMP
  fuse: { max: 3, cost: 0 }, // 1回の融合に使える素材の数 / 融合に払うMP(どちらも省略できる)
  stats: { hp: 100, atk: 100, def: 50, spd: 30 },
  tags: [],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [],
  // 【融合】: 上から順に調べて、最初に合ったものに変身する
  //   when: costMin/costMax(素材の合計コスト) kindsMin/kindsMax(素材の種類数) countMin/countMax(素材の枚数) ids(この素材を含む)
  fusions: [{ when: { costMin: 3, kindsMin: 2 }, into: stage2 }],
}
