// アルビオンバハムート(ローテーション: クロニクル・オブ・デスティニー)
export default {
  id: 'neutral_05', name: 'アルビオンバハムート', class: 'ニュートラル', rarity: 'legend',
  stats: { hp: 1300, atk: 1290, def: 90, spd: 20 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
  passives: [{
    name: 'ファンファーレ', trigger: 'fanfare', desc: '【モード】1つ選んでその能力が働く。(1)場の召喚物をすべて消滅。(2)場のアミュレットをすべて消滅。(3)場のクレストをすべて消滅。',
    effects: [{
      type: 'mode', prompt: 'モードを1つ選んでください',
      modes: [
        { name: '召喚物を消滅', desc: '場の召喚物をすべて消滅。', effects: [{ type: 'vanish', target: 'fieldSummons' }] },
        { name: 'アミュレットを消滅', desc: '場のアミュレットをすべて消滅。', effects: [{ type: 'vanish', target: 'fieldAmulets' }] },
        { name: 'クレストを消滅', desc: '場のクレストをすべて消滅。', effects: [{ type: 'clearCrests' }] },
      ],
    }],
  }],
}
