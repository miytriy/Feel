export default {
  id: 'royal_08', name: 'サイレントスナイパー・ワルツ', class: 'ロイヤル', rarity: 'gold',
  stats: { hp: 129, atk: 232, def: 130, spd: 80 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '相手の場のフォロワー1体を選ぶ。それに250の物理ダメージ。',
      log: '相手の場のフォロワー1体を選ぶ。それに250の物理ダメージ。',
      effects: [{ type: 'damage', stat: 'atk', mult: 0, add: 250, dmgType: 'physical', target: 'enemyOne', choose: true }],
    },
  ],
  // 【エンハンス_6】: MP6を消費すると働く特性(自分のターンに、ボタンで使う)
  traits: [{
    id: 'enhance', name: 'エンハンス_6', cost: 6, target: 'self',
    desc: '【エンハンス_6】これは+200/+200して、【潜伏】をもつ。',
    log: 'これは+200/+200して、【潜伏】をもつ。',
    effects: [
      { type: 'buff', stat: 'atk', flat: 200, target: 'self' },
      { type: 'maxHp', flat: 200, target: 'self' },
      { type: 'gainKeyword', keyword: 'stealth', target: 'self' },
    ],
  }],
}
