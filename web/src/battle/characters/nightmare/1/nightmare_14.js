export default {
  id: 'nightmare_14', name: '猛毒姫・メドゥーサ', class: 'ナイトメア', rarity: 'legend',
  stats: { hp: 720, atk: 323, def: 400, spd: 44 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
  passives: [
    'rush', // 【突進】
    { name: '攻撃時', trigger: 'onAttack', desc: '召喚物への攻撃なら、ターゲットを破壊。キャラクターへの攻撃なら、追加で攻撃力50%分の物理ダメージ。',
      effects: [
        { type: 'destroy', target: 'opponent', onlyField: 'summon' },
        { type: 'damage', stat: 'atk', mult: 0.5, dmgType: 'physical', target: 'opponent', onlyField: 'main' },
      ] },
  ],
  traits: [{
    id: 'active', name: 'アクティブ', cost: 3, target: 'self',
    desc: '【アクティブ】MPを3消費する。自分は『クレスト:猛毒姫・メドゥーサ』を持つ。',
    effects: [{
      type: 'crest',
      crest: {
        name: '猛毒姫・メドゥーサ', countdown: 1, // 【カウントダウン_1】
        desc: '【カウントダウン_1】自分の場の『猛毒姫・メドゥーサ』は1ターンに3回スキルを発動できる。',
        passives: [
          { name: '1ターンに3回', trigger: 'constant', desc: '自分の場の『猛毒姫・メドゥーサ』は1ターンに3回スキルを発動できる。', effects: [{ type: 'extraSkill', times: 3, onlyName: '猛毒姫・メドゥーサ' }] },
        ],
      },
    }],
  }],
}
