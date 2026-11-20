// 辺獄の悪鬼(トークン。召喚されて出てくる。キャラ一覧・ガチャには自動では入らない)
export default {
  id: 'neutral_token_02', name: '辺獄の悪鬼', class: 'ニュートラル', rarity: 'legend', token: true,
  stats: { hp: 620, atk: 912, def: 300, spd: 63 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
  passives: [{
    name: 'ファンファーレ', trigger: 'fanfare', desc: '相手の場のキャラクター2体を選ぶ。それと相手の場の召喚物すべてに350の物理ダメージ。',
    log: '相手の場のキャラクター2体と、召喚物すべてに350の物理ダメージ。',
    effects: [
      { type: 'damage', stat: 'atk', mult: 0, add: 350, dmgType: 'physical', target: 'enemyCharOne', choose: true },
      { type: 'damage', stat: 'atk', mult: 0, add: 350, dmgType: 'physical', target: 'enemyCharOne2', choose: true },
      { type: 'damage', stat: 'atk', mult: 0, add: 350, dmgType: 'physical', target: 'enemySummons' },
    ],
  }],
}
