// Feel Battle - ローテーション(ピックアップの名前)
// キャラ・スペル・アミュレットは、クラスのフォルダの下の「ローテーションのフォルダ」に置きます。
//   例: characters/elf/1/elf_01.js (1 = 第1弾ピックアップ) / characters/neutral/basic/neutral_basic_01.js (basic = ベーシック)
// フォルダ名と、ローテーションの名前の対応は、ここに書きます。ピックアップを増やすときは、1行足すだけです。
export const ROTATIONS = {
  basic: 'ベーシック', // 通常ガチャに入るキャラ
  1: '伝説の幕開け',
  2: 'インフィニティ・エボルブ',
  3: '絶傑の継承者',
  4: '蒼空の六竜',
  5: '花酔遊戯',
  6: 'アポカリプス・パクト',
  7: '神殺しアナテマ',
  8: 'クロニクル・オブ・デスティニー',
  9: 'アズヴォルト・レヴナント',
  10: '二ーゲルへリア神殺事件',
}
// 英語の名前(ない(まだ決まっていない)ものは書かない)
export const ROTATIONS_EN = {
  basic: 'Basic',
  1: 'Legends Rise',
  2: 'Infinity Evolved',
  3: 'Heirs of the Omen',
  4: 'Skybound Dragons',
  6: 'Apocalypse Pact',
  7: "Anathema's Gambit",
  8: 'Choronicle of Destiny',
  9: 'Revenants of Azvaldt',
  10: 'Deicide in Nacreheim',
}
// ファイルの場所(例: ./elf/1/elf_01.js)から、ローテーションの名前を返す。対応がないフォルダ(testなど)は null
export function rotationOfPath(path) {
  const parts = String(path).split('/').filter((p) => p && p !== '.' && p !== '..')
  const i = parts.findIndex((p, k) => k > 0 && k < parts.length - 1 && Object.prototype.hasOwnProperty.call(ROTATIONS, p))
  return i === -1 ? null : ROTATIONS[parts[i]]
}
