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
// ルール(対戦の形式)。ユニット・スペル・アミュレット・遺物で、同じ表を使う。
//   rotation  : ローテーション = 「ローテーション対象」のピックアップだけ使える
//   unlimited : アンリミテッド = これまでに登場したすべてのピックアップが使える(一部のユニットは使用禁止になることがある)
//   infinity  : インフィニティ = これまでに登場したすべてのピックアップが使える(使用禁止ユニットが指定されてからの登場。指定までは未公開)
// ローテーション対象のピックアップは、ここの ROTATION_TARGETS に書く(期が変わったら書き換える)。
// 今期: 伝説の幕開け(1)。ベーシックは、毎期いつでも使える扱いにしている(仮定)
export const ROTATION_TARGETS = ['basic', '1']
// 使用禁止にするユニット(キャラ・スペル・アミュレットのid、遺物は名前)を、形式ごとに書く
export const BANNED = { rotation: [], unlimited: [], infinity: [] }
export const FORMATS = {
  rotation: { name: 'ローテーション', rotations: ROTATION_TARGETS },
  unlimited: { name: 'アンリミテッド', rotations: 'all' },
  infinity: { name: 'インフィニティ', rotations: 'all', open: false }, // open:false = まだ遊べない(使用禁止ユニットの指定待ち)
}
// 遺物(セット遺物・部位つき遺物)は、ローテーション・アンリミテッドでは使用禁止。インフィニティだけで使える
export const RELIC_FORMATS = ['infinity']
export const relicAllowedIn = (format) => RELIC_FORMATS.includes(format)
export const DEFAULT_FORMAT = 'rotation' // ランダムマッチ(ランク・カジュアル)・ルーム対戦は、いまはローテーションだけ
// そのローテーション(フォルダ名 'basic' / 1 / 2… でも、名前 'ベーシック' / '伝説の幕開け' でもよい)は、その形式で使えるか。
// id(または遺物の名前)を渡すと、使用禁止かどうかも見る
export function rotationAllowed(format, rotation, id) {
  const f = FORMATS[format]
  if (!f) return false
  if (id != null && format !== 'infinity' && (BANNED[format] || []).includes(id)) return false // インフィニティだけは、使用禁止のユニット・遺物でも使える(例外)
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
