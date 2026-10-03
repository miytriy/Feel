// Feel Battle - 動作テスト用の仮キャラ(本番のキャラではありません)
// stats: hp=体力 atk=攻撃力 mag=魔力 def=防御力 spd=速度 critRate=クリ率(%) critDmg=クリダメ(%) dmgResist=ダメージ耐性
// skill: stat=参照ステータス(atk/mag) type=physical/magic/true mult=倍率 add=ダメージ加算

export const TEST_CHARACTERS = [
  {
    id: 'test_01', name: 'テスト剣士', class: 'ニュートラル',
    stats: { hp: 2200, atk: 520, mag: 0, def: 180, spd: 100 },
    passives: [],
    skill: { name: '斬撃', stat: 'atk', type: 'physical', mult: 1.2 },
  },
  {
    id: 'test_02', name: 'テスト魔導士', class: 'ニュートラル',
    stats: { hp: 1600, atk: 900, def: 100, spd: 95 },
    passives: [],
    skill: { name: '火球', stat: 'mag', type: 'magic', mult: 1.4 },
  },
  {
    id: 'test_03', name: 'テスト盾兵', class: 'ニュートラル',
    stats: { hp: 3200, atk: 300, mag: 0, def: 360, spd: 85 },
    passives: [],
    skill: { name: '盾打ち', stat: 'atk', type: 'physical', mult: 1.0 },
  },
  {
    id: 'test_04', name: 'テスト弓兵', class: 'ニュートラル',
    stats: { hp: 1700, atk: 480, mag: 0, def: 120, spd: 125, critRate: 25, critDmg: 80 },
    passives: [],
    skill: { name: '速射', stat: 'atk', type: 'physical', mult: 1.0 },
  },
  {
    id: 'test_05', name: 'テスト暗殺者', class: 'ニュートラル',
    stats: { hp: 1500, atk: 560, mag: 0, def: 90, spd: 135 },
    passives: [],
    skill: { name: '急所突き', stat: 'atk', type: 'true', mult: 0.7 },
  },
  {
    id: 'test_06', name: 'テスト突撃兵', class: 'ニュートラル',
    stats: { hp: 2000, atk: 500, mag: 0, def: 150, spd: 105 },
    passives: ['rush'],
    skill: { name: '突撃', stat: 'atk', type: 'physical', mult: 1.1 },
  },
]

export const TEAM_SAMPLE = TEST_CHARACTERS.slice(0, 5)
