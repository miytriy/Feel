// スペル(プレイヤー能力): ローテーション: ベーシック(フォルダ basic)。タイプなし(ー)
// 【リアニメイト_90】= reanimate(speed: 90): 自分の倒れたキャラ・召喚物のうち、速度が90のものからランダム1体を、元いた場所に蘇生する
export default {
  id: 'nightmare_spell_04', name: 'カオティックカース', class: 'ナイトメア/スペル', rarity: 'bronze',
  cost: 2, // MP
  log: false, // スペルを使った瞬間のログは出さず、選んだモードのログを出す
  desc: '【モード】1つを選んでその能力が働く。(1)最も近い味方1体の行動順10%アップ。(2)【リアニメイト_90】を行う。',
  effects: [{
    type: 'mode',
    prompt: '使うモードを選んでください',
    modes: [
      { name: '行動順アップ', desc: '最も近い味方1体の行動順10%アップ。', log: '最も近い味方1体の行動順10%アップ。', effects: [{ type: 'advance', pct: 10, target: 'nearestAlly' }] },
      { name: 'リアニメイト_90', desc: '【リアニメイト_90】を行う。', log: '【リアニメイト_90】を行う。', effects: [{ type: 'reanimate', speed: 90 }] },
    ],
  }],
}
