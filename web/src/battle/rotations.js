// Feel Battle - ローテーション(ピックアップの名前)
// キャラ・スペル・アミュレットは、クラスのフォルダの下の「ローテーションのフォルダ」に置きます。
//   例: characters/elf/1/elf_01.js (1 = 第1弾ピックアップ) / characters/neutral/basic/neutral_basic_01.js (basic = ベーシック)
// フォルダ名と、ローテーションの名前の対応は、ここに書きます。ピックアップを増やすときは、1行足すだけです。
export const ROTATIONS = {
  basic: 'ベーシック', // 通常ガチャに入るキャラ
  1: '伝説の幕開け', // 第1弾ピックアップ
  // 2: '(第2弾の名前)',
}
// ファイルの場所(例: ./elf/1/elf_01.js)から、ローテーションの名前を返す。対応がないフォルダ(testなど)は null
export function rotationOfPath(path) {
  const parts = String(path).split('/').filter((p) => p && p !== '.' && p !== '..')
  const i = parts.findIndex((p, k) => k > 0 && k < parts.length - 1 && Object.prototype.hasOwnProperty.call(ROTATIONS, p))
  return i === -1 ? null : ROTATIONS[parts[i]]
}
