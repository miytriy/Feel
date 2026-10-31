export default {
  id: 'nightmare_2_06', name: '流れ堕つ冥河・カローン', class: 'ナイトメア', rarity: 'legend',
  stats: { hp: 400, atk: 410, def: 90, spd: 60 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    // 【リアニメイト_N】= reanimate(speed: N): 自分の倒れたキャラ・召喚物のうち、速度がNのものからランダム1体を、元いた場所に蘇生する
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '【リアニメイト_90】と【リアニメイト_100】を行う。',
      effects: [{ type: 'reanimate', speed: 90 }, { type: 'reanimate', speed: 100 }] },
    { name: '死者の守護', trigger: 'allyEnter', enterType: '死者', desc: '自分の「タイプ:死者」が出たとき、それは【守護】を持つ。', effects: [{ type: 'gainKeyword', keyword: 'guard', target: 'entered' }] },
    {
      name: '進化時', trigger: 'onEvolve',
      desc: '自分は『クレスト:流れ堕つ冥河・カローン』を持つ。',
      effects: [{
        type: 'crest',
        crest: {
          name: '流れ堕つ冥河・カローン',
          desc: '【カウントダウン_2】カローンのターン開始時、【リアニメイト_80】を行う。',
          countdown: 2,
          passives: [
            { name: 'ターン開始時', trigger: 'turnStart', desc: '【リアニメイト_80】を行う。', effects: [{ type: 'reanimate', speed: 80 }] },
          ],
        },
      }],
    },
  ],
}
