export default {
  id: 'nightmare_04', name: '燃え盛る魔剣・オルトルス', class: 'ナイトメア', rarity: 'gold',
  stats: { hp: 200, atk: 210, def: 90, spd: 90 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    'guard',
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '自分の墓場を+2する。', effects: [{ type: 'graveyard', amount: 2 }] },
    // 【ネクロマンス_4】= graveCost: 4(墓場を4消費して働く。足りないときは働かない)。repeat: 2 = 2回行う(コストは1回だけ・対象は毎回選び直す)
    { name: '進化時', trigger: 'onEvolve', desc: '【ネクロマンス_4】「相手の場のキャラクターからランダム1体に200ダメージ。」を2回行う。',
      effects: [{ type: 'damage', stat: 'atk', mult: 0, add: 200, dmgType: 'physical', target: 'enemyRandom', graveCost: 4, repeat: 2 }] },
  ],
}
