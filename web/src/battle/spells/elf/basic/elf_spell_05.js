// スペル(プレイヤー能力): 自分のキャラのターン中、MPを使って1ターンに1回まで使える。キャラの行動は消費しない
export default {
  id: 'elf_spell_05', name: '虫の知らせ', class: 'エルフ/スペル', rarity: 'silver', // ローテーション: ベーシック(フォルダ basic)。タイプなし(ー)
  cost: 1, // MP
  desc: '自分の場のユニット1つを選ぶ。それを再出場させる。相手の場のフォロワーからランダム1体に200の物理ダメージ。',
  log: '自分の場のユニット1つを選ぶ。それを再出場させる。相手の場のフォロワーからランダム1体に200の物理ダメージ。',
  effects: [
    { type: 'reenter', target: 'allyFieldOne', choose: true }, // 召喚物・アミュレットも選べる(「ユニット」)
    { type: 'damage', stat: 'atk', mult: 0, add: 200, dmgType: 'physical', target: 'enemyFollowerRandom' },
  ],
}
