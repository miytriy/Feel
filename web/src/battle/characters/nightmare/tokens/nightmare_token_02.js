// ゴースト(トークン。召喚されて出てくる。tokens フォルダの中は、キャラ一覧・ガチャには自動では入らない)
export default {
  id: 'nightmare_token_02', name: 'ゴースト', class: 'ナイトメア', rarity: 'bronze', type: 'トークン/死者',
  stats: { hp: 100, atk: 100, def: 90, spd: 100 },
  passives: [
    'dash', // 【疾走】
    // 場を離れる場合(HPが0になって破壊されるときも)、破壊ではなく消滅する。効果は engine の resolveDeaths が処理する
    { name: '消滅', trigger: 'onLeave', desc: '場を離れる場合、これを消滅。', effects: [] },
    { name: '消滅', trigger: 'turnEnd', desc: '自分のターン終了時、これを消滅。', effects: [{ type: 'vanish', target: 'self' }] },
  ],
  skill: { name: '攻撃', stat: 'atk', type: 'physical', mult: 1.0 }, // 敵単体に攻撃力100%分の物理ダメージ
}
