// クレイゴーレム(トークン。召喚されて出てくる。tokens フォルダの中は、キャラ一覧・ガチャには自動では入らない)
export default {
  id: 'witch_token_01', name: 'クレイゴーレム', class: 'ウィッチ', rarity: 'bronze', type: 'トークン/ゴーレム',
  stats: { hp: 200, atk: 200, def: 90, spd: 100 },
  skill: { name: '攻撃', stat: 'mag', type: 'magic', mult: 1.25 }, // 敵単体に魔力125%分の魔法ダメージ
}
