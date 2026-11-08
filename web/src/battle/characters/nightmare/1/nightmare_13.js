export default {
  id: 'nightmare_13', name: 'ジャグリングゴースト', class: 'ナイトメア', rarity: 'bronze',
  stats: { hp: 504, atk: 581, def: 90, spd: 56 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
  passives: [
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '【リアニメイト_70】を行う。', effects: [{ type: 'reanimate', speed: 70 }] },
  ],
}
