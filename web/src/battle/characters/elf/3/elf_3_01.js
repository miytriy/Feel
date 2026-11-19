// 不殺の継承者・クルル(ローテーション: 絶傑の継承者 = フォルダ 3)。タイプなし(ー)
export default {
  id: 'elf_3_01', name: '不殺の継承者・クルル', class: 'エルフ', rarity: 'legend',
  stats: { hp: 349, atk: 111, def: 200, spd: 73 },
  tags: ['弱体化', '治療', 'コントロール', 'サポーター'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    'stealth_3', // 【潜伏_3T】: 攻撃すると剥がれ、自分のターンが3回始まるたびに戻る
    // 「HP」の減少 = 現在HPの減少(loseHp)。最大HPは変わらない。0以下になったら倒れる
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '相手の場のフォロワーすべては-0/-200する。', log: '相手の場のフォロワーすべては-0/-200する。', effects: [{ type: 'loseHp', amount: 200, target: 'enemyFollowers' }] },
    // enemyHpDown: 相手のフォロワーの現在HPが場で減らされたとき(-0/-200・クレストの-100/-100など。ダメージは含まない)。oncePerTurn: ターンごとに1回
    { name: '常時', trigger: 'enemyHpDown', oncePerTurn: true, desc: '相手のフォロワーのHPが場で-されたとき、そのターンごとに1回、自分の場のフォロワーすべてに100のヒールを割り振る。', log: '自分の場のフォロワーすべてに100のヒールを割り振る。', effects: [{ type: 'heal', flat: 100, split: true, target: 'allyFollowers' }] },
    {
      name: '進化時', trigger: 'onEvolve',
      desc: '相手は『クレスト:不殺の継承者・クルル』を持つ。',
      effects: [{
        type: 'crest', onEnemy: true, // 相手が持つクレスト(「自分の」は、クレストを持つ相手側のこと)
        crest: {
          name: '不殺の継承者・クルル', countdown: 2, // 【カウントダウン_2】
          desc: '自分のフォロワーが場に出たとき、それは-100/-100する。',
          passives: [],
          onEnter: { atk: -100, hp: -100, log: 'それは-100/-100する。' },
        },
      }],
    },
  ],
}
