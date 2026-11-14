import { useEffect, useRef, useState } from 'react'
import { useIsDesktop, C, FONT, DISPLAY, alpha } from './ui.js'
import { ScreenHeader } from './chrome.jsx'
import EffectGallery from './EffectGallery.jsx'
import { StatIcon } from './icons.jsx'
import { classElf, classRoyal, classNeutral, classWitch, classNemesis, classBishop, classNightmare, classDragon } from './classIcons.js'

// ルール説明(ユーザー向けの、かんたんな版): 「公式ルールブック(ユーザー用)」の章立て・数字に合わせてある。
// 戦闘処理の細かい規則は、別の「システム用ルールブック」にある。
// 動画(MP4・60fps)は、キーワードの盤面エフェクトのみ(public/rules/)。
// first=true のときは「はじめに」の見出しになり、いちばん下のボタンが「あそびはじめる」になる。

const M = (n) => `/rules/${n}`

// 章 = [章の題, [ [節の題, [[用語, 説明], ...] | 'KW1' ], ... ]]
const CHAPTERS = [
 [
  "第1章　ゲームの基本とカードの種類",
  [
   [
    "1-1　概要",
    [
     [
      "",
      "1対1で行う対戦ゲームです。自分のチームを率いて対戦し、勝利条件を満たしたプレイヤーが勝者となります。"
     ]
    ]
   ],
   [
    "1-2　ユニットの種類",
    [
     [
      "キャラクター",
      "体力や攻撃力などの基本ステータスを持つユニットです。"
     ],
     [
      "召喚物",
      "キャラクターの能力などでフィールドに呼び出される特殊なユニットです。"
     ],
     [
      "アミュレット",
      "召喚物の一種で、設置型のユニットです。体力・攻撃力を持たず、相手から攻撃対象に選ばれません。スキルは使えませんが、持っている能力で戦況を助けます。"
     ],
     [
      "スペル",
      "自分の好きなタイミングで唱えられる、使い切りの能力です。最大ストックは3個です。"
     ]
    ]
   ],
   [
    "1-3　クラス",
    [
     [
      "エルフ",
      "コンボをつなげて戦うクラス。"
     ],
     [
      "ロイヤル",
      "多くのユニットを展開して攻めるクラス。"
     ],
     [
      "ウィッチ",
      "多彩な魔法やトリッキーな能力が中心のクラス。"
     ],
     [
      "ドラゴン",
      "独自のエネルギー（MP）をためて戦うクラス。"
     ],
     [
      "ナイトメア",
      "墓場を使って戦うクラス。"
     ],
     [
      "ビショップ",
      "アミュレットの設置や体力回復で守りを固めるクラス。"
     ],
     [
      "ネメシス",
      "人形などの召喚物を大量に運用するクラス。"
     ],
     [
      "ニュートラル",
      "どのクラスの編成にも入れられる汎用クラス。"
     ]
    ]
   ]
  ]
 ],
 [
  "第2章　チーム編成とクラス特性",
  [
   [
    "2-1　編成ルール",
    [
     [
      "",
      "編成は、原則として同じクラスのユニットだけで組みます。ニュートラルだけは例外で、どのクラスの編成にも混ぜられます。"
     ]
    ]
   ],
   [
    "2-2　クラス特性",
    [
     [
      "",
      "編成の全ユニットを1つのクラスでそろえると、バトル中ずっと次の特性が働きます。"
     ],
     [
      "エルフ",
      "コンボリセットのターンの行動値が20%遅くなります。"
     ],
     [
      "ロイヤル",
      "自分のフィールドの全ユニットのスキルダメージが20%アップします。"
     ],
     [
      "ウィッチ",
      "スペルブーストと土の印の蓄積効率が25%アップします。"
     ],
     [
      "ドラゴン",
      "ラウンド1の最大MPの増加量が1アップします。"
     ],
     [
      "ナイトメア",
      "死者タイプのユニットが与えるダメージが29%アップします。"
     ],
     [
      "ビショップ",
      "自分のフィールドの全ユニットの防御力が18%アップします。"
     ],
     [
      "ネメシス",
      "人形タイプのユニットの体力が15%、速度が3%アップします。"
     ],
     [
      "ニュートラル",
      "受ける物理攻撃への耐性（物理耐性）が15%アップします。"
     ]
    ]
   ],
   [
    "2-3　その他の編成要素",
    [
     [
      "ローテーション",
      "ユニットに付いている、特定のピックアップ情報のことです。"
     ],
     [
      "「署名」キャラクター",
      "持っている同名キャラクターをまた獲得すると、代わりに「署名」キャラクターが相応の数もらえます。100個集めるごとにそのキャラクターを強化（限界突破）でき、全ステータスが10アップします。"
     ]
    ]
   ]
  ]
 ],
 [
  "第3章　ステータスと行動順",
  [
   [
    "3-1　基本ステータス",
    [
     [
      "体力（HP）",
      "生き残るための数値。0になると戦闘不能になり、すぐ墓場へ送られます。"
     ],
     [
      "アーマー",
      "体力の前にたまり、ダメージを肩代わりして吸収する耐久値です。"
     ],
     [
      "吸収レート",
      "アーマーが攻撃を受けたとき、吸収するダメージの量を表します。"
     ],
     [
      "攻撃力",
      "攻撃能力の基準値です。"
     ],
     [
      "防御力",
      "受けるダメージを減らすための基準値です。"
     ],
     [
      "速度",
      "高いほど、ターンが早く回ってきます。"
     ],
     [
      "クリティカルレート",
      "クリティカルダメージが出る確率です。初期値は5%です。"
     ],
     [
      "クリティカルダメージ",
      "クリティカルが出たときの、ダメージの増え幅です。初期値は50%です。"
     ],
     [
      "ダメージ耐性",
      "受けるすべてのダメージを、一定の割合で減らす特別な防御ステータスです。"
     ]
    ]
   ],
   [
    "3-2　行動レート",
    [
     [
      "",
      "バトル中、キャラクターの状態や配置によって、次にターンが回ってくる早さは常に変わります。この変化のもとになる補正を行動レートといい、次のルールで増減します。"
     ],
     [
      "減少HP補正",
      "最大HPから現在HPが10%減るごとに、行動レートが10%加算されます。"
     ],
     [
      "高ステータス補正",
      "現在の攻撃力と防御力のうち高いほうが100増えるごとに、行動レートが3%減算されます。"
     ],
     [
      "編成配置補正",
      "編成画面での配置（左から右）に応じて、10%、8%、5%、3%が加算されます。"
     ],
     [
      "入場順補正",
      "フィールドに入った順番に応じて、10%、8%、5%、3%が加算されます。"
     ],
     [
      "行動後補正",
      "自分のターンが終わると、行動レートが15%減算されます。"
     ]
    ]
   ]
  ]
 ],
 [
  "第4章　リソースとゲージ",
  [
   [
    "4-1　共有リソース",
    [
     [
      "MP（魔法ポイント）",
      "チーム全員で共有する、能力を使うための資源です。初期値は0で、ラウンドが進むたびに最大値が1上がり、現在値も全回復します。"
     ],
     [
      "EP（進化ポイント）",
      "キャラクターを進化させる資源です。最大ストックは2で、5ターン目に自分へ2個付与され、味方で共有します。"
     ],
     [
      "連携",
      "フィールドに出ているキャラクターと召喚物が、スキルを使った合計回数です。指定の値以上になると、さまざまな効果が働きます。"
     ],
     [
      "クレスト",
      "特別なエリアに最大5つまで置ける共通リソースです。同じ名前のクレストは重ねて置けません。"
     ],
     [
      "信仰値",
      "0から始まる、キャラクター固有のリソースです。たまり方はキャラクターごとに違い、たまった値はクレストと同じエリアに置かれます。"
     ]
    ]
   ],
   [
    "4-2　特殊なゲージとシステム",
    [
     [
      "奥義ゲージ",
      "経過ターン数と、自分の特性が発動した回数の合計でたまります。召喚物は奥義ゲージをためられません。"
     ],
     [
      "コンボシステム",
      "味方にコンボ能力を持つユニットが1体でもいると、タイムラインに「コンボリセット」という専用のターンが加わります。コンボ持ちが多いほど、コンボリセットのターンが回ってくる間隔が遅くなります。"
     ],
     [
      "スペルブースト",
      "スペルを使ったときにかかる効果です。スペルごとに別々にたまり、さまざまな能力に使われます。"
     ],
     [
      "スペルシステム",
      "スペルの編成数と同じ数のターンが過ぎるごとに、スペルが1つずつ順番に有効化（使う権利を獲得）されます。有効化の前でも、スペルブーストは受けられます。"
     ]
    ]
   ]
  ]
 ],
 [
  "第5章　バトルの進行と制限",
  [
   [
    "5-1　タイムラインとラウンド",
    [
     [
      "ターンの獲得",
      "速度をもとに決まる「行動値」という待ち時間が0になったユニットから、順番にターンを得て行動できます。",
      "「行動順アップ」(100%・50%・30%など、疾走も同じ)で行動値が0になっても、すでに行動値0で行動を待っているユニットを飛び越えることはできません。そのユニットの後ろに並びます。"
     ],
     [
      "ラウンド",
      "バトルは、行動値100という時間の区切りごとに、ラウンドとして進みます。"
     ]
    ]
   ],
   [
    "5-2　フィールドの制限",
    [
     [
      "入場制限",
      "自分のフィールドに出せるのは、キャラクター最大5体、アミュレットを含む召喚物は最大5体までです。"
     ],
     [
      "出場制限",
      "フィールドに出た最初のターンは、相手に対してスキルを使えません。ただし、自動で働くパッシブや特性は有効です。突進や疾走を持つユニットは、この制限を受けません。"
     ],
     [
      "破壊と消滅",
      "HPが0以下になるか、破壊の効果を受けると、フィールドから退場して墓場が増えます。攻撃されても墓場はたまります。一方、消滅はフィールドから直接取り除く処理で、墓場は増えません。"
     ]
    ]
   ]
  ]
 ],
 [
  "第6章　ダメージの計算",
  [
   [
    "6-1　ダメージを受ける順番",
    [
     [
      "",
      "ダメージを受けると、バリア → アーマー → 体力の順に減ります。バリアがあるときは、まずバリアが使われます。"
     ]
    ]
   ],
   [
    "6-2　アーマーの超過計算",
    [
     [
      "",
      "アーマーには防御力もダメージ耐性も効かず、いつも元のダメージを受けます。"
     ],
     [
      "手順1",
      "出たダメージを、アーマーが吸収する分（吸収レート分）と、HPに直接当たる分の2つに分けます。"
     ],
     [
      "手順2",
      "吸収する分がアーマーの残りより多いと、アーマーは壊れ、吸収しきれなかった分が超過ダメージになります。"
     ],
     [
      "手順3",
      "HPに直接当たる分と超過ダメージを足し、そこから相手の防御力とダメージ耐性で減らして、HPに入る最終ダメージを出します。"
     ]
    ]
   ],
   [
    "6-3　3つの攻撃属性",
    [
     [
      "物理ダメージ",
      "標準の攻撃属性。相手の防御力とダメージ耐性の影響を受けます。クリティカルが出ます。"
     ],
     [
      "魔法ダメージ",
      "相手の防御力を5%無視して計算します。防御力とダメージ耐性の影響を受け、アーマーには通常より15%多くダメージを与えます。クリティカルが出ます。"
     ],
     [
      "確定ダメージ",
      "相手の防御力を100%無視してHPを削ります。ダメージ耐性の影響は受け、アーマーに与えるダメージは元の50%に減ります。"
     ]
    ]
   ],
   [
    "6-4　ダメージの決まり方",
    [
     [
      "",
      "スキルのダメージは、キャラクターのステータス、技ごとの倍率（軌跡倍率）、上乗せのボーナスで基本の値が決まります。そこにクリティカル、防御の係数、耐性が加わって、最終的な数値が決まり、その分のダメージが与えられます。"
     ]
    ]
   ]
  ]
 ],
 [
  "第7章　能力の種類",
  [
   [
    "",
    [
     [
      "",
      "このゲームの「能力」は、自動で働く「パッシブ」と、特定の条件で働く「特性」の2つです。自分で使う「スキル」は能力に入りません。"
     ]
    ]
   ],
   [
    "7-1　クラス能力",
    [
     [
      "コンボ",
      "同じターン中に味方の特性が働いた回数を数え、指定の値以上になると効果が発動します。コンボ数はユニットではなくプレイヤー自身に蓄積し、コンボリセットのターンで0に戻ります。"
     ],
     [
      "連携",
      "フィールドに出ているキャラクターと召喚物が、スキルを使った合計回数です。指定の値以上になると、さまざまな効果が働きます。"
     ],
     [
      "スペルブースト",
      "スペルを使ったときにかかる効果です。スペルごとに別々にたまり、さまざまな能力に使われます。"
     ],
     [
      "土の秘術",
      "【土の秘術_N】は、土の印をN個消費して働く能力です。土の印が足りないときは働きません。"
     ],
     [
      "土の印",
      "土の印アミュレットの中に、数としてたまります。自分の場の土の印の数は合算され、土の秘術で消費されます。能力で破壊できず、相手の能力では選ばれません。"
     ],
     [
      "覚醒",
      "自分のMP最大値が7以上のときに強くなる能力です。"
     ],
     [
      "ネクロマンス",
      "【ネクロマンス_N】は、墓場をN消費して働く能力です。墓場が足りないときは働きません。"
     ],
     [
      "リアニメイト",
      "【リアニメイト_N】は、自分の倒れた(消滅していない)キャラクター・召喚物のうち、速度がNのものからランダムに1体を蘇生します。蘇生できるものがいないときは何も起きません。"
     ]
    ]
   ],
   [
    "7-2　ユニットかアミュレットが持つ能力",
    "KW1"
   ],
   [
    "7-3　特定のタイミングで働く能力",
    [
     [
      "ファンファーレ",
      "ユニットがフィールドに入ったターンの開始時に発動します。"
     ],
     [
      "ラストワード",
      "破壊されてフィールドから退場した瞬間に発動します。"
     ],
     [
      "進化時",
      "EPを使って進化したときに、専用の進化時の能力が発動します。進化前のキャラクターは「進化」でき、「攻撃力・体力+200、【突進】を獲得する」が起こります。"
     ],
     [
      "攻撃時",
      "相手を攻撃する瞬間に発動します。"
     ],
     [
      "交戦時",
      "相手を攻撃する瞬間、または相手から攻撃される瞬間に発動します。"
     ],
     [
      "エンハンス",
      "【エンハンス_N】は、自分のターンにボタンを押し、MPをN消費して発動する能力です。"
     ],
     [
      "アクセラレート",
      "本体とは別の速度を持つ特性で、本体と同時にアクションバーに表示されます。実行すると本体の行動ターンを使い、予定されていた本体の行動はなくなります。"
     ],
     [
      "結晶",
      "(説明は準備中です)"
     ],
     [
      "モード",
      "発動すると、複数の選択肢から1つを選んで、その能力が働きます。"
     ],
     [
      "融合",
      "(説明は準備中です)"
     ],
     [
      "アクト",
      "1ターンに1回、専用のボタンを押して発動する能力です。コストが決まっているときは、味方で共有するMPを使います。"
     ],
     [
      "クレスト",
      "特別なエリアに最大5つまで置ける共通リソースです。同じ名前のクレストは重ねて置けません。カウントダウンを持つものもあります。"
     ],
     [
      "信仰",
      "0から始まる、キャラクター固有のリソースです。たまり方はキャラクターごとに違い、たまった値はクレストと同じエリアに置かれます。"
     ],
     [
      "奥義",
      "奥義ゲージが10以上のときに使える能力です。【解放奥義】は、奥義ゲージが15以上のときに使える能力です。"
     ]
    ]
   ]
  ]
 ],
 [
  "第8章　ウィッチ専用：「土の印」",
  [
   [
    "",
    [
     [
      "",
      "ウィッチなどが使う「土の印」は、フィールドにある土の印アミュレットの中に、数としてたまります。土の印アミュレットは能力で選ばれず、相手から攻撃もされません。"
     ],
     [
      "0になったとき",
      "土の印の数が0になった（または最初から0の）ときは、その土の印アミュレットは自動で消えます。"
     ],
     [
      "回復したとき",
      "土の印を回復する効果が働くと、その数は今あるアミュレットに直接足されます。"
     ]
    ]
   ]
  ]
 ],
 [
  "第9章　エフェクト一覧（実際の動き）",
  [
   [
    "",
    'FX'
   ]
  ]
 ]
]

// 7-2 の能力: [名前, 説明, 'GIFファイル|キャプション' | null]
const KW1 = [
 [
  "疾走",
  "場に出た最初のターンでも、すぐにスキルを使えます。さらにラウンド開始時に行動順が100%引き上がり、通常の順番を無視して最優先でターンが回ります。",
  null
 ],
 [
  "突進",
  "場に出た最初のターンでも、すぐにスキルを使えます。行動順は自分の速度どおりです。",
  null
 ],
 [
  "守護",
  "この能力を持つユニットがいると、相手は守護を持たないユニットを攻撃対象に選べません。",
  "guard.mp4|盤面: 緑の盾"
 ],
 [
  "必殺",
  "スキルでダメージを与えるとき、ターゲットに最大HPの15%分の確定ダメージを追撃で与えます。ターゲットが召喚物なら、この効果は変わり、ターゲットを破壊します。",
  null
 ],
 [
  "潜伏",
  "相手の特性の対象に選ばれず、攻撃も受けない状態です。自分が攻撃するか、能力でダメージを与えると解除されます。",
  "stealth.mp4|盤面: 灰色のもや"
 ],
 [
  "ドレイン",
  "スキルで与えたダメージと同じ数値だけ、自分のHPを回復します。",
  null
 ],
 [
  "カウントダウン",
  "【カウントダウン_N】は、カウントがNから始まり、持ち主のターンが来るたびに1ずつ減ります。0になると、能力が働いたり、破壊されたりします。",
  null
 ],
 [
  "威圧",
  "相手のスキルの対象に選ばれません。",
  "intimidate.mp4|盤面: ◇の黄緑の光"
 ],
 [
  "オーラ",
  "相手の能力（パッシブ・特性）の対象に選ばれません。",
  "aura.mp4|盤面: ◇が順に光る"
 ],
 [
  "バリア",
  "相手からの攻撃を1回だけ0ダメージにします。そのあと、バリアは壊れます。",
  "barrier.mp4|盤面: 水色の円"
 ],
 [
  "直接召喚",
  "(説明は準備中です)",
  null
 ],
 [
  "証拠",
  "(説明は準備中です)",
  null
 ]
]


// ---- 見た目(読んでいて楽しい版)。動かすのは transform / opacity だけ(web/EFFECTS.md)----
const HUES = ['#e8c800', '#ff7a45', '#4d9dff', '#37d2a0', '#b07cff', '#ff5c8a', '#4fd6ee', '#8fd14f', '#f2a93b'] // 章ごとの色
const chapterInfo = (title) => { const m = String(title).match(/^第(\d+)章[\s　]*(.*)$/); return m ? { n: m[1], name: m[2] } : { n: '', name: title } }

const CSS = `
.rl { position: relative; min-height: 100vh; background: ${C.paper}; color: ${C.ink}; font-family: ${FONT}; overflow-x: hidden }
.rl-progress { position: fixed; left: 0; right: 0; top: 0; height: 3px; z-index: 40; transform-origin: left; transform: scaleX(0); background: linear-gradient(90deg, #e8c800, #ff7a45, #b07cff, #4fd6ee); will-change: transform }
.rl-hero { position: relative; overflow: hidden; border-radius: 16px; padding: 26px 20px 22px; margin-bottom: 16px; color: #fff4c8; background: radial-gradient(ellipse at 80% 20%, #4a3d1a 0%, #1a1712 55%, #0c0b0e 100%); border: 1px solid ${alpha('#e8c800', 35)}; animation: rl-up .5s ease-out backwards }
.rl-hero h1 { position: relative; margin: 0 0 6px; font-family: ${DISPLAY}; font-size: 30px; letter-spacing: .1em; font-weight: 800 }
.rl-hero p { position: relative; margin: 0; font-size: 13.5px; line-height: 1.7; color: #e6dcb5 }
.rl-hero .beam { position: absolute; top: -20%; height: 140%; width: 90px; background: #e8c800; opacity: .08; transform: skewX(-24deg); will-change: transform; animation: rl-beam 8s ease-in-out infinite alternate }
.rl-hero .beam.b2 { width: 16px; opacity: .22; animation-duration: 6s; animation-delay: -2s }
.rl-hero .mote { position: absolute; bottom: -8px; width: 4px; height: 4px; border-radius: 50%; background: #ffe58a; opacity: 0; will-change: transform, opacity; animation: rl-rise var(--d, 7s) var(--dl, 0s) linear infinite }
.rl-hero .mote.b { background: #8fd4ff }
@keyframes rl-beam { from { transform: skewX(-24deg) translateX(-30px) } to { transform: skewX(-24deg) translateX(50px) } }
@keyframes rl-rise { 0% { transform: translateY(0) scale(.6); opacity: 0 } 15% { opacity: .9 } 100% { transform: translateY(-190px) translateX(var(--dx, 20px)) scale(1.2); opacity: 0 } }
@keyframes rl-up { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: none } }
.rl-toc { background: ${C.card}; border: 1px solid ${C.line}; border-radius: 14px; padding: 12px; margin-bottom: 16px; animation: rl-up .5s .08s ease-out backwards }
.rl-toc > button { background: none; border: none; font-family: ${FONT}; font-size: 15px; font-weight: 800; color: ${C.ink}; cursor: pointer; padding: 0; width: 100%; text-align: left; display: flex; justify-content: space-between }
.rl-toc ol { margin: 10px 0 0; padding: 0; list-style: none; display: grid; gap: 8px; grid-template-columns: 1fr }
.rl-chip { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px; border-radius: 10px; border: 1px solid ${C.line}; background: ${C.paper}; color: ${C.ink}; font-family: ${FONT}; font-size: 13.5px; text-align: left; cursor: pointer; transition: transform .16s ease-out; animation: rl-up .45s var(--i, 0ms) ease-out backwards }
.rl-chip:hover { transform: translateY(-2px) }
.rl-chip:active { transform: scale(.98) }
.rl-chip .num { flex: 0 0 auto; width: 28px; height: 28px; display: grid; place-items: center; border-radius: 50%; font-family: ${DISPLAY}; font-weight: 800; font-size: 14px; color: #1b1500; background: var(--h) }
.rl-ch { position: relative; border-radius: 16px; margin-bottom: 18px; background: ${C.card}; border: 1px solid ${C.line}; overflow: hidden; scroll-margin-top: 56px }
.rl-ch.pre { opacity: 0; transform: translateY(26px) }
.rl-ch.in { opacity: 1; transform: none; transition: opacity .55s ease-out, transform .55s cubic-bezier(.2, .8, .2, 1) }
.rl-ch-head { position: relative; display: flex; align-items: center; gap: 14px; padding: 16px 16px 14px; background: linear-gradient(100deg, ${alpha('var(--h)', 30)}, ${alpha('var(--h)', 4)} 70%); border-bottom: 1px solid ${alpha('var(--h)', 40)} }
.rl-ch-head::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; background: linear-gradient(90deg, var(--h), transparent); transform-origin: left; transform: scaleX(0); transition: transform .9s .25s cubic-bezier(.2, .8, .2, 1) }
.rl-ch.in .rl-ch-head::after { transform: scaleX(1) }
.rl-badge { position: relative; flex: 0 0 auto; width: 52px; height: 52px; display: grid; place-items: center; font-family: ${DISPLAY}; font-weight: 800; font-size: 26px; color: #1b1500; background: linear-gradient(160deg, #fff, var(--h) 55%); clip-path: polygon(50% 0, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%) }
.rl-ch.in .rl-badge { animation: rl-pop .7s .15s cubic-bezier(.2, 1.3, .4, 1) backwards }
@keyframes rl-pop { from { opacity: 0; transform: scale(.4) rotate(-30deg) } to { opacity: 1; transform: none } }
.rl-ch-head small { display: block; font-size: 10.5px; font-weight: 800; letter-spacing: .22em; color: var(--h); filter: none }
.rl-ch-head h2 { margin: 2px 0 0; font-size: 18px; line-height: 1.35 }
.rl-body { padding: 4px 16px 16px }
.rl-sec { display: flex; align-items: center; gap: 8px; margin: 20px 0 6px; font-size: 15px; font-weight: 800 }
.rl-sec::before { content: ''; flex: 0 0 auto; width: 10px; height: 10px; background: var(--h); transform: rotate(45deg) }
.rl-sec::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, ${alpha('var(--h)', 55)}, transparent) }
.rl-item { margin: 8px 0; font-size: 14px; line-height: 1.85; padding: 6px 10px; border-radius: 8px; border-left: 3px solid transparent; transition: transform .16s ease-out }
.rl-item:hover { transform: translateX(3px) }
.rl-item.t { border-left-color: ${alpha('var(--h)', 70)}; background: ${alpha('var(--h)', 7)} }
.rl-term { display: inline-block; margin-right: 8px; padding: 0 10px; border-radius: 999px; font-weight: 800; font-size: 13px; line-height: 1.7; color: #1b1500; background: var(--h) }
.rl-kw { display: flex; gap: 10px; padding: 10px; border-radius: 10px; align-items: center; background: ${C.paper}; border: 1px solid ${C.line}; transition: transform .18s ease-out }
.rl-kw:hover { transform: translateY(-3px) }
.rl-kw b { color: var(--h) }
.rl-top { position: fixed; right: 14px; bottom: calc(18px + env(safe-area-inset-bottom)); z-index: 30; width: 46px; height: 46px; border-radius: 50%; border: 2px solid #d8b85a; background: ${C.card}; color: ${C.ink}; font-size: 20px; cursor: pointer; opacity: 0; transform: translateY(14px) scale(.8); pointer-events: none; transition: opacity .25s, transform .25s }
.rl-top.on { opacity: 1; transform: none; pointer-events: auto }
.rl-go { position: relative; width: 100%; margin-top: 8px; padding: 16px; border-radius: 14px; border: none; background: ${C.player}; color: ${C.onAccent}; font-family: ${FONT}; font-weight: 800; font-size: 18px; cursor: pointer; overflow: hidden; animation: rl-breathe 2.4s ease-in-out infinite; will-change: transform }
.rl-go::after { content: ''; position: absolute; top: 0; bottom: 0; left: 0; width: 30%; background: linear-gradient(105deg, rgba(255,255,255,0), rgba(255,255,255,.5), rgba(255,255,255,0)); transform: translateX(-200%) skewX(-18deg); animation: rl-sweep 3s 1s ease-in-out infinite }
@keyframes rl-breathe { 0%, 100% { transform: scale(1) } 50% { transform: scale(1.02) } }
@keyframes rl-sweep { 0% { transform: translateX(-200%) skewX(-18deg) } 45%, 100% { transform: translateX(500%) skewX(-18deg) } }
@media (min-width: 900px) { .rl-toc ol { grid-template-columns: 1fr 1fr } .rl-hero h1 { font-size: 38px } .rl-hero { padding: 34px 28px 28px } }
@media (prefers-reduced-motion: reduce) { .rl *, .rl-top { animation-duration: .01s !important; animation-iteration-count: 1 !important; transition-duration: .01s !important } .rl-ch.pre { opacity: 1; transform: none } }
`

// 文章の中の、クラス名とステータス名(体力・攻撃力など)に、アイコンをつける
const CLASS_ICON = { 'エルフ': classElf, 'ロイヤル': classRoyal, 'ニュートラル': classNeutral, 'ウィッチ': classWitch, 'ネメシス': classNemesis, 'ビショップ': classBishop, 'ナイトメア': classNightmare, 'ドラゴン': classDragon }
const STAT_KEY = { '体力': 'hp', '攻撃力': 'atk', '防御力': 'def', '速度': 'spd', '魔力': 'mag', 'クリティカル率': 'critRate', 'クリティカルレート': 'critRate', 'ダメージ耐性': 'dmgResist', 'クリティカルダメージ': 'critDmg' }
const ICON_RE = new RegExp(`(${[...Object.keys(CLASS_ICON), ...Object.keys(STAT_KEY)].sort((a, b) => b.length - a.length).join('|')})`)
function Rich({ children, big = false }) {
  if (typeof children !== 'string') return children
  const sz = big ? '1.5em' : '1.15em'
  return children.split(ICON_RE).map((part, i) => {
    if (CLASS_ICON[part]) return <span key={i} style={{ whiteSpace: 'nowrap' }}><img src={CLASS_ICON[part]} alt="" draggable={false} style={{ height: sz, width: sz, objectFit: 'contain', verticalAlign: '-0.28em', marginRight: 3 }} />{part}</span>
    if (STAT_KEY[part]) return <span key={i} style={{ whiteSpace: 'nowrap' }}><StatIcon stat={STAT_KEY[part]} style={{ width: '1.05em', height: '1.05em', verticalAlign: '-0.18em', marginRight: 2 }} />{part}</span>
    return part
  })
}

const Item = ({ term, text }) => (
  <div className={`rl-item${term ? ' t' : ''}`}>
    {term ? <><span className="rl-term"><Rich big>{term}</Rich></span><Rich>{text}</Rich></> : <Rich>{text}</Rich>}
  </div>
)

function KeywordGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
      {KW1.map(([name, text, media]) => {
        const [file, cap] = media ? media.split('|') : []
        return (
          <div key={name} className="rl-kw">
            {file && <video src={M(file)} aria-label={`【${name}】${cap}`} autoPlay loop muted playsInline preload="metadata" width={96} height={96} style={{ flex: '0 0 auto', borderRadius: 8, objectFit: 'cover', background: '#0b0b0e' }} />}
            <div style={{ fontSize: 13, lineHeight: 1.7 }}>
              <b>【{name}】</b>　{text}
              {cap && <div style={{ fontSize: 11, color: C.mute }}>{cap}</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const MOTES = Array.from({ length: 10 }, (_, i) => ({ x: (i * 41 + 9) % 95 + 2, d: 6 + (i * 3) % 5, dl: -((i * 2.3) % 8), dx: ((i * 23) % 50) - 25 }))

export default function RulesScreen({ onExit, first = false }) {
  const desktop = useIsDesktop()
  const refs = useRef({})
  const barRef = useRef(null)
  const [toc, setToc] = useState(false)
  const [topOn, setTopOn] = useState(false)
  const jump = (i) => refs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  // 読んだ量のバー(transform だけ)と、「上へ」ボタン。スクロールの親は画面全体(window)
  useEffect(() => {
    let raf = 0
    const on = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const h = document.documentElement
        const max = Math.max(1, h.scrollHeight - window.innerHeight)
        if (barRef.current) barRef.current.style.transform = `scaleX(${Math.min(1, window.scrollY / max)})`
        setTopOn(window.scrollY > 600)
      })
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => { window.removeEventListener('scroll', on); if (raf) cancelAnimationFrame(raf) }
  }, [])
  // 章は、画面に入ったときにふわっと現れる(IntersectionObserver が使えない端末では、最初から見える)
  useEffect(() => {
    const els = Object.values(refs.current).filter(Boolean)
    if (typeof IntersectionObserver === 'undefined') { els.forEach((el) => el.classList.add('in')); return }
    els.forEach((el) => el.classList.add('pre'))
    const io = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) { e.target.classList.remove('pre'); e.target.classList.add('in'); io.unobserve(e.target) } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.04 })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
  return (
    <div className="rl" style={{ padding: desktop ? 24 : 12 }}>
      <style>{CSS}</style>
      <div className="rl-progress" ref={barRef} aria-hidden="true" />
      <div style={{ margin: desktop ? '-24px -24px 16px' : '-12px -12px 12px' }}><ScreenHeader title={first ? 'はじめに' : 'ルール'} onClose={onExit} /></div>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <header className="rl-hero">
          <span className="beam" style={{ right: '6%' }} /><span className="beam b2" style={{ right: '16%' }} />
          {MOTES.map((m, i) => <span key={i} className={`mote${i % 3 === 2 ? ' b' : ''}`} style={{ left: `${m.x}%`, '--d': `${m.d}s`, '--dl': `${m.dl}s`, '--dx': `${m.dx}px` }} />)}
          <h1>{first ? 'はじめに' : 'ルールブック'}</h1>
          <p>{first ? 'まずは第1章〜第5章を読めば遊べます。' : '知りたい章を、目次から探してください。'}<br />動くエフェクトは、第9章でそのまま見られます。</p>
        </header>
        <div className="rl-toc">
          <button onClick={() => setToc((v) => !v)}><span>目次</span><span style={{ color: C.mute }}>{toc || desktop ? '▲' : '▼'}</span></button>
          {(toc || desktop) && (
            <ol>
              {CHAPTERS.map(([title], i) => {
                const { n, name } = chapterInfo(title)
                return <li key={title}><button className="rl-chip" style={{ '--h': HUES[i % HUES.length], '--i': `${i * 40}ms` }} onClick={() => jump(i)}><span className="num">{n}</span>{name}</button></li>
              })}
            </ol>
          )}
        </div>
        {CHAPTERS.map(([title, secs], i) => {
          const { n, name } = chapterInfo(title)
          return (
            <section key={title} ref={(el) => { refs.current[i] = el }} className="rl-ch" style={{ '--h': HUES[i % HUES.length] }}>
              <div className="rl-ch-head">
                <div className="rl-badge">{n}</div>
                <div><small>CHAPTER {n}</small><h2>{name}</h2></div>
              </div>
              <div className="rl-body">
                {secs.map(([st, items], k) => (
                  <div key={k}>
                    {st && <h3 className="rl-sec">{st}</h3>}
                    {items === 'KW1' ? <KeywordGrid /> : items === 'FX' ? <EffectGallery /> : items.map(([t, x], j) => <Item key={j} term={t} text={x} />)}
                  </div>
                ))}
              </div>
            </section>
          )
        })}
        {first && <button className="rl-go" onClick={onExit}>あそびはじめる</button>}
      </div>
      <button type="button" className={`rl-top${topOn ? ' on' : ''}`} aria-label="いちばん上へ" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>↑</button>
    </div>
  )
}
