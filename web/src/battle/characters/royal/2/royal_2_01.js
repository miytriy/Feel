import steelKnight from '../1/tokens/royal_token_02.js' // 召喚する「スティールナイト」

// 静寂のアナテマ・ギルダリア(ローテーション: インフィニティ・エボルヴ = フォルダ 2)。タイプ: アナテマ
export default {
  id: 'royal_2_01', name: '静寂のアナテマ・ギルダリア', class: 'ロイヤル', rarity: 'legend', type: 'アナテマ',
  stats: { hp: 449, atk: 456, def: 90, spd: 54 },
  tags: ['展開', '範囲攻撃', '自己強化', 'メインアタッカー'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    // 【連携_20】= condition: { link: 20 }(味方のスキル発動回数が20以上)
    { name: 'ファンファーレ', trigger: 'fanfare', condition: { link: 20 }, desc: '【連携_20】これは進化する。', log: 'これは進化する。', effects: [{ type: 'evolve' }] },
    // enterFollower: 出てきたのが、フォロワー(キャラクター・召喚物。アミュレットは除く)のときだけ働く。「他の」= 自分自身が出たときは働かない
    { name: '常時', trigger: 'allyEnter', enterFollower: true, desc: '自分の他のフォロワーが場に出たとき、相手の場のフォロワーすべてに50ダメージ。', log: '相手の場のフォロワーすべてに50ダメージ。',
      effects: [{ type: 'damage', stat: 'atk', mult: 0, add: 50, dmgType: 'physical', target: 'enemyFollowers' }] },
    { name: '進化したとき', trigger: 'onEvolved', plain: true, desc: 'これが進化したとき、『スティールナイト』2枚を自分の場に出す。それは【突進】を持つ。', log: '『スティールナイト』2枚を自分の場に出す。それは【突進】を持つ。',
      effects: [{ type: 'summon', count: 2, unit: steelKnight, gainKeyword: 'rush' }] },
  ],
}
