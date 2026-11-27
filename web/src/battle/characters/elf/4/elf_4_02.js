// 風の理・イーウィヤ(レジェンド / ローテーション: 蒼空の六竜 = フォルダ 4)。タイプなし(ー)
export default {
  id: 'elf_4_02', name: '風の理・イーウィヤ', class: 'エルフ', rarity: 'legend',
  stats: { hp: 110, atk: 200, def: 100, spd: 92 },
  tags: ['EP回復', 'サポーター'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
  passives: [
    'rush', // 【突進】
  ],
  // 【アクティブ】【奥義】: MPを10消費(奥義ゲージ10以上のときだけ使える)。EPを1回復
  traits: [{
    id: 'active', name: 'アクティブ', cost: 10, target: 'self', condition: { ultimate: true },
    desc: '【アクティブ】【奥義】MPを10消費する。EPを1回復。',
    log: 'EPを1回復。',
    effects: [{ type: 'ep', amount: 1 }],
  }],
}
