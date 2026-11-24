// シーズン補正「異界の共鳴」(Season Bonus — Resonance of Another World)
// 戦闘開始時に、編成に入っているクラス(アミュレットは数えない)ぶんの補正が、そのチームに付く。クラス特性(classTrait)とは別に、両方働く。
// 仕組み: state.season[team] に、付いたクラスと、各補正の数え(コンボの段階など)を持つ。
//   常に計算で出せるもの(エルフ・ナイトメア・ビショップ・ネメシスの速度・ニュートラル)は seasonMods が、ステータス計算(recalc)に足す。
//   そのときの場にいるユニットに、その場で永続バフをかけるもの(ロイヤル・ドラゴン・ネメシスの召喚物)は、各フックの中で u.buffs に足す。
export const SEASON = { id: 'resonance', name: '異界の共鳴', en: 'Resonance of Another World' }
export const SEASON_BONUS = {
  'エルフ': { name: '連鎖する生命', desc: 'コンボが5に到達するたび、自分の場の妖精タイプのユニットすべての攻撃力を15%アップする。この効果は最大3回まで累積する。コンボリセット時、累積効果をすべて失う。' },
  'ロイヤル': { name: '不屈の軍勢', desc: '自分の兵士・フォロワーが場に出たとき、ほかの味方ユニットすべての防御力を10%アップする。この効果は最大3回まで累積する。' },
  'ウィッチ': { name: '魔力循環', desc: 'スペルブーストが発動したとき、25%の固定確率でMPを1回復する。この効果は1ターンに最大2回まで発動する。' },
  'ドラゴン': { name: '竜の鼓動', desc: '覚醒状態になったとき、自分の場のユニットすべての攻撃力を20%アップする。さらに、覚醒状態の間、自分の最大MPが増加するたびに味方全体の速度を3%アップする。' },
  'ナイトメア': { name: '死者の行進', desc: '自分の場のユニットが破壊されたとき、墓場を2獲得する。さらに、墓場が10増えるたび、自分の場の「死者」タイプのユニットすべての攻撃力を5%アップする。' },
  'ビショップ': { name: '聖域の加護', desc: '自分の場にアミュレットがある間、味方全体の防御力を15%アップする。さらに、味方が回復を受けたとき、そのユニットにバリアを付与する。この効果は1ターンに1回まで。' },
  'ネメシス': { name: '機巧の進化', desc: '自分が召喚物を召喚するたび、その召喚物の攻撃力を10%アップする。召喚物が3体以上いる場合、召喚物すべての速度を10%アップする。' },
  'ニュートラル': { name: '均衡の理', desc: '自分の場にいるニュートラルクラスのユニット1体につき、味方全体の与えるダメージを3%アップする。この効果は最大15%まで累積する。' },
}
export const SEASON_CLASSES = Object.keys(SEASON_BONUS)

const hasTypeName = (u, name) => String(u.type || '').split('/').includes(name)

// 編成(キャラの定義の一覧。アミュレットは数えない)に入っているクラス → そのクラスの補正の一覧
export function seasonClassesOf(defs) {
  const out = []
  for (const d of defs || []) if (d && !d.amulet && SEASON_BONUS[d.class] && !out.includes(d.class)) out.push(d.class)
  return out
}
export const newSeason = (defs) => ({ classes: seasonClassesOf(defs), elf: 0, royal: 0, dragonAwake: false, grave: 0, witchTurn: -1, witchCnt: 0, bishopTurn: -1 })
export const seasonHas = (state, team, cls) => !!state.season?.[team]?.classes.includes(cls)

// ステータス計算に足す補正(recalc から呼ぶ)。{ stat, pct } の一覧を返す
export function seasonMods(state, u) {
  const s = state.season?.[u.team]
  if (!s || !s.classes.length || !u.alive) return []
  const mods = []
  const mates = () => state.units.filter((x) => x.alive && x.team === u.team)
  if (s.classes.includes('エルフ') && s.elf > 0 && hasTypeName(u, '妖精') && !u.isAmulet) mods.push({ stat: 'atk', pct: 15 * s.elf })
  if (s.classes.includes('ナイトメア') && hasTypeName(u, '死者') && !u.isAmulet && s.grave >= 10) mods.push({ stat: 'atk', pct: 5 * Math.floor(s.grave / 10) })
  if (s.classes.includes('ビショップ') && !u.isAmulet && mates().some((x) => x.isAmulet)) mods.push({ stat: 'def', pct: 15 })
  if (s.classes.includes('ネメシス') && u.field === 'summon' && !u.isAmulet && mates().filter((x) => x.field === 'summon' && !x.isAmulet).length >= 3) mods.push({ stat: 'spd', pct: 10 })
  if (s.classes.includes('ニュートラル') && !u.isAmulet) {
    const n = mates().filter((x) => !x.isAmulet && x.class === 'ニュートラル').length
    if (n > 0) mods.push({ stat: 'dmgUp', flat: Math.min(15, 3 * n) }) // dmgUp は、基礎値が0なので、%ではなく足し算(+15 = 与えるダメージ1.15倍)
  }
  return mods
}

const say = (state, team, cls, text) => state.log.push(`シーズン補正【${SEASON_BONUS[cls].name}】${text}`)
const fieldOf = (state, team) => state.units.filter((x) => x.alive && x.team === team && !x.isAmulet)
const permBuff = (u, stat, pct) => u.buffs.push({ stat, pct, flat: 0, turns: null, season: true })

// コンボが増えた(before → after)。5に届くたび、エルフの補正が1段階増える(最大3)
export function seasonComboUp(state, team, before, after) {
  const s = state.season?.[team]
  if (!s || !s.classes.includes('エルフ')) return false
  let changed = false
  for (let k = Math.floor(before / 5) + 1; k <= Math.floor(after / 5); k++) {
    if (s.elf < 3) { s.elf += 1; changed = true; say(state, team, 'エルフ', `で、妖精の攻撃力が15%アップした(${s.elf}/3)`) }
  }
  return changed
}
export function seasonComboReset(state, team) {
  const s = state.season?.[team]
  if (!s || !s.classes.includes('エルフ') || s.elf === 0) return false
  s.elf = 0
  say(state, team, 'エルフ', 'の累積効果を失った')
  return true
}

// ユニットが場に出た(召喚・蘇生を含む)。ロイヤル: 兵士・フォロワーが出たとき、ほかの味方の防御力+10%(最大3回)。ネメシス: 召喚物の攻撃力+10%
export function seasonEnter(state, u) {
  const s = state.season?.[u.team]
  if (!s || !s.classes.length || u.isAmulet) return false
  let changed = false
  if (s.classes.includes('ロイヤル') && hasTypeName(u, '兵士') && s.royal < 3) {
    s.royal += 1
    for (const x of fieldOf(state, u.team)) if (x.uid !== u.uid) permBuff(x, 'def', 10)
    say(state, u.team, 'ロイヤル', `で、ほかの味方の防御力が10%アップした(${s.royal}/3)`)
    changed = true
  }
  if (s.classes.includes('ネメシス') && u.field === 'summon') {
    permBuff(u, 'atk', 10)
    say(state, u.team, 'ネメシス', `で、${u.name}の攻撃力が10%アップした`)
    changed = true
  }
  return changed
}

// スペルブーストが発動した。ウィッチ: 25%でMP+1(1ターンに最大2回)
export function seasonBoost(state, team, rng) {
  const s = state.season?.[team]
  if (!s || !s.classes.includes('ウィッチ')) return
  if (s.witchTurn !== state.turns) { s.witchTurn = state.turns; s.witchCnt = 0 }
  if (s.witchCnt >= 2) return
  if (rng() >= 0.25) return
  s.witchCnt += 1
  state.mp[team] = Math.min(state.mpMax[team], state.mp[team] + 1)
  say(state, team, 'ウィッチ', `で、MPを1回復した(このターン${s.witchCnt}/2)`)
}

// 最大MPが変わった(before → after)。ドラゴン: 覚醒状態になったとき攻撃力+20%、覚醒中は最大MPが増えるたび味方全体の速度+3%
export function seasonMpMax(state, team, before, after, awakenMp) {
  const s = state.season?.[team]
  if (!s || !s.classes.includes('ドラゴン') || !(after > before)) return false
  let changed = false
  if (before < awakenMp && after >= awakenMp && !s.dragonAwake) {
    s.dragonAwake = true
    for (const x of fieldOf(state, team)) permBuff(x, 'atk', 20)
    say(state, team, 'ドラゴン', 'で、自分の場の攻撃力が20%アップした')
    changed = true
  } else if (s.dragonAwake) {
    for (const x of fieldOf(state, team)) permBuff(x, 'spd', 3)
    say(state, team, 'ドラゴン', 'で、味方全体の速度が3%アップした')
    changed = true
  }
  return changed
}

// 墓場が増えた(攻撃を受けた・倒された)。ナイトメア: 増えた分を数える(10増えるたび、死者の攻撃力+5%。墓場を消費しても、増えた分は消えない)
export function seasonGrave(state, team, n) {
  const s = state.season?.[team]
  if (!s || !s.classes.includes('ナイトメア') || !(n > 0)) return false
  const before = Math.floor(s.grave / 10)
  s.grave += n
  return Math.floor(s.grave / 10) > before
}
// 自分の場のユニット(アミュレットを除く)が破壊された。ナイトメア: 墓場+2
export function seasonDestroyed(state, u) {
  const s = state.season?.[u.team]
  if (!s || !s.classes.includes('ナイトメア') || u.isAmulet) return false
  state.graveyard[u.team] += 2
  say(state, u.team, 'ナイトメア', 'で、墓場を2獲得した')
  seasonGrave(state, u.team, 2)
  return true
}

// 味方が回復を受けた。ビショップ: そのユニットにバリア(1ターンに1回)
export function seasonHealed(state, u) {
  const s = state.season?.[u.team]
  if (!s || !s.classes.includes('ビショップ') || u.isAmulet) return
  if (s.bishopTurn === state.turns) return
  s.bishopTurn = state.turns
  u.barrier = 1
  say(state, u.team, 'ビショップ', `で、${u.name}はバリアを得た`)
}
