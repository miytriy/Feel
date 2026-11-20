// 進化時に相手のフォロワーへ与える能力: ターン終了時、自分の場すべてに100の確定ダメージを割り振る
const spread = {
  name: 'ターン終了時', trigger: 'turnEnd', desc: 'ターン終了時、自分の場すべてに100の確定ダメージを割り振る。',
  effects: [{ type: 'damage', stat: 'atk', mult: 0, add: 100, split: true, dmgType: 'true', target: 'allyFollowers' }],
}

export default {
  id: 'elf_2_07', name: '絡み付く密林・リーマガ', class: 'エルフ', rarity: 'legend',
  stats: { hp: 774, atk: 703, def: 90, spd: 47 },
  tags: ['奇策', 'メインアタッカー'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
  passives: [
    {
      name: 'ファンファーレ', trigger: 'fanfare', desc: '相手の場のフォロワー2体を選ぶ。相手のターン終了時まで、それは「フォロワーを攻撃できない」を持つ。',
      effects: [
        { type: 'gainKeyword', keyword: 'noAttackFollower', untilTurnEnd: true, target: 'enemyFollowerOne', choose: true },
        { type: 'gainKeyword', keyword: 'noAttackFollower', untilTurnEnd: true, target: 'enemyFollowerOne2', choose: true },
      ],
    },
    {
      name: '進化時', trigger: 'onEvolve', desc: '相手の場のフォロワー2体を選ぶ。それは「ターン終了時、自分の場すべてに100の確定ダメージを割り振る。」を持つ。',
      effects: [
        { type: 'gainPassive', passive: spread, target: 'enemyFollowerOne', choose: true },
        { type: 'gainPassive', passive: spread, target: 'enemyFollowerOne2', choose: true },
      ],
    },
  ],
}
