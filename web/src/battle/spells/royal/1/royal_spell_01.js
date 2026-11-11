import knight from '../../../characters/royal/1/tokens/royal_token_01.js' // 召喚する「ナイト」
import steelKnight from '../../../characters/royal/1/tokens/royal_token_02.js' // 召喚する「スティールナイト」

// スペル(プレイヤー能力): 【モード】1つ選んで、その能力が働く
export default {
  id: 'royal_spell_01', name: '王断の威光', class: 'ロイヤル/スペル', rarity: 'silver',
  cost: 3, // MP
  desc: '【モード】1つ選んで、その能力が働く。(1)『スティールナイト』1体と『ナイト』1体を召喚する。(2)自分の場のフォロワーすべては+100/+100する。',
  log: false, // スペルを使った瞬間のログは出さず、選んだモードのログを出す
  effects: [{
    type: 'mode',
    prompt: '使うモードを選んでください',
    modes: [
      {
        name: '召喚', desc: '『スティールナイト』1体と『ナイト』1体を召喚する。',
        log: '『スティールナイト』1体と『ナイト』1体を召喚する。',
        effects: [{ type: 'summon', count: 1, unit: steelKnight }, { type: 'summon', count: 1, unit: knight }],
      },
      {
        name: '強化', desc: '自分の場のフォロワーすべては+100/+100する。',
        log: '自分の場のフォロワーすべては+100/+100する。',
        effects: [{ type: 'buff', stat: 'atk', flat: 100, target: 'allyField' }, { type: 'maxHp', flat: 100, target: 'allyField' }],
      },
    ],
  }],
}
