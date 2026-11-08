// 一ツ尾狐(トークン。「双輪夜行・ギンセツ&ユヅキ」の能力で出てくる。tokens フォルダの中は、キャラ一覧・ガチャには自動では入らない)
export default {
  id: 'nightmare_token_05', name: '一ツ尾狐', class: 'ナイトメア', rarity: 'legend', type: 'トークン',
  stats: { hp: 330, atk: 200, def: 100, spd: 80 },
  passives: [
    'rush', 'guard', // 【突進】【守護】
    // onlyName: 候補を、この名前のキャラだけにしぼってから、ランダムに1体選ぶ(場にいなければ何もしない)
    { name: 'ラストワード', trigger: 'lastWord', desc: '自分の場の「双輪夜行・ギンセツ&ユヅキ」からランダム1体は「攻撃力+30」を行う。',
      effects: [{ type: 'buff', stat: 'atk', flat: 30, target: 'allyFieldRandom', onlyName: '双輪夜行・ギンセツ&ユヅキ' }] },
  ],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
}
