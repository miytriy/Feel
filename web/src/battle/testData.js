// Feel Battle - 動作テスト用の仮キャラ(本番のキャラではありません)
//
// stats   : hp=体力 atk=攻撃力 def=防御力 spd=速度 critRate=クリ率(%) critDmg=クリダメ(%) dmgResist=ダメージ耐性
// skill   : stat=参照ステータス(atk/mag) type=physical/magic/true mult=倍率 add=ダメージ加算
// passives: キーワード能力は文字列で書く
//             'guard'守護 'stealth'潜伏 'aura'オーラ 'intimidate'威圧 'rush'突進 'dash'疾走
//             'finisher'必殺 'drain'ドレイン 'barrier'バリア
//           効果つきのパッシブは { name, trigger, desc, effects } で書く
//             trigger: fanfare / constant / active / lastWord / onAttack / onEngage / combo(min=回数)
// traits  : 特性(MPを使う能力) { id, name, cost, target, desc, effects }
//             target: self / allies / allyOne / enemies / enemyOne
// effects : { type:'damage', stat, mult, add, dmgType, target }
//           { type:'heal', stat:'atk'|'maxHp', mult, target }
//           { type:'buff', stat, pct, flat, turns, target }   (turnsを省くと戦闘中ずっと)
//           { type:'armor', stat, mult, rate(吸収レート0.6〜1), target } { type:'barrier', target }
//           { type:'advance', pct, target } { type:'mp', amount }
//           target: self / opponent / allies / otherAllies / allyOne / enemies / enemyOne / enemyRandom

export const TEST_CHARACTERS = [
  {
    id: 'test_01', name: 'テスト剣士', class: 'ニュートラル',
    stats: { hp: 2200, atk: 520, def: 180, spd: 100 },
    skill: { name: '斬撃', stat: 'atk', type: 'physical', mult: 1.2 },
  },
  {
    id: 'test_02', name: 'テスト魔導士', class: 'ニュートラル',
    stats: { hp: 1600, atk: 900, def: 100, spd: 95 },
    skill: { name: '火球', stat: 'mag', type: 'magic', mult: 1.4 },
    traits: [
      {
        id: 'focus', name: '詠唱強化', cost: 1, target: 'self', desc: 'このターン、攻撃力+40%',
        effects: [{ type: 'buff', stat: 'atk', pct: 40, turns: 1, target: 'self' }],
      },
    ],
  },
  {
    id: 'test_03', name: 'テスト盾兵', class: 'ニュートラル',
    stats: { hp: 3000, atk: 300, def: 340, spd: 85 },
    skill: { name: '盾打ち', stat: 'atk', type: 'physical', mult: 1.0 },
    passives: [
      'guard',
      { name: '堅牢', trigger: 'constant', desc: '防御力+10%', effects: [{ type: 'buff', stat: 'def', pct: 10 }] },
    ],
  },
  {
    id: 'test_04', name: 'テスト僧侶', class: 'ニュートラル',
    stats: { hp: 1800, atk: 350, def: 120, spd: 98 },
    skill: { name: '杖打ち', stat: 'atk', type: 'physical', mult: 1.0 },
    traits: [
      {
        id: 'heal', name: '癒しの光', cost: 2, target: 'allyOne', desc: '味方1体を攻撃力の150%回復',
        effects: [{ type: 'heal', stat: 'atk', mult: 1.5, target: 'allyOne' }],
      },
      {
        id: 'bless', name: '祝福', cost: 3, target: 'allies', desc: '味方全員の攻撃力+20%(2ターン)',
        effects: [{ type: 'buff', stat: 'atk', pct: 20, turns: 2, target: 'allies' }],
      },
    ],
  },
  {
    id: 'test_05', name: 'テスト疾走兵', class: 'ニュートラル',
    stats: { hp: 1700, atk: 430, def: 130, spd: 70 },
    skill: { name: '疾走斬り', stat: 'atk', type: 'physical', mult: 1.0 },
    passives: ['dash'],
  },
  {
    id: 'test_06', name: 'テスト暗殺者', class: 'ニュートラル',
    stats: { hp: 1500, atk: 520, def: 90, spd: 135 },
    skill: { name: '急所突き', stat: 'atk', type: 'physical', mult: 0.9 },
    passives: ['stealth', 'finisher'],
  },
  {
    id: 'test_07', name: 'テスト吸血鬼', class: 'ニュートラル',
    stats: { hp: 1900, atk: 470, def: 140, spd: 105 },
    skill: { name: '吸血', stat: 'atk', type: 'physical', mult: 1.0 },
    passives: ['drain'],
  },
  {
    id: 'test_08', name: 'テスト爆弾兵', class: 'ニュートラル',
    stats: { hp: 1300, atk: 380, def: 100, spd: 110 },
    skill: { name: '爆裂弾', stat: 'atk', type: 'physical', mult: 1.1 },
    passives: [
      {
        name: '自爆', trigger: 'lastWord', desc: '倒されたとき、相手全体に攻撃力の80%の確定ダメージ',
        effects: [{ type: 'damage', stat: 'atk', mult: 0.8, dmgType: 'true', target: 'enemies' }],
      },
    ],
  },
  {
    id: 'test_09', name: 'テスト騎士', class: 'ニュートラル',
    stats: { hp: 2400, atk: 430, def: 220, spd: 92 },
    skill: { name: '騎士剣', stat: 'atk', type: 'physical', mult: 1.1 },
    passives: [
      {
        name: '加護', trigger: 'fanfare', desc: '最初のターン開始時、最大HPの30%のアーマーを得る',
        effects: [{ type: 'armor', stat: 'maxHp', mult: 0.3, rate: 1, target: 'self' }],
      },
      {
        name: '受け流し', trigger: 'onEngage', desc: '交戦時、防御力+30%(1ターン)',
        effects: [{ type: 'buff', stat: 'def', pct: 30, turns: 1, target: 'self' }],
      },
    ],
  },
  {
    id: 'test_10', name: 'テスト連撃士', class: 'ニュートラル',
    stats: { hp: 1800, atk: 480, def: 130, spd: 112 },
    skill: { name: '連撃', stat: 'atk', type: 'physical', mult: 1.0 },
    traits: [
      {
        id: 'stance', name: '構え', cost: 1, target: 'self', desc: 'このターン、クリティカルレート+30',
        effects: [{ type: 'buff', stat: 'critRate', flat: 30, turns: 1, target: 'self' }],
      },
      {
        id: 'resolve', name: '集中', cost: 1, target: 'self', desc: 'このターン、攻撃力+20%',
        effects: [{ type: 'buff', stat: 'atk', pct: 20, turns: 1, target: 'self' }],
      },
    ],
    passives: [
      {
        name: '連撃', trigger: 'combo', min: 2, desc: '特性を2回使うと、このターンのクリティカルダメージ+50',
        effects: [{ type: 'buff', stat: 'critDmg', flat: 50, turns: 1, target: 'self' }],
      },
    ],
  },
  // ここから下は能力の確認用(標準の編成には入れていません)
  {
    id: 'test_11', name: 'テスト突撃兵', class: 'ニュートラル',
    stats: { hp: 2000, atk: 500, def: 150, spd: 105 },
    skill: { name: '突撃', stat: 'atk', type: 'physical', mult: 1.1 },
    passives: ['rush'],
  },
  {
    id: 'test_12', name: 'テスト守護者', class: 'ニュートラル',
    stats: { hp: 2600, atk: 330, def: 280, spd: 88 },
    skill: { name: '防壁', stat: 'atk', type: 'physical', mult: 1.0 },
    passives: ['guard', 'barrier'],
  },
  {
    id: 'test_13', name: 'テスト幻影', class: 'ニュートラル',
    stats: { hp: 1700, atk: 450, def: 120, spd: 108 },
    skill: { name: '幻撃', stat: 'atk', type: 'physical', mult: 1.0 },
    passives: ['aura'],
  },
  {
    id: 'test_14', name: 'テスト威圧兵', class: 'ニュートラル',
    stats: { hp: 1900, atk: 440, def: 140, spd: 100 },
    skill: { name: '威圧斬り', stat: 'atk', type: 'physical', mult: 1.0 },
    passives: ['intimidate'],
  },
]

const byId = (id) => TEST_CHARACTERS.find((c) => c.id === id)

// 標準の編成(自分側 / CPU側)
export const TEAM_PLAYER = ['test_01', 'test_02', 'test_03', 'test_04', 'test_05'].map(byId)
export const TEAM_CPU = ['test_06', 'test_07', 'test_08', 'test_09', 'test_10'].map(byId)
