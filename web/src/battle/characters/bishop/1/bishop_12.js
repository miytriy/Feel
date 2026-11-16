// 純白の聖女・ジャンヌ(ローテーション: 伝説の幕開け = フォルダ 1)。タイプなし(ー)
export default {
  id: 'bishop_12', name: '純白の聖女・ジャンヌ', class: 'ビショップ', rarity: 'legend',
  stats: { hp: 631, atk: 686, def: 90, spd: 46 },
  tags: ['範囲攻撃', 'バフ', 'アタッカー'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
  passives: [
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '相手の場のキャラクターすべてに300の物理ダメージ。自分の場の他のキャラクターすべては+50/+100する。',
      effects: [
        { type: 'damage', stat: 'atk', mult: 0, add: 300, dmgType: 'physical', target: 'enemies' },
        { type: 'buff', stat: 'atk', flat: 50, target: 'otherAllyField' }, // +50/+100 = 攻撃力+50 / 体力+100(royal_13 と同じ書き方)
        { type: 'maxHp', flat: 100, target: 'otherAllyField' },
      ],
    },
    'guard', // 【守護】
  ],
}
