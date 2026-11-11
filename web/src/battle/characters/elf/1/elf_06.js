export default {
  id: 'elf_06', name: '働きバッタ', class: 'エルフ', rarity: 'bronze',
  stats: { hp: 110, atk: 207, def: 100, spd: 81 },
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 },
  passives: [{
    name: 'ファンファーレ', trigger: 'fanfare', usesCombo: true,
    desc: '自分の場のフォロワーから速度X×10以下のランダム1体と同名を召喚する。Xはコンボであり、最大10まで適用される。',
    log: '自分の場のキャラクターから速度X以下のランダム1体と同名を召喚する。', // 左のログに出す文
    effects: [{ type: 'summon', fromOwned: true, fromField: true, speedPerCombo: 10, maxCombo: 10 }],
  }],
}
