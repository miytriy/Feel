import mimi from '../tokens/nightmare_token_06.js' // 召喚する『番犬の右腕・ミミ』
import coco from '../tokens/nightmare_token_07.js' // 召喚する『番犬の左腕・ココ』

// 奔放なる獄炎・ケルベロス(ローテーション: 伝説の幕開け = フォルダ 1)
export default {
  id: 'nightmare_16', name: '奔放なる獄炎・ケルベロス', class: 'ナイトメア', rarity: 'legend',
  stats: { hp: 600, atk: 618, def: 90, spd: 36 },
  tags: ['召喚物生成', '蘇生', 'バフ', 'サポーター'],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 相手単体に攻撃力100%分の物理ダメージ
  passives: [
    {
      name: 'ファンファーレ', trigger: 'fanfare',
      desc: '『番犬の右腕・ミミ』1体と『番犬の左腕・ココ』1体を召喚する。【ネクロマンス_6】自分の場の他のフォロワーすべては+200/+0する。',
      effects: [
        { type: 'summon', count: 1, unit: mimi },
        { type: 'summon', count: 1, unit: coco },
        // 【ネクロマンス_6】= graveCost: 6(墓場を6消費して働く。足りないときはこの効果だけ働かない)
        // フォロワー = キャラクターと召喚物(アミュレットは含まない)。召喚した2体にもかかる
        { type: 'buff', stat: 'atk', flat: 200, target: 'otherAllies', followers: true, graveCost: 6 },
      ],
    },
    {
      name: '進化時', trigger: 'onEvolve',
      desc: '【リアニメイト_100】を2回行う。',
      effects: [{ type: 'reanimate', speed: 100, repeat: 2 }],
    },
  ],
}
