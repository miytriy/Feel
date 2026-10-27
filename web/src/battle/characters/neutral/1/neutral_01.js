// グリードケルブ・ルビィ(ニュートラル / ブロンズ)
export default {
  id: 'neutral_01',
  name: 'グリードケルブ・ルビィ',
  class: 'ニュートラル',
  rarity: 'bronze',
  stats: { hp: 210, atk: 200, def: 100, spd: 90 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
  passives: [
    {
      name: 'ファンファーレ',
      trigger: 'fanfare',
      desc: '自分以外の味方単体を選ぶ。それを入場させ直す。',
      effects: [{ type: 'reenter', target: 'otherAllyOne', choose: true }],
    },
  ],
}
