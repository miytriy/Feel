// 裁決のアナテマ・ロデオ(ローテーション: 伝説の幕開け = フォルダ 1)
export default {
  id: 'bishop_11', name: '裁決のアナテマ・ロデオ', class: 'ビショップ', rarity: 'legend', type: 'アナテマ',
  stats: { hp: 554, atk: 501, def: 90, spd: 45 },
  tags: ['召喚物生成', '範囲攻撃', 'アタッカー'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '自分の場の1体を選ぶ。それを破壊。ビショップ・アミュレットの中から、速度80以下のランダムな3種類を召喚する。',
      effects: [
        { type: 'destroy', target: 'allyFieldOne', choose: true, settle: true }, // 自分の場の1体(自分自身・アミュレットも選べる)。破壊の処理を先に済ませてから召喚する
        { type: 'summon', fromCatalog: { amulet: true, class: 'ビショップ', maxSpd: 80 }, count: 3 }, // 全カードのうち、ビショップのアミュレットで速度80以下のものから、ランダム3種類(所持は関係ない)
      ],
    },
    {
      name: '進化時', trigger: 'onEvolve',
      desc: '相手の場の攻撃力最大のキャラクターからランダム1体に攻撃力100%分の物理ダメージを与える。それ以外の相手の場のフォロワーすべてに100の物理ダメージを与える。',
      effects: [
        { type: 'damage', stat: 'atk', mult: 1.0, dmgType: 'physical', target: 'enemyTopAtk' },
        { type: 'damage', stat: 'atk', mult: 0, add: 100, dmgType: 'physical', target: 'enemyFollowers', exceptPrev: true }, // それ以外 = 上の効果の対象を除く
      ],
    },
  ],
}
