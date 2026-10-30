import skeleton from './tokens/nightmare_token_01.js' // 召喚する「スケルトン」は nightmare_token_01.js のキャラです

export default {
  id: 'nightmare_02', name: '辣腕の死神・ミーノ', class: 'ナイトメア', rarity: 'silver',
  stats: { hp: 130, atk: 200, def: 100, spd: 90 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    { name: 'ラストワード', trigger: 'lastWord', desc: '『スケルトン』1体を召喚する。', effects: [{ type: 'summon', count: 1, unit: skeleton }] },
  ],
  // 【エンハンス_4】: MP4を消費すると働く特性(自分のターンに、ボタンで使う。1ターンに1回)
  traits: [{
    id: 'enhance', name: 'エンハンス_4', cost: 4, target: 'self',
    desc: '【エンハンス_4】MP4を消費すると、これは【突進】と【必殺】を持つ。',
    effects: [{ type: 'gainKeyword', keyword: 'rush', target: 'self' }, { type: 'gainKeyword', keyword: 'finisher', target: 'self' }],
  }],
}
