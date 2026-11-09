// 番犬の左腕・ココ(トークン。召喚されて出てくる。tokens フォルダの中は、キャラ一覧・ガチャには自動では入らない)
export default {
  id: 'nightmare_token_07', name: '番犬の左腕・ココ', class: 'ナイトメア', rarity: 'legend', token: true,
  stats: { hp: 200, atk: 100, def: 100, spd: 100 },
  passives: [
    'rush', // 【突進】
    { name: 'ラストワード', trigger: 'lastWord', desc: '自分の場のすべてのHPを100ヒールする。',
      effects: [{ type: 'heal', flat: 100, target: 'allyField' }] },
  ],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
}
