// 穏やかなる教会(ローテーション: 伝説の幕開け = フォルダ 1)。タイプなし(ー)・パッシブなし(ー)
export default {
  id: 'bishop_amulet_01', name: '穏やかなる教会', class: 'ビショップ', rarity: 'bronze', amulet: true, countdown: 3, // 【カウントダウン_3】
  stats: { hp: 1, atk: 0, def: 0, spd: 100 }, // アミュレットには体力の概念がない(数字は使われません)
  skill: { name: '-', stat: 'atk', type: 'physical', mult: 0 },
  passives: [
    { name: 'ラストワード', trigger: 'lastWord', desc: '最も近い味方1体の行動順20%アップ。', effects: [{ type: 'advance', pct: 20, target: 'nearestAlly' }] },
  ],
  traits: [{
    id: 'act', name: 'アクト', cost: 1, target: 'self', // repeatable を付けない = 1ターンに1回まで
    desc: '【アクト】これのカウントを-1する。',
    effects: [{ type: 'countdown', amount: -1, target: 'self' }],
  }],
}
