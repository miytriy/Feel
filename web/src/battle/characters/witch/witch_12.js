import tenko from './tokens/witch_token_07.js' // 式神・天后
import bouki from './tokens/witch_token_06.js' // 式神・暴鬼
import katashiro from './tokens/witch_token_05.js' // 式神・形代
import kijin from './tokens/witch_token_08.js' // 式神・貴人

export default {
  id: 'witch_12', name: '五行の果て・クオン', class: 'ウィッチ', rarity: 'legend',
  stats: { hp: 307, atk: 310, def: 90, spd: 40 },
  skill: { name: '攻撃', stat: 'mag', type: 'magic', mult: 1.25 }, // 敵単体に魔力125%分の魔法ダメージ
  passives: [
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '『式神・天后』1体と『式神・暴鬼』1体と『式神・形代』1体を自分の場に召喚する。',
      effects: [
        { type: 'summon', count: 1, unit: tenko },
        { type: 'summon', count: 1, unit: bouki },
        { type: 'summon', count: 1, unit: katashiro },
      ],
    },
    {
      name: '進化時', trigger: 'onEvolve',
      desc: '自分の場の「タイプ:式神」のキャラクター1体を選ぶ。それは【疾走】を持つ。',
      effects: [{ type: 'gainKeyword', keyword: 'dash', target: 'allyFieldOne', onlyType: '式神', choose: true }],
    },
  ],
  // 【エンハンス_10】: MP10を消費すると働く特性(自分のターンに、ボタンで使う)
  traits: [{
    id: 'enhance', name: 'エンハンス_10', cost: 10, target: 'self',
    desc: '【エンハンス_10】MP10を消費すると、自分の場の「タイプ:式神」のキャラクターすべてを破壊。『式神・貴人』1体を自分の場に出す。',
    effects: [
      { type: 'destroy', target: 'allyField', onlyType: '式神', settle: true }, // 先に破壊の処理を済ませる(そのあとに出る貴人が、倒された式神の分だけ強くなる)
      { type: 'summon', count: 1, unit: kijin },
    ],
  }],
}
