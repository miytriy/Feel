export default {
  id: 'royal_07', name: 'ミリタリードッグ', class: 'ロイヤル', rarity: 'bronze',
  stats: { hp: 210, atk: 405, def: 187, spd: 70 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    'rush', // 【突進】
  ],
  // 【エンハンス_6】: MP6を消費すると働く特性(自分のターンに、ボタンで使う)
  traits: [{
    id: 'enhance', name: 'エンハンス_6', cost: 6, target: 'self',
    desc: '【エンハンス_6】MP6を消費すると、「ミリタリードッグ」2体を召喚する。',
    effects: [{ type: 'summon', count: 2, copySelf: true }], // 召喚されるのも本人と同じ(エンハンスも使える)
  }],
}
