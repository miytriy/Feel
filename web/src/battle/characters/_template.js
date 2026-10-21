// Feel Battle - キャラクターの書き方(見本)
//
// このファイルは読み込まれません(説明用です)。
// 新しいキャラは、フォルダ(例: test / neutral / elf / royal)の中に「id.js」という名前で作ります。
//   例: web/src/battle/characters/elf/elf_001.js
// 中身は「export default { ... }」と書くだけで、一覧には自動で入ります(index.js の編集は不要)。
// ファイル名と id は同じにしてください。書き間違いは、ブラウザのコンソールに日本語で出ます。
//
// ---- 項目 ----
// id, name, class(エルフ/ロイヤル/ウィッチ/ドラゴン/ナイトメア/ビショップ/ネメシス/ニュートラル)
// stats   : hp=体力 atk=攻撃力 def=防御力 spd=速度 mag=魔力(原則0) critRate=クリ率(%) critDmg=クリダメ(%) dmgResist=ダメージ耐性
// skill   : { name, stat:'atk'|'mag', type:'physical'|'magic'|'true', mult, add }
// relic   : 遺物のセット名(省略可)ピエロの祝福 / 鬼の形相 / 月と太陽の印字 / 紅血の証 / 少女の物語
// countdown: カウントダウンの数(省略可)  evolvable: false で進化できない
// passives: キーワードは文字列で書く
//             'guard'守護 'stealth'潜伏 'aura'オーラ 'intimidate'威圧 'rush'突進 'dash'疾走
//             'finisher'必殺 'drain'ドレイン 'barrier'バリア
//           効果つきは { name, trigger, desc, effects, min(連携・コンボの回数), condition }
//             trigger: fanfare / constant / active / lastWord / onAttack / onEngage / combo / onEvolve / roundStart / allyTurnStart / link
// traits  : 特性(MPを使う) { id, name, cost, target, desc, effects, repeatable, condition }
//             target: self / allies / otherAllies / allyOne / enemies / enemyOne / enemyRandom / summons
// accelerate: { id, name, speed, cost, target, desc, effects }  本体とは別の速度で番が回る特性
// amulet  : true にすると、召喚物がアミュレット(スキル攻撃できない)になる(召喚するキャラの中で使う)
//
// ---- effects(効果)の種類 ----
//   { type:'damage', stat, mult, add, dmgType, target }
//   { type:'heal', stat:'atk'|'maxHp', mult, flat, target }
//   { type:'buff', stat, pct, flat, turns, target }   turns を省くと戦闘中ずっと
//   { type:'armor', stat, mult, flat, rate(吸収レート0.6〜1), target }   barrier: { type:'barrier', target }
//   { type:'advance', pct, target }   { type:'mp', amount }   { type:'ep', amount }
//   { type:'faith', amount }   { type:'graveyard', amount }(マイナスで消費)
//   { type:'summon', unit:{ キャラのデータ }, count }   { type:'crest', crest:{ name, passives, countdown } }
//   perGraveyard: 墓場1つにつき、効果が(heal/buff/armor/damageのadd)その分だけ増える
//   condition: { link, gauge, ultimate, liberation, faith, graveyard, hpBelow, hpAbove, evolved, crests }
//   target: self / opponent / allies / otherAllies / allyOne / enemies / enemyOne / enemyRandom / summons

export default {
  id: 'sample_001',
  name: '見本の剣士',
  class: 'ニュートラル',
  stats: { hp: 2000, atk: 500, def: 150, spd: 100 },
  skill: { name: '斬撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: ['rush'],
  traits: [
    {
      id: 'power_up', name: '気合', cost: 1, target: 'self', desc: 'このターン、攻撃力+40%',
      effects: [{ type: 'buff', stat: 'atk', pct: 40, turns: 1, target: 'self' }],
    },
  ],
}
