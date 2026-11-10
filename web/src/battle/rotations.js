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
  10: 'ニーゲルヘリア神殺事件',
}
// ルール(対戦の形式)ごとに、使えるローテーションの範囲。ユニット・スペル・遺物で、同じ表を使う。
//   rotation  : ローテーション(いまは、すべての弾が使える。範囲をしぼるときは、ここの rotations を書き換える)
//   unlimited : アンリミテッド(すべての弾が使える)
export const FORMATS = {
  rotation: { name: 'ローテーション', rotations: ['basic', ...Object.keys(ROTATIONS).filter((k) => k !== 'basic')] },
  unlimited: { name: 'アンリミテッド', rotations: 'all' },
}
export const DEFAULT_FORMAT = 'rotation' // ランダムマッチ(ランク・カジュアル)・ルーム対戦は、いまはローテーションだけ
// そのローテーション(フォルダ名 'basic' / 1 / 2… でも、名前 'ベーシック' / '伝説の幕開け' でもよい)は、その形式で使えるか
export function rotationAllowed(format, rotation) {
  const f = FORMATS[format]
  if (!f) return false
  if (f.rotations === 'all') return true
  const key = Object.keys(ROTATIONS).find((k) => k === String(rotation) || ROTATIONS[k] === rotation)
  return key != null && f.rotations.includes(key)
}
// 英語の名前(ない(まだ決まっていない)ものは書かない)
export const ROTATIONS_EN = {
  basic: 'Basic',
  1: 'Legends Rise',
  2: 'Infinity Evolved',
  3: 'Heirs of the Omen',
  4: 'Skybound Dragons',
  5: 'Blossoming Fate',
  6: 'Apocalypse Pact',
  7: "Anathema's Gambit",
  8: 'Chronicle of Destiny',
  9: 'Revenants of Azvaldt',
  10: 'Deicide in Nacreheim',
}
// ファイルの場所(例: ./elf/1/elf_01.js)から、ローテーションの名前を返す。対応がないフォルダ(testなど)は null
export function rotationOfPath(path) {
  const parts = String(path).split('/').filter((p) => p && p !== '.' && p !== '..')
  const i = parts.findIndex((p, k) => k > 0 && k < parts.length - 1 && Object.prototype.hasOwnProperty.call(ROTATIONS, p))
  return i === -1 ? null : ROTATIONS[parts[i]]
}
