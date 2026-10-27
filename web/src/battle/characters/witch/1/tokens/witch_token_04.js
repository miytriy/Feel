// アンの大英霊(トークン。召喚されて出てくる。tokens フォルダの中は、キャラ一覧・ガチャには自動では入らない)
export default {
  id: 'witch_token_04', name: 'アンの大英霊', class: 'ウィッチ', rarity: 'legend', type: 'トークン/マナリア',
  stats: { hp: 502, atk: 500, def: 90, spd: 80 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    'guard', // 【守護】
    'rush', // 【突進】
    // 召喚されてから、相手にターンがまわり、そのターンが終わるとき自分を破壊する
    { name: '相手のターン終了時', trigger: 'enemyTurnEnd', desc: 'これを破壊する。', effects: [{ type: 'destroy', target: 'self' }] },
  ],
}
