import ghost from './tokens/nightmare_token_02.js' // 召喚する「ゴースト」は nightmare_token_02.js のキャラです
import bat from './tokens/nightmare_token_03.js' // 召喚する「バット」は nightmare_token_03.js のキャラです

export default {
  id: 'nightmare_08', name: '怪奇の探索者・ユナ', class: 'ナイトメア', rarity: 'silver',
  stats: { hp: 520, atk: 308, def: 201, spd: 70 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    'guard', // 【守護】
    { name: 'ラストワード', trigger: 'lastWord', desc: '『ゴースト』『バット』それぞれ1体を召喚する。',
      effects: [{ type: 'summon', count: 1, unit: ghost }, { type: 'summon', count: 1, unit: bat }] },
  ],
}
