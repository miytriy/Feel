import fairy from '../../../characters/elf/1/tokens/elf_token_01.js' // 召喚する「フェアリー」
import forestMystery from '../../../spells/elf/1/elf_spell_02.js' // 有効化する「森の神秘」

// アミュレット: 編成に入れると、バトル開始時からアミュレット置き場にいる(スキル攻撃はできない)
export default {
  id: 'elf_amulet_01', name: '燐光の岩', class: 'エルフ', rarity: 'silver', amulet: true,
  stats: { hp: 1, atk: 0, def: 0, spd: 90 }, // アミュレットには体力の概念がない(数字は使われません)
  skill: { name: '-', stat: 'atk', type: 'physical', mult: 0 },
  passives: [
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '『フェアリー』1体を召喚する。', log: '『フェアリー』1体を召喚する。',
      logCombo: { combo: 3, log: '『フェアリー』1体を召喚する。『森の神秘』1回を有効化する。' }, // コンボ3以上のときは、この1行にまとめて出す
      effects: [{ type: 'summon', count: 1, unit: fairy }] },
    { name: 'コンボ_3', trigger: 'combo', min: 3, desc: '『森の神秘』1回を有効化する。', log: false, effects: [{ type: 'enableSpell', spell: forestMystery }] },
  ],
  traits: [{
    id: 'act', name: 'アクト', cost: 0, target: 'allyOne',
    desc: '【アクト】これを破壊。自分の場のフォロワー1体を選ぶ。それは+100/+100する。',
    log: 'これを破壊。自分の場のフォロワー1体を選ぶ。それは+100/+100する。',
    effects: [
      { type: 'buff', stat: 'atk', flat: 100, target: 'allyOne' },
      { type: 'maxHp', flat: 100, target: 'allyOne' },
      { type: 'destroy', target: 'self' },
    ],
  }],
}
