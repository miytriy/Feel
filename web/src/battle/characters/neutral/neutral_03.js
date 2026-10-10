export default {
  id: 'neutral_03', name: '観察の探偵', class: 'ニュートラル', rarity: 'bronze',
  stats: { hp: 307, atk: 301, def: 90, spd: 80 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [{ name: 'ラストワード', trigger: 'lastWord', desc: '「探偵のルーペ」を召喚する。',
    effects: [{ type: 'summon', count: 1, unit: {
      id: 'detective_loupe', name: '探偵のルーペ', class: 'ニュートラル', rarity: 'bronze', amulet: true,
      stats: { hp: 1, atk: 0, def: 0, spd: 80 }, // アミュレットには体力の概念がない(数字は使われません)
      skill: { name: '-', stat: 'atk', type: 'physical', mult: 0 },
      passives: [],
      traits: [{ id: 'act', name: 'アクト', cost: 0, target: 'enemyOne', desc: '【アクト】自身を破壊。相手単体を選ぶ。それは【守護】を失う。',
        effects: [{ type: 'loseKeyword', keyword: 'guard', target: 'enemyOne' }, { type: 'destroy', target: 'self' }] }],
    } }] }],
}
