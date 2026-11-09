// 番犬の右腕・ミミ(トークン。召喚されて出てくる。tokens フォルダの中は、キャラ一覧・ガチャには自動では入らない)
export default {
  id: 'nightmare_token_06', name: '番犬の右腕・ミミ', class: 'ナイトメア', rarity: 'legend', token: true,
  stats: { hp: 100, atk: 200, def: 100, spd: 100 },
  passives: [
    'rush', // 【突進】
    { name: 'ラストワード', trigger: 'lastWord', desc: 'ランダムな相手単体に100の確定ダメージを与える。',
      effects: [{ type: 'damage', stat: 'atk', mult: 0, add: 100, dmgType: 'true', target: 'enemyRandom' }] },
  ],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
}
