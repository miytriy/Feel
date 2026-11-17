import improved from './tokens/nemesis_token_02.js' // 召喚する『改良型・操り人形』

// オートマタアサシン(ローテーション: 伝説の幕開け = フォルダ 1)。タイプなし(ー)
export default {
  id: 'nemesis_04', name: 'オートマタアサシン', class: 'ネメシス', rarity: 'bronze',
  stats: { hp: 214, atk: 229, def: 90, spd: 82 },
  tags: ['展開', 'サブアタッカー'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '『改良型・操り人形』1体を召喚する。', effects: [{ type: 'summon', count: 1, unit: improved }] },
    // enterType: 出てきたのが「タイプ:人形」のときだけ働く / oncePerTurn: それぞれのキャラクターのターンごとに1回まで
    { name: '常時', trigger: 'allyEnter', enterType: '人形', oncePerTurn: true, desc: '自分の「人形タイプ」のユニットが場に出たとき、それぞれのキャラクターのターンごとに1回、それは【必殺】を持つ。', log: 'それは【必殺】を持つ。', effects: [{ type: 'gainKeyword', keyword: 'finisher', target: 'entered' }] },
  ],
}
