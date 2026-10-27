// 腐臭のゾンビ(トークン。召喚されて出てくる。tokens フォルダの中は、キャラ一覧・ガチャには自動では入らない)
// 倒れると、自分と同じ「腐臭のゾンビ」を1体召喚する。ただし、召喚されたほうは【ラストワード】を持たない(連鎖しない)
const base = {
  id: 'nightmare_token_04', name: '腐臭のゾンビ', class: 'ナイトメア', rarity: 'bronze', type: 'トークン/死者',
  stats: { hp: 200, atk: 200, def: 90, spd: 80 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
}
const afterLife = { ...base, passives: [] } // 召喚されるゾンビ: 【ラストワード】を失っている

export default {
  ...base,
  passives: [
    { name: 'ラストワード', trigger: 'lastWord', desc: '『腐臭のゾンビ』1体を召喚する。それは【ラストワード】を失う。', effects: [{ type: 'summon', count: 1, unit: afterLife }] },
  ],
}
