import puppet from './tokens/nemesis_token_01.js' // 召喚する『操り人形』

// 愛執のドールユーザー(ローテーション: 伝説の幕開け = フォルダ 1)。タイプなし(ー)
const summonPuppet = [{ type: 'summon', count: 1, unit: puppet }]
export default {
  id: 'nemesis_03', name: '愛執のドールユーザー', class: 'ネメシス', rarity: 'silver',
  stats: { hp: 246, atk: 253, def: 90, spd: 92 },
  tags: ['展開', 'サブアタッカー'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '『操り人形』1体を召喚する。', effects: summonPuppet },
    { name: '進化時', trigger: 'onEvolve', desc: '【ファンファーレ】と同じ能力が働く。', log: '『操り人形』1体を召喚する。', effects: summonPuppet },
  ],
}
