// 大地の守護神・ミーヴェ(ローテーション: 伝説の幕開け = フォルダ 1)
export default {
  id: 'bishop_10', name: '大地の守護神・ミーヴェ', class: 'ビショップ', rarity: 'silver',
  stats: { hp: 740, atk: 528, def: 198, spd: 42 },
  tags: ['召喚物生成', '再展開', 'タンク'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
  passives: [
    'guard', // 【守護】
    {
      name: 'ラストワード', trigger: 'lastWord',
      desc: 'このバトル中に破壊された自分の元の速度最大のアミュレットからランダム1つと同名のアミュレット1つを召喚する。',
      effects: [{ type: 'copyAmulet', from: 'destroyed', maxSpd: true }], // 破壊されたアミュレットのうち、元の速度が最大のものからランダムに1つ(消滅したものは含まない)
    },
  ],
}
