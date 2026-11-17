// ガロダートVSゼット(ローテーション: アズヴォルト・レヴナント = フォルダ 9)
export default {
  id: 'nightmare_9_01', name: 'ガロダートVSゼット', class: 'ナイトメア', rarity: 'legend',
  stats: { hp: 801, atk: 846, def: 90, spd: 38 },
  tags: ['大ダメージ', '範囲攻撃', '自己強化', 'メインアタッカー'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    {
      name: '常時', trigger: 'turnEnd', condition: { hpAtMost: 400 },
      desc: '自分のターン終了時、自分の体力が400以下なら、これの速度を+10する。',
      log: 'これの速度を+10する。',
      effects: [{ type: 'buff', stat: 'spd', flat: 10, target: 'self' }],
    },
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '【モード】1つを選んでその能力が働く。(1)これは【疾走】を持つ。自身に200の物理ダメージ。(2)これは【守護】を持つ。相手の場のフォロワーすべてに400の物理ダメージ。',
      effects: [{
        type: 'mode', prompt: 'モードを1つ選んでください',
        modes: [
          { name: '疾走・自傷', desc: 'これは【疾走】を持つ。自身に200の物理ダメージ。', effects: [
            { type: 'gainKeyword', keyword: 'dash', target: 'self' },
            { type: 'damage', stat: 'atk', mult: 0, add: 200, dmgType: 'physical', target: 'self' },
          ] },
          { name: '守護・範囲攻撃', desc: 'これは【守護】を持つ。相手の場のフォロワーすべてに400の物理ダメージ。', effects: [
            { type: 'gainKeyword', keyword: 'guard', target: 'self' },
            { type: 'damage', stat: 'atk', mult: 0, add: 400, dmgType: 'physical', target: 'enemyFollowers' },
          ] },
        ],
      }],
    },
  ],
}
