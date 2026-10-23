export default {
  id: 'dragon_06', name: '白鱗の御使い', class: 'ドラゴン', rarity: 'bronze',
  stats: { hp: 402, atk: 440, def: 90, spd: 70 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
  passives: [
    // 【覚醒】= condition: { awaken: true }(自分のMP最大値が7以上。数字は engine.js の AWAKEN_MP)
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '【覚醒】なら、自分の場すべてを140ヒールする。', effects: [{ type: 'heal', flat: 140, target: 'allyField', condition: { awaken: true } }] },
  ],
}
