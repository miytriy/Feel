// フェアリー(単独のキャラ。純粋なるウォーターフェアリー(elf_01.js)の【ラストワード】でも、このデータがそのまま召喚されます)
export default {
  id: 'elf_token_01', name: 'フェアリー', class: 'エルフ', rarity: 'bronze', type: 'トークン/妖精',
  stats: { hp: 100, atk: 100, def: 90, spd: 100 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: ['rush'], // 【突進】
}
