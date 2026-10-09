// Feel Battle - 動作テスト用の編成(本番のキャラではありません)
// testData.js のキャラに、進化・信仰値・クレスト・カウントダウン・コンボ・連携・奥義・アクセラレートの確認用キャラを足したものです。
import { TEST_CHARACTERS } from './testData.js'

// 信仰値とクレストの確認用: 「祈り」で信仰値を貯め、「聖印」でクレストを置く
const PRIEST = {
  id: 'test_15', name: 'テスト祈祷師', class: 'ニュートラル',
  stats: { hp: 1900, atk: 380, def: 130, spd: 96 },
  skill: { name: '祈りの光', stat: 'atk', type: 'physical', mult: 1.0 },
  traits: [
    {
      id: 'pray', name: '祈り', cost: 1, target: 'self', repeatable: true, desc: '信仰値+1(連続使用できる)',
      effects: [{ type: 'faith', amount: 1 }],
    },
    {
      id: 'seal', name: '聖印', cost: 1, target: 'self', condition: { faith: 2 },
      desc: '信仰値2以上で使える。信仰値を2使い、クレスト【守りの印】を置く',
      effects: [
        { type: 'faith', amount: -2 },
        {
          type: 'crest',
          crest: {
            name: '守りの印', countdown: 3, desc: '味方全員の防御力+20%。祈祷師のターン開始時に3→0まで減って消える',
            passives: [{ trigger: 'constant', target: 'allies', effects: [{ type: 'buff', stat: 'def', pct: 20 }] }],
          },
        },
      ],
    },
  ],
  passives: [
    {
      name: '加護の気配', trigger: 'onEvolve', desc: '進化時、味方全員を攻撃力の100%回復',
      effects: [{ type: 'heal', stat: 'atk', mult: 1.0, target: 'allies' }],
    },
  ],
}

// カウントダウンの確認用: 3回のターンで消える代わりに、強い
const FAMILIAR = {
  id: 'test_16', name: 'テスト使い魔', class: 'ニュートラル', countdown: 4, evolvable: false,
  stats: { hp: 1400, atk: 640, def: 90, spd: 118 },
  skill: { name: '爪撃', stat: 'atk', type: 'physical', mult: 1.1 },
  passives: [
    {
      name: '置き土産', trigger: 'lastWord', desc: '破壊されたとき、味方全員を回復',
      effects: [{ type: 'heal', flat: 300, target: 'otherAllies' }],
    },
  ],
}

// コンボの確認用: 味方の特性が使われた数を数える
const KNIGHT = {
  ...TEST_CHARACTERS.find((c) => c.id === 'test_09'),
  traits: [
    {
      id: 'inspire', name: '鼓舞', cost: 1, target: 'allies', desc: '味方全員の防御力+10%(2ターン)',
      effects: [{ type: 'buff', stat: 'def', pct: 10, turns: 2, target: 'allies' }],
    },
  ],
}
const COMBO_USER = {
  id: 'test_10', name: 'テスト連撃士', class: 'ニュートラル',
  stats: { hp: 1800, atk: 480, def: 130, spd: 112 },
  skill: { name: '連撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    {
      name: '連撃', trigger: 'combo', min: 1, desc: '味方が特性を1回使うと、次の自分のターン中、クリティカルダメージ+60',
      effects: [{ type: 'buff', stat: 'critDmg', flat: 60, turns: 1, target: 'self' }],
    },
  ],
}

// 連携・奥義・解放奥義の確認用
const FIGHTER = {
  id: 'test_17', name: 'テスト武闘家', class: 'ニュートラル',
  stats: { hp: 2300, atk: 500, def: 170, spd: 102 },
  skill: { name: '連打', stat: 'atk', type: 'physical', mult: 1.1 },
  passives: [
    {
      name: '連携_4', trigger: 'link', min: 4, desc: '味方がスキルを合計4回発動すると、味方全員の攻撃力+15%(戦闘中ずっと)',
      effects: [{ type: 'buff', stat: 'atk', pct: 15, target: 'allies' }],
    },
    {
      name: '奥義: 闘気', trigger: 'constant', condition: { ultimate: true }, desc: '奥義ゲージ10以上のとき、攻撃力+30%',
      effects: [{ type: 'buff', stat: 'atk', pct: 30 }],
    },
  ],
  traits: [
    {
      id: 'liberation', name: '解放奥義: 極大拳', cost: 3, target: 'enemyOne', condition: { liberation: true },
      desc: '奥義ゲージ15以上で使える。相手1体に攻撃力の250%のダメージ',
      effects: [{ type: 'damage', stat: 'atk', mult: 2.5, dmgType: 'physical', target: 'enemyOne' }],
    },
  ],
}

// アクセラレートの確認用: 本体とは別の速度(70)で番が回る特性
const STRIKER = {
  id: 'test_18', name: 'テスト追撃手', class: 'ニュートラル',
  stats: { hp: 1900, atk: 450, def: 150, spd: 100 },
  skill: { name: '射撃', stat: 'atk', type: 'physical', mult: 1.0 },
  accelerate: {
    id: 'pursuit', name: 'アクセラレート_70: 追撃', speed: 70, cost: 1, target: 'enemyOne',
    desc: '本体とは別の速度70で番が回る。相手1体に攻撃力の90%のダメージ。実行すると本体の番を消費する',
    effects: [{ type: 'damage', stat: 'atk', mult: 0.9, dmgType: 'physical', target: 'enemyOne' }],
  },
}

// ネメシス風: 使い魔を召喚する(召喚物フィールド・召喚物の確認用)
const SUMMONER = {
  id: 'test_19', name: 'テスト召喚師', class: 'ニュートラル', relic: 'ピエロの祝福',
  stats: { hp: 1700, atk: 380, def: 120, spd: 105 },
  skill: { name: '杖打ち', stat: 'atk', type: 'physical', mult: 1.0 },
  traits: [
    {
      id: 'call_imp', name: '使い魔召喚', cost: 2, target: 'self', desc: '使い魔を1体召喚する(召喚物フィールドは最大5体)',
      effects: [{
        type: 'summon', count: 1,
        unit: {
          id: 'imp', name: '使い魔', class: 'ニュートラル', stats: { hp: 600, atk: 260, def: 60, spd: 120 },
          skill: { name: 'ひっかき', stat: 'atk', type: 'physical', mult: 1.0 }, passives: [], traits: [],
        },
      }],
    },
  ],
}

// ビショップ風: アミュレット(スキル攻撃はできず、特性だけ使う)を設置する
const AMULETER = {
  id: 'test_20', name: 'テスト結界師', class: 'ニュートラル', relic: '少女の物語',
  stats: { hp: 1800, atk: 330, def: 140, spd: 95 },
  skill: { name: '祈りの一撃', stat: 'atk', type: 'physical', mult: 1.0 },
  traits: [
    {
      id: 'set_amulet', name: '護符設置', cost: 2, target: 'self', desc: '聖なる護符(アミュレット)を1つ設置する。護符は特性で味方全体を回復する',
      effects: [{
        type: 'summon', count: 1,
        unit: {
          id: 'amulet_heal', name: '聖なる護符', class: 'ニュートラル', amulet: true, countdown: 4,
          stats: { hp: 400, atk: 0, def: 0, spd: 100 },
          skill: { name: '-', stat: 'atk', type: 'physical', mult: 0 }, passives: [],
          traits: [{ id: 'bless', name: '祝福', cost: 1, target: 'allies', desc: '味方全体を150回復', effects: [{ type: 'heal', flat: 150, target: 'allies' }] }],
        },
      }],
    },
  ],
}

// ナイトメア風: 墓場が溜まるほど回復・強化できる
const NIGHTMARE = {
  id: 'test_21', name: 'テスト墓守', class: 'ニュートラル', relic: '鬼の形相',
  stats: { hp: 2000, atk: 400, def: 130, spd: 100 },
  skill: { name: '鎌の一閃', stat: 'atk', type: 'physical', mult: 1.0 },
  traits: [
    {
      id: 'feast', name: '墓場の饗宴', cost: 2, target: 'self', desc: '墓場が3以上のとき、墓場1つにつき120回復し、墓場を3つ消費する',
      condition: { graveyard: 3 },
      effects: [{ type: 'heal', flat: 0, perGraveyard: 120, target: 'self' }, { type: 'graveyard', amount: -3 }],
    },
    {
      id: 'grave_rage', name: '墓荒らし', cost: 1, target: 'self', desc: '墓場1つにつき攻撃力+5%(自分)',
      effects: [{ type: 'buff', stat: 'atk', pct: 0, perGraveyard: 5, turns: 2, target: 'self' }],
    },
  ],
}

export const ALL_TEST_CHARACTERS = [
  ...TEST_CHARACTERS.filter((c) => c.id !== 'test_09' && c.id !== 'test_10'),
  KNIGHT, COMBO_USER, PRIEST, FAMILIAR, FIGHTER, STRIKER, SUMMONER, AMULETER, NIGHTMARE,
]
const byId = (id) => ALL_TEST_CHARACTERS.find((c) => c.id === id)

// 標準の編成(自分側 / CPU側)
export const TEAM_PLAYER = ['test_17', 'test_18', 'test_19', 'test_20', 'test_21'].map(byId)
export const TEAM_CPU = ['test_06', 'test_09', 'test_10', 'test_15', 'test_16'].map(byId)
