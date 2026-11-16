// 煌翼のフェザーフォルク・リノ(ローテーション: 伝説の幕開け = フォルダ 1)
export default {
  id: 'bishop_05', name: '煌翼のフェザーフォルク・リノ', class: 'ビショップ', rarity: 'silver',
  stats: { hp: 554, atk: 318, def: 200, spd: 82 },
  tags: ['カウンター', '連続攻撃', 'アタッカー'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    {
      // 攻撃された側のときだけ働く(自分から攻撃したときは、攻撃してきた相手がいないので働かない)
      name: '交戦時', trigger: 'onEngage', engageRole: 'defender',
      desc: '攻撃してきた相手に100の物理ダメージ。',
      effects: [{ type: 'damage', stat: 'atk', mult: 0, add: 100, dmgType: 'physical', target: 'opponent' }],
    },
    {
      // 進化すると、1ターンに2回スキルを発動できるようになる(2回目はMPを2消費する)
      name: '進化時', trigger: 'onEvolve',
      desc: 'これは「【アクティブ】MPを2消費する。そのターン中、1ターンに2回スキルを発動できる。」を持つ。',
      effects: [{ type: 'gainDoubleSkill', mpCost: 2, target: 'self' }],
    },
  ],
}
