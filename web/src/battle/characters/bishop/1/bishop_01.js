// 潜みしマイニュ(ローテーション: 伝説の幕開け = フォルダ 1)
export default {
  id: 'bishop_01', name: '潜みしマイニュ', class: 'ビショップ', rarity: 'bronze',
  stats: { hp: 226, atk: 200, def: 90, spd: 90 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    'aura', // 【オーラ】
    {
      name: '味方がアミュレットをアクトしたとき', trigger: 'allyAmuletAct',
      desc: '味方がアミュレットを【アクト】したとき、これは「攻撃力+40」をする。',
      effects: [{ type: 'buff', stat: 'atk', flat: 40, target: 'self' }], // turns を省く = 戦闘中ずっと
    },
  ],
}
