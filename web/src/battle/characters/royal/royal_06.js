export default {
  id: 'royal_06', name: '忍びのムササビ', class: 'ロイヤル', rarity: 'silver',
  stats: { hp: 111, atk: 216, def: 120, spd: 90 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    'stealth_3', // 【潜伏_3】: 攻撃すると剥がれ、自分のターンが3回始まるたびに戻る
    // copySelf: 召喚されるのも、このキャラ自身(召喚物も進化できるので、進化すればまた召喚できる)
    { name: '進化時', trigger: 'onEvolve', desc: '「忍びのムササビ」1体を召喚する。', effects: [{ type: 'summon', count: 1, copySelf: true }] },
  ],
}
