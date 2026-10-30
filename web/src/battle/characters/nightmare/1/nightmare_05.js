import bat from './tokens/nightmare_token_03.js' // 召喚する「バット」は nightmare_token_03.js のキャラです

export default {
  id: 'nightmare_05', name: 'ミッドナイトヴァンパイア・エラル', class: 'ナイトメア', rarity: 'bronze',
  stats: { hp: 100, atk: 150, def: 90, spd: 70 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '『バット』1体を召喚する。', effects: [{ type: 'summon', count: 1, unit: bat }] },
    // enterName: 出てきたのが『バット』のときだけ働く。「割り振る」= 合計を、対象の人数で等分する
    { name: 'バットの疾走', trigger: 'allyEnter', enterName: 'バット', desc: '自分の『バット』が場に出たとき、それは【疾走】を持つ。味方すべてに50ダメージを割り振る。',
      effects: [
        { type: 'gainKeyword', keyword: 'dash', target: 'entered' },
        { type: 'damage', stat: 'atk', mult: 0, add: 50, split: true, dmgType: 'physical', target: 'allies' },
      ] },
  ],
}
