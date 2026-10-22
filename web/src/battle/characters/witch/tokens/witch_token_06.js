// 式神・暴鬼(トークン。召喚されて出てくる。tokens フォルダの中は、キャラ一覧・ガチャには自動では入らない)
export default {
  id: 'witch_token_06', name: '式神・暴鬼', class: 'ウィッチ', rarity: 'bronze', type: 'トークン/式神',
  stats: { hp: 300, atk: 320, def: 90, spd: 80 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    'rush', // 【突進】
    { name: 'ラストワード', trigger: 'lastWord', desc: '自分の場すべては1回スペルブーストする。', effects: [{ type: 'boost', amount: 1, target: 'allyField' }] },
  ],
}
