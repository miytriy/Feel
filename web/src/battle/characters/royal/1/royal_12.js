export default {
  id: 'royal_12', name: 'レヴィオンの迅雷・アルベール', class: 'ロイヤル', rarity: 'legend', type: 'レヴィオン',
  stats: { hp: 505, atk: 487, def: 90, spd: 58 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    'dash', // 【疾走】
  ],
  // 【エンハンス_9】: MP9を消費すると働く特性(自分のターンに、ボタンで使う)
  traits: [{
    id: 'enhance', name: 'エンハンス_9', cost: 9, target: 'self',
    desc: '【エンハンス_9】MP9を消費すると、相手の場のフォロワーすべてに150の物理ダメージ。これは「【アクティブ】1ターンに2回スキルを発動できる。2回目のスキル発動にはMPを2消費する。」を持つ。また、エンハンスを発動したとき、『レヴィオンの迅雷・アルベール』の基礎速度は21に変化する。',
    log: '【エンハンス_9】相手の場のフォロワーすべてに150の物理ダメージ。これは「【アクティブ】1ターンに2回スキルを発動できる。2回目のスキル発動にはMPを2消費する。」を持つ。',
    effects: [
      { type: 'damage', stat: 'atk', mult: 0, add: 150, dmgType: 'physical', target: 'enemies' },
      { type: 'gainDoubleSkill', mpCost: 2, target: 'self' },
      { type: 'setBaseSpd', value: 21, target: 'self' },
    ],
  }],
}
