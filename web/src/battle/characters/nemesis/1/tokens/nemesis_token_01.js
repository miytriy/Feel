// 操り人形(トークン。召喚されて出てくる。tokens フォルダの中は、キャラ一覧・ガチャには自動では入らない)
export default {
  id: 'nemesis_token_01', name: '操り人形', class: 'ネメシス', rarity: 'bronze', token: true, type: '人形',
  stats: { hp: 100, atk: 100, def: 90, spd: 110 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    'rush', // 【突進】
    // 召喚されてから、相手にターンがまわり、そのターンが終わるとき自分を破壊する
    { name: '相手のターン終了時', trigger: 'enemyTurnEnd', desc: '自身の行動終了後の相手のターン終了時、これを破壊。', effects: [{ type: 'destroy', target: 'self' }] },
  ],
}
