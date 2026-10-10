export default {
  id: 'elf_05', name: 'ピュアクリスタリア・リリィ', class: 'エルフ', rarity: 'gold',
  stats: { hp: 353, atk: 107, def: 200, spd: 80 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [
    { name: 'ファンファーレ【コンボ_3】', trigger: 'fanfare', condition: { combo: 3 },
      desc: 'コンボ3以上のとき、相手単体を選ぶ。それの現在体力を-100する。',
      effects: [{ type: 'loseHp', amount: 100, target: 'enemyOne', choose: true }] },
    { name: '進化時', trigger: 'onEvolve', desc: '相手単体を選ぶ。それに100の物理ダメージ。',
      effects: [{ type: 'damage', stat: 'atk', mult: 0, add: 100, dmgType: 'physical', target: 'enemyOne', choose: true }] },
  ],
}
