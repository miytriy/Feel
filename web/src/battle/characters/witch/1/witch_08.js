import golem from './tokens/witch_token_01.js' // 召喚する「クレイゴーレム」は witch_token_01.js のキャラです

export default {
  id: 'witch_08', name: 'ワンダーウィッチ・エミル', class: 'ウィッチ', rarity: 'silver',
  stats: { hp: 220, atk: 203, def: 90, spd: 64 },
  skill: { name: '攻撃', stat: 'mag', type: 'magic', mult: 1.25 }, // 敵単体に魔力125%分の魔法ダメージ
  passives: [
    { name: 'スペルブースト時', trigger: 'onBoost', desc: 'これの速度を+10する。', log: false, effects: [{ type: 'buff', stat: 'spd', flat: 10, target: 'self' }] },
    {
      name: '進化時', trigger: 'onEvolve',
      desc: '『クレイゴーレム』1体を召喚する。相手の場のキャラクターすべてにX×50ダメージ。Xは自分の場のゴーレム・フォロワーのキャラクターの数である。',
      log: '『クレイゴーレム』1体を召喚する。相手の場のキャラクターすべてにXダメージ。Xは自分の場のゴーレム・フォロワーのキャラクターの数である。',
      effects: [
        { type: 'summon', count: 1, unit: golem },
        { type: 'damage', stat: 'atk', mult: 0, add: 0, perType: 'ゴーレム', perTypeFlat: 50, dmgType: 'magic', target: 'enemies' },
      ],
    },
  ],
}
