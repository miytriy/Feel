// ナイト(トークン。召喚されて出てくる)。ローテーション: クロニクル・オブ・デスティニー
// ※仮のデータ: 性能(ステータス・能力・タイプ)はまだ受け取っていない。タイプは、マーズの【常時】が効くように「兵士」と仮置き。カードの性能が届いたら差し替える
export default {
  id: 'royal_8_token_01', name: 'ナイト', class: 'ロイヤル', rarity: 'bronze', token: true, type: '兵士',
  stats: { hp: 300, atk: 300, def: 90, spd: 60 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [],
}
