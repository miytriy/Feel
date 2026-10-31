import fox from './tokens/nightmare_token_05.js' // 召喚する「一ツ尾狐」は nightmare_token_05.js のキャラです

export default {
  id: 'nightmare_2_08', name: '双輪夜行・ギンセツ&ユヅキ', class: 'ナイトメア', rarity: 'legend',
  stats: { hp: 909, atk: 550, def: 350, spd: 20 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [{
    name: 'ファンファーレ', trigger: 'fanfare',
    desc: '【モード】1つを選んでその能力が働く。(1)『一ツ尾狐』4体を召喚する。(2)相手の場からランダム4体を選ぶ。それに攻撃力50%分の物理ダメージ。ターゲットが召喚物だったときそれを破壊。自分の場すべてを100ヒール。',
    effects: [{
      type: 'mode', prompt: 'モードを1つ選んでください',
      modes: [
        { name: '一ツ尾狐を4体', desc: '『一ツ尾狐』4体を召喚する。', effects: [{ type: 'summon', count: 4, unit: fox }] },
        {
          name: 'ランダム4体に攻撃', desc: '相手の場からランダム4体を選ぶ。それに攻撃力50%分の物理ダメージ。ターゲットが召喚物だったときそれを破壊。自分の場すべてを100ヒール。',
          effects: [
            { type: 'damage', stat: 'atk', mult: 0.5, dmgType: 'physical', target: 'enemyFieldRandom', count: 4, destroyIfSummon: true },
            { type: 'heal', flat: 100, target: 'allyField' },
          ],
        },
      ],
    }],
  }],
}
