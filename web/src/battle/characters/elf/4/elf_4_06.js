// 調和の舞手・ユエル&ソシエ(レジェンド / ローテーション: 蒼空の六竜 = フォルダ 4)。タイプなし(ー)
export default {
  id: 'elf_4_06', name: '調和の舞手・ユエル&ソシエ', class: 'エルフ', rarity: 'legend',
  stats: { hp: 320, atk: 409, def: 100, spd: 65 },
  tags: ['大ダメージ', '範囲攻撃', '展開', 'メインアタッカー'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
  passives: [
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '「相手の場のフォロワーからランダム1体に400の物理ダメージ。」を2回行う。',
      log: '相手の場のフォロワーからランダム1体に400の物理ダメージ。(2回)',
      effects: [{ type: 'damage', stat: 'atk', mult: 0, add: 400, dmgType: 'physical', target: 'enemyFollowerRandom', repeat: 2 }],
    },
    {
      name: '進化時', trigger: 'onEvolved',
      desc: '自分は『クレスト：調和の舞手・ユエル&ソシエ』を持つ。',
      log: '自分は『クレスト：調和の舞手・ユエル&ソシエ』を持つ。',
      effects: [{
        type: 'crest',
        crest: {
          name: '調和の舞手・ユエル&ソシエ', countdown: 4, // 【カウントダウン_4】
          desc: '【カウントダウン_4】味方がフォロワーを召喚したとき、味方のターンごとに1回、それは進化する。',
          passives: [
            { name: '味方が召喚したとき', trigger: 'allyEnter', oncePerTurn: true, desc: '味方がフォロワーを召喚したとき、味方のターンごとに1回、それは進化する。', log: 'それは進化する。', effects: [{ type: 'evolve', target: 'entered' }] },
          ],
        },
      }],
    },
  ],
}
