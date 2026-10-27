export default {
  id: 'witch_01', name: '見習い占星術師', class: 'ウィッチ', rarity: 'bronze',
  stats: { hp: 203, atk: 220, def: 90, spd: 80 },
  skill: { name: '攻撃', stat: 'mag', type: 'magic', mult: 1.25 }, // 魔力125%分の魔法ダメージ
  passives: [
    { name: 'ファンファーレ', trigger: 'fanfare', desc: '自分の場の土の印を+1する。', effects: [{ type: 'earth', amount: 1 }] },
  ],
}
