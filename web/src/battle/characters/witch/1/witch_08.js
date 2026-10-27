import golem from './tokens/witch_token_01.js' // 召喚する「クレイゴーレム」は witch_token_01.js のキャラです

export default {
  id: 'witch_08', name: 'ワンダーウィッチ・エミル', class: 'ウィッチ', rarity: 'silver',
  stats: { hp: 220, atk: 203, def: 90, spd: 60 },
  skill: { name: '攻撃', stat: 'mag', type: 'magic', mult: 1.25 }, // 敵単体に魔力125%分の魔法ダメージ
  passives: [
    { name: 'スペルブースト時', trigger: 'onBoost', desc: 'これの速度を+10する。', effects: [{ type: 'buff', stat: 'spd', flat: 10, target: 'self' }] },
    {
      name: '進化時', trigger: 'onEvolve',
      desc: '「クレイゴーレム」1体を自分の場に出す。相手の場のキャラクターすべてに50×Xダメージ。Xは自分の場の「タイプ:ゴーレム」のキャラクターの数である。',
      effects: [
        { type: 'summon', count: 1, unit: golem },
        { type: 'damage', stat: 'atk', mult: 0, add: 0, perType: 'ゴーレム', perTypeFlat: 50, dmgType: 'magic', target: 'enemies' },
      ],
    },
  ],
}
