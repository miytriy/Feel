import EARTH_SHARD from './amulet/witch/1/witch_amulet_01.js' // 土の印がないときに召喚される「大地の魔片」
// Feel Battle - バトルの処理(段階4: アーマー・墓場・召喚物・アミュレット・遺物 を追加。段階3までの進化・EP・信仰値・カウントダウン・クレスト・連携・奥義・アクセラレートを含む)
// 画面やFirebaseには依存しません。「状態 + 行動 → 新しい状態」の形で作ってあります。

const AV_BASE = 10000 // 初期行動値 = 10000 ÷ 速度
const ROUND_AV = 100 // 行動値が100進むごとに1ラウンド
const EPS = 1e-9
const COMBO_RESET_K = 150 // コンボリセットの行動値 Tr = K × N (N = 【コンボ_◯】を持つ味方の数)
const MP_CAP = 10 // MPの最大値の上限
const AWAKEN_MP = 7 // 【覚醒】: 自分のMP最大値がこれ以上のとき(数字を変えるときは、ここだけ直す)
const EP_MAX = 2 // EPの最大ストック
const EP_GRANT_ROUND = 5 // このラウンドの開始時にEPをもらう
const EP_GRANT = 2 // もらえるEPの数
const CREST_MAX = 5 // クレストを置ける数
const ULTIMATE_GAUGE = 10 // 奥義ゲージがこの値以上のとき【奥義】が働く
const LIBERATION_GAUGE = 15 // 奥義ゲージがこの値以上のとき【解放奥義】が働く
const MAX_ACTIONS_PER_TURN = 30 // 1ターンに使える特性・進化の回数の安全上限
const MAX_TURNS = 1500 // これを超えたら引き分け(膠着対策)
const MAGIC_CONVERSION = 0.7 // 魔力参照の攻撃は、攻撃力の70%を魔力に変換する
const FINISHER_RATE = 0.35 // 必殺: 相手の現在HPの35%
const STATS = ['atk', 'mag', 'def', 'spd', 'critRate', 'critDmg', 'dmgResist']

// 画面表示用: キーワード能力の名前と説明
// ---------- クラス特性 ----------
// チーム編成を、すべてそのクラスのキャラクターにそろえたときに働く常時特性(ニュートラルを混ぜると、働かない)
export const CLASS_TRAITS = {
  'エルフ': { name: 'コンボリセットの初期行動値+20%', desc: 'コンボリセットの初期行動値+20%' },
  'ロイヤル': { name: '場すべてのスキルダメージ+20%', desc: '自分の場すべてのスキルダメージ+20%' },
  'ウィッチ': { name: 'スペルブースト・土の印の蓄積効率+25%', desc: 'スペルブースト・土の印の蓄積効率+25%' },
  'ドラゴン': { name: 'ラウンド1の最大MP増加量+1', desc: 'ラウンド1の最大MP増加量+1' },
  'ナイトメア': { name: '「死者」のダメージ+29%', desc: '「死者」のキャラクターのダメージ+29%' },
  'ビショップ': { name: '場すべての防御力+18%', desc: '自分の場すべての防御力+18%' },
  'ネメシス': { name: '「人形」の体力+15%・速度+3%', desc: '「人形」キャラクターの体力+15%、速度+3%' },
  'ニュートラル': { name: '物理耐性+15%', desc: '物理耐性+15%' },
}
// 編成(キャラの定義の一覧。アミュレットは数えない)が、すべて同じクラスなら、そのクラスを返す。そろっていなければ null
export function classTraitOf(defs) {
  const mains = (defs || []).filter((d) => d && !d.amulet)
  if (!mains.length) return null
  const cls = mains[0].class
  return CLASS_TRAITS[cls] && mains.every((d) => d.class === cls) ? cls : null
}
const hasTypeName = (u, name) => String(u.type || '').split('/').includes(name)

export const KEYWORDS = {
  guard: { label: '守護', desc: '相手は守護を持つキャラ以外を攻撃できない' },
  stealth: { label: '潜伏', desc: '相手の特性で選ばれず、攻撃もされない。攻撃するか能力でダメージを与えると失う' },
  aura: { label: 'オーラ', desc: '相手の能力で選ばれない' },
  intimidate: { label: '威圧', desc: '相手のスキルで選ばれない' },
  rush: { label: '突進', desc: '場に出たターンでもスキルを発動できる' },
  dash: { label: '疾走', desc: '場に出たターンでもスキルを発動できる。ラウンド開始時に行動順100%アップ' },
  finisher: { label: '必殺', desc: 'スキルでダメージを与えたとき、相手の現在HP35%の固定ダメージ(防御無視)' },
  drain: { label: 'ドレイン', desc: 'スキルで与えたダメージと同じだけ自身を回復' },
  barrier: { label: 'バリア', desc: '攻撃を一回0ダメージにして壊れる' },
  earthSign: { label: '土の印', desc: '自分の場の土の印の数は合算される。土の印は土の秘術によって消費される。これは能力で破壊できず、相手の能力で選ばれない' },
}
export const TRIGGER_LABELS = {
  fanfare: 'ファンファーレ', constant: '常時', active: 'アクティブ', lastWord: 'ラストワード',
  onAttack: '攻撃時', onEngage: '交戦時', combo: 'コンボ', onEvolve: '進化時', onEvolved: '進化したとき', turnEnd: 'ターン終了時', onLeave: '場を離れる場合', onEnter: '場に出たとき', enemyTurnEnd: '相手のターン終了時',
  roundStart: 'ラウンド開始時', allyDeath: '味方が戦闘不能になったとき', allyEnter: '味方が場に出たとき', allyTurnStart: '味方のターン開始時', link: '連携', onBoost: 'スペルブースト時', allyHeal: '味方が回復したとき',
}

// ---------- 遺物(頭・胴・脚・靴のセットを装備したキャラに、セット効果がつく) ----------
// pct = 元のステータスに対する+%、flat = そのまま足す値(少女の物語は%ではなく、耐性値+10)
export const RELICS = {
  'ピエロの祝福': { desc: '攻撃力 +12%', mods: [{ stat: 'atk', pct: 12 }] },
  '鬼の形相': { desc: 'HP +21%', mods: [{ stat: 'hp', pct: 21 }] },
  '月と太陽の印字': { desc: '魔力 +13%', mods: [{ stat: 'mag', pct: 13 }] },
  '紅血の証': { desc: '防御力 +29%', mods: [{ stat: 'def', pct: 29 }] },
  '少女の物語': { desc: 'ダメージ耐性値 +10', mods: [{ stat: 'dmgResist', flat: 10 }] },
}

// ---------- ユニットの作成 ----------

// アクセラレート: キャラ本体とは別の速度をもつ特性(行動バーに本体とは別の枠として並ぶ)
function makeAccel(a) {
  const av = AV_BASE / a.speed
  return { ...JSON.parse(JSON.stringify(a)), id: a.id || 'accelerate', speed: a.speed, baseAV: av, curAV: av }
}

// クラス特性を、キャラ(召喚されたものも)に反映する。体力は、ここで増やす(ネメシス: 「人形」の体力+15%)
function applyClassTrait(u, trait) {
  u.ct = trait || null
  if (trait === 'ネメシス' && hasTypeName(u, '人形') && !u.isAmulet) {
    const up = Math.round(u.maxHp * 0.15)
    u.maxHp += up; u.baseMaxHp += up; u.hp += up
  }
}
// 蓄積効率+25%(ウィッチ): 増えるぶんに25%を足す。端数は、次に持ち越す
function witchBonus(state, team, kind, n) {
  if (state.classTrait?.[team] !== 'ウィッチ' || !(n > 0)) return 0
  const c = state.ctCarry[team]
  c[kind] += n * 0.25
  const extra = Math.floor(c[kind] + 1e-9)
  c[kind] -= extra
  return extra
}

function makeUnit(def, team, index, field = 'main', uid = null) {
  const s = { ...def.stats }
  const base = {
    atk: s.atk, mag: s.mag ?? 0, def: s.def, spd: s.spd,
    critRate: s.critRate ?? 5, critDmg: s.critDmg ?? 50, dmgResist: s.dmgResist ?? 0,
  }
  // 遺物のセット効果(def.relic に遺物の名前を書く)を、元のステータスに反映する
  const relic = def.relic ? RELICS[def.relic] : null
  if (def.relic && !relic) throw new Error(`知らない遺物です: ${def.relic}`)
  for (const m of relic ? relic.mods : []) {
    const cur = m.stat === 'hp' ? s.hp : base[m.stat]
    const next = Math.round(cur * (1 + (m.pct || 0) / 100) + (m.flat || 0))
    if (m.stat === 'hp') s.hp = next
    else base[m.stat] = next
  }
  const passives = def.passives || []
  const rawKw = passives.filter((p) => typeof p === 'string')
  const keywords = rawKw.map((k) => (/^stealth_\d+$/.test(k) ? 'stealth' : k)) // 'stealth_3' = 【潜伏_3】(3ターンごとに潜伏が戻る)
  const stealthEvery = Number(rawKw.map((k) => /^stealth_(\d+)$/.exec(k)).find(Boolean)?.[1]) || null
  const clone = (x) => JSON.parse(JSON.stringify(x))
  return {
    ct: null, // ct: このキャラのチームで働いているクラス特性(クラス名。働いていなければ null)
    uid: uid || `${team}${index}`, defId: def.id, name: def.name, class: def.class, type: def.type || null, team, relic: def.relic || null, // type: キャラのタイプ(妖精など)
    field, // 'main' = 場のキャラ / 'summon' = 召喚物フィールドの召喚物・アミュレット
    isAmulet: field === 'summon' && !!def.amulet, // アミュレット: スキル攻撃はできず、相手のスキル攻撃の対象にもならない
    maxHp: s.hp, baseMaxHp: s.hp, hp: s.hp, armor: 0, armorRate: 1,
    base, ...base,
    baseAV: AV_BASE / base.spd, curAV: AV_BASE / base.spd,
    skill: { ...def.skill },
    keywords,
    passiveObjs: clone(passives.filter((p) => typeof p === 'object')),
    traits: clone(def.traits || []),
    stealth: keywords.includes('stealth'), stealthEvery, stealthTimer: null,
    barrier: keywords.includes('barrier') ? 1 : 0,
    evolvable: !(field === 'summon' && def.amulet) && def.evolvable !== false, evolved: false, charDef: def, // 召喚物も進化できる(アミュレットだけ進化しない)。def: 「自分と同じキャラを召喚」のために元の定義を持つ
    accel: def.accelerate ? makeAccel(def.accelerate) : null,
    countdown: def.countdown ?? null,
    comboCount: 0, boost: 0, earthCount: 0, // earthCount: 【土の印】アミュレットに溜まっている土の印の数
    buffs: [], usedTraits: [],
    hasActed: false, alive: true, deathHandled: false, killedBy: null,
  }
}

export const MAX_SPELL_SLOTS = 3 // スペルセットで有効化できる回数(環境を見て変更する予定)

function makeSpell(def, i) {
  const sp = { slot: `sp${i}`, id: def.id, name: def.name, cost: def.cost ?? 0, baseDesc: def.desc ?? '', desc: def.desc ?? '', baseEffects: def.effects, effects: def.effects, onBoost: def.onBoost || null, x: def.onBoost?.startX ?? 1, used: false }
  refreshSpell(sp)
  return sp
}
// ブーストで育つスペル(onBoost を持つもの): いまのXを、効果(addX × X を add に)と説明に反映する
function refreshSpell(sp) {
  if (!sp.onBoost) return
  sp.effects = sp.baseEffects.map((e) => (e.addX != null ? { ...e, add: e.addX * sp.x } : e))
  sp.desc = `${sp.baseDesc}(いま X=${sp.x})`
}
// スペルブースト(発動したスペル以外も、効果で): 手札(スペルセット)の、onBoost を持つスペルが育つ。Xが増え、必要MPも増える(増えるのは maxCostUps 回まで)
// スペル1つを n 回スペルブーストする(Xが増え、必要MPも増える。transform があれば、Xが条件に届いたとき別のスペルに変身する)
function growSpell(state, team, sp, n) {
  for (let k = 0; k < n; k++) {
    sp.x = Math.min(sp.onBoost.maxX ?? 99, sp.x + (sp.onBoost.x ?? 1)) // Xの増加は maxX(99)まで
    if ((sp.costUps || 0) < (sp.onBoost.maxCostUps ?? 9)) { sp.cost += sp.onBoost.cost ?? 0; sp.costUps = (sp.costUps || 0) + 1 } // MPが増えるのは maxCostUps(9)回まで
    const tf = sp.onBoost.transform // 例: { at: 5, into: スペル定義 }(「Xが5以上なら、これは〇〇に変身する」)
    if (tf && sp.x >= tf.at) {
      const i = state.spells[team].indexOf(sp)
      if (i >= 0) {
        const next = makeSpell(tf.into, i)
        next.slot = sp.slot
        next.used = sp.used
        state.spells[team][i] = next
        state.log.push(`スペル【${sp.name}】は【${next.name}】に変身した`)
        return next
      }
    }
  }
  refreshSpell(sp)
  return sp
}
function boostSpells(state, team, n, except = null) {
  for (const sp of [...state.spells[team]]) {
    if (!sp.onBoost || sp === except) continue
    growSpell(state, team, sp, n)
  }
}

// キャラクターが、スペルブーストされた(boost の回数を数え、【スペルブースト時】のパッシブが働く)
function boostUnit(state, u, n) {
  u.boost = (u.boost || 0) + n
  state.log.push(`${u.name}はスペルブーストした(${u.boost}回)`)
  if (!(u.passiveObjs || []).some((p) => p.trigger === 'onBoost')) return
  for (let k = 0; k < n && !state.pending; k++) fire(state, 'onBoost', u, {})
}
// 場の【スペルブースト時】を持つキャラクター全員が、スペルブーストされる
function boostFieldUnits(state, team, n) {
  for (const u of state.units) {
    if (u.alive && u.field === 'main' && u.team === team && (u.passiveObjs || []).some((p) => p.trigger === 'onBoost')) boostUnit(state, u, n)
  }
}

// バトルを作る(teamA = プレイヤー側, teamB = 相手側。最大5体ずつ)
// opts.comboMode: 'old' = 従来(コンボ持ち自身のターンが終わると数え直す) / 'reset' = β(味方のアクションバーに「コンボリセット」が並ぶ)
export function createBattle(teamADefs, teamBDefs, opts = {}) {
  // キャラは最大5体(アミュレットは別に数える。最大2つ)
  const mainCount = (defs) => defs.filter((d) => !d.amulet).length
  if (teamADefs.length < 1 || mainCount(teamADefs) > 5 || teamADefs.length > 7 || teamBDefs.length < 1 || mainCount(teamBDefs) > 5 || teamBDefs.length > 7) {
    throw new Error('編成は、キャラ1〜5体(アミュレットは別に2つまで)にしてください')
  }
  // アミュレット(amulet: true)を編成に入れた場合は、バトル開始時から召喚物の場(アミュレット置き場)にいる。キャラは最低1体必要
  const build = (defs, team) => {
    const mains = defs.filter((d) => !d.amulet)
    if (mains.length < 1) throw new Error('キャラを1体以上編成してください(アミュレットだけでは戦えません)')
    let seq = 0
    return [
      ...mains.map((d, i) => makeUnit(d, team, i)),
      ...defs.filter((d) => d.amulet).map((d, i) => makeUnit(d, team, mains.length + i, 'summon', `${team}s${++seq}`)),
    ]
  }
  const units = [...build(teamADefs, 'A'), ...build(teamBDefs, 'B')]
  const classTrait = { A: classTraitOf(teamADefs), B: classTraitOf(teamBDefs) }
  for (const u of units) applyClassTrait(u, classTrait[u.team])
  const startSummons = { A: units.filter((u) => u.team === 'A' && u.field === 'summon').length, B: units.filter((u) => u.team === 'B' && u.field === 'summon').length }
  const state = {
    units, classTrait, ctCarry: { A: { boost: 0, earth: 0 }, B: { boost: 0, earth: 0 } }, totalAV: 0, round: 0, turns: 0, actionsThisTurn: 0,
    mp: { A: 0, B: 0 }, mpMax: { A: 0, B: 0 }, ep: { A: 0, B: 0 },
    faith: { A: 0, B: 0 }, boost: { A: 0, B: 0 }, earth: { A: 0, B: 0 }, crests: { A: [], B: [] }, graveyard: { A: 0, B: 0 },
    link: { A: 0, B: 0 }, traitCount: { A: 0, B: 0 }, summonSeq: Math.max(startSummons.A, startSummons.B), pending: null,
    active: null, activeKind: null, winner: null, log: ['バトル開始!'],
    comboMode: opts.comboMode === 'reset' ? 'reset' : 'old', comboReset: { A: null, B: null }, comboCount: { A: 0, B: 0 },
    pool: { A: opts.pool?.A || [], B: opts.pool?.B || [] }, // 所持キャラクター(「所持キャラから召喚する」能力の候補)
    // スペル(プレイヤー能力): opts.spells = { A: [スペル定義...], B: [...] }(同じスペルを何回入れてもよい。最大 MAX_SPELL_SLOTS 回分)
    // 自分のキャラのターン中に、枠1つにつき1回、MPを払って使える
    spells: { A: (opts.spells?.A || []).slice(0, MAX_SPELL_SLOTS).map(makeSpell), B: (opts.spells?.B || []).slice(0, MAX_SPELL_SLOTS).map(makeSpell) },
    casting: null, lastAbility: null, abilitySeq: 0, means: '', // means = いま働いている攻撃手段の名前(スキル名・特性名など。画面の「○○の△△!」用)
    events: [], rec: opts.record !== false, // events = 直近の行動で起きたことの記録(画面で1つずつ再生する用)
  }
  startRound(state)
  recalc(state)
  return advance(state)
}

export const getUnit = (state, uid) => state.units.find((u) => u.uid === uid)
export const getActiveUnit = (state) => (state.active ? getUnit(state, state.active) : null)
const hasKw = (u, k) => u.keywords.includes(k)
// 「味方」「相手」は場のキャラのこと。召喚物は専用の指定(summons)で選ぶ
const alliesOf = (state, u) => state.units.filter((x) => x.alive && x.field === 'main' && x.team === u.team)
const enemiesOf = (state, u) => state.units.filter((x) => x.alive && x.field === 'main' && x.team !== u.team)
const allyFieldOf = (state, u) => state.units.filter((x) => x.alive && x.team === u.team)
const summonsOf = (state, u) => state.units.filter((x) => x.alive && x.field === 'summon' && x.team === u.team)
const SUMMON_MAX = 5 // 召喚物フィールドは最大5体
const enemiesSummonsOf = (state, u) => state.units.filter((x) => x.alive && x.field === 'summon' && x.team !== u.team)
const abilityTargetable = (u) => u.alive && !u.stealth && !hasKw(u, 'aura')
// 単体を選ぶ能力の候補: 相手の場のキャラ + 相手のアミュレット(アミュレットは、単体指定の能力で消滅させられる)
const enemyOneList = (state, u) => [
  ...enemiesOf(state, u).filter(abilityTargetable),
  ...state.units.filter((x) => x.alive && x.field === 'summon' && x.isAmulet && x.team !== u.team && !hasKw(x, 'earthSign')),
]

// 奥義ゲージ = 現在のターン数(ラウンド数) + 特性の発動回数(チーム全体)
export const gaugeOf = (state, team) => state.round + state.traitCount[team]

// 条件: graveyard(墓場の下限) faith(信仰値の下限) hpBelow/hpAbove(HP%) evolved(進化済みか) crests(クレストの数の下限)
//       link(連携の下限) gauge(奥義ゲージの下限) ultimate(奥義: ゲージ10以上) liberation(解放奥義: ゲージ15以上)
// コンボ数: 従来はキャラごと(自分のターンが終わると0) / βはチーム共有(コンボリセットのターンで0)
const comboOf = (state, unit) => (state.comboMode === 'reset' ? state.comboCount[unit.team] : unit.comboCount)

function checkCond(state, unit, c) {
  if (!c) return true
  if (c.link != null && state.link[unit.team] < c.link) return false
  if (c.gauge != null && gaugeOf(state, unit.team) < c.gauge) return false
  if (c.ultimate && gaugeOf(state, unit.team) < ULTIMATE_GAUGE) return false
  if (c.liberation && gaugeOf(state, unit.team) < LIBERATION_GAUGE) return false
  if (c.faith != null && state.faith[unit.team] < c.faith) return false
  if (c.boost != null && (state.boost?.[unit.team] ?? 0) < c.boost) return false
  if (c.earth != null && (state.earth?.[unit.team] ?? 0) < c.earth) return false
  if (c.graveyard != null && state.graveyard[unit.team] < c.graveyard) return false
  if (c.hpBelow != null && (unit.hp / unit.maxHp) * 100 > c.hpBelow) return false
  if (c.hpAbove != null && (unit.hp / unit.maxHp) * 100 < c.hpAbove) return false
  if (c.awaken && state.mpMax[unit.team] < AWAKEN_MP) return false // 【覚醒】
  if (c.evolved != null && unit.evolved !== c.evolved) return false
  if (c.evolveTurn && state.round < EP_GRANT_ROUND) return false // 進化可能ターン: EPが配られたラウンドから戦闘終了まで
  if (c.crests != null && state.crests[unit.team].length < c.crests) return false
  if (c.combo != null && comboOf(state, unit) < c.combo) return false // コンボ: 味方の特性が使われた回数
  return true
}

// クレストの効果を出す役(置いたキャラ。倒れていたら味方の誰か)
function crestSource(state, crest) {
  const src = getUnit(state, crest.sourceUid)
  if (src && src.alive) return src
  return state.units.find((u) => u.alive && u.team === crest.team) || null
}

// ---------- ステータスの再計算(バフ・常時・アクティブ・クレスト) ----------

// 【コンボ_◯】を持っているキャラ(コンボのパッシブ、または条件 combo を持つ能力がある、場の生きているキャラ)
export const hasComboAbility = (u) => u.passiveObjs.some((p) => p.trigger === 'combo' || p.condition?.combo != null || p.usesCombo || p.effects?.some((e) => e.fromOwned || e.perCombo || e.comboCount))
// 自分の場(場のキャラ + 召喚物フィールド)にいる、指定のタイプのキャラの数
// タイプの判定: 「トークン/兵士」のように「/」でつないだタイプは、どの部分にも当てはまる(兵士でもあり、トークンでもある)
const hasType = (u, type) => !!u && !!u.type && String(u.type).split('/').includes(type)
const typeCount = (state, source, type) => state.units.filter((u) => u.alive && u.team === source.team && hasType(u, type)).length
const comboHolders = (state, team) => state.units.filter((u) => u.alive && u.field === 'main' && u.team === team && hasComboAbility(u))

// βのコンボリセット(システムターン)の行動値を、味方のコンボ持ちの数Nに合わせる: Tr = K × N
// 持ち主のいないカウントダウン付きクレストは、元の持ち主の速度で行動バーに並び、順番が来るたびにカウントダウンが進む
function syncCrestSlots(state) {
  for (const team of ['A', 'B']) {
    for (const c of state.crests[team]) {
      if (c.countdown == null) continue
      const src = getUnit(state, c.sourceUid)
      if (src && src.alive) { c.ownerSpd = src.spd; c.slot = null; continue } // 持ち主がいる間は、持ち主の行動で進む。速度は覚えておく
      if (!c.slot) { const base = AV_BASE / (c.ownerSpd || 1); c.slot = { baseAV: base, curAV: base } }
    }
  }
}

function syncComboReset(state) {
  for (const team of ['A', 'B']) {
    const n = state.comboMode === 'reset' ? comboHolders(state, team).length : 0
    const cr = state.comboReset[team]
    if (!n) { state.comboReset[team] = null; continue }
    const base = COMBO_RESET_K * n * (state.classTrait?.[team] === 'エルフ' ? 1.2 : 1) // エルフ(クラス特性): コンボリセットの初期行動値+20%
    if (!cr) state.comboReset[team] = { baseAV: base, curAV: base }
    else if (Math.abs(cr.baseAV - base) > EPS) { // Nが変わったら、進み具合は保ったまま調整する
      cr.curAV = cr.curAV * (base / cr.baseAV)
      cr.baseAV = base
    }
  }
}

function recalc(state) {
  // クレストの常時効果(味方全体 / 相手全体へのバフ)
  const crestMods = new Map()
  for (const team of ['A', 'B']) {
    for (const crest of state.crests[team]) {
      const src = crestSource(state, crest)
      if (!src) continue
      for (const p of crest.passives) {
        if (p.trigger !== 'constant' || !checkCond(state, src, p.condition)) continue
        const targets = state.units.filter((u) => u.alive && (p.target === 'enemies' ? u.team !== team : u.team === team))
        for (const e of p.effects) {
          if (e.type !== 'buff') continue
          for (const u of targets) crestMods.set(u.uid, [...(crestMods.get(u.uid) || []), e])
        }
      }
    }
  }
  for (const u of state.units) {
    const mods = [...u.buffs, ...(crestMods.get(u.uid) || [])]
    if (u.ct === 'ビショップ') mods.push({ stat: 'def', pct: 18 }) // ビショップ(クラス特性): 自分の場すべての防御力+18%
    if (u.ct === 'ネメシス' && hasTypeName(u, '人形')) mods.push({ stat: 'spd', pct: 3 }) // ネメシス(クラス特性): 「人形」の速度+3%
    for (const p of u.passiveObjs) {
      if (!(p.trigger === 'constant' || (p.trigger === 'active' && u.uid === state.active))) continue
      if (!checkCond(state, u, p.condition)) continue
      for (const e of p.effects) if (e.type === 'buff') mods.push(e)
    }
    for (const stat of STATS) {
      let pct = 0
      let flat = 0
      for (const m of mods) {
        if (m.stat === stat) {
          pct += m.pct || 0
          flat += m.flat || 0
        }
      }
      u[stat] = Math.max(stat === 'spd' ? 1 : 0, (u.base[stat] + flat) * (1 + pct / 100))
    }
    // 速度が変わったら、行動までの進み具合は保ったまま行動値を調整する
    const newBase = AV_BASE / u.spd
    if (Math.abs(newBase - u.baseAV) > EPS) {
      u.curAV = u.curAV * (newBase / u.baseAV)
      u.baseAV = newBase
    }
  }
  syncCrestSlots(state)
  syncComboReset(state)
  syncEarth(state)
}

// ---------- ダメージ ----------

export function refStatValue(unit, skill) {
  return skill.stat === 'mag' ? unit.atk * MAGIC_CONVERSION + unit.mag : unit.atk
}

// opts.expected = true なら、クリティカルを確率の平均で計算する(CPUの思考用)
export function calcDamage(attacker, defender, skill, opts = {}) {
  const rng = opts.rng || Math.random
  const base = refStatValue(attacker, skill) * skill.mult + (skill.add || 0)

  const critChance = Math.min(1, Math.max(0, attacker.critRate / 100))
  let critMul = 1
  let isCrit = false
  if (opts.expected) {
    critMul = 1 + critChance * (attacker.critDmg / 100)
  } else if (rng() < critChance) {
    isCrit = true
    critMul = 1 + attacker.critDmg / 100
  }

  let defense = defender.def
  if (skill.type === 'magic') defense *= 0.95 // 魔法は防御力を5%無視
  const defCoef = skill.type === 'true' ? 1 : 1 - defense / (defense + 200 + 10) // 確定ダメージは防御無視
  const resCoef = 1 - defender.dmgResist / (defender.dmgResist + 800)

  let ctMul = 1 // クラス特性
  if (attacker.ct === 'ロイヤル' && opts.bySkill) ctMul *= 1.2 // ロイヤル: 自分の場すべてのスキルダメージ+20%
  if (attacker.ct === 'ナイトメア' && hasTypeName(attacker, '死者')) ctMul *= 1.29 // ナイトメア: 「死者」のダメージ+29%
  if (defender.ct === 'ニュートラル' && skill.type === 'physical') ctMul *= 0.85 // ニュートラル: 物理耐性+15%
  const raw = base * critMul * defCoef * resCoef * ctMul
  return { damage: opts.expected ? raw : Math.max(1, Math.floor(raw)), isCrit }
}

// アーマーがあれば、吸収レートの分だけ先にアーマーが受ける
// 例: 吸収レート60%なら、ダメージの60%をアーマーが受け、体力は残り40%分を受ける
//     アーマーが足りなければ、あふれた分は体力が受ける
// 確定ダメージ(isTrue)は、アーマーに対するダメージが元の50%に減る
const TRUE_VS_ARMOR = 0.5
function dealDamage(target, dmg, isTrue = false) {
  const mult = isTrue ? TRUE_VS_ARMOR : 1
  const toArmor = dmg * target.armorRate // アーマーが受け持つ分
  const covered = Math.min(toArmor, target.armor / mult) // アーマーで止められるダメージ
  target.armor -= covered * mult
  target.hp -= dmg - covered
  if (target.hp <= 0) {
    target.hp = 0
    target.alive = false
  }
}

// 攻撃を受ける(バリアがあれば0ダメージにして壊れる)。実際に与えたダメージを返す
function applyDamage(state, source, target, amount, isTrue = false) {
  if (!target.alive) return 0
  if (target.isAmulet) return 0 // アミュレットには体力がなく、ダメージを受けない(なくなるのは、破壊・消滅・カウントダウンだけ)
  if (target.barrier > 0) {
    target.barrier = 0
    state.log.push(`${target.name}のバリアが攻撃を防いだ!`)
    emit(state, 'block', { src: source.uid, target: target.uid, means: state.means || '攻撃' })
    return 0
  }
  dealDamage(target, amount, isTrue)
  if (!target.alive) target.killedBy = source.uid
  if (target.field === 'main') state.graveyard[target.team] += GRAVE_PER_HIT // 攻撃をされると墓場が溜まる
  emit(state, 'damage', { src: source.uid, target: target.uid, amount: Math.round(amount), means: state.means || '効果' })
  return amount
}

function heal(state, unit, amount) {
  if (!unit.alive || unit.isAmulet) return
  const before = unit.hp
  unit.hp = Math.min(unit.maxHp, unit.hp + amount)
  const gained = Math.round(unit.hp - before)
  if (gained > 0) {
    state.log.push(`${unit.name}は${gained}回復した`)
    emit(state, 'heal', { target: unit.uid, amount: gained })
    fireCrestsOnHeal(state, unit.team)
  }
}

// クレストの【味方が回復したとき】。oncePerTurn: true のものは、そのチームのターン開始ごとに1回まで
function fireCrestsOnHeal(state, team) {
  for (const crest of [...state.crests[team]]) {
    for (const p of crest.passives) {
      if (p.trigger !== 'allyHeal') continue
      if (p.oncePerTurn && crest.healUsed) continue
      const source = crestSource(state, crest)
      if (!source) continue
      crest.healUsed = true
      state.log.push(`クレスト【${crest.name}】が働いた`)
      noteAbility(state, 'クレスト', crest.name, p.name, p.desc ?? crest.desc, crest.team)
      runEffects(state, source, p.effects, {})
    }
  }
}

// 起きたことの記録(画面で、1つずつ順番に見せるため)。そのときの盤面の要約(体力など)つき。AIの先読み(expected)のときは記録しない
const SNAP_KEYS = ['hp', 'maxHp', 'alive', 'armor', 'armorRate', 'barrier', 'stealth', 'countdown', 'comboCount', 'evolved', 'earthCount']
function emit(state, type, data = {}) {
  if (!state.rec) return
  const units = {}
  for (const u of state.units) {
    const o = { keywords: [...u.keywords] }
    for (const k of SNAP_KEYS) o[k] = u[k]
    units[u.uid] = o
  }
  state.events.push({ type, ...data, round: state.round, units, logLen: state.log.length, mp: { ...state.mp }, ep: { ...state.ep } })
}

// 直近に発動した能力(画面に説明を出すための記録): kind=種類(ファンファーレ・特性・スペルなど) owner=持ち主の名前 name=能力名 desc=説明
function noteAbility(state, kind, owner, name, desc, team) {
  state.abilitySeq += 1
  state.lastAbility = { seq: state.abilitySeq, kind, owner, name: name || '', desc: desc || '', team: team ?? null }
  state.means = name || kind
  emit(state, 'ability', { kind, owner, name: name || '', desc: desc || '', team: team ?? null })
}

// ---------- 効果の実行 ----------

function resolveTargets(state, source, key, ctx) {
  const rng = ctx.opts?.rng || Math.random
  const allies = alliesOf(state, source)
  const enemies = enemiesOf(state, source).filter(abilityTargetable)
  const pickRandom = (list) => (list.length ? [list[Math.floor(rng() * list.length)]] : [])
  switch (key) {
    case 'self': return [source]
    case 'opponent': return ctx.other && ctx.other.alive ? [ctx.other] : []
    case 'allies': return allies
    case 'otherAllies': return allies.filter((u) => u !== source)
    case 'nearestAlly': { // 最も近い味方1体: 自分以外の場のキャラのうち、行動順が最も近い(いまの行動値が最も小さい)1体
      const others = allies.filter((u) => u !== source && u.uid !== source.uid)
      return [[...others].sort((a, b) => a.curAV - b.curAV)[0]].filter(Boolean)
    }
    case 'otherAllyOne': {
      const others = allies.filter((u) => u !== source)
      if (ctx.chosen) return others.filter((u) => u.uid === ctx.chosen)
      return others.slice(0, 1) // 選ばれなかった(CPUの読み・テストなど)ときは先頭の1体
    }
    case 'entered': return ctx.other && ctx.other.alive ? [ctx.other] : [] // 「味方が場に出たとき」の、出てきたキャラ
    case 'summons': return summonsOf(state, source)
    case 'otherAllyField': return [...allies, ...summonsOf(state, source)].filter((u) => u.uid !== source.uid) // 自分以外の場すべて
    case 'allyField': return [...allies, ...summonsOf(state, source)] // 自分の場すべて(場のキャラ + 召喚物)
    case 'allyFieldRandom': return pickRandom([...allies, ...summonsOf(state, source)]) // 自分の場(場のキャラ + 召喚物)からランダム1体
    case 'allyOne': {
      if (ctx.chosen) return [getUnit(state, ctx.chosen)]
      return [[...allies].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]].filter(Boolean)
    }
    case 'allyFieldOne': { // 自分の場(場のキャラ + 召喚物)から1体(選ぶ効果用)
      const field = [...allies, ...summonsOf(state, source)]
      if (ctx.chosen) return field.filter((u) => u.uid === ctx.chosen)
      return field.slice(0, 1)
    }
    case 'enemies': return enemies
    case 'enemyField': return [...enemies, ...enemiesSummonsOf(state, source).filter(abilityTargetable)] // 相手の場すべて(場のキャラ + 召喚物)
    case 'enemyOne': return ctx.chosen ? [getUnit(state, ctx.chosen)] : pickRandom(enemies)
    case 'enemyRandom': return pickRandom(enemies)
    default: return []
  }
}

function statLabel(stat) {
  return { atk: '攻撃力', mag: '魔力', def: '防御力', spd: '速度', critRate: 'クリティカルレート', critDmg: 'クリティカルダメージ', dmgResist: 'ダメージ耐性' }[stat] || stat
}

// クレストを置く(最大5つ、同名は置けない)
function placeCrest(state, source, def, onEnemy = false) {
  const holder = onEnemy ? (source.team === 'A' ? 'B' : 'A') : source.team // onEnemy: 相手がこのクレストを持つ
  const area = state.crests[holder]
  if (area.length >= CREST_MAX) {
    state.log.push(`クレストは${CREST_MAX}つまでしか置けない(【${def.name}】は置けなかった)`)
    return
  }
  if (area.some((c) => c.name === def.name)) {
    state.log.push(`同名のクレスト【${def.name}】は置けない`)
    return
  }
  const crest = JSON.parse(JSON.stringify(def))
  crest.passives = crest.passives || []
  crest.countdown = def.countdown ?? null
  crest.sourceUid = onEnemy ? null : source.uid // 相手に置くクレストは、持つ側の生きているキャラが効果を出す役になる
  crest.team = holder
  crest.ownerSpd = source.spd // 持ち主が倒れたあとは、この速度で行動バーに並ぶ
  crest.slot = null
  crest.originDef = source.charDef // 置いたキャラの元の定義(「置いたキャラと同じキャラを召喚」のため)
  area.push(crest)
  state.log.push(`クレスト【${def.name}】を置いた`)
}

// 墓場: 攻撃を受けるたびに+1、キャラが倒されると+3(チーム共有)
const GRAVE_PER_HIT = 1
const GRAVE_PER_DEATH = 3
// 効果の perGraveyard が指定されていれば、墓場1つにつきその分だけ効果が大きくなる
const graveBonus = (state, source, e) => (e.perGraveyard || 0) * state.graveyard[source.team]

// 消滅させる: 破壊でも「場を離れる」でもない。墓場にも倒された記録にも入らず、ラストワードや味方の戦闘不能の能力も働かない
function vanishUnit(state, u, log = true) {
  if (!u.alive) return
  u.alive = false; u.deathHandled = true; u.hp = 0
  u.buffs = []; u.armor = 0; u.barrier = 0; u.stealth = false
  if (log) state.log.push(`${u.name}は消滅した`)
}

// 土の印: 数は【土の印】アミュレット自身が持つ(earthCount)。チームの合計(state.earth)は、場の土の印アミュレットの合計
const earthAmulets = (state, team) => state.units.filter((x) => x.alive && x.team === team && x.field === 'summon' && hasKw(x, 'earthSign'))
function syncEarth(state) {
  for (const t of ['A', 'B']) state.earth[t] = earthAmulets(state, t).reduce((n, u) => n + (u.earthCount || 0), 0)
}
// 土の印を増やす(+)・減らす(-)。アミュレットがなければ、増やすときだけ新しく出す(出せなければ働かない)。0になったらアミュレットは消滅する
function addEarth(state, team, source, amount) {
  let am = earthAmulets(state, team)[0]
  if (!am) {
    if (amount <= 0) return false
    am = summon(state, source, EARTH_SHARD)
    if (!am) return false
  }
  am.earthCount = Math.max(0, (am.earthCount || 0) + amount)
  if (am.earthCount <= 0) vanishUnit(state, am)
  syncEarth(state)
  return true
}
// 土の印アミュレットを召喚する(増やす効果とは別): 新しいものが先に出て(満員でも例外で上限を超えて出られる)、すでにあったものは消滅し、その数が新しいほうに足される
function summonEarth(state, source, amount) {
  if (!(amount > 0)) return null
  const olds = earthAmulets(state, source.team)
  const nu = summon(state, source, EARTH_SHARD, { overflow: true })
  if (!nu) return null
  let total = amount
  for (const o of olds) { total += o.earthCount || 0; vanishUnit(state, o) }
  nu.earthCount = total
  if (olds.length) state.log.push(`土の印アミュレットが1つにまとまった(土の印 ${total})`)
  recalc(state)
  syncEarth(state)
  return nu
}

// 召喚: 召喚物フィールド(最大5体)に出す。満員なら出せない(opts.overflow があるときだけ、上限を超えて出られる)
function summon(state, source, def, opts = {}) {
  if (!opts.overflow && summonsOf(state, source).length >= SUMMON_MAX) {
    state.log.push(`召喚物フィールドが満員で、${def.name}は出せなかった`)
    return null
  }
  state.summonSeq += 1
  const u = makeUnit(def, source.team, 0, 'summon', `${source.team}s${state.summonSeq}`)
  applyClassTrait(u, state.classTrait?.[source.team])
  state.units.push(u)
  emit(state, 'summon', { target: u.uid, name: def.name, team: u.team })
  state.log.push(state.casting ? `スペル【${state.casting}】で${def.name}を${u.isAmulet ? '設置' : '召喚'}した` : `${source.name}は${def.name}を${u.isAmulet ? '設置' : '召喚'}した`)
  // クレストの onEnter: 自分のチームの(指定のタイプの)キャラが場に出たとき、キーワード能力(疾走など)を持つ
  for (const crest of state.crests[u.team]) {
    const oe = crest.onEnter
    if (!oe || (oe.type && !hasType(u, oe.type)) || !oe.gainKeyword || u.keywords.includes(oe.gainKeyword)) continue
    u.keywords.push(oe.gainKeyword)
    state.log.push(`【${crest.name}】の効果で、${u.name}は【${KEYWORDS[oe.gainKeyword]?.label || oe.gainKeyword}】を持つ`)
  }
  // 自分の場の「味方が場に出たとき」(enterType があれば、そのタイプのキャラが出たときだけ)
  for (const a of state.units.filter((x) => x.alive && x.team === u.team && x.uid !== u.uid)) fire(state, 'allyEnter', a, { other: u })
  recalc(state)
  fire(state, 'onEnter', u, {}) // 【場に出たとき】: ファンファーレ(最初の自分のターン開始時)とは違い、出た瞬間に働く
  return u
}

// 選択が必要な効果(choose: true)の、選べる対象の一覧
function candidatesOf(state, source, e) {
  const key = e.target || 'self'
  let list
  if (key === 'otherAllyOne') list = alliesOf(state, source).filter((u) => u.uid !== source.uid)
  else if (key === 'allyOne') list = alliesOf(state, source)
  else if (key === 'allyFieldOne') list = [...alliesOf(state, source), ...summonsOf(state, source)]
  else if (key === 'enemyOne') list = enemyOneList(state, source)
  else list = resolveTargets(state, source, key, {})
  if (e.onlyName) list = list.filter((u) => u.name === e.onlyName) // onlyName: 指定の名前のキャラだけ
  return e.onlyType ? list.filter((u) => hasType(u, e.onlyType)) : list // onlyType: 指定のタイプ(式神など)だけ
}

// 候補が0体 → 何もしない / 1体 → 自動で選ぶ / 2体以上 → state.pending に残して、選ばれるまで待つ(ファンファーレのときだけ)
function runEffects(state, source, effects, ctx = {}) {
  for (let idx = 0; idx < effects.length; idx++) {
    const e = effects[idx]
    if (e.condition && !checkCond(state, source, e.condition)) continue
    if (e.earthCost) { // 【土の秘術_N】土の印をN消費して、この効果が働く。足りないときは働かない(対象を選ぶ効果とは組み合わせない: 選んだあとの再開で二重に消費するため)
      if (state.earth[source.team] < e.earthCost) { state.log.push(`土の印が足りないので、【土の秘術_${e.earthCost}】は働かなかった`); continue }
      addEarth(state, source.team, source, -e.earthCost)
      state.log.push(`【土の秘術_${e.earthCost}】土の印を${e.earthCost}消費(${state.earth[source.team]})`)
    }
    if (e.timesPerType && !ctx.noRepeat) { // 「自分の場の〇〇タイプの数だけ、この効果を繰り返す」(対象は毎回選び直す)
      const n = typeCount(state, source, e.timesPerType)
      state.log.push(`${e.timesPerType}タイプが${n}体なので、${n}回行う`)
      for (let i = 0; i < n; i++) runEffects(state, source, [{ ...e, timesPerType: undefined }], { ...ctx, noRepeat: true })
      continue
    }
    if (e.optional) { // 「追加でMPを消費すると〜」のように、使うかどうかを選べる効果
      if (ctx.answer === undefined) {
        if (e.mpCost && state.mp[source.team] < e.mpCost) { state.log.push(`MPが足りないので、追加の効果はなし`); continue }
        if (ctx.allowPending) {
          state.pending = { uid: source.uid, effects: effects.slice(idx), candidates: ['yes', 'no'], confirm: true, prompt: e.prompt || '追加の効果を使いますか?', trigger: ctx.trigger || null, nextPassive: ctx.nextPassive ?? null, spell: !!ctx.spell }
          state.log.push(`${source.name}の効果: ${state.pending.prompt}`)
          recalc(state)
          return
        }
      } else {
        const ans = ctx.answer
        ctx = { ...ctx, answer: undefined }
        if (ans === 'no') continue
      }
    }
    if (e.choose && !ctx.chosen && ctx.allowPending) {
      const cands = candidatesOf(state, source, e)
      if (cands.length === 0) { state.log.push(`${source.name}の効果の対象がいなかった`); continue }
      if (cands.length > 1) {
        // 選んでもらうために止まる(残りの効果と、あとに続くパッシブは、選ばれたあとに続けて行う)
        state.pending = { uid: source.uid, effects: effects.slice(idx), candidates: cands.map((u) => u.uid), trigger: ctx.trigger || null, nextPassive: ctx.nextPassive ?? null, spell: !!ctx.spell }
        state.log.push(`${source.name}の効果: 対象を選んでください`)
        recalc(state)
        return
      }
      ctx = { ...ctx, chosen: cands[0].uid } // 1体だけなら自動で選ぶ
    }

    if (e.type === 'spendMp') { // MPを好きな数(0〜いまのMP)だけ消費する。消費した数Xは、あとの効果の perMpSpent(damage)で使う
      let x = ctx.mpSpent
      if (x === undefined) {
        const have = state.mp[source.team]
        if (ctx.allowPending && have > 0) {
          state.pending = {
            uid: source.uid, effects: effects.slice(idx), candidates: Array.from({ length: have + 1 }, (_, i) => `mode${i}`), mpPick: true,
            modes: Array.from({ length: have + 1 }, (_, i) => ({ name: `MP${i}`, desc: i === 0 ? '消費しない' : '' })), prompt: e.prompt || '消費するMPの数を選んでください',
            trigger: ctx.trigger || null, nextPassive: ctx.nextPassive ?? null, spell: !!ctx.spell,
          }
          state.log.push(`${source.name}の効果: 消費するMPを選んでください`)
          recalc(state)
          return
        }
        x = have // 選べない場面(CPUの先読みなど)は、あるだけ消費する
      }
      state.mp[source.team] -= x
      state.log.push(`MPを${x}消費した`)
      ctx = { ...ctx, mpSpent: x }
      continue
    }
    if (e.type === 'mode') { // 【モード】1つ選んで、その能力が働く(選ぶまで待つ。選べない場面では先頭のモード)
      let pick = ctx.mode
      if (pick === undefined) {
        if (ctx.allowPending) {
          state.pending = {
            uid: source.uid, effects: effects.slice(idx), candidates: e.modes.map((_, i) => `mode${i}`),
            modes: e.modes.map((m) => ({ name: m.name, desc: m.desc || '' })), prompt: e.prompt || 'モードを1つ選んでください',
            trigger: ctx.trigger || null, nextPassive: ctx.nextPassive ?? null, spell: !!ctx.spell,
          }
          state.log.push(`${source.name}の効果: モードを選んでください`)
          recalc(state)
          return
        }
        pick = 0
      }
      const m = e.modes[pick]
      if (m) {
        state.log.push(`モード【${m.name}】が働く`)
        runEffects(state, source, m.effects, { ...ctx, mode: undefined, chosen: undefined, allowPending: false })
      }
      ctx = { ...ctx, mode: undefined }
      continue
    }

    // チーム全体に関わる効果(対象を選ばない)
    if (e.type === 'faith') {
      const next = Math.max(0, state.faith[source.team] + (e.amount ?? 1))
      state.log.push(`信仰値が${(e.amount ?? 1) >= 0 ? '+' : ''}${e.amount ?? 1}(${next})`)
      state.faith[source.team] = next
      continue
    }
    if (e.type === 'boostPick') { // 自分の【スペルブースト時】を持つキャラクター・スペルを1つ選んで、それを1回スペルブーストする
      const opts = []
      state.spells[source.team].forEach((sp) => { if (sp.onBoost) opts.push({ kind: 'spell', sp, name: `${sp.name}(いま X=${sp.x})`, desc: 'スペル' }) })
      state.units.forEach((u) => { if (u.alive && u.field === 'main' && u.team === source.team && (u.passiveObjs || []).some((p) => p.trigger === 'onBoost')) opts.push({ kind: 'unit', u, name: u.name, desc: 'キャラクター' }) })
      if (!opts.length) { state.log.push('スペルブーストできるものがなかった'); continue }
      let pick = ctx.mode
      if (pick === undefined) {
        if (opts.length > 1 && ctx.allowPending) {
          state.pending = {
            uid: source.uid, effects: effects.slice(idx), candidates: opts.map((_, i) => `mode${i}`),
            modes: opts.map((o) => ({ name: o.name, desc: o.desc })), prompt: e.prompt || 'スペルブーストするものを1つ選んでください',
            trigger: ctx.trigger || null, nextPassive: ctx.nextPassive ?? null, spell: !!ctx.spell,
          }
          state.log.push('スペルブーストするものを選んでください')
          recalc(state)
          return
        }
        pick = 0
      }
      const o = opts[pick] || opts[0]
      const n = (e.amount ?? 1) + witchBonus(state, source.team, 'boost', e.amount ?? 1)
      if (o.kind === 'spell') {
        state.boost[source.team] += n
        const sp = growSpell(state, source.team, o.sp, n)
        state.log.push(`スペル【${o.sp.name}】がスペルブーストした(X=${o.sp.x})`)
      } else {
        boostUnit(state, o.u, n)
      }
      ctx = { ...ctx, mode: undefined }
      continue
    }
    if (e.type === 'boost' && e.target) { // 対象つき: 場のキャラ(と召喚物)それぞれが、ブーストされた回数を数える
      const n = (e.amount ?? 1) + witchBonus(state, source.team, 'boost', e.amount ?? 1)
      for (const t of resolveTargets(state, source, e.target, ctx)) {
        boostUnit(state, t, n)
      }
      continue
    }
    if (e.type === 'boost') { // 対象なし: 手札(スペルセット)のスペルが、ブーストされた回数(チーム共通)
      const n = (e.amount ?? 1) + witchBonus(state, source.team, 'boost', e.amount ?? 1)
      state.boost[source.team] += n
      boostSpells(state, source.team, n, ctx.spell ? state.spells[source.team].find((x) => x.slot === state.castingSlot) || null : null) // 発動中のスペル自身は、ブーストされない
      boostFieldUnits(state, source.team, n)
      state.log.push(`スペルブースト+${n}(${state.boost[source.team]}回)`)
      continue
    }
    if (e.type === 'earth') { // 土の印: 場の土の印の合計(チーム共通)。マイナスで消費(土の秘術)
      const amount = (e.amount ?? 1) + witchBonus(state, source.team, 'earth', e.amount ?? 1)
      // 場に土の印アミュレットがないときに増えるなら、先に「大地の魔片」を召喚して、そこに溜める(満員で出せなければ働かない)
      if (!addEarth(state, source.team, source, amount)) { state.log.push('土の印を溜める【土の印】アミュレットがないので、土の印は増えなかった'); continue }
      state.log.push(`土の印が${amount >= 0 ? '+' : ''}${amount}(${state.earth[source.team]})`)
      continue
    }
    if (e.type === 'earthSummon') { // 土の印アミュレットを召喚する(amount = 新しいアミュレットの最初の数)
      summonEarth(state, source, e.amount ?? 1)
      continue
    }
    if (e.type === 'graveyard') {
      const amount = e.amount ?? 1
      const next = Math.max(0, state.graveyard[source.team] + amount)
      state.log.push(`墓場が${amount >= 0 ? '+' : ''}${amount}(${next})`)
      state.graveyard[source.team] = next
      continue
    }
    if (e.type === 'summon' && e.fromOwned) { // 所持キャラクターから、速度が コンボ数×10(最大10コンボ)のキャラをランダムに1体召喚する
      const x = Math.min(e.maxCombo ?? 10, comboOf(state, source))
      const spd = x * (e.speedPerCombo ?? 10)
      const cands = (state.pool[source.team] || []).filter((c) => c.stats.spd === spd)
      if (!cands.length) { state.log.push(`コンボ${x}(速度${spd})の所持キャラがいないので、召喚はなし`); continue }
      const rng = ctx.opts?.rng || Math.random
      const pick = cands[Math.floor(rng() * cands.length)]
      state.log.push(`コンボ${x}: 速度${spd}の所持キャラから${pick.name}が選ばれた`)
      summon(state, source, pick)
      continue
    }
    if (e.type === 'summon') {
      const rng0 = ctx.opts?.rng || Math.random
      const sdef = e.fromCrest ? ctx.crest?.originDef : e.copySelf ? source.charDef : e.randomUnits ? e.randomUnits[0] : e.unit // copySelf: 自分と同じキャラを召喚する(進化もできる)
      if (e.mpCost) { // 追加でMPを消費すると働く効果(MPが足りなければ働かない)
        if (state.mp[source.team] < e.mpCost) { state.log.push(`MPが足りないので、${sdef.name}の追加召喚はなし`); continue }
        state.mp[source.team] -= e.mpCost
        state.log.push(`MPを${e.mpCost}消費して、追加で召喚する`)
      }
      if (!sdef) continue
      for (let i = 0; i < (e.count ?? 1); i++) summon(state, source, e.randomUnits ? e.randomUnits[Math.floor(rng0() * e.randomUnits.length)] : sdef) // randomUnits: 1体ごとに、候補からランダムに選ぶ
      continue
    }
    if (e.type === 'crest') {
      placeCrest(state, source, e.crest, !!e.onEnemy) // onEnemy: true なら、相手が持つクレストになる
      continue
    }
    if (e.type === 'ep') {
      state.ep[source.team] = Math.min(EP_MAX, state.ep[source.team] + (e.amount ?? 1))
      continue
    }
    if (e.type === 'growByDead') { // 攻撃力+X / 体力+Y: X・Y は、このターン中に倒された自分の(deadType)タイプのキャラの、元の攻撃力・体力の合計
      const dead = (state.deaths || []).filter((d) => d.turn === state.turns && d.team === source.team && String(d.type || '').split('/').includes(e.deadType))
      const a = dead.reduce((n, d) => n + d.atk, 0)
      const h = dead.reduce((n, d) => n + d.hp, 0)
      if (a > 0) source.buffs.push({ stat: 'atk', pct: 0, flat: a, turns: null })
      if (h > 0 && !source.isAmulet) { source.maxHp += h; source.hp += h }
      state.log.push(`このターンに倒された「${e.deadType}」は${dead.length}体: 攻撃力+${a} / 体力+${h}`)
      recalc(state)
      continue
    }
    if (e.type === 'evolve') { // これは進化する(EPは使わない。すでに進化済み・進化できないキャラ・場にいないときは何もしない)
      if (source.alive && source.field === 'main' && source.evolvable && !source.evolved) doEvolve(state, source, ctx.opts, true)
      continue
    }
    if (e.type === 'mpMax') { // 自分のMP最大値を増やす(上限 MP_CAP まで。いまのMPは変わらない)
      state.mpMax[source.team] = Math.min(MP_CAP, state.mpMax[source.team] + (e.amount ?? 1))
      state.log.push(`MP最大値が${state.mpMax[source.team]}になった`)
      continue
    }
    if (e.type === 'mp') {
      state.mp[source.team] = Math.min(state.mpMax[source.team], state.mp[source.team] + (e.amount ?? 1))
      continue
    }

    let targets = resolveTargets(state, source, e.target || 'self', ctx)
    if (e.onlyClass) targets = targets.filter((t) => t.class === e.onlyClass) // 指定のクラス(ロイヤルなど)だけ
    if (e.onlyType) targets = targets.filter((t) => hasType(t, e.onlyType)) // 指定のタイプ(式神など)だけ
    if (e.onlyName) targets = targets.filter((t) => t.name === e.onlyName) // 指定の名前のキャラ(トークンなど)だけ
    // ランダムな相手の人数: count(基本は1体)。comboCount: { combo: 3, count: 3 } なら、コンボが3以上のとき3体(重ならないように選ぶ)
    if ((e.target || 'self') === 'enemyRandom' && (e.count != null || e.comboCount)) {
      let n = e.count ?? 1
      if (e.comboCount && comboOf(state, source) >= e.comboCount.combo) n = e.comboCount.count
      const rng = ctx.opts?.rng || Math.random
      const pool = [...enemiesOf(state, source).filter(abilityTargetable)]
      targets = []
      while (targets.length < n && pool.length) targets.push(pool.splice(Math.floor(rng() * pool.length), 1)[0])
    }
    for (const t of targets) {
      if (!t) continue
      switch (e.type) {
        case 'damage': {
          if (e.perMpSpent != null && !(ctx.mpSpent > 0)) break // perMpSpent: 消費したMP1つにつき、倍率が perMpSpent ずつ増える(MPを使わなかったら何もしない)
          const skill = { stat: e.stat || 'atk', mult: (e.perMpSpent != null ? (e.mult ?? 0) + e.perMpSpent * ctx.mpSpent : e.mult ?? 1), add: (e.add || 0) + graveBonus(state, source, e) + (e.perType ? (e.perTypeFlat ?? 1) * typeCount(state, source, e.perType) : 0) + (e.perEarth ? e.perEarth * state.earth[source.team] : 0), type: e.dmgType || 'physical' } // perEarth: 自分の場の土の印1つにつき、add が perEarth ずつ増える / perType: 自分の場の「そのタイプ」のキャラ1体につき、add が perTypeFlat(省くと1)ずつ増える
          const { damage } = calcDamage(source, t, skill, ctx.opts)
          const dealt = applyDamage(state, source, t, damage, skill.type === 'true')
          loseStealth(source) // 能力でダメージを与えたら潜伏を失う
          if (dealt > 0) state.log.push(`${source.name}の効果で${t.name}に${Math.round(dealt)}ダメージ`)
          break
        }
        case 'heal':
          if (e.pctMax != null) heal(state, t, (t.maxHp * e.pctMax) / 100) // 回復される本人の最大HPの○%
          else if (e.pctPerSummon != null) heal(state, t, (t.maxHp * e.pctPerSummon * summonsOf(state, source).length) / 100) // 回復する本人の最大HPの(pctPerSummon×召喚物の数)%
          else if (e.split && e.flat != null) heal(state, t, e.flat / targets.length) // 回復量を、対象の人数で等分に割り振る(全体で合計 flat)
          else heal(state, t, (e.flat ?? (e.stat === 'maxHp' ? source.maxHp : source.atk) * (e.mult ?? 1)) + graveBonus(state, source, e))
          break
        case 'buff':
          t.buffs.push({ stat: e.stat, pct: (e.pct || 0) + graveBonus(state, source, e), flat: (e.flat || 0) + (e.perCombo || 0) * comboOf(state, source) + (e.perType ? (e.perTypeFlat ?? 1) * typeCount(state, source, e.perType) : 0), turns: e.turns ?? null }) // perCombo: コンボ1つにつき、flat がその分だけ増える
          state.log.push(`${t.name}の${statLabel(e.stat)}が上がった`)
          break
        case 'loseHp': { // 現在体力を直接減らす(ダメージではないので、防御・アーマー・バリアは関係なく、墓場も増えない)
          if (t.isAmulet || !t.alive) break
          const before = t.hp
          t.hp = Math.max(0, t.hp - (e.amount || 0))
          state.log.push(`${t.name}の現在体力が${Math.round(before - t.hp)}減った`)
          if (t.hp <= 0) { t.alive = false; t.killedBy = source.uid }
          break
        }
        case 'maxHp': { // 最大HPを元のHPの+%だけ増やす(現在HPも同じだけ増える。アミュレットには体力がない)
          if (t.isAmulet) break
          const up = Math.round((t.baseMaxHp * (e.pct || 0)) / 100) + (e.flat || 0) + (e.perType ? (e.perTypeFlat ?? 1) * typeCount(state, source, e.perType) : 0)
          t.maxHp += up
          t.hp += up
          state.log.push(`${t.name}の最大HPが${up}増えた`)
          break
        }
        case 'armor':
        case 'shield': { // 'shield' は昔の書き方(アーマーと同じ)
          const amount = (e.flat ?? (e.stat === 'maxHp' ? source.maxHp : source.atk) * (e.mult ?? 1)) + graveBonus(state, source, e)
          t.armor += amount
          t.armorRate = e.rate ?? 1
          state.log.push(`${t.name}は${Math.round(amount)}のアーマーを得た(吸収${Math.round((e.rate ?? 1) * 100)}%)`)
          break
        }
        case 'barrier':
          t.barrier = 1
          state.log.push(`${t.name}はバリアを得た`)
          break
        case 'enableTrait': { // 特性を使えるようにする(回数つき)。回数は「指定した速度の味方の数」(自分以外・場のキャラと召喚物)
          const n = e.perAllySpeed ? allyFieldOf(state, source).filter((u) => u.uid !== source.uid && e.perAllySpeed.includes(Math.round(u.spd))).length : (e.charges ?? 1)
          state.log.push(`${source.name}は特性【${e.trait.name}】を${n}回使えるようになった`)
          if (n <= 0) break
          const have = source.traits.find((x) => x.id === e.trait.id)
          if (have) have.charges = (have.charges ?? 0) + n
          else source.traits.push({ ...structuredClone(e.trait), charges: n })
          break
        }
        case 'enableSpell': { // スペルを1回分有効化する(スペルセットの最大回数には数えない。すぐに使える)
          const list = state.spells[source.team]
          // perAllySpeed: 指定した速度の味方(自分以外・場のキャラと召喚物)の数だけ、使えるようにする
          const n = e.perAllySpeed ? allyFieldOf(state, source).filter((u) => u.uid !== source.uid && e.perAllySpeed.includes(Math.round(u.spd))).length : (e.count ?? 1)
          for (let i = 0; i < n; i++) list.push(makeSpell(e.spell, list.length))
          state.log.push(`スペル【${e.spell.name}】が${n}回使えるようになった`)
          break
        }
        case 'gainDoubleSkill': // 【アクティブ】1ターンに2回スキルを発動できる(2回目はMPを消費)
          t.doubleSkill = { mpCost: e.mpCost ?? 1 }
          state.log.push(`${t.name}は1ターンに2回スキルを発動できるようになった(2回目はMP${t.doubleSkill.mpCost})`)
          break
        case 'gainKeyword': { // キーワード能力(必殺など)を得る
          const k = e.keyword
          if (k === 'barrier' && t.barrier <= 0) t.barrier = 1 // バリアは、持つだけでなく、いま1回分が張られた状態にする
          if (k === 'stealth' && !t.stealth) t.stealth = true // 潜伏は持っているだけでなく、いま潜伏している状態にする
          if (!t.keywords.includes(k)) {
            t.keywords.push(k)
            state.log.push(`${t.name}は【${KEYWORDS[k]?.label || k}】を持つ`)
          }
          break
        }
        case 'loseKeyword': { // キーワード能力(守護など)を失わせる
          const k = e.keyword || 'guard'
          if (t.keywords.includes(k)) {
            t.keywords = t.keywords.filter((x) => x !== k)
            state.log.push(`${t.name}は【${KEYWORDS[k]?.label || k}】を失った`)
          } else state.log.push(`${t.name}は【${KEYWORDS[k]?.label || k}】を持っていなかった`)
          break
        }
        case 'vanish': // 消滅させる(破壊とは違い、墓場に行かず、ラストワードも働かない)
          vanishUnit(state, t)
          break
        case 'destroy': // 破壊する(召喚物の「自身を破壊」など)
          if (hasKw(t, 'earthSign')) break // 土の印は、能力で破壊できない
          if (t.alive) { t.hp = 0; t.alive = false; state.log.push(`${t.name}は破壊された`) }
          if (e.settle) resolveDeaths(state, ctx.opts) // settle: 破壊の処理(ラストワード・倒された記録)を、次の効果より先に済ませる
          break
        case 'reenter': // 入場し直す: 入場直後の状態に戻る(次の自分のターン開始時にファンファーレがもう一度働き、そのターンはスキル攻撃ができない)
          t.hasActed = false
          t.comboCount = 0
          state.log.push(`${t.name}は入場し直した`)
          break
        case 'advance':
          t.curAV = Math.max(0, t.curAV - (t.baseAV * (e.pct ?? 0)) / 100)
          state.log.push(`${t.name}の行動順が早まった`)
          break
        default:
          break
      }
    }
  }
  recalc(state)
}

// トリガー型パッシブ(ファンファーレ・攻撃時・交戦時・進化時・ラストワード)を発動する
function fire(state, trigger, unit, ctx = {}, from = 0) {
  if (!unit.alive && trigger !== 'lastWord') return
  for (let i = from; i < unit.passiveObjs.length; i++) {
    const p = unit.passiveObjs[i]
    if (p.trigger !== trigger || !checkCond(state, unit, p.condition)) continue
    if (p.enterType && !hasType(ctx.other, p.enterType)) continue
    state.log.push(`${unit.name}の【${p.name || TRIGGER_LABELS[trigger]}】`)
    noteAbility(state, TRIGGER_LABELS[trigger] ?? trigger, unit.name, p.name && p.name !== TRIGGER_LABELS[trigger] ? p.name : '', p.desc, unit.team)
    runEffects(state, unit, p.effects, { ...ctx, trigger, nextPassive: i + 1 })
    if (state.pending) return // 選ぶのを待つ。続きは、選ばれたあとに行う
  }
}

// クレストのトリガー(ラウンド開始時・味方のターン開始時)
function fireCrests(state, team, trigger, subject, opts) {
  if (trigger === 'allyTurnStart') for (const c of state.crests[team]) c.healUsed = false // 【味方が回復したとき】(oncePerTurn)の回数をリセット
  for (const crest of [...state.crests[team]]) {
    for (const p of crest.passives) {
      if (p.trigger !== trigger) continue
      const source = trigger === 'allyTurnStart' ? subject : crestSource(state, crest)
      if (!source || !checkCond(state, source, p.condition)) continue
      state.log.push(`クレスト【${crest.name}】が働いた`)
      noteAbility(state, 'クレスト', crest.name, p.name, p.desc ?? crest.desc, crest.team)
      runEffects(state, source, p.effects, { opts })
    }
  }
}

// クレストのカウントダウンを1つ進める(0になったら消える)
function tickCrest(state, crest, opts) {
  if (crest.countdown == null) return
  crest.countdown -= 1
  if (crest.countdown <= 0) {
    state.crests[crest.team] = state.crests[crest.team].filter((c) => c !== crest)
    state.log.push(`クレスト【${crest.name}】は役目を終えて消えた`)
    recalc(state) // クレストの常時効果がなくなった分を反映
    // クレストのラストワード(消えるときに働く)
    for (const p of crest.passives) {
      if (p.trigger !== 'lastWord') continue
      const src = crestSource(state, crest)
      if (!src) continue
      state.log.push(`クレスト【${crest.name}】の【ラストワード】`)
      noteAbility(state, 'クレスト・ラストワード', crest.name, p.name, p.desc ?? crest.desc, crest.team)
      runEffects(state, src, p.effects, { opts, crest })
    }
  }
}

// 倒れたユニットの後始末(ラストワード)。連鎖して倒れた場合も処理する
function resolveDeaths(state, opts) {
  for (let i = 0; i < 50; i++) {
    const dead = state.units.filter((u) => !u.alive && !u.deathHandled)
    if (!dead.length) return
    for (const u of dead) {
      const leave = (u.passiveObjs || []).find((p) => p.trigger === 'onLeave') // 【場を離れる場合、これを消滅】: 破壊されず、消滅する(倒れた扱いにならない。墓場・ラストワード・味方が倒れたときの能力は働かない)
      if (leave) {
        // 退場するときは、破壊ではなく、必ず消滅になる(墓場・ラストワード・味方の戦闘不能の能力は働かない)
        u.deathHandled = true
        u.buffs = []; u.armor = 0; u.barrier = 0; u.stealth = false
        state.log.push(`${u.name}は消滅した`)
        noteAbility(state, TRIGGER_LABELS.onLeave, u.name, leave.name && leave.name !== TRIGGER_LABELS.onLeave ? leave.name : '', leave.desc, u.team)
        continue
      }
      u.deathHandled = true
      u.buffs = []
      u.armor = 0
      u.barrier = 0
      u.stealth = false
      state.log.push(`${u.name}は倒れた`)
      // このターン中に倒されたキャラの記録(元の攻撃力・体力つき)。【場に出たとき】の growByDead が使う。前のターンの記録は捨てる
      state.deaths = (state.deaths || []).filter((d) => d.turn === state.turns)
      state.deaths.push({ turn: state.turns, team: u.team, type: u.type, atk: u.charDef?.stats?.atk ?? u.base.atk, hp: u.charDef?.stats?.hp ?? u.baseMaxHp })
      if (u.field === 'main') state.graveyard[u.team] += GRAVE_PER_DEATH // 倒されると墓場が大きく増える
      const killer = u.killedBy ? getUnit(state, u.killedBy) : null
      fire(state, 'lastWord', u, { other: killer, opts })
      // 場のキャラが倒れたら、同じチームの生き残り(自分以外)の「味方が戦闘不能になったとき」が働く
      if (u.field === 'main') for (const a of state.units.filter((x) => x.alive && x.team === u.team && x.uid !== u.uid)) fire(state, 'allyDeath', a, { other: u, opts })
    }
    recalc(state)
  }
}

// ---------- 行動の一覧 ----------

export function attackableTargets(state, actor) {
  // スキル攻撃は、相手の場のキャラと召喚物を選べる(アミュレットは選べない)
  const candidates = state.units.filter(
    (u) => u.alive && u.team !== actor.team && !u.isAmulet && !u.stealth && !hasKw(u, 'intimidate')
  )
  const guards = candidates.filter((u) => hasKw(u, 'guard'))
  return guards.length ? guards : candidates
}

function traitTargets(state, actor, trait) {
  switch (trait.target) {
    case 'allyOne': return alliesOf(state, actor).map((u) => u.uid)
    case 'otherAllyOne': return alliesOf(state, actor).filter((u) => u.uid !== actor.uid).map((u) => u.uid)
    case 'allyFieldOne': return [...alliesOf(state, actor), ...summonsOf(state, actor)].map((u) => u.uid) // 自分の場(場のキャラ + 召喚物・アミュレット)から1体
    case 'enemyOne': return enemyOneList(state, actor).map((u) => u.uid)
    case 'enemies': return enemiesOf(state, actor).some(abilityTargetable) ? [null] : []
    default: return [null]
  }
}

function accelActions(state, actor) {
  const ac = actor.accel
  const list = []
  if (state.mp[actor.team] >= (ac.cost ?? 0) && checkCond(state, actor, ac.condition)) {
    for (const target of traitTargets(state, actor, ac)) list.push({ type: 'accelerate', trait: ac.id, target })
  }
  return list
}

// 使えるスペル(プレイヤー能力)。自分のキャラの通常のターン中、まだ使っていない枠で、MPが足りているもの
function spellActions(state, actor) {
  const mp = state.mp[actor.team]
  const full = summonsOf(state, actor).length >= SUMMON_MAX
  return state.spells[actor.team]
    .filter((sp) => !sp.used && mp >= sp.cost)
    .filter((sp) => !(full && sp.effects.every((e) => e.type === 'summon'))) // 召喚物が満員なら、召喚だけのスペルは使えない
    .map((sp) => ({ type: 'spell', spell: sp.slot }))
}

// 今行動するユニットが選べる行動の一覧
//  skill = スキル攻撃(ターン終了) / trait = 特性(MPを使う。ターンは続く)
//  evolve = 進化(EPを使う。ターンは続く) / endTurn = 何もせず終える
//  accelerate = アクセラレートの実行(アクセラレートの番のときだけ。実行すると本体の行動を消費する)
export function legalActions(state) {
  const actor = getActiveUnit(state)
  if (!actor || state.winner || !actor.alive) return []
  // 効果の対象を選ぶ場面(ファンファーレなど): 選べる対象だけが行動になる
  if (state.pending) return state.pending.candidates.map((uid) => ({ type: 'choose', target: uid }))
  // アクセラレートの番: 実行する(特性を使う) か、見送る(endTurn)
  if (state.activeKind === 'accel') return [...accelActions(state, actor), { type: 'endTurn' }]
  const actions = []
  // 「1ターンに2回スキルを発動できる」(2回目はMPを消費)
  const skillsDone = actor.skillsThisTurn || 0
  const secondOk = !!actor.doubleSkill && skillsDone === 1 && state.mp[actor.team] >= actor.doubleSkill.mpCost
  const canUseSkill = !actor.isAmulet && (actor.hasActed || hasKw(actor, 'rush') || hasKw(actor, 'dash')) && (skillsDone === 0 || secondOk)
  const targets = attackableTargets(state, actor)
  if (canUseSkill) for (const t of targets) actions.push({ type: 'skill', target: t.uid })

  if (state.actionsThisTurn < MAX_ACTIONS_PER_TURN) {
    for (const tr of actor.traits) {
      if (tr.charges != null && tr.charges <= 0) continue // 回数つきの特性は、使い切ったら使えない
      if (!tr.repeatable && actor.usedTraits.includes(tr.id)) continue // 同じ特性は1ターンに1回(連続使用できる特性は除く)
      if (state.mp[actor.team] < tr.cost) continue
      if (!checkCond(state, actor, tr.condition)) continue
      for (const target of traitTargets(state, actor, tr)) actions.push({ type: 'trait', trait: tr.id, target })
    }
    if (actor.evolvable && !actor.evolved && state.ep[actor.team] >= 1) actions.push({ type: 'evolve' })
  }
  actions.push(...spellActions(state, actor)) // スペルはキャラの行動を消費しない
  if (!canUseSkill || targets.length === 0 || skillsDone > 0) actions.push({ type: 'endTurn' })
  return actions
}

const sameAction = (a, b) =>
  a.type === b.type && (a.target ?? null) === (b.target ?? null) && (a.trait ?? null) === (b.trait ?? null) && (a.spell ?? null) === (b.spell ?? null)

// ---------- ターンとラウンドの進行 ----------

function startRound(state, opts) {
  state.round += 1
  for (const team of ['A', 'B']) {
    state.mpMax[team] = Math.min(MP_CAP, state.mpMax[team] + 1 + (state.round === 1 && state.classTrait?.[team] === 'ドラゴン' ? 1 : 0)) // ドラゴン(クラス特性): ラウンド1の最大MP増加量+1
    state.mp[team] = state.mpMax[team]
    if (state.round === EP_GRANT_ROUND) state.ep[team] = Math.min(EP_MAX, state.ep[team] + EP_GRANT)
  }
  if (state.round === EP_GRANT_ROUND) state.log.push(`ラウンド${EP_GRANT_ROUND}: 両チームにEP${EP_GRANT}が与えられた(進化できる)`)
  for (const u of state.units) {
    if (u.alive && hasKw(u, 'dash')) u.curAV = Math.max(0, u.curAV - u.baseAV) // 疾走: 行動順100%アップ
  }
  for (const team of ['A', 'B']) {
    fireCrests(state, team, 'roundStart', null, opts)
  }
  resolveDeaths(state, opts)
  recalc(state) // ラウンドが進むと奥義ゲージも変わる
}

function beginTurn(state, unit, opts) {
  state.actionsThisTurn = 0
  emit(state, 'turn', { uid: unit.uid, name: unit.name, team: unit.team })
  unit.usedTraits = []
  unit.skillsThisTurn = 0
  if (unit.stealthEvery && !unit.stealth && unit.stealthTimer != null) {
    unit.stealthTimer += 1
    if (unit.stealthTimer >= unit.stealthEvery) { unit.stealth = true; unit.stealthTimer = null; state.log.push(`${unit.name}は再び【潜伏】した`) }
  }
  recalc(state) // アクティブ(自ターン中だけ有効)をここで反映

  // カウントダウン: 自分のターン開始時に1つ進み、0になったら破壊される
  if (unit.countdown != null) {
    unit.countdown -= 1
    if (unit.countdown <= 0) {
      state.log.push(`${unit.name}のカウントダウンが0になり、破壊された`)
      unit.hp = 0
      unit.alive = false
      resolveDeaths(state, opts)
      return
    }
  }
  for (const crest of [...state.crests[unit.team]]) {
    if (crest.sourceUid === unit.uid) tickCrest(state, crest, opts)
  }
  fireCrests(state, unit.team, 'allyTurnStart', unit, opts)
  if (!unit.hasActed) fire(state, 'fanfare', unit, { opts, allowPending: true }) // 最初のターン開始時だけ(選ぶ効果は、プレイヤーが選ぶまで待つ)
  resolveDeaths(state, opts)
}

function endTurn(state, actor) {
  actor.hasActed = true
  if (actor.alive) { // クレストの【ターン終了時】: そのクレストを持つキャラ自身のターンが終わるときに働く
    for (const crest of [...state.crests[actor.team]]) {
      if (crest.sourceUid !== actor.uid) continue
      for (const p of crest.passives) {
        if (p.trigger !== 'turnEnd' || !checkCond(state, actor, p.condition)) continue
        state.log.push(`クレスト【${crest.name}】が働いた`)
        noteAbility(state, 'クレスト', crest.name, p.name, p.desc ?? crest.desc, crest.team)
        runEffects(state, actor, p.effects, {})
      }
    }
    resolveDeaths(state)
  }
  if (actor.alive) { // 【ターン終了時】(自分のターンが終わるとき): 場のキャラ・召喚物自身の能力
    fire(state, 'turnEnd', actor, {})
    resolveDeaths(state)
  }
  for (const u of [...state.units]) { // 【相手のターン終了時】: 相手のキャラのターンが終わるときに、場のキャラ・召喚物の能力が働く
    if (!u.alive || u.team === actor.team) continue
    fire(state, 'enemyTurnEnd', u, {})
  }
  resolveDeaths(state)
  actor.curAV = actor.baseAV
  if (state.comboMode !== 'reset') actor.comboCount = 0 // 従来: コンボは、自分のターンが終わった後から数え直す(βでは、コンボリセットのターンで数え直す)
  actor.buffs = actor.buffs
    .map((b) => ({ ...b, turns: b.turns == null ? null : b.turns - 1 }))
    .filter((b) => b.turns == null || b.turns > 0)
  state.turns += 1
  state.active = null
  state.activeKind = null
  recalc(state)
}

// 行動バー上の全員の行動値を同じだけ進める(本体もアクセラレートも)
function shiftAV(state, amount) {
  for (const u of state.units) {
    if (!u.alive) continue
    u.curAV = Math.max(0, u.curAV - amount)
    if (u.accel) u.accel.curAV = Math.max(0, u.accel.curAV - amount)
  }
  for (const team of ['A', 'B']) {
    const cr = state.comboReset[team]
    if (cr) cr.curAV = Math.max(0, cr.curAV - amount)
    for (const c of state.crests[team]) if (c.slot) c.slot.curAV = Math.max(0, c.slot.curAV - amount)
  }
}

// アクセラレートの行動が終わったとき。実行したなら本体の行動も消費し、本体とアクセラレートの行動値を初期値に戻す
// (見送ったときは、アクセラレートの行動値だけ初期値に戻る)
function endAccel(state, unit, executed) {
  unit.accel.curAV = unit.accel.baseAV
  if (executed) unit.curAV = unit.baseAV
  state.turns += 1
  state.active = null
  state.activeKind = null
  recalc(state)
}

function checkWinner(state) {
  // 勝敗は場のキャラだけで決まる(召喚物は数えない)
  const aAlive = state.units.some((u) => u.team === 'A' && u.field === 'main' && u.alive)
  const bAlive = state.units.some((u) => u.team === 'B' && u.field === 'main' && u.alive)
  if (aAlive && bAlive) return null
  if (aAlive) return 'A'
  if (bAlive) return 'B'
  return 'draw'
}

// 次に行動するユニットを決める。選べる行動がない(終了のみ)ときは自動で飛ばす
function advance(state, opts) {
  for (let guard = 0; guard < 3000; guard++) {
    const winner = checkWinner(state)
    if (winner) {
      state.winner = winner
      state.active = null
      return state
    }
    if (state.turns > MAX_TURNS) {
      state.log.push('決着がつかないため、引き分けになりました')
      state.winner = 'draw'
      state.active = null
      return state
    }
    const alive = state.units.filter((u) => u.alive)
    // 行動バー上の枠: キャラ本体と、アクセラレート(あれば)は別々の枠
    const slots = []
    for (const u of alive) {
      slots.push({ u, kind: 'body', av: u.curAV, spd: u.spd })
      if (u.accel) slots.push({ u, kind: 'accel', av: u.accel.curAV, spd: u.accel.speed })
    }
    // βのコンボリセット: 味方のアクションバーに並ぶシステムターン(同じ行動値なら、キャラの行動のあとに回る)
    for (const team of ['A', 'B']) {
      const cr = state.comboReset[team]
      if (cr) slots.push({ u: null, kind: 'comboReset', team, av: cr.curAV, spd: -1 })
    }
    // 持ち主のいないクレストのカウントダウン(元の持ち主の速度で並ぶ。コンボリセットと同じく、キャラの行動のあとに回る)
    for (const team of ['A', 'B']) for (const c of state.crests[team]) if (c.slot) slots.push({ u: null, kind: 'crest', crest: c, team, av: c.slot.curAV, spd: -2 })
    let slot = slots[0]
    for (const sl of slots) {
      const tie = Math.abs(sl.av - slot.av) <= EPS
      if (sl.av < slot.av - EPS || (tie && (sl.spd > slot.spd || (sl.spd === slot.spd && sl.kind === 'accel' && slot.kind === 'body')))) slot = sl
    }
    const next = slot.u // コンボリセットのときは null

    // ラウンドの境目が先に来るなら、先にラウンドを進める
    const toBoundary = state.round * ROUND_AV - state.totalAV
    if (toBoundary <= slot.av + EPS) {
      shiftAV(state, toBoundary)
      state.totalAV += toBoundary
      startRound(state, opts)
      continue
    }

    shiftAV(state, Math.max(0, slot.av))
    state.totalAV += Math.max(0, slot.av)

    if (slot.kind === 'crest') { // 持ち主のいないクレストの番: カウントダウンが1つ進む(行動は選ばない)
      slot.crest.slot.curAV = slot.crest.slot.baseAV
      state.log.push(`クレスト【${slot.crest.name}】のカウントダウンが進んだ`)
      tickCrest(state, slot.crest, opts)
      resolveDeaths(state, opts)
      continue
    }

    if (slot.kind === 'comboReset') { // システムターン: コンボ持ちの味方全員のコンボ数を0に戻す(行動は選ばない)
      const holders = comboHolders(state, slot.team)
      const before = state.comboCount[slot.team]
      state.comboCount[slot.team] = 0 // コンボカウントはチーム共有
      state.log.push(`${slot.team === 'A' ? '自分' : '相手'}側のコンボリセット(コンボ${before}→0)`)
      const cr = state.comboReset[slot.team]
      cr.curAV = cr.baseAV
      continue
    }

    state.active = next.uid
    state.activeKind = slot.kind

    if (slot.kind === 'accel') {
      recalc(state)
      if (legalActions(state).length === 1) { // 実行できないときは見送る
        state.log.push(`${next.name}のアクセラレートは使えず、見送った`)
        endAccel(state, next, false)
        continue
      }
      return state
    }

    beginTurn(state, next, opts)

    if (checkWinner(state)) continue
    if (!next.alive) {
      state.active = null
      state.activeKind = null
      recalc(state)
      continue
    }
    const actions = legalActions(state)
    if (actions.length === 1 && actions[0].type === 'endTurn') {
      state.log.push(`${next.name}は様子を見ている(入場直後はスキルを使えない)`)
      endTurn(state, next)
      continue
    }
    return state
  }
  throw new Error('バトルが終わりませんでした')
}

// ---------- 行動の実行 ----------

// 潜伏を失う。【潜伏_N】は、自分のターンがN回始まると潜伏が戻る(【潜伏】だけなら二度と戻らない)
function loseStealth(u) {
  if (!u.stealth) return
  u.stealth = false
  if (u.stealthEvery) u.stealthTimer = 0
}

function doSkill(state, actor, targetUid, opts) {
  const target = getUnit(state, targetUid)
  const skill = actor.skill
  loseStealth(actor) // 攻撃したら潜伏を失う

  // 攻撃時・交戦時の能力(ダメージ計算の前に働く)
  fire(state, 'onAttack', actor, { other: target, opts })
  fire(state, 'onEngage', actor, { other: target, opts })
  fire(state, 'onEngage', target, { other: actor, opts })
  recalc(state)

  emit(state, 'attack', { src: actor.uid, target: target.uid, skill: skill.name })
  state.means = skill.name // これから与えるダメージの攻撃手段(攻撃時の能力が働いたあとに決める)
  const { damage, isCrit } = calcDamage(actor, target, skill, { ...opts, bySkill: true })
  const dealt = applyDamage(state, actor, target, damage, skill.type === 'true')
  if (dealt > 0) {
    if (isCrit && state.rec) { const ev = [...state.events].reverse().find((e) => e.type === 'damage' && e.target === target.uid); if (ev) ev.crit = true }
    state.log.push(`${actor.name}の「${skill.name}」! ${target.name}に${Math.round(dealt)}ダメージ${isCrit ? '(クリティカル!)' : ''}`)
    let total = dealt
    if (hasKw(actor, 'finisher') && target.alive) {
      const fixed = Math.floor(target.hp * FINISHER_RATE)
      if (fixed > 0) {
        dealDamage(target, fixed, true) // 必殺の固定ダメージは確定ダメージ
        emit(state, 'damage', { src: actor.uid, target: target.uid, amount: fixed, means: '必殺' })
        if (!target.alive) target.killedBy = actor.uid
        total += fixed
        state.log.push(`【必殺】${target.name}に追加で${fixed}の固定ダメージ`)
      }
    }
    if (hasKw(actor, 'drain')) heal(state, actor, total)
  } else {
    state.log.push(`${actor.name}の「${skill.name}」!`)
  }
  resolveDeaths(state, opts)
  if (actor.field === 'main') countLink(state, actor, opts) // 連携は場のキャラのスキルだけ数える
  emit(state, 'sync')
}

// 連携: 味方がスキルを発動した回数を数える。【連携_N】は、回数がNに達したときに働く
function countLink(state, actor, opts) {
  state.link[actor.team] += 1
  const count = state.link[actor.team]
  for (const u of state.units) {
    if (!u.alive || u.team !== actor.team) continue
    for (const p of u.passiveObjs) {
      if (p.trigger !== 'link' || p.min !== count || !checkCond(state, u, p.condition)) continue
      state.log.push(`${u.name}の【連携_${p.min}】`)
      runEffects(state, u, p.effects, { opts })
    }
  }
  resolveDeaths(state, opts)
}

// 味方の特性が使われたとき、コンボを持つ味方のカウントを1つ進める
// (コンボ持ちのターンが終わってから、次にそのキャラのターンが来るまでの間に使われた特性を数える)
function countCombos(state, actor, opts) {
  const shared = state.comboMode === 'reset'
  if (shared) state.comboCount[actor.team] += 1 // β: コンボカウントはチーム共有(特性を使ったのが誰でも数える)
  for (const u of state.units) {
    if (!u.alive || u.team !== actor.team || (!shared && u.uid === actor.uid)) continue
    const combos = u.passiveObjs.filter((p) => p.trigger === 'combo')
    if (!hasComboAbility(u)) continue
    if (!shared) u.comboCount += 1
    const count = comboOf(state, u)
    for (const p of combos) {
      if (p.min !== count || !checkCond(state, u, p.condition)) continue
      state.log.push(`${u.name}の【${p.name || 'コンボ'}】(${count}コンボ)`)
      runEffects(state, u, p.effects, { opts })
    }
  }
}

function doTrait(state, actor, action, opts) {
  const trait = actor.traits.find((t) => t.id === action.trait)
  state.mp[actor.team] -= trait.cost
  state.traitCount[actor.team] += 1 // 奥義ゲージに数えられる
  actor.usedTraits.push(trait.id)
  if (trait.charges != null) trait.charges -= 1
  recalc(state)
  state.log.push(`${actor.name}の特性【${trait.name}】(MP${trait.cost})`)
  noteAbility(state, '特性', actor.name, trait.name, trait.desc, actor.team)
  runEffects(state, actor, trait.effects, { opts, chosen: action.target })
  countCombos(state, actor, opts)
  resolveDeaths(state, opts)
  emit(state, 'sync')
}

// スペルを使う: MPを払い、効果を行う。キャラの行動(スキル・特性)は消費しない。特性として数えられる(奥義ゲージ・コンボが増える)
function doSpell(state, actor, action, opts) {
  const sp = state.spells[actor.team].find((x) => x.slot === action.spell)
  state.mp[actor.team] -= sp.cost
  state.traitCount[actor.team] += 1
  sp.used = true
  // スペルブーストが起きるとき(1) スペルという能力を発動したとき(基本): 発動したスペル自身は除く、スペルセットの【スペルブースト時】持ちと、場の【スペルブースト時】持ちのキャラが、1回スペルブーストする
  //   (2) 「スペルブーストする」という能力が働いたとき → runEffects の boost / boostPick
  state.boost[actor.team] += 1
  boostSpells(state, actor.team, 1, sp)
  boostFieldUnits(state, actor.team, 1)
  state.log.push(`${actor.team === 'A' ? '自分' : '相手'}のスペル【${sp.name}】(MP${sp.cost})`)
  state.casting = sp.name
  state.castingSlot = sp.slot
  noteAbility(state, 'スペル', actor.team === 'A' ? '自分' : '相手', sp.name, sp.desc, actor.team)
  recalc(state)
  runEffects(state, actor, sp.effects, { opts, spell: true, allowPending: true })
  state.casting = null
  state.castingSlot = null
  if (state.pending) { emit(state, 'sync'); return } // モードを選んだあとに、続きを行う
  countCombos(state, actor, opts)
  resolveDeaths(state, opts)
  emit(state, 'sync')
}

// アクセラレートを実行する(特性と同じようにMPを使い、特性の発動回数として数える)
function doAccelerate(state, actor, action, opts) {
  const ac = actor.accel
  state.mp[actor.team] -= ac.cost ?? 0
  state.traitCount[actor.team] += 1
  recalc(state)
  state.log.push(`${actor.name}の【${ac.name}】(MP${ac.cost ?? 0})`)
  noteAbility(state, `アクセラレート_${ac.speed}`, actor.name, ac.name, ac.desc, actor.team)
  runEffects(state, actor, ac.effects, { opts, chosen: action.target })
  countCombos(state, actor, opts)
  resolveDeaths(state, opts)
  emit(state, 'sync')
}

// 進化: EPを1つ使い、HPと攻撃力が+100%、突進と同じ効果(進化したターンからスキルを使える)を得る
function doEvolve(state, actor, opts, free = false) { // free: 能力の効果で進化する(EPは使わない。死亡の処理は、呼び出し元がまとめて行う)
  if (!free) state.ep[actor.team] -= 1
  actor.evolved = true
  actor.maxHp += actor.baseMaxHp
  actor.hp += actor.baseMaxHp
  actor.buffs.push({ stat: 'atk', pct: 100, flat: 0, turns: null })
  if (!actor.keywords.includes('rush')) actor.keywords.push('rush')
  state.log.push(`${actor.name}は進化した!(体力と攻撃力が2倍に)`)
  noteAbility(state, '進化', actor.name, '', '体力と攻撃力が2倍になり、【突進】を得る。', actor.team)
  recalc(state)
  if (!free) fire(state, 'onEvolve', actor, { opts, allowPending: true }) // 【進化時】は、EPを使った進化のときだけ働く。選ぶ効果は、プレイヤーが選ぶまで待つ
  if (!state.pending) fire(state, 'onEvolved', actor, { opts, allowPending: true }) // 【進化したとき】(これが進化したとき)は、EPを使わない進化でも働く
  if (!free && !state.pending) resolveDeaths(state, opts)
  emit(state, 'sync')
}

// 行動を実行して、次の行動待ちの状態を返す(元の状態は書き換えない)
//  特性・進化を使った場合は、同じユニットのターンが続く
export function applyAction(prev, action, opts = {}) {
  if (prev.winner || !prev.active) return prev
  const state = structuredClone(prev)
  state.events = [] // 今回の行動で起きたことだけを記録する
  state.rec = !opts.expected
  const actor = getActiveUnit(state)
  if (!legalActions(state).some((a) => sameAction(a, action))) throw new Error('その行動は選べません')

  if (state.activeKind === 'accel') {
    const executed = action.type === 'accelerate'
    if (executed) doAccelerate(state, actor, action, opts)
    else state.log.push(`${actor.name}はアクセラレートを見送った`)
    endAccel(state, actor, executed)
    return advance(state, opts)
  }

  if (action.type === 'spell') {
    doSpell(state, actor, action, opts)
    if (checkWinner(state) || !actor.alive) return advance(state, opts)
    return state // スペルを使っても、そのキャラのターンは続く
  }

  if (action.type === 'choose') {
    const p = state.pending
    state.pending = null
    if (p.modes) {
      const idx = Number(String(action.target).replace('mode', ''))
      state.log.push(p.mpPick ? `MPを${idx}消費することにした` : `モード【${p.modes[idx]?.name}】を選んだ`)
      runEffects(state, actor, p.effects, { opts, mode: p.mpPick ? undefined : idx, mpSpent: p.mpPick ? idx : undefined, trigger: p.trigger, spell: p.spell })
      if (p.spell && !state.pending) countCombos(state, actor, opts) // スペルは特性として数える
    } else if (p.confirm) {
      state.log.push(action.target === 'yes' ? '使うことにした' : '使わないことにした')
      runEffects(state, actor, p.effects, { opts, answer: action.target, trigger: p.trigger, spell: p.spell, allowPending: !!p.spell })
      if (p.spell && !state.pending) countCombos(state, actor, opts)
    } else {
      state.log.push(`${getUnit(state, action.target).name}を選んだ`)
      runEffects(state, actor, p.effects, { opts, chosen: action.target, trigger: p.trigger, spell: p.spell, allowPending: !!p.spell })
      if (p.spell && !state.pending) countCombos(state, actor, opts)
    }
    if (p.trigger && p.nextPassive != null) fire(state, p.trigger, actor, { opts, allowPending: true }, p.nextPassive) // 続きのパッシブ
    if (!state.pending) resolveDeaths(state, opts)
    if (checkWinner(state) || !actor.alive) return advance(state, opts)
    if (p.spell) return state // スペルのあとも、そのキャラのターンは続く
    const acts = legalActions(state)
    if (acts.length === 1 && acts[0].type === 'endTurn') {
      state.log.push(`${actor.name}は様子を見ている(入場直後はスキルを使えない)`)
      endTurn(state, actor)
      return advance(state, opts)
    }
    return state
  }

  if (action.type === 'skill') {
    if ((actor.skillsThisTurn || 0) >= 1) { // 2回目のスキル発動: MPを消費する
      state.mp[actor.team] -= actor.doubleSkill.mpCost
      state.log.push(`${actor.name}は2回目のスキルを発動(MP${actor.doubleSkill.mpCost})`)
    }
    actor.skillsThisTurn = (actor.skillsThisTurn || 0) + 1
    doSkill(state, actor, action.target, opts)
    // 2回発動できるなら、1回目のあとはターンが続く(2回目が打てるとき)
    if (actor.alive && !checkWinner(state) && actor.skillsThisTurn === 1 && actor.doubleSkill && legalActions(state).some((a) => a.type === 'skill')) return state
    endTurn(state, actor)
    return advance(state, opts)
  }
  if (action.type === 'trait' || action.type === 'evolve') {
    state.actionsThisTurn += 1
    if (action.type === 'trait') doTrait(state, actor, action, opts)
    else doEvolve(state, actor, opts)
    if (checkWinner(state) || !actor.alive) return advance(state, opts)
    const actions = legalActions(state)
    if (actions.length === 1 && actions[0].type === 'endTurn') {
      endTurn(state, actor)
      return advance(state, opts)
    }
    return state
  }
  state.log.push(`${actor.name}はターンを終えた`)
  endTurn(state, actor)
  return advance(state, opts)
}

// テスト用(画面からは使わない): 土の印の内部処理
export const _earthTest = { addEarth, summonEarth, vanishUnit }
