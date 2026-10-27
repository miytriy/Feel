// 式神・天后(トークン。召喚されて出てくる。tokens フォルダの中は、キャラ一覧・ガチャには自動では入らない)
export default {
  id: 'witch_token_07', name: '式神・天后', class: 'ウィッチ', rarity: 'legend', type: 'トークン/式神',
  stats: { hp: 500, atk: 429, def: 110, spd: 70 },
  skill: { name: '攻撃', stat: 'mag', type: 'magic', mult: 1.25 }, // 敵単体に魔力125%分の魔法ダメージ
  passives: [
    'guard', // 【守護】
    { name: 'ラストワード', trigger: 'lastWord', desc: '自分の場すべては3回スペルブーストする。', effects: [{ type: 'boost', amount: 3, target: 'allyField' }] },
  ],
}
