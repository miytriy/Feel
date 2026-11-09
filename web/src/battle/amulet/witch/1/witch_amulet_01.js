// トークン「大地の魔片」(土の印を持つアミュレット)。召喚するキャラのファイルから import して使う。
// amulet/クラス名/ フォルダ(ファイル名=id)。token: true なので、ガチャ・編成には入らない(召喚・設置専用)。
export default {
  id: 'witch_amulet_01', name: '大地の魔片', class: 'ウィッチ', rarity: 'bronze', token: true, type: '土の印', amulet: true,
  stats: { hp: 1, atk: 0, def: 0, spd: 100 }, // アミュレットには体力の概念がない(数字は使われません)
  skill: { name: '-', stat: 'atk', type: 'physical', mult: 0 },
  passives: ['earthSign'],
  traits: [{
    id: 'act', name: 'アクト', cost: 1, target: 'self', // repeatable を付けない = 1ターンに1回まで
    desc: '【アクト】自分の場の土の印を+1する。',
    effects: [{ type: 'earth', amount: 1 }],
  }],
}
