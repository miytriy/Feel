// 式神・貴人(トークン。召喚されて出てくる。tokens フォルダの中は、キャラ一覧・ガチャには自動では入らない)
export default {
  id: 'witch_token_08', name: '式神・貴人', class: 'ウィッチ', rarity: 'legend', type: 'トークン/式神',
  stats: { hp: 100, atk: 100, def: 90, spd: 10 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    {
      name: '場に出たとき', trigger: 'onEnter',
      desc: 'これが場に出たとき、これは攻撃力+X/体力+Yする。X/Yはこのターン中に破壊された自分の「タイプ:式神」のキャラクターの元の攻撃力/体力の合計である。',
      effects: [{ type: 'growByDead', deadType: '式神' }],
    },
  ],
}
