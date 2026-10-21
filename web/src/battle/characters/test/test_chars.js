// テスト用の仮キャラ21体(本番のキャラではありません)。仮キャラは、まとめて1ファイルにしてあります。
// 本番のキャラは、1体につき1ファイル(キャラのid.js)で作ります。
export default [
  {
    id: 'test_01',
    name: 'テスト剣士',
    class: 'ニュートラル',
    stats: { hp: 2200, atk: 520, def: 180, spd: 100 },
    skill: { name: '斬撃', stat: 'atk', type: 'physical', mult: 1.2 }
  },
  {
    id: 'test_02',
    name: 'テスト魔導士',
    class: 'ニュートラル',
    stats: { hp: 1600, atk: 900, def: 100, spd: 95 },
    skill: { name: '火球', stat: 'mag', type: 'magic', mult: 1.4 },
    traits: [
      {
        id: 'focus',
        name: '詠唱強化',
        cost: 1,
        target: 'self',
        desc: 'このターン、攻撃力+40%',
        effects: [ { type: 'buff', stat: 'atk', pct: 40, turns: 1, target: 'self' } ]
      }
    ]
  },
  {
    id: 'test_03',
    name: 'テスト盾兵',
    class: 'ニュートラル',
    stats: { hp: 3000, atk: 300, def: 340, spd: 85 },
    skill: { name: '盾打ち', stat: 'atk', type: 'physical', mult: 1 },
    passives: [
      'guard',
      {
        name: '堅牢',
        trigger: 'constant',
        desc: '防御力+10%',
        effects: [ { type: 'buff', stat: 'def', pct: 10 } ]
      }
    ]
  },
  {
    id: 'test_04',
    name: 'テスト僧侶',
    class: 'ニュートラル',
    stats: { hp: 1800, atk: 350, def: 120, spd: 98 },
    skill: { name: '杖打ち', stat: 'atk', type: 'physical', mult: 1 },
    traits: [
      {
        id: 'heal',
        name: '癒しの光',
        cost: 2,
        target: 'allyOne',
        desc: '味方1体を攻撃力の150%回復',
        effects: [ { type: 'heal', stat: 'atk', mult: 1.5, target: 'allyOne' } ]
      },
      {
        id: 'bless',
        name: '祝福',
        cost: 3,
        target: 'allies',
        desc: '味方全員の攻撃力+20%(2ターン)',
        effects: [ { type: 'buff', stat: 'atk', pct: 20, turns: 2, target: 'allies' } ]
      }
    ]
  },
  {
    id: 'test_05',
    name: 'テスト疾走兵',
    class: 'ニュートラル',
    stats: { hp: 1700, atk: 430, def: 130, spd: 70 },
    skill: { name: '疾走斬り', stat: 'atk', type: 'physical', mult: 1 },
    passives: [ 'dash' ]
  },
  {
    id: 'test_06',
    name: 'テスト暗殺者',
    class: 'ニュートラル',
    stats: { hp: 1500, atk: 520, def: 90, spd: 135 },
    skill: { name: '急所突き', stat: 'atk', type: 'physical', mult: 0.9 },
    passives: [ 'stealth', 'finisher' ]
  },
  {
    id: 'test_07',
    name: 'テスト吸血鬼',
    class: 'ニュートラル',
    stats: { hp: 1900, atk: 470, def: 140, spd: 105 },
    skill: { name: '吸血', stat: 'atk', type: 'physical', mult: 1 },
    passives: [ 'drain' ]
  },
  {
    id: 'test_08',
    name: 'テスト爆弾兵',
    class: 'ニュートラル',
    stats: { hp: 1300, atk: 380, def: 100, spd: 110 },
    skill: { name: '爆裂弾', stat: 'atk', type: 'physical', mult: 1.1 },
    passives: [
      {
        name: '自爆',
        trigger: 'lastWord',
        desc: '倒されたとき、相手全体に攻撃力の80%の確定ダメージ',
        effects: [ { type: 'damage', stat: 'atk', mult: 0.8, dmgType: 'true', target: 'enemies' } ]
      }
    ]
  },
  {
    id: 'test_11',
    name: 'テスト突撃兵',
    class: 'ニュートラル',
    stats: { hp: 2000, atk: 500, def: 150, spd: 105 },
    skill: { name: '突撃', stat: 'atk', type: 'physical', mult: 1.1 },
    passives: [ 'rush' ]
  },
  {
    id: 'test_12',
    name: 'テスト守護者',
    class: 'ニュートラル',
    stats: { hp: 2600, atk: 330, def: 280, spd: 88 },
    skill: { name: '防壁', stat: 'atk', type: 'physical', mult: 1 },
    passives: [ 'guard', 'barrier' ]
  },
  {
    id: 'test_13',
    name: 'テスト幻影',
    class: 'ニュートラル',
    stats: { hp: 1700, atk: 450, def: 120, spd: 108 },
    skill: { name: '幻撃', stat: 'atk', type: 'physical', mult: 1 },
    passives: [ 'aura' ]
  },
  {
    id: 'test_14',
    name: 'テスト威圧兵',
    class: 'ニュートラル',
    stats: { hp: 1900, atk: 440, def: 140, spd: 100 },
    skill: { name: '威圧斬り', stat: 'atk', type: 'physical', mult: 1 },
    passives: [ 'intimidate' ]
  },
  {
    id: 'test_09',
    name: 'テスト騎士',
    class: 'ニュートラル',
    stats: { hp: 2400, atk: 430, def: 220, spd: 92 },
    skill: { name: '騎士剣', stat: 'atk', type: 'physical', mult: 1.1 },
    passives: [
      {
        name: '加護',
        trigger: 'fanfare',
        desc: '最初のターン開始時、最大HPの30%のアーマーを得る',
        effects: [ { type: 'armor', stat: 'maxHp', mult: 0.3, rate: 1, target: 'self' } ]
      },
      {
        name: '受け流し',
        trigger: 'onEngage',
        desc: '交戦時、防御力+30%(1ターン)',
        effects: [ { type: 'buff', stat: 'def', pct: 30, turns: 1, target: 'self' } ]
      }
    ],
    traits: [
      {
        id: 'inspire',
        name: '鼓舞',
        cost: 1,
        target: 'allies',
        desc: '味方全員の防御力+10%(2ターン)',
        effects: [ { type: 'buff', stat: 'def', pct: 10, turns: 2, target: 'allies' } ]
      }
    ]
  },
  {
    id: 'test_10',
    name: 'テスト連撃士',
    class: 'ニュートラル',
    stats: { hp: 1800, atk: 480, def: 130, spd: 112 },
    skill: { name: '連撃', stat: 'atk', type: 'physical', mult: 1 },
    passives: [
      {
        name: '連撃',
        trigger: 'combo',
        min: 1,
        desc: '味方が特性を1回使うと、次の自分のターン中、クリティカルダメージ+60',
        effects: [ { type: 'buff', stat: 'critDmg', flat: 60, turns: 1, target: 'self' } ]
      }
    ]
  },
  {
    id: 'test_15',
    name: 'テスト祈祷師',
    class: 'ニュートラル',
    stats: { hp: 1900, atk: 380, def: 130, spd: 96 },
    skill: { name: '祈りの光', stat: 'atk', type: 'physical', mult: 1 },
    traits: [
      {
        id: 'pray',
        name: '祈り',
        cost: 1,
        target: 'self',
        repeatable: true,
        desc: '信仰値+1(連続使用できる)',
        effects: [ { type: 'faith', amount: 1 } ]
      },
      {
        id: 'seal',
        name: '聖印',
        cost: 1,
        target: 'self',
        condition: { faith: 2 },
        desc: '信仰値2以上で使える。信仰値を2使い、クレスト【守りの印】を置く',
        effects: [
          { type: 'faith', amount: -2 },
          {
            type: 'crest',
            crest: {
              name: '守りの印',
              countdown: 3,
              desc: '味方全員の防御力+20%。祈祷師のターン開始時に3→0まで減って消える',
              passives: [
                {
                  trigger: 'constant',
                  target: 'allies',
                  effects: [ { type: 'buff', stat: 'def', pct: 20 } ]
                }
              ]
            }
          }
        ]
      }
    ],
    passives: [
      {
        name: '加護の気配',
        trigger: 'onEvolve',
        desc: '進化時、味方全員を攻撃力の100%回復',
        effects: [ { type: 'heal', stat: 'atk', mult: 1, target: 'allies' } ]
      }
    ]
  },
  {
    id: 'test_16',
    name: 'テスト使い魔',
    class: 'ニュートラル',
    countdown: 4,
    evolvable: false,
    stats: { hp: 1400, atk: 640, def: 90, spd: 118 },
    skill: { name: '爪撃', stat: 'atk', type: 'physical', mult: 1.1 },
    passives: [
      {
        name: '置き土産',
        trigger: 'lastWord',
        desc: '破壊されたとき、味方全員を回復',
        effects: [ { type: 'heal', flat: 300, target: 'otherAllies' } ]
      }
    ]
  },
  {
    id: 'test_17',
    name: 'テスト武闘家',
    class: 'ニュートラル',
    stats: { hp: 2300, atk: 500, def: 170, spd: 102 },
    skill: { name: '連打', stat: 'atk', type: 'physical', mult: 1.1 },
    passives: [
      {
        name: '連携_4',
        trigger: 'link',
        min: 4,
        desc: '味方がスキルを合計4回発動すると、味方全員の攻撃力+15%(戦闘中ずっと)',
        effects: [ { type: 'buff', stat: 'atk', pct: 15, target: 'allies' } ]
      },
      {
        name: '奥義: 闘気',
        trigger: 'constant',
        condition: { ultimate: true },
        desc: '奥義ゲージ10以上のとき、攻撃力+30%',
        effects: [ { type: 'buff', stat: 'atk', pct: 30 } ]
      }
    ],
    traits: [
      {
        id: 'liberation',
        name: '解放奥義: 極大拳',
        cost: 3,
        target: 'enemyOne',
        condition: { liberation: true },
        desc: '奥義ゲージ15以上で使える。相手1体に攻撃力の250%のダメージ',
        effects: [ { type: 'damage', stat: 'atk', mult: 2.5, dmgType: 'physical', target: 'enemyOne' } ]
      }
    ]
  },
  {
    id: 'test_18',
    name: 'テスト追撃手',
    class: 'ニュートラル',
    stats: { hp: 1900, atk: 450, def: 150, spd: 100 },
    skill: { name: '射撃', stat: 'atk', type: 'physical', mult: 1 },
    accelerate: {
      id: 'pursuit',
      name: 'アクセラレート_70: 追撃',
      speed: 70,
      cost: 1,
      target: 'enemyOne',
      desc: '本体とは別の速度70で番が回る。相手1体に攻撃力の90%のダメージ。実行すると本体の番を消費する',
      effects: [ { type: 'damage', stat: 'atk', mult: 0.9, dmgType: 'physical', target: 'enemyOne' } ]
    }
  },
  {
    id: 'test_19',
    name: 'テスト召喚師',
    class: 'ニュートラル',
    relic: 'ピエロの祝福',
    stats: { hp: 1700, atk: 380, def: 120, spd: 105 },
    skill: { name: '杖打ち', stat: 'atk', type: 'physical', mult: 1 },
    traits: [
      {
        id: 'call_imp',
        name: '使い魔召喚',
        cost: 2,
        target: 'self',
        desc: '使い魔を1体召喚する(召喚物フィールドは最大5体)',
        effects: [
          {
            type: 'summon',
            count: 1,
            unit: {
              id: 'imp',
              name: '使い魔',
              class: 'ニュートラル',
              stats: { hp: 600, atk: 260, def: 60, spd: 120 },
              skill: { name: 'ひっかき', stat: 'atk', type: 'physical', mult: 1 },
              passives: [],
              traits: []
            }
          }
        ]
      }
    ]
  },
  {
    id: 'test_20',
    name: 'テスト結界師',
    class: 'ニュートラル',
    relic: '少女の物語',
    stats: { hp: 1800, atk: 330, def: 140, spd: 95 },
    skill: { name: '祈りの一撃', stat: 'atk', type: 'physical', mult: 1 },
    traits: [
      {
        id: 'set_amulet',
        name: '護符設置',
        cost: 2,
        target: 'self',
        desc: '聖なる護符(アミュレット)を1つ設置する。護符は特性で味方全体を回復する',
        effects: [
          {
            type: 'summon',
            count: 1,
            unit: {
              id: 'amulet_heal',
              name: '聖なる護符',
              class: 'ニュートラル',
              amulet: true,
              countdown: 4,
              stats: { hp: 400, atk: 0, def: 0, spd: 100 },
              skill: { name: '-', stat: 'atk', type: 'physical', mult: 0 },
              passives: [],
              traits: [
                {
                  id: 'bless',
                  name: '祝福',
                  cost: 1,
                  target: 'allies',
                  desc: '味方全体を150回復',
                  effects: [ { type: 'heal', flat: 150, target: 'allies' } ]
                }
              ]
            }
          }
        ]
      }
    ]
  },
  {
    id: 'test_21',
    name: 'テスト墓守',
    class: 'ニュートラル',
    relic: '鬼の形相',
    stats: { hp: 2000, atk: 400, def: 130, spd: 100 },
    skill: { name: '鎌の一閃', stat: 'atk', type: 'physical', mult: 1 },
    traits: [
      {
        id: 'feast',
        name: '墓場の饗宴',
        cost: 2,
        target: 'self',
        desc: '墓場が3以上のとき、墓場1つにつき120回復し、墓場を3つ消費する',
        condition: { graveyard: 3 },
        effects: [
          { type: 'heal', flat: 0, perGraveyard: 120, target: 'self' },
          { type: 'graveyard', amount: -3 }
        ]
      },
      {
        id: 'grave_rage',
        name: '墓荒らし',
        cost: 1,
        target: 'self',
        desc: '墓場1つにつき攻撃力+5%(自分)',
        effects: [ { type: 'buff', stat: 'atk', pct: 0, perGraveyard: 5, turns: 2, target: 'self' } ]
      }
    ]
  }
]
