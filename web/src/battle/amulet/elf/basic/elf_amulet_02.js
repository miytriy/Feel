import fairy from '../../../characters/elf/1/tokens/elf_token_01.js' // 召喚する「フェアリー」

// アミュレット: 編成に入れると、バトル開始時からアミュレット置き場にいる(スキル攻撃はできない)
export default {
  id: 'elf_amulet_02', name: '繚乱の庭', class: 'エルフ', rarity: 'bronze', amulet: true, countdown: 2,
  stats: { hp: 1, atk: 0, def: 0, spd: 90 }, // アミュレットには体力の概念がない(数字は使われません)
  skill: { name: '-', stat: 'atk', type: 'physical', mult: 0 },
  passives: [
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '『フェアリー』1体を召喚する。', log: '『フェアリー』1体を召喚する。', effects: [{ type: 'summon', count: 1, unit: fairy }] },
    {
      name: '常時', trigger: 'allyEnter', enterType: '妖精',
      desc: '【カウントダウン_2】自分の妖精・フォロワーが場に出たとき、相手の場のフォロワーからランダム1体に100の物理ダメージ。',
      log: '相手の場のフォロワーからランダム1体に100の物理ダメージ。',
      effects: [{ type: 'damage', stat: 'atk', mult: 0, add: 100, dmgType: 'physical', target: 'enemyRandom' }],
    },
  ],
}
