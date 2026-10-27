// ベーシック(通常ガチャに入るキャラ)。basic フォルダに置く
export default {
  id: 'neutral_basic_01', name: '不屈のファイター', class: 'ニュートラル', rarity: 'bronze',
  stats: { hp: 210, atk: 200, def: 90, spd: 90 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
  passives: [],
  // 【エンハンス_4】: MP4を消費すると働く特性(自分のターンに、ボタンで使う)
  traits: [{
    id: 'enhance', name: 'エンハンス_4', cost: 4, target: 'self',
    desc: '【エンハンス_4】MP4を消費すると、これは「攻撃力・体力+300」を行う。',
    effects: [
      { type: 'buff', stat: 'atk', flat: 300, target: 'self' },
      { type: 'maxHp', flat: 300, target: 'self' },
    ],
  }],
}
