// ガーディアンゴーレム(トークン。召喚されて出てくる。tokens フォルダの中は、キャラ一覧・ガチャには自動では入らない)
export default {
  id: 'witch_token_02', name: 'ガーディアンゴーレム', class: 'ウィッチ', rarity: 'bronze', type: 'トークン/ゴーレム',
  stats: { hp: 300, atk: 300, def: 90, spd: 80 },
  passives: ['guard'], // 【守護】
  skill: { name: '攻撃', stat: 'mag', type: 'magic', mult: 1.25 }, // 敵単体に魔力125%分の魔法ダメージ
}
