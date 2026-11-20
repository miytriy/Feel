// スペル(プレイヤー能力): ローテーション: ベーシック(フォルダ basic)。タイプなし(ー)
export default {
  id: 'nightmare_spell_03', name: '魂の捕食', class: 'ナイトメア/スペル', rarity: 'silver',
  cost: 2, // MP
  desc: '自分の場のフォロワー1体を選ぶ。それを破壊。最も近い味方1体の行動順30%アップ。',
  log: '自分の場のフォロワー1体を選ぶ。それを破壊。最も近い味方1体の行動順30%アップ。',
  effects: [
    { type: 'pick', target: 'allyFollowerOne', choose: true },
    { type: 'destroy', target: 'allyFollowerOne' },
    { type: 'advance', pct: 30, target: 'nearestAlly' },
  ],
}
