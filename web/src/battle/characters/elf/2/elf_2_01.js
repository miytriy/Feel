import fairy from '../1/tokens/elf_token_01.js' // 召喚・変身先の「フェアリー」

export default {
  id: 'elf_2_01', name: '翅の女王・ティターニア', class: 'エルフ', rarity: 'legend',
  stats: { hp: 222, atk: 203, def: 90, spd: 74 },
  tags: ['展開', 'メインアタッカー'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
  passives: [
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '『フェアリー』1体を召喚する。自分は『クレスト:翅の女王・ティターニア』を持つ。',
      effects: [
        { type: 'summon', count: 1, unit: fairy },
        {
          type: 'crest',
          crest: {
            name: '翅の女王・ティターニア',
            desc: '味方キャラクターのターン開始時、『フェアリー』1体を召喚する。2ターンに1回有効。',
            passives: [
              { name: 'ターン開始時', trigger: 'allyTurnStart', everyTurns: 2, desc: '味方キャラクターのターン開始時、『フェアリー』1体を召喚する。2ターンに1回有効。', log: '『フェアリー』1体を召喚する。', effects: [{ type: 'summon', count: 1, unit: fairy }] },
            ],
          },
        },
      ],
    },
    {
      name: '進化時', trigger: 'onEvolve', desc: '相手の場のフォロワー1体を選ぶ。それは『フェアリー』に変身する。',
      effects: [{ type: 'transform', unit: fairy, target: 'enemyFollowerOne', choose: true }],
    },
  ],
}
