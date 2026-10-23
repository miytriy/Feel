import babyDrake from './tokens/dragon_token_01.js' // 召喚する「ベビーファイアドレイク」は dragon_token_01.js のキャラです

// 【ファンファーレ】と【進化時】は、同じ能力(同じ effects を使う)
const summonDrake = [{ type: 'summon', count: 1, unit: babyDrake }]

export default {
  id: 'dragon_01', name: '竜育の少女', class: 'ドラゴン', rarity: 'bronze',
  stats: { hp: 100, atk: 100, def: 90, spd: 90 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '『ベビーファイアドレイク』1体を召喚する。', effects: summonDrake },
    { name: '進化時', trigger: 'onEvolve', desc: '【ファンファーレ】と同じ能力が働く。(『ベビーファイアドレイク』1体を召喚する。)', effects: summonDrake },
  ],
}
