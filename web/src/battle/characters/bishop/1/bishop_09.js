// 終焉のスカルフェイン(ローテーション: 伝説の幕開け = フォルダ 1)
export default {
  id: 'bishop_09', name: '終焉のスカルフェイン', class: 'ビショップ', rarity: 'gold',
  stats: { hp: 483, atk: 425, def: 90, spd: 54 },
  tags: ['範囲攻撃', '物理ダメージ', 'アタッカー'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '自分の場のアミュレットすべてを破壊。相手の場のフォロワーすべてにX×50の物理ダメージ。Xはアミュレットを破壊した総数である。',
      effects: [
        { type: 'destroy', target: 'allyAmulets', settle: true }, // 破壊した数が X(あとの効果の perDestroyed)
        { type: 'damage', stat: 'atk', mult: 0, perDestroyed: 50, dmgType: 'physical', target: 'enemyFollowers' }, // X×50。1つも破壊しなかったら、何もしない
      ],
    },
  ],
}
