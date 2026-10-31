<<<<<<< HEAD
// 青薔薇の令嬢・セレス(ローテーション: 伝説の幕開け = フォルダ 1)
export default {
  id: 'nightmare_09', name: '青薔薇の令嬢・セレス', class: 'ナイトメア', rarity: 'gold',
  stats: { hp: 400, atk: 111, def: 300, spd: 70 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    'finisher', // 【必殺】
    'barrier', // 【バリア】(特性の「これは【バリア】を持つ」)
    {
      name: 'ターン終了時', trigger: 'turnEnd',
      desc: '自分のターン終了時、自分の場のキャラクターからランダム1体を150ヒール。これが進化後なら、150ヒールではなく250ヒール。',
      effects: [
        { type: 'heal', flat: 150, target: 'allyFieldRandom', condition: { evolved: false } },
        { type: 'heal', flat: 250, target: 'allyFieldRandom', condition: { evolved: true } },
      ],
    },
=======
import ghost from './tokens/nightmare_token_02.js' // 召喚する「ゴースト」は nightmare_token_02.js のキャラです

export default {
  id: 'nightmare_09', name: '瞑地の天宮・ムカン', class: 'ナイトメア', rarity: 'gold',
  stats: { hp: 330, atk: 333, def: 90, spd: 70 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    // 【ネクロマンス_8】= graveCost: 8(墓場を8消費して働く。足りないときは進化しない)
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '【ネクロマンス_8】これは進化する。', effects: [{ type: 'evolve', graveCost: 8 }] },
    // enterType: 出てきたのが「タイプ:死者」のときだけ働く
    { name: '死者の必殺', trigger: 'allyEnter', enterType: '死者', desc: '自分の場に「タイプ:死者」が出たとき、それは【必殺】を持つ。', effects: [{ type: 'gainKeyword', keyword: 'finisher', target: 'entered' }] },
    // 進化したとき(EPでも、効果での進化でも働く)
    { name: '進化したとき', trigger: 'onEvolved', desc: 'これが進化したとき、『ゴースト』1体を召喚する。', effects: [{ type: 'summon', count: 1, unit: ghost }] },
>>>>>>> f065e03 (瞑地の天宮・ムカン(nightmare_09)を追加)
  ],
}
