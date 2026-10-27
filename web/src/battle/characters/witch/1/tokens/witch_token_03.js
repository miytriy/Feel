// オニオン軍団(トークン。召喚されて出てくる。tokens フォルダの中は、キャラ一覧・ガチャには自動では入らない)
export default {
  id: 'witch_token_03', name: 'オニオン軍団', class: 'ウィッチ', rarity: 'silver', type: 'トークン',
  stats: { hp: 100, atk: 100, def: 90, spd: 100 },
  skill: { name: '攻撃', stat: 'mag', type: 'magic', mult: 1.25 }, // 敵単体に魔力125%分の魔法ダメージ
  passives: [
    // 攻撃時の能力は、パッシブ(trigger: onAttack)として書く
    { name: '攻撃時', trigger: 'onAttack', desc: '自分の場すべては1回スペルブーストする。', effects: [{ type: 'boost', amount: 1, target: 'allyField' }] },
  ],
}
