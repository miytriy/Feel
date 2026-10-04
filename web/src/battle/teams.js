// Feel Battle - 動作テスト用の編成(本番のキャラではありません)
// testData.js のキャラに、進化・信仰値・クレスト・カウントダウン・コンボの確認用キャラを足したものです。
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

export const ALL_TEST_CHARACTERS = [
  ...TEST_CHARACTERS.filter((c) => c.id !== 'test_09' && c.id !== 'test_10'),
  KNIGHT, COMBO_USER, PRIEST, FAMILIAR,
]
const byId = (id) => ALL_TEST_CHARACTERS.find((c) => c.id === id)

// 標準の編成(自分側 / CPU側)
export const TEAM_PLAYER = ['test_01', 'test_03', 'test_04', 'test_15', 'test_16'].map(byId)
export const TEAM_CPU = ['test_06', 'test_07', 'test_08', 'test_09', 'test_10'].map(byId)
