export default {
  id: 'nightmare_12', name: 'エンドレスハンター・アラガビィ', class: 'ナイトメア', rarity: 'legend',
  stats: { hp: 302, atk: 428, def: 100, spd: 61 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
  passives: [
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '相手の場のキャラクターすべてに700の物理ダメージを割り振る。',
      effects: [{ type: 'damage', stat: 'atk', mult: 0, add: 700, split: true, dmgType: 'physical', target: 'enemies' }] },
    { name: '進化時', trigger: 'onEvolve', desc: '場のすべてのキャラクターに300の物理ダメージ。',
      effects: [
        { type: 'damage', stat: 'atk', mult: 0, add: 300, dmgType: 'physical', target: 'allies' },
        { type: 'damage', stat: 'atk', mult: 0, add: 300, dmgType: 'physical', target: 'enemies' },
      ] },
  ],
}
