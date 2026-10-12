export default {
  id: 'royal_14', name: 'レヴィオンの迅雷・アルベール', class: 'ロイヤル', rarity: 'legend', type: 'レヴィオン',
  stats: { hp: 505, atk: 501, def: 90, spd: 60 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    'dash', // 【疾走】
  ],
  // 【エンハンス_9】: MP9を消費すると働く特性(自分のターンに、ボタンで使う)
  traits: [{
    id: 'enhance', name: 'エンハンス_9', cost: 9, target: 'self',
    desc: '【エンハンス_9】MP9を消費すると、相手すべてに50の物理ダメージ。これは「【アクティブ】1ターンに2回スキルを発動できる。2回目のスキル発動にはMPを1消費する。」を持つ。',
    effects: [
      { type: 'damage', stat: 'atk', mult: 0, add: 50, dmgType: 'physical', target: 'enemies' },
      { type: 'gainDoubleSkill', mpCost: 1, target: 'self' },
    ],
  }],
}
