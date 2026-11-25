import { applyRelics } from './relicRules.js'
import { SEASON_BONUS, newSeason, seasonMods, seasonComboUp, seasonComboReset, seasonEnter, seasonBoost, seasonMpMax, seasonGrave, seasonDestroyed, seasonHealed } from './season.js'
import ghostToken from './characters/nightmare/tokens/nightmare_token_02.js' // テスト戦の「ゴースト無限湧き」用
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
const FINISHER_RATE = 0.15 // 必殺: 相手の最大HPの15%
const STATS = ['atk', 'mag', 'def', 'spd', 'critRate', 'critDmg', 'dmgResist', 'dmgUp'] // dmgUp = 与ダメージ(%。+15なら、与えるダメージが1.15倍。効果だけで増える)

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
  finisher: { label: '必殺', desc: 'スキルでダメージを与えるとき、ターゲットに対象の最大HP15%分の必殺ダメージを与える。そのターゲットが召喚物だったとき、それを破壊する' },
  drain: { label: 'ドレイン', desc: 'スキルで与えたダメージと同じだけ自身を回復' },
  barrier: { label: 'バリア', desc: '攻撃を一回0ダメージにして壊れる' },
  noAttackFollower: { label: 'フォロワーを攻撃できない', desc: 'スキルでフォロワー(キャラ・召喚物)を攻撃できない(攻撃できる相手がいないので、スキルを発動できない)' },
  silence: { label: 'スキル発動不可', desc: 'スキルを発動できない' },
  earthSign: { label: '土の印', desc: '自分の場の土の印の数は合算される。土の印は土の秘術によって消費される。これは能力で破壊できず、相手の能力で選ばれない' },
}
// 能力名を【】でかこむ。『ファンファーレ【コンボ_3】』のように中に【】があるときは、【ファンファーレ】【コンボ_3】と分けて並べる
// エンハンスは『【エンハンス_N】MPNを消費すると、』が説明の頭に入っている。表示ではタイトル【エンハンス_N】+中身だけにする
export const isEnhance = (t) => /^enhance(_\d+)?$/.test(t?.id || '') // id は 'enhance'、または 'enhance_7' のように、複数のエンハンスを区別したもの
export const enhanceBody = (t) => (t.desc || '').replace(/^【エンハンス_?\d*】/, '').replace(/^MP\d+を消費すると、?/, '')
export const bracket = (name) => { const m = /^(.+?)【(.+)】$/.exec(name); return m ? `【${m[1]}】【${m[2]}】` : `【${name}】` }

export const TRIGGER_LABELS = {
  fanfare: 'ファンファーレ', constant: '常時', active: 'アクティブ', lastWord: 'ラストワード',
  onAttack: '攻撃時', onEngage: '交戦時', combo: 'コンボ', onEvolve: '進化時', onEvolved: '進化したとき', turnEnd: 'ターン終了時', onLeave: '場を離れる場合', onEnter: '場に出たとき', enemyTurnEnd: '相手のターン終了時',
  roundStart: 'ラウンド開始時', allyDeath: '味方が戦闘不能になったとき', allyEnter: '味方が場に出たとき', allyTurnStart: '味方のターン開始時', turnStart: '自分のターン開始時', allyTurnEnd: '味方のターン終了時', link: '連携', onBoost: 'スペルブースト時', allyHeal: '味方が回復したとき', allyAmuletAct: '味方がアミュレットをアクトしたとき', enemyHpDown: '相手のフォロワーのHPが場で減らされたとき',
}

// ---------- 遺物(頭・胴・脚・靴のセットを装備したキャラに、セット効果がつく) ----------
// pct = 元のステータスに対する+%、flat = そのまま足す値(少女の物語は%ではなく、耐性値+10)
// rotation: その遺物が属するローテーション(フォルダ名と同じ 'basic' / 1 / 2…)。対戦の形式ごとに使える範囲は battle/rotations.js の FORMATS
export const RELICS = {
  'ピエロの祝福': { rotation: 'basic', desc: '攻撃力 +12%', mods: [{ stat: 'atk', pct: 12 }] },
  '鬼の形相': { rotation: 'basic', desc: 'HP +21%', mods: [{ stat: 'hp', pct: 21 }] },
  '月と太陽の印字': { rotation: 'basic', desc: '魔力 +13%', mods: [{ stat: 'mag', pct: 13 }] },
  '紅血の証': { rotation: 'basic', desc: '防御力 +29%', mods: [{ stat: 'def', pct: 29 }] },
  '少女の物語': { rotation: 'basic', desc: '耐性値 +10', mods: [{ stat: 'dmgResist', flat: 10 }] },
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

// 説明文(desc)に「フォロワー」を含む能力の効果には followers: true を付ける(対象が、キャラクター + 召喚物になる)。何度呼んでも同じ
const followerDone = new WeakSet()
function markFollowers(o) {
  if (!o || typeof o !== 'object' || followerDone.has(o)) return
  followerDone.add(o)
  if (Array.isArray(o)) { o.forEach(markFollowers); return }
  if (typeof o.desc === 'string' && o.desc.includes('フォロワー') && Array.isArray(o.effects)) o.effects.forEach((e) => { if (e && typeof e === 'object' && e.followers === undefined) e.followers = true })
  for (const k of Object.keys(o)) if (k !== 'effects' || !Array.isArray(o.effects)) markFollowers(o[k])
}
function makeUnit(def, team, index, field = 'main', uid = null) {
  markFollowers(def)
  const s = { ...def.stats }
  const base = {
    atk: s.atk, mag: s.mag ?? 0, def: s.def, spd: s.spd,
    critRate: s.critRate ?? 5, critDmg: s.critDmg ?? 50, dmgResist: s.dmgResist ?? 0, dmgUp: 0,
    physUp: 0, magUp: 0, healUp: 0, effHit: 0, // 遺物(部位つき)のメイン・サブステータス。効果効率は、いまのバトルに効果の命中判定がないので、数字だけ持つ
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
  // 部位つきの遺物(def.relicPieces: relicRules.js の遺物の配列)のメイン・サブステータスを反映する
  if (def.relicPieces?.length) {
    const r = applyRelics({ ...base, hp: s.hp }, def.relicPieces)
    s.hp = r.hp
    Object.assign(base, { atk: r.atk, def: r.def, spd: r.spd, dmgResist: r.dmgResist, critRate: r.critRate, critDmg: r.critDmg, physUp: r.physUp, magUp: r.magUp, healUp: r.healUp, effHit: r.effHit })
  }
  const passives = def.passives || []
  const rawKw = passives.filter((p) => typeof p === 'string')
  const keywords = rawKw.map((k) => (/^stealth_\d+$/.test(k) ? 'stealth' : k)) // 'stealth_3' = 【潜伏_3】(3ターンごとに潜伏が戻る)
  const stealthEvery = Number(rawKw.map((k) => /^stealth_(\d+)$/.exec(k)).find(Boolean)?.[1]) || null
  const clone = (x) => JSON.parse(JSON.stringify(x))
  return {
    flag: !!def.flag, // 緑旗(能力が働くと光る旗)をつけるキャラ(def.flag: true)
    ct: null, // ct: このキャラのチームで働いているクラス特性(クラス名。働いていなければ null)
    uid: uid || `${team}${index}`, defId: def.id, name: def.name, class: def.class, type: def.type || null, unitType: def.amulet ? 'アミュレット' : 'キャラクター', token: def.token === true, team, relic: def.relic || null, // type: キャラのタイプ(妖精など)
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
  markFollowers(def)
  const sp = { slot: `sp${i}`, id: def.id, name: def.name, cost: def.cost ?? 0, baseDesc: def.desc ?? '', desc: def.desc ?? '', baseEffects: def.effects, effects: def.effects, log: def.log, onBoost: def.onBoost || null, x: def.onBoost?.startX ?? 1, used: false }
  refreshSpell(sp)
  return sp
}
// ---------- アーティファクト ----------
// 手持ちに抱えるリソース(スペルと同じく、opts.artifacts = { A: [定義...], B: [...] })。単体では場に出ない特殊なユニット群。
//  ・【融合】: 手持ちのアーティファクトに、手持ちの別のアーティファクト(素材にするもの)を融合させると、上位のアーティファクトに変身する。素材専用のカードはない。素材にしたアーティファクトは手持ちから無くなる
//     変身先は、アーティファクト定義の fusions に書く。上から順に調べて、最初に合ったものになる:
//       fusions: [{ when: { costMin, costMax, kindsMin, kindsMax, countMin, countMax, ids: [素材にするアーティファクトのid(すべて含む)] }, into: アーティファクト定義 }]
//       ・ベース = このアーティファクト自身(変身後は、変身先の fusions が次の段階になる)
//       ・cost = 素材にしたアーティファクトの合計コスト / kinds = 素材の種類数(idの種類) / count = 素材の枚数
//  ・【場に出す】: 好きな段階で、MPを払って場に出せる(召喚物として、ユニットになる)。出したら手持ちから無くなる
//  ・noField: true のアーティファクトは、場に出せない(「フィールドに存在できない」)
//  ・fuse.accept: { type, amulet, ids } = 融合できる素材の種類(アーティファクトの type / amulet が合うものだけ)
//  どちらも、スペルと同じく、キャラの行動(スキル・特性)は消費しない
export const MAX_HAND = 9 // 手持ち(アーティファクトの手持ちは、最大9つ)
export const MAX_FUSE_MATERIALS = 3 // 1回の融合に使える素材の最大数(アーティファクトの fuse.max で変えられる)
function makeArtifact(def, i) {
  markFollowers(def)
  return { slot: `af${i}`, id: def.id, name: def.name, cost: def.cost ?? 0, desc: def.desc ?? '', type: def.type ?? null, amulet: !!def.amulet, noField: !!def.noField, def }
}
// 素材の組み合わせに合う変身先(なければ null)
export function fusionFor(art, mats, catalog = []) {
  const fuse = art.def.fuse || {}
  if (fuse.accept && !mats.every((m) => (fuse.accept.type == null || m.type === fuse.accept.type) && (fuse.accept.amulet == null || (fuse.accept.amulet ? m.amulet : (!m.amulet || m.noField))) && (!fuse.accept.ids || fuse.accept.ids.includes(m.id)))) return null // 融合できる素材の種類(例: タイプ「アーティファクト」のアミュレット)
  const max = fuse.max ?? MAX_FUSE_MATERIALS
  if (!mats.length || mats.length > max) return null
  const cost = mats.reduce((a, m) => a + m.cost, 0)
  const kinds = new Set(mats.map((m) => m.id)).size
  const n = mats.length
  const ok = (w) => (w.costMin == null || cost >= w.costMin) && (w.costMax == null || cost <= w.costMax) && (w.kindsMin == null || kinds >= w.kindsMin) && (w.kindsMax == null || kinds <= w.kindsMax) &&
    (w.countMin == null || n >= w.countMin) && (w.countMax == null || n <= w.countMax) && (!w.ids || w.ids.every((id) => mats.some((m) => m.id === id)))
  const hit = (art.def.fusions || []).find((f) => ok(f.when || {}))
  if (!hit) return null
  return typeof hit.into === 'string' ? (catalog.find((c) => c.id === hit.into || c.name === hit.into) || null) : hit.into // into は、定義そのもの / 変身先のidか名前(まだ無いカードは、できあがるまで融合できない)
}
// 融合の素材: amulet:true =「アミュレット」/ amulet:false =「ユニット」。場に出せないアミュレット(コアなど)は、実質アミュレットではないので、どちらの素材にもなれる
function artifactActions(state, actor) {
  const team = actor.team
  const mp = state.mp[team]
  const out = []
  const full = summonsOf(state, actor).length >= SUMMON_MAX
  for (const art of state.artifacts[team]) {
    const mats = state.artifacts[team].filter((x) => x !== art) // 素材にできるのは、手持ちの別のアーティファクト
    if (!art.def.noField && !full && mp >= art.cost) out.push({ type: 'playArtifact', artifact: art.slot })
    if (!(art.def.fusions || []).length || mp < (art.def.fuse?.cost ?? 0)) continue
    const max = Math.min(art.def.fuse?.max ?? MAX_FUSE_MATERIALS, mats.length)
    const walk = (start, pick) => { // 素材の組み合わせ(最大 fuse.max 枚まで。手持ちは最大9枚なので、数は少ない)
      if (pick.length && fusionFor(art, pick, state.artifactCatalog)) out.push({ type: 'fuse', artifact: art.slot, materials: pick.map((m) => m.slot) })
      if (pick.length >= max) return
      for (let k = start; k < mats.length; k++) walk(k + 1, [...pick, mats[k]])
    }
    walk(0, [])
  }
  return out
}
function doFuse(state, actor, action) {
  const team = actor.team
  const who = team === 'A' ? '自分' : '相手'
  const i = state.artifacts[team].findIndex((a) => a.slot === action.artifact)
  const art = state.artifacts[team][i]
  const mats = action.materials.map((sl) => state.artifacts[team].find((m) => m.slot === sl))
  const into = fusionFor(art, mats, state.artifactCatalog)
  state.mp[team] -= art.def.fuse?.cost ?? 0
  const next = makeArtifact(into, 0)
  next.slot = art.slot
  state.artifacts[team][i] = next
  state.artifacts[team] = state.artifacts[team].filter((m) => !action.materials.includes(m.slot)) // 素材にしたアーティファクトは、手持ちから無くなる
  state.log.push(`${who}は【${mats.map((m) => m.name).join('・')}】を融合して、アーティファクト【${art.name}】は【${next.name}】に変身した`)
  emit(state, 'fuse', { team, from: art.name, into: next.name, materials: mats.map((m) => m.name) })
}
function doPlayArtifact(state, actor, action, opts) {
  const team = actor.team
  const i = state.artifacts[team].findIndex((a) => a.slot === action.artifact)
  const art = state.artifacts[team][i]
  state.mp[team] -= art.cost
  state.artifacts[team].splice(i, 1)
  state.log.push(`${team === 'A' ? '自分' : '相手'}のアーティファクト【${art.name}】を場に出す(MP${art.cost})`)
  const u = summon(state, actor, art.def)
  if (u) u.artifact = true
  recalc(state)
}

// ブーストで育つスペル(onBoost を持つもの): いまのXを、効果(addX × X を add に)と説明に反映する
function refreshSpell(sp) {
  if (!sp.onBoost || sp.onBoost.noX) return // noX: Xを持たない(コストだけが変わる)スペル
  sp.effects = sp.baseEffects.map((e) => (e.addX != null ? { ...e, add: e.addX * sp.x } : e))
  sp.desc = `${sp.baseDesc}(いま X=${sp.x})`
}
// スペルブースト(発動したスペル以外も、効果で): 手札(スペルセット)の、onBoost を持つスペルが育つ。Xが増え、必要MPも増える(増えるのは maxCostUps 回まで)
// スペル1つを n 回スペルブーストする(Xが増え、必要MPも増える。transform があれば、Xが条件に届いたとき別のスペルに変身する)
function growSpell(state, team, sp, n) {
  for (let k = 0; k < n; k++) {
    sp.x = Math.min(sp.onBoost.maxX ?? 99, sp.x + (sp.onBoost.x ?? 1)) // Xの増加は maxX(99)まで
    if ((sp.costUps || 0) < (sp.onBoost.maxCostUps ?? 9)) { sp.cost = Math.max(sp.onBoost.minCost ?? 0, sp.cost + (sp.onBoost.cost ?? 0)); sp.costUps = (sp.costUps || 0) + 1 } // MPが増えるのは maxCostUps(9)回まで
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
  if (n > 0) seasonBoost(state, team, seasonRng) // シーズン補正(ウィッチ)
  for (const sp of [...state.spells[team]]) {
    if (!sp.onBoost || sp === except) continue
    growSpell(state, team, sp, n)
  }
}

// キャラクターが、スペルブーストされた(boost の回数を数え、【スペルブースト時】のパッシブが働く)
function boostUnit(state, u, n) {
  u.boost = (u.boost || 0) + n
  // スペルブーストしたこと自体は、ログに出さない(例外は、指示があったものだけ)
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
// コンボ: プレイヤー(チーム)に蓄積し、味方のアクションバーに並ぶ「コンボリセット」のターンで0に戻る
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
    units, classTrait, season: { A: newSeason(teamADefs), B: newSeason(teamBDefs) }, ctCarry: { A: { boost: 0, earth: 0 }, B: { boost: 0, earth: 0 } }, totalAV: 0, round: 0, turns: 0, actionsThisTurn: 0,
    mp: { A: 0, B: 0 }, mpMax: { A: 0, B: 0 }, ep: { A: 0, B: 0 },
    faith: { A: 0, B: 0 }, boost: { A: 0, B: 0 }, earth: { A: 0, B: 0 }, crests: { A: [], B: [] }, graveyard: { A: 0, B: 0 },
    link: { A: 0, B: 0 }, traitCount: { A: 0, B: 0 }, summonSeq: Math.max(startSummons.A, startSummons.B), pending: null,
    active: null, activeKind: null, winner: null, log: ['バトル開始!'],
    comboReset: { A: null, B: null }, comboCount: { A: 0, B: 0 },
    evolveReadyShown: { A: false, B: false }, // 「進化可能」の演出を、そのチームで出したか(各チーム1回。そのチームの最初のターンの頭に出す)
    keepTurn: { A: !!opts.keepTurn?.A, B: !!opts.keepTurn?.B }, // 設定「行動手段が無いとき自動でターンを終了」をオフにしたチーム(true なら、行動できなくても自動では終わらず、自分で終える)
    catalog: opts.catalog || [], // 全カードの定義(「ビショップ・アミュレットの中から召喚」など、所持に関係なく全カードから選ぶ能力の候補)
    pool: { A: opts.pool?.A || [], B: opts.pool?.B || [] }, // 所持キャラクター(「所持キャラから召喚する」能力の候補)
    // スペル(プレイヤー能力): opts.spells = { A: [スペル定義...], B: [...] }(同じスペルを何回入れてもよい。最大 MAX_SPELL_SLOTS 回分)
    // 自分のキャラのターン中に、枠1つにつき1回、MPを払って使える
    spells: { A: (opts.spells?.A || []).slice(0, MAX_SPELL_SLOTS).map(makeSpell), B: (opts.spells?.B || []).slice(0, MAX_SPELL_SLOTS).map(makeSpell) },
    artifactCatalog: opts.artifactCatalog || [], // 融合の変身先(idや名前で書かれたもの)を探す一覧
    // アーティファクト(opts.artifacts = { A: [定義...], B: [...] })
    artifacts: { A: (opts.artifacts?.A || []).slice(0, MAX_HAND).map(makeArtifact), B: (opts.artifacts?.B || []).slice(0, MAX_HAND).map(makeArtifact) },
    casting: null, lastAbility: null, abilitySeq: 0, means: '', // means = いま働いている攻撃手段の名前(スキル名・特性名など。画面の「○○の△△!」用)
    events: [], rec: opts.record !== false, // events = 直近の行動で起きたことの記録(画面で1つずつ再生する用)
  }
  for (const t of ['A', 'B']) for (const cls of state.season[t].classes) state.log.push(`${t === 'A' ? '自分' : '相手'}側にシーズン補正【${SEASON_BONUS[cls].name}】が付与された`)
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
// 相手のユニット = 場のキャラクター + 召喚物 + アミュレット(フォロワー = キャラクター + 召喚物。アミュレットは召喚物ではない)
const enemyUnitsOf = (state, u) => [...enemiesOf(state, u).filter(abilityTargetable), ...state.units.filter((x) => x.alive && x.field === 'summon' && x.team !== u.team && abilityTargetable(x) && !hasKw(x, 'earthSign'))]
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
const comboOf = (state, unit) => state.comboCount[unit.team] // コンボは、ユニットではなくプレイヤー(チーム)に蓄積する

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
  if (c.hpAtMost != null && unit.hp > c.hpAtMost) return false // HPの実数(「体力が400以下」)
  if (c.hpAbove != null && (unit.hp / unit.maxHp) * 100 < c.hpAbove) return false
  if (c.awaken && state.mpMax[unit.team] < AWAKEN_MP) return false // 【覚醒】
  if (c.notAwaken && state.mpMax[unit.team] >= AWAKEN_MP) return false // 【覚醒】でないとき(「200ダメージではなく400ダメージ」の、200のほう)
  if (c.mpMax != null && state.mpMax[unit.team] < c.mpMax) return false // 自分のMP最大値が、これ以上のとき
  if (c.acted && !unit.hasActed) return false // 自身が行動したあと(自分のターンを1度終えたあと)
  if (c.evolved != null && unit.evolved !== c.evolved) return false
  if (c.allyEvolved && !state.units.some((x) => x.alive && !x.isAmulet && x.team === unit.team && x.evolved)) return false // 自分の場に、進化後のフォロワー(キャラ・召喚物)がある
  if (c.evolveTurn && state.round < EP_GRANT_ROUND) return false // 進化可能ターン: EPが配られたラウンドから戦闘終了まで
  if (c.crests != null && state.crests[unit.team].length < c.crests) return false
  if (c.combo != null && comboOf(state, unit) < c.combo) return false // コンボ: 味方の特性が使われた回数
  if (c.fieldCharsBelow != null && state.units.filter((x) => x.alive && x.field === 'main' && x.team === unit.team).length >= c.fieldCharsBelow) return false // 自分の場の生存しているキャラクターが N 体未満
  if (c.fieldCharsAtLeast != null && state.units.filter((x) => x.alive && x.field === 'main' && x.team === unit.team).length < c.fieldCharsAtLeast) return false // 自分の場の生存しているキャラクターが N 体以上
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
export const hasComboAbility = (u) => u.passiveObjs.some((p) => p.trigger === 'combo' || p.condition?.combo != null || p.usesCombo || p.effects?.some((e) => e.fromOwned || e.perCombo || e.comboCount)) || (u.traits || []).some((t) => t.usesCombo || t.effects?.some((e) => e.perCombo))
// 自分の場(場のキャラ + 召喚物フィールド)にいる、指定のタイプのキャラの数
// タイプの判定: 「トークン/兵士」のように「/」でつないだタイプは、どの部分にも当てはまる(兵士でもあり、トークンでもある)
const hasType = (u, type) => !!u && !!u.type && String(u.type).split('/').includes(type)
const typeCount = (state, source, type) => state.units.filter((u) => u.alive && !u.isAmulet && u.team === source.team && hasType(u, type)).length // フォロワー(キャラ + 召喚物)の数。アミュレットは数えない
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
    const n = comboHolders(state, team).length
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
    mods.push(...seasonMods(state, u)) // シーズン補正(異界の共鳴)
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
      if (u.isAmulet && stat !== 'spd') { u[stat] = u.base[stat]; continue } // アミュレットは、速度以外のステータス(HP・攻撃・防御など)を持たない扱い。バフ・デバフ・クラス特性の影響を受けない
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
  if (skill.type === 'true') {
    // 確定ダメージは、クリティカルが出ない
  } else if (opts.expected) {
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
  const upCoef = (1 + Math.max(-90, attacker.dmgUp || 0) / 100) * (1 + (skill.type === 'physical' ? attacker.physUp || 0 : skill.type === 'magic' ? attacker.magUp || 0 : 0) / 100) // 与ダメージ(効果で増減)× 物理/魔法ダメージ%(遺物)
  const raw = base * critMul * defCoef * resCoef * ctMul * upCoef
  return { damage: opts.expected ? raw : Math.max(1, Math.floor(raw)), isCrit }
}

// アーマーがあれば、吸収レートの分だけ先にアーマーが受ける
// 例: 吸収レート60%なら、ダメージの60%をアーマーが受け、体力は残り40%分を受ける
//     アーマーが足りなければ、あふれた分は体力が受ける
// 確定ダメージ(isTrue)は、アーマーに対するダメージが元の50%に減る
const TRUE_VS_ARMOR = 0.5
const MAGIC_VS_ARMOR = 1.15 // 魔法ダメージは、アーマーに通常より15%多くダメージを与える
function dealDamage(target, dmg, isTrue = false, dmgType = 'physical') {
  const mult = isTrue ? TRUE_VS_ARMOR : dmgType === 'magic' ? MAGIC_VS_ARMOR : 1
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
function applyDamage(state, source, target, amount, isTrue = false, dmgType = 'physical') {
  if (!target.alive) return 0
  if (target.isAmulet) return 0 // アミュレットには体力がなく、ダメージを受けない(なくなるのは、破壊・消滅・カウントダウンだけ)
  if (target.barrier > 0) {
    target.barrier = 0
    state.log.push(`${target.name}のバリアが攻撃を防いだ!`)
    emit(state, 'block', { src: source.uid, target: target.uid, means: state.means || '攻撃' })
    return 0
  }
  dealDamage(target, amount, isTrue, dmgType)
  if (!target.alive) target.killedBy = source.uid
  if (target.field === 'main') { state.graveyard[target.team] += GRAVE_PER_HIT; if (seasonGrave(state, target.team, GRAVE_PER_HIT)) recalc(state) } // 攻撃をされると墓場が溜まる
  emit(state, 'damage', { src: source.uid, target: target.uid, amount: Math.round(amount), means: state.means || '効果', dmgType: isTrue ? 'true' : dmgType })
  return amount
}

// 最大HP(と現在HP)を増減する(「最大HP」の増減)。0以下になったら倒れる
function changeMaxHp(state, t, up, source) {
  if (t.isAmulet || !t.alive || !up) return
  t.maxHp = Math.max(1, t.maxHp + up)
  t.hp = up > 0 ? t.hp + up : Math.min(t.hp + up, t.maxHp)
  if (t.hp <= 0) { t.hp = 0; t.alive = false; t.killedBy = source?.uid }
}
// 現在HPを直接減らす(「HP」の減少。ダメージではないので、防御・アーマー・バリアは関係ない)。減ったら、相手の【相手のフォロワーのHPが場で減らされたとき】が働く
function loseHpOf(state, t, amount, source) {
  if (t.isAmulet || !t.alive || !(amount > 0)) return 0
  const before = t.hp
  t.hp = Math.max(0, t.hp - amount)
  const lost = before - t.hp
  if (t.hp <= 0) { t.alive = false; t.killedBy = source?.uid }
  if (lost > 0) for (const a of state.units.filter((x) => x.alive && x.team !== t.team)) fire(state, 'enemyHpDown', a, { other: t })
  return lost
}

function heal(state, unit, amount) {
  if (!unit.alive || unit.isAmulet) return
  const before = unit.hp
  unit.hp = Math.min(unit.maxHp, unit.hp + amount)
  const gained = Math.round(unit.hp - before)
  if (gained > 0) {
    state.log.push(`${unit.name}は${gained}回復した`)
    emit(state, 'heal', { target: unit.uid, amount: gained })
    seasonHealed(state, unit) // シーズン補正(ビショップ)
    fireCrestsOnHeal(state, unit.team)
  } else if (amount > 0) {
    emit(state, 'heal', { target: unit.uid, amount: 0 }) // 体力が満タンで増えなくても、回復の演出は流す(ログ・クレストの「回復したとき」は働かない)
  }
}

// クレストの能力を1つ働かせる(ログ → 左のログ → 効果)。クレストの能力は、すべてここを通る
function runCrestPassive(state, crest, p, source, ctx = {}, kind = 'クレスト', head = `クレスト【${crest.name}】が働いた`) {
  state.log.push(head)
  noteAbility(state, kind, crest.name, p.name, p.desc ?? crest.desc, crest.team, p.log)
  runEffects(state, source, p.effects, ctx)
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
      runCrestPassive(state, crest, p, source)
    }
  }
}

// 起きたことの記録(画面で、1つずつ順番に見せるため)。そのときの盤面の要約(体力など)つき。AIの先読み(expected)のときは記録しない
const SNAP_KEYS = ['hp', 'maxHp', 'alive', 'armor', 'armorRate', 'barrier', 'stealth', 'countdown', 'comboCount', 'evolved', 'earthCount', 'curAV', 'baseAV', 'acts', 'accelActs']
function crestSlots(state) {
  const o = {}
  for (const t of ['A', 'B']) o[t] = (state.crests?.[t] || []).map((c) => ({ countdown: c.countdown, slot: c.slot && { ...c.slot } }))
  return o
}
function emit(state, type, data = {}) {
  if (!state.rec) return
  const units = {}
  for (const u of state.units) {
    const o = { keywords: [...u.keywords] }
    for (const k of SNAP_KEYS) o[k] = u[k]
    o.accelAV = u.accel ? u.accel.curAV : null
    units[u.uid] = o
  }
  state.events.push({ type, ...data, round: state.round, units, totalAV: state.totalAV, comboReset: { A: state.comboReset.A && { ...state.comboReset.A }, B: state.comboReset.B && { ...state.comboReset.B } }, crestSlots: crestSlots(state), logLen: state.log.length, mp: { ...state.mp }, ep: { ...state.ep }, comboCount: { ...state.comboCount } })
}

// 直近に発動した能力(画面に説明を出すための記録): kind=種類(ファンファーレ・特性・スペルなど) owner=持ち主の名前 name=能力名 desc=説明
// log=左のログに出す文(なければ desc)
function noteAbility(state, kind, owner, name, desc, team, log, uid = null) {
  state.abilitySeq += 1
  state.lastAbility = { seq: state.abilitySeq, kind, owner, name: name || '', desc: desc || '', team: team ?? null }
  state.means = name || kind
  emit(state, 'ability', { kind, owner, uid, name: name || '', desc: desc || '', log: log || '', nolog: log === false, team: team ?? null }) // log: false = 左のログには出さない
}

// ---------- 効果の実行 ----------

// ---------- 対象の指定 ----------
// 対象は { side, scope, pick, other } で表す。古い文字列(target: 'enemyFieldOne' など)は TARGETS の表で同じものに読み替える。
//   side : ally(味方) / enemy(相手) / field(両チーム)
//   scope: main(場のキャラ) / follower(キャラ + 召喚物。アミュレットは含まない) / unit(キャラ + 召喚物 + アミュレット) / amulet / summon(召喚物 + アミュレット)
//          'auto' = 効果の units / followers フラグで決める(units → unit、followers → follower、なければ main)
//   pick : all(全員) / chosen(選ぶ。選ばれなければ先頭) / random(ランダム1体) / weakest(選ばれなければ、HP割合が最も低い1体) / topAtk(攻撃力が最大のものからランダム1体)
//          chosenRandom(選ばれなければ、ランダム1体)
//   other: true なら自分を除く
//   cand : 選ぶとき(choose)の候補の範囲(省略すると scope と同じ)
// 新しい対象を足すときは、TARGETS に1行足すだけ
const TARGETS = {
  allies: { side: 'ally', scope: 'auto', pick: 'all' },
  otherAllies: { side: 'ally', scope: 'auto', pick: 'all', other: true },
  summons: { side: 'ally', scope: 'summon', pick: 'all' },
  allyField: { side: 'ally', scope: 'unit', pick: 'all' },
  allyAmulets: { side: 'ally', scope: 'amulet', pick: 'all' },
  otherAllyField: { side: 'ally', scope: 'unit', pick: 'all', other: true },
  allyFieldRandom: { side: 'ally', scope: 'unit', pick: 'random', charsOnly: true },
  allyFieldOne: { side: 'ally', scope: 'unit', pick: 'chosen' },
  allyAmuletOne: { side: 'ally', scope: 'amulet', pick: 'chosen' },
  allyOne: { side: 'ally', scope: 'auto', pick: 'weakest', cand: 'follower' },
  otherAllyOne: { side: 'ally', scope: 'auto', pick: 'chosen', other: true },
  enemies: { side: 'enemy', scope: 'auto', pick: 'all', enemyAuto: true },
  allyFollowers: { side: 'ally', scope: 'follower', pick: 'all' },
  enemyFollowers: { side: 'enemy', scope: 'follower', pick: 'all' },
  allyFollowerRandom: { side: 'ally', scope: 'follower', pick: 'random' }, // 自分の場のフォロワー(キャラ + 召喚物)からランダム1体(count で複数)
  enemyFollowerRandom: { side: 'enemy', scope: 'follower', pick: 'random' }, // 相手の場のフォロワー(キャラ + 召喚物)からランダム1体
  enemyField: { side: 'enemy', scope: 'unit', pick: 'all' },
  enemyTopAtk: { side: 'enemy', scope: 'main', pick: 'topAtk' }, // 相手の場のキャラクターのうち、攻撃力が最大のものからランダム1体
  enemyRandom: { side: 'enemy', scope: 'auto', pick: 'random', enemyAuto: true },
  enemyCharRandom: { side: 'enemy', scope: 'main', pick: 'random' }, // 相手の場のキャラクター(召喚物・アミュレットは除く)からランダム1体
  enemyFollowerOne2: { side: 'enemy', scope: 'follower', pick: 'chosenRandom', exclude: 'enemyFollowerOne' }, // 「相手のフォロワー2体を選ぶ」の2体目(enemyFollowerOne で選んだ1体は選べない)
  enemyCharOne2: { side: 'enemy', scope: 'main', pick: 'chosenRandom', exclude: 'enemyCharOne' }, // 「相手のキャラクター2体を選ぶ」の2体目(enemyCharOne で選んだ1体は選べない。効果は enemyCharOne → enemyCharOne2 の順に書く)
  enemySummonTopAtk: { side: 'enemy', scope: 'follower', pick: 'topAtk', only: 'summon' }, // 相手の場の召喚物のうち、攻撃力が最大のものからランダム1体
  enemySummons: { side: 'enemy', scope: 'follower', pick: 'all', only: 'summon' }, // 相手の場の召喚物すべて(アミュレットは含まない)
  enemyCharOne: { side: 'enemy', scope: 'main', pick: 'chosenRandom' }, // 相手の場のキャラクター1体を選ぶ
  enemyFieldRandom: { side: 'enemy', scope: 'unit', pick: 'random' },
  enemyOne: { side: 'enemy', scope: 'auto', pick: 'chosenRandom', enemyAuto: true, cand: 'mainAmulet' },
  enemyFieldOne: { side: 'enemy', scope: 'unit', pick: 'chosenRandom', pool: 'enemyUnits' },
  allyFollowerOne: { side: 'ally', scope: 'follower', pick: 'chosenRandom' }, // 自分の場のフォロワー(キャラ + 召喚物)から1体を選ぶ
  enemyFollowerOne: { side: 'enemy', scope: 'follower', pick: 'chosenRandom' }, // 相手の場のフォロワー(キャラ + 召喚物)から1体を選ぶ
  fieldOthers: { side: 'field', scope: 'main', pick: 'all', other: true },
  fieldSummons: { side: 'field', scope: 'follower', pick: 'all', only: 'summon' },
  fieldAll: { side: 'field', scope: 'unit', pick: 'all' },
  fieldFollowers: { side: 'field', scope: 'followerAll', pick: 'all' }, // 場のフォロワーすべて(敵味方)
  fieldAmulets: { side: 'field', scope: 'amulet', pick: 'all' },
}

// side と scope から、対象の候補(全員)を作る
function poolOf(state, source, side, scope, e = {}) {
  if (scope === 'auto') scope = e.units ? 'unit' : e.followers ? 'follower' : 'main'
  if (side === 'field') {
    const live = state.units.filter((u) => u.alive)
    if (scope === 'main') return live.filter((u) => u.field === 'main')
    if (scope === 'follower') return live.filter((u) => u.field === 'summon' && !u.isAmulet)
    if (scope === 'amulet') return live.filter((u) => u.isAmulet)
    if (scope === 'followerAll') return live.filter((u) => !u.isAmulet) // 場のフォロワーすべて(キャラ + 召喚物。敵味方とも。アミュレットは除く)
    return live
  }
  if (side === 'ally') {
    const main = alliesOf(state, source)
    const sm = summonsOf(state, source)
    if (scope === 'main') return main
    if (scope === 'follower') return [...main, ...sm.filter((u) => !u.isAmulet)]
    if (scope === 'unit') return [...main, ...sm]
    if (scope === 'amulet') return sm.filter((u) => u.isAmulet)
    if (scope === 'summon') return sm
    return main
  }
  // 相手: 隠れている・オーラのあるユニットは、能力の対象にならない
  const main = enemiesOf(state, source).filter(abilityTargetable)
  const sm = enemiesSummonsOf(state, source)
  if (scope === 'main') return main
  if (scope === 'follower') return [...main, ...sm.filter((u) => !u.isAmulet && abilityTargetable(u))]
  if (scope === 'unit') return [...main, ...sm.filter(abilityTargetable)]
  if (scope === 'mainAmulet') return enemyOneList(state, source)
  if (scope === 'enemyUnits') return enemyUnitsOf(state, source)
  return main
}

function resolveTargets(state, source, key, ctx) {
  const rng = ctx.opts?.rng || Math.random
  const onlyFilter = ctx.only ? filterOf(ctx.only, EFFECT_FILTER_KEYS) : {} // ランダムに選ぶ前に、候補をしぼる
  const keep = (u) => matchUnit(u, onlyFilter)
  const randomOf = (list0) => { const list = list0.filter(keep); return list.length ? [list[Math.floor(rng() * list.length)]] : [] }
  const T = TARGETS[key]
  const chosenId = ctx.chosenMap ? ctx.chosenMap[key] : ctx.chosen // 選ぶ効果が2つ以上あるときは、対象ごとに選んだものを覚えている(chosenMap)
  if (T) {
    const eff = { followers: ctx.followers, units: ctx.units }
    let scope = T.scope
    if (T.charsOnly && ctx.only?.charsOnly) scope = 'main'
    let pool = poolOf(state, source, T.side, T.pool || scope, eff)
    if (T.only === 'summon') pool = pool.filter((u) => u.field === 'summon')
    if (T.other) pool = pool.filter((u) => u !== source && u.uid !== source.uid)
    if (T.exclude && ctx.chosenMap?.[T.exclude]) pool = pool.filter((u) => u.uid !== ctx.chosenMap[T.exclude]) // 1体目に選んだものは、2体目には選べない
    switch (T.pick) {
      case 'all': return pool
      case 'random': return randomOf(pool)
      case 'topAtk': { const l = pool.filter(keep); const top = Math.max(...l.map((u) => u.atk)); return randomOf(l.filter((u) => u.atk === top)) }
      case 'weakest': {
        if (chosenId) return [getUnit(state, chosenId)].filter((u) => u?.alive) // 破壊されたユニットは対象にしない
        return [[...pool].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]].filter(Boolean)
      }
      case 'chosenRandom':
        return chosenId ? [getUnit(state, chosenId)].filter((u) => u?.alive) : randomOf(pool)
      case 'chosen': {
        if (chosenId) { // 選ぶ段階で候補が決まっている。召喚物・アミュレットも選べるので、広い範囲から探す
          const wide = T.scope === 'auto' ? poolOf(state, source, T.side, 'unit', eff) : pool
          return wide.filter((u) => u.alive && (u.uid === chosenId && u.uid !== source.uid || (!T.other && u.uid === chosenId))) // wide は生存しているものだけだが、念のため
        }
        return pool.slice(0, 1) // 選ばれなかった(CPUの読み・テストなど)ときは先頭の1体
      }
    }
  }
  const alliesMain = alliesOf(state, source)
  switch (key) {
    case 'self': return [source]
    case 'opponent': return ctx.other && ctx.other.alive ? [ctx.other] : []
    // 【最も近い味方1体】(target: 'nearestAlly')
    //   効果が働いた時点(このキャラが行動中)で、自分以外の場のキャラ(召喚物・アミュレットは含まない)のうち、
    //   いまの行動値(curAV)が最も小さい1体。同じ行動値なら、場の並びで先の1体。味方がいなければ何もしない
    case 'nearestAlly': {
      const others = alliesMain.filter((u) => u !== source && u.uid !== source.uid)
      return [[...others].sort((a, b) => a.curAV - b.curAV)[0]].filter(Boolean)
    }
    case 'entered': return ctx.other && ctx.other.alive ? [ctx.other] : [] // 「味方が場に出たとき」の、出てきたキャラ
    default: return []
  }
}

function statLabel(stat) {
  return { atk: '攻撃力', mag: '魔力', def: '防御力', spd: '速度', critRate: 'クリティカルレート', critDmg: 'クリティカルダメージ', dmgResist: '耐性値', dmgUp: '与ダメージ' }[stat] || stat
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
// ユニットの絞り込み: filter: { name, type, class, field, follower, keyword }(書いたものすべてに合うユニットだけ)
//   効果の filter は「対象」を、パッシブの filter は「出た / 倒れたユニット(ctx.other)」を絞る。
//   古い書き方(効果: onlyName / onlyType / onlyClass / onlyField、パッシブ: enterName / enterType / enterFollower / deathKeyword)も、同じ filter として読む
//   新しい絞り込みを足すときは、matchUnit に1行足すだけ
const EFFECT_FILTER_KEYS = { onlyName: 'name', onlyType: 'type', onlyClass: 'class', onlyField: 'field' }
const PASSIVE_FILTER_KEYS = { enterName: 'name', enterType: 'type', enterFollower: 'follower', deathKeyword: 'keyword' }
function filterOf(obj, keys) {
  const f = { ...(obj.filter || {}) }
  for (const [k, to] of Object.entries(keys)) if (obj[k] != null && obj[k] !== false) f[to] = obj[k]
  return f
}
const matchUnit = (u, f) => !!u
  && (!f.name || u.name === f.name)
  && (!f.type || hasType(u, f.type))
  && (!f.class || u.class === f.class)
  && (!f.field || u.field === f.field) // 'main' = 場のキャラクターだけ / 'summon' = 召喚物(アミュレットも)だけ
  && (!f.follower || !u.isAmulet) // フォロワー(キャラ + 召喚物。アミュレットは含まない)
  && (!f.keyword || hasKw(u, f.keyword))
const hasFilter = (f) => Object.keys(f).length > 0

// 効果に払うコスト(足りなければ、その効果は働かない)。新しいコストは、COSTS に1つ足すだけ
//   quietShort: 足りないときに、ログを出さない / unit: ログに出す単位
const COSTS = {
  earthCost: { name: '土の秘術', unit: '土の印', quietShort: true, have: (st, team) => st.earth[team], pay: (st, src, n) => addEarth(st, src.team, src, -n) },
  graveCost: { name: 'ネクロマンス', unit: '墓場', have: (st, team) => st.graveyard[team], pay: (st, src, n) => { st.graveyard[src.team] -= n } },
}
const COST_KEYS = Object.keys(COSTS)
function payCosts(state, source, e) {
  const need = COST_KEYS.filter((k) => e[k])
  for (const k of need) { // 先に、すべて足りるか確かめる(一部だけ払って失敗、をなくす)
    const c = COSTS[k]
    if (c.have(state, source.team) < e[k]) { if (!c.quietShort) state.log.push(`${c.unit}が足りないので、【${c.name}_${e[k]}】は働かなかった`); return false }
  }
  for (const k of need) {
    const c = COSTS[k]
    c.pay(state, source, e[k])
    state.log.push(`【${c.name}_${e[k]}】${c.unit}を${e[k]}消費(${c.have(state, source.team)})`)
  }
  return true
}

// 「〜1つにつき、効果がその分だけ増える」: 数えるもの(COUNTERS)× 1つあたりの量。効果に per* を書く(キー名 → 数えるもの)
//   perEarth(土の印)/ perGraveyard(墓場)/ perCombo(コンボ)/ perFollower(自分の場のフォロワー数)/ perBoost(スペルブーストされた回数)/ perType(タイプの数。1つあたりは perTypeFlat)
//   新しく数えるものを足すときは、COUNTERS に1行と PER_KEYS に1行足すだけ
const COUNTERS = {
  earth: (state, src) => state.earth[src.team],
  graveyard: (state, src) => state.graveyard[src.team],
  combo: (state, src) => comboOf(state, src),
  follower: (state, src) => state.units.filter((u) => u.alive && !u.isAmulet && u.team === src.team).length,
  boost: (state, src) => src.boost || 0,
  type: (state, src, e) => typeCount(state, src, e.perType),
}
const PER_KEYS = { perEarth: 'earth', perGraveyard: 'graveyard', perCombo: 'combo', perFollower: 'follower', perBoost: 'boost' }
// skip: 数えない per キー(バフの perGraveyard は、割合(pct)のほうに足すため、flat では数えない)
function perAmount(state, src, e, skip = []) {
  let sum = 0
  for (const [key, of] of Object.entries(PER_KEYS)) if (e[key] && !skip.includes(key)) sum += e[key] * COUNTERS[of](state, src, e)
  if (e.perType) sum += (e.perTypeFlat ?? 1) * COUNTERS.type(state, src, e)
  return sum
}
const graveBonus = (state, source, e) => (e.perGraveyard || 0) * COUNTERS.graveyard(state, source) // バフの割合(pct)に足す墓場の分

// 消滅させる: 破壊でも「場を離れる」でもない。墓場にも倒された記録にも入らず、ラストワードや味方の戦闘不能の能力も働かない
function vanishUnit(state, u, log = true, blast = false) {
  if (!u.alive) return
  u.alive = false; u.deathHandled = true; u.hp = 0; u.vanished = true // 消滅したものは、蘇生できない
  u.buffs = []; u.armor = 0; u.barrier = 0; u.stealth = false
  if (log) state.log.push(`${u.name}は消滅した`)
  emit(state, 'vanish', blast ? { target: u.uid, blast: true } : { target: u.uid }) // blast: アルビオンバハムートの爆発の動画が、上に重なる
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

// 蘇生【リアニメイト_N】: 自分の倒れた(消滅していない)キャラクター・召喚物のうち、速度がNのものからランダムに1体を蘇生する。
// 元いた場所(場のキャラ / 召喚物フィールド)に、入場直後の状態で戻る。召喚物フィールドが満員のときは、召喚物は選ばれない
function reanimate(state, source, speed, opts) {
  const rng = opts?.rng || Math.random
  const full = summonsOf(state, source).length >= SUMMON_MAX
  // 蘇生できるのは、破壊されたフォロワー(キャラクター・召喚物。アミュレットは含まない)のうち、元の速度(base.spd)がちょうど speed のもの
  const cands = state.units.filter((u) => !u.alive && !u.vanished && !u.isAmulet && u.team === source.team && Math.round(u.base.spd) === speed && !(u.field === 'summon' && full))
  if (!cands.length) { state.log.push(`【リアニメイト_${speed}】蘇生できるものがいなかった`); return null }
  const old = cands[Math.floor(rng() * cands.length)]
  const idx = state.units.indexOf(old)
  const u = makeUnit(old.charDef, old.team, 0, old.field, old.uid)
  applyClassTrait(u, state.classTrait?.[old.team])
  state.units[idx] = u
  emit(state, 'summon', { target: u.uid, name: u.name, team: u.team })
  state.log.push(`【リアニメイト_${speed}】${u.name}が蘇生した`)
  for (const a of state.units.filter((x) => x.alive && x.team === u.team && x.uid !== u.uid)) fire(state, 'allyEnter', a, { other: u })
  seasonEnter(state, u) // シーズン補正
  recalc(state)
  fire(state, 'onEnter', u, {})
  return u
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
  if (opts.defer) return u // 複数を一気に召喚するとき: 全員が出てから、場に出たときの能力・付与を働かせる(afterEnter)
  afterEnter(state, u)
  return u
}

// 場に出たあとの処理: クレストによる付与・味方の【場に出たとき】・自分の【場に出たとき】
function afterEnter(state, u) {
  // クレストの onEnter: 自分のチームの(指定のタイプの)キャラが場に出たとき、キーワード能力(疾走など)を持つ
  for (const crest of state.crests[u.team]) {
    const oe = crest.onEnter
    if (oe && (oe.atk || oe.hp) && !(oe.type && !hasType(u, oe.type))) { // atk / hp: 場に出たユニットの攻撃力・体力が増減する(マイナスは「-100/-100」)
      if (oe.atk) u.buffs.push({ stat: 'atk', pct: 0, flat: oe.atk, turns: null })
      state.log.push(`【${crest.name}】の効果で、${u.name}は${oe.atk >= 0 ? '+' : ''}${oe.atk || 0}/${(oe.hp || 0) >= 0 ? '+' : ''}${oe.hp || 0}する`)
      if (oe.log) noteAbility(state, 'クレスト', `クレスト：${crest.name}`, '', crest.desc, crest.team, oe.log)
      if (oe.hp) { if (oe.hp < 0) loseHpOf(state, u, -oe.hp, null); else changeMaxHp(state, u, oe.hp, null); if (!u.alive) resolveDeaths(state) } // hp: マイナスは現在HPの減少、プラスは最大HPの増加
    }
    if (!oe || (oe.type && !hasType(u, oe.type)) || !oe.gainKeyword || u.keywords.includes(oe.gainKeyword)) continue
    u.keywords.push(oe.gainKeyword)
    state.log.push(`【${crest.name}】の効果で、${u.name}は【${KEYWORDS[oe.gainKeyword]?.label || oe.gainKeyword}】を持つ`)
    if (oe.log) noteAbility(state, 'クレスト', `クレスト：${crest.name}`, '', crest.desc, crest.team, oe.log) // 左のログ(oe.log があるときだけ)
  }
  // 自分の場の「味方が場に出たとき」(enterType があれば、そのタイプのキャラが出たときだけ)
  for (const a of state.units.filter((x) => x.alive && x.team === u.team && x.uid !== u.uid)) fire(state, 'allyEnter', a, { other: u })
  seasonEnter(state, u) // シーズン補正
  recalc(state)
  fire(state, 'onEnter', u, {}) // 【場に出たとき】: ファンファーレ(最初の自分のターン開始時)とは違い、出た瞬間に働く
}

// 選択が必要な効果(choose: true)の、選べる対象の一覧
function candidatesOf(state, source, e, ctx = {}) {
  const key = e.target || 'self'
  const T = TARGETS[key]
  let list
  if (T && (T.pick === 'chosen' || T.pick === 'chosenRandom' || T.pick === 'weakest')) {
    // 選べる範囲: cand があればそれ(allyOne はフォロワーまで)、なければ scope と同じ。enemyOne は、フォロワーの能力なら召喚物も、そうでなければ場のキャラ + アミュレット
    const cand = T.cand === 'mainAmulet' ? (e.followers ? 'follower' : 'mainAmulet') : T.cand || T.scope
    list = poolOf(state, source, T.side, cand, e)
    if (T.pool && !T.cand) list = poolOf(state, source, T.side, T.pool, e)
    if (T.other) list = list.filter((u) => u.uid !== source.uid)
    if (T.exclude && ctx.chosenMap?.[T.exclude]) list = list.filter((u) => u.uid !== ctx.chosenMap[T.exclude])
  } else list = resolveTargets(state, source, key, { followers: e.followers, units: e.units })
  const f = filterOf(e, EFFECT_FILTER_KEYS)
  return hasFilter(f) ? list.filter((u) => matchUnit(u, f)) : list
}

// 候補が0体 → 何もしない / 1体 → 自動で選ぶ / 2体以上 → state.pending に残して、選ばれるまで待つ(ファンファーレのときだけ)
function runEffects(state, source, effects, ctx = {}) {
  // repeat: n … 同じ効果を n 回行う(COSTS のコスト(土の印・墓場)は、最初の1回だけ払う。対象は毎回選び直す)
  if (effects.some((x) => x.repeat > 1)) effects = effects.flatMap((x, gi) => (x.repeat > 1 ? Array.from({ length: x.repeat }, (_, i) => ({ ...x, repeat: undefined, repGroup: `${gi}`, ...(i > 0 ? Object.fromEntries(COST_KEYS.map((k) => [k, undefined])) : null) })) : [x]))
  if (ctx.multi === undefined) ctx = { ...ctx, multi: effects.filter((x) => x.choose).length > 1 } // 「味方1体と相手1体を選ぶ」のように、選ぶ効果が2つ以上あるとき
  let skipGroup = null // コストが払えなかった repeat の組は、残りも行わない
  for (let idx = 0; idx < effects.length; idx++) {
    const e = effects[idx]
    if (e.repGroup != null && e.repGroup === skipGroup) continue
    if (e.condition && !checkCond(state, source, e.condition)) continue
    if (e.everyTurns > 1 || e.everyTurns === 1) { // 「Nターンに1回」: 自分のターンが来るたびに数えて、N回に1回だけ働く(最初の1回目から働く)
      source.everyCnt = source.everyCnt || {}
      const key = e.everyKey ?? idx
      const n = source.everyCnt[key] || 0
      source.everyCnt[key] = n + 1
      if (n % e.everyTurns !== 0) continue
    }
    if (!payCosts(state, source, e)) { skipGroup = e.repGroup ?? null; continue } // コスト(土の印・墓場)が払えないときは、働かない(対象を選ぶ効果とは組み合わせない: 選んだあとの再開で二重に消費するため)
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
          state.pending = { uid: source.uid, effects: effects.slice(idx), candidates: ['yes', 'no'], confirm: true, prompt: e.prompt || '追加の効果を使いますか?', trigger: ctx.trigger || null, nextPassive: ctx.nextPassive ?? null, spell: !!ctx.spell, spellName: ctx.spellName || state.casting || null }
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
    const chosenNow = ctx.multi ? ctx.chosenMap?.[e.target] : ctx.chosen
    if (e.choose && !chosenNow && ctx.allowPending) {
      const cands = candidatesOf(state, source, e, ctx)
      if (cands.length === 0) { state.log.push(`${source.name}の効果の対象がいなかった`); continue }
      if (cands.length > 1) {
        // 選んでもらうために止まる(残りの効果と、あとに続くパッシブは、選ばれたあとに続けて行う)
        state.pending = { uid: source.uid, effects: effects.slice(idx), candidates: cands.map((u) => u.uid), key: e.target, multi: !!ctx.multi, chosenMap: ctx.chosenMap || null, trigger: ctx.trigger || null, nextPassive: ctx.nextPassive ?? null, spell: !!ctx.spell, spellName: ctx.spellName || state.casting || null }
        state.log.push(`${source.name}の効果: 対象を選んでください`)
        recalc(state)
        return
      }
      ctx = { ...ctx, chosen: cands[0].uid, ...(ctx.multi ? { chosenMap: { ...ctx.chosenMap, [e.target]: cands[0].uid } } : {}) } // 1体だけなら自動で選ぶ
    }

    if (e.type === 'pick') continue // 対象を選ぶだけ(選んだものは、このあとの効果の target が、そのまま使う)。選ぶ範囲に絞り込みがかからないよう、絞り込み(onlyType など)は、あとの効果に書く

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
    if (e.type === 'copyPick') { // 手持ちのアーティファクト・自分の場のフォロワーから、合わせて max 体まで選び、そのコピーを召喚する
      const team = source.team
      const taken = ctx.copyTaken || []
      const opts = []
      for (const a of state.artifacts[team]) if (!a.def.noField && a.cost <= (e.maxCost ?? 99)) opts.push({ key: `art:${a.slot}`, name: `[手持ち] ${a.name}`, def: a.def })
      for (const u of state.units) if (u.alive && u.team === team && !u.isAmulet) opts.push({ key: `unit:${u.uid}`, name: `[場] ${u.name}`, def: u.charDef })
      const left = opts.filter((o) => !taken.includes(o.key))
      if (!ctx.copyStop && taken.length < (e.max ?? 2) && left.length && ctx.allowPending) {
        state.pending = {
          uid: source.uid, effects: effects.slice(idx), candidates: [...left.map((_, i) => `mode${i}`), `mode${left.length}`],
          modes: [...left.map((o) => ({ name: o.name, desc: '' })), { name: 'やめる', desc: '選ぶのをここまでにする' }], prompt: `コピーするものを選んでください(あと${(e.max ?? 2) - taken.length}体まで)`,
          copy: { taken, keys: left.map((o) => o.key) }, trigger: ctx.trigger || null, nextPassive: ctx.nextPassive ?? null, spell: !!ctx.spell, spellName: ctx.spellName || state.casting || null,
        }
        state.log.push(`${source.name}の効果: コピーするものを選んでください`)
        recalc(state)
        return
      }
      for (const key of taken) { // 選んだものを、1体ずつコピーして召喚する(コピーは「自身の行動終了後の相手のターン終了時、これを破壊。」を持つ)
        const o = opts.find((x) => x.key === key)
        if (!o) continue
        const def = { ...o.def, token: true, passives: [...(o.def.passives || []), ...(e.grant || [])] }
        summon(state, source, def)
      }
      ctx = { ...ctx, copyTaken: undefined, copyStop: undefined }
      continue
    }
    if (e.type === 'mode') { // 【モード】1つ選んで、その能力が働く(選ぶまで待つ。選べない場面では先頭のモード)
      let pick = ctx.mode
      if (pick === undefined) {
        if (ctx.allowPending) {
          state.pending = {
            uid: source.uid, effects: effects.slice(idx), candidates: e.modes.map((_, i) => `mode${i}`),
            modes: e.modes.map((m) => ({ name: m.name, desc: m.desc || '' })), prompt: e.prompt || 'モードを1つ選んでください',
            trigger: ctx.trigger || null, nextPassive: ctx.nextPassive ?? null, spell: !!ctx.spell, spellName: ctx.spellName || state.casting || null,
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
        if (ctx.spell && m.log) noteAbility(state, 'スペル', source.team === 'A' ? '自分' : '相手', ctx.spellName || state.casting || m.name, m.desc, source.team, m.log) // 選んだモードのログ(左のログ)
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
      } else {
        boostUnit(state, o.u, n)
      }
      ctx = { ...ctx, mode: undefined }
      continue
    }
    if (e.type === 'boost' && e.target) { // 対象つき: 場のキャラ(と召喚物)それぞれが、ブーストされた回数を数える
      const n = (e.amount ?? 1) + witchBonus(state, source.team, 'boost', e.amount ?? 1)
      for (const t of resolveTargets(state, source, e.target, { ...ctx, followers: e.followers, units: e.units })) {
        boostUnit(state, t, n)
      }
      continue
    }
    if (e.type === 'boost') { // 対象なし: 手札(スペルセット)のスペルが、ブーストされた回数(チーム共通)
      const n = (e.amount ?? 1) + witchBonus(state, source.team, 'boost', e.amount ?? 1)
      state.boost[source.team] += n
      boostSpells(state, source.team, n, ctx.spell ? state.spells[source.team].find((x) => x.slot === state.castingSlot) || null : null) // 発動中のスペル自身は、ブーストされない
      boostFieldUnits(state, source.team, n)
      continue
    }
    if (e.type === 'earth') { // 土の印: 場の土の印の合計(チーム共通)。マイナスで消費(土の秘術)
      const amount = (e.amount ?? 1) + witchBonus(state, source.team, 'earth', e.amount ?? 1)
      // 場に土の印アミュレットがないときに増えるなら、先に「大地の魔片」を召喚して、そこに溜める(満員で出せなければ働かない)
      if (!addEarth(state, source.team, source, amount)) { state.log.push('土の印を溜める【土の印】アミュレットがないので、土の印は増えなかった'); continue }
      state.log.push(`土の印が${amount >= 0 ? '+' : ''}${amount}(${state.earth[source.team]})`)
      continue
    }
    if (e.type === 'clearCrests') { // 場(両チーム)のクレストをすべて消滅させる(消えるときのラストワードは働かない)
      let n = 0
      for (const t of ['A', 'B']) { n += state.crests[t].length; state.crests[t] = [] }
      state.log.push(n ? `場のクレスト${n}つが消滅した` : '消滅させるクレストがなかった')
      recalc(state)
      continue
    }
    if (e.type === 'reanimate') { // 蘇生(speed = リアニメイトの数値)
      reanimate(state, source, e.speed, ctx.opts)
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
    if (e.type === 'summon' && e.fromOwned && e.fromField) { // 自分の場のキャラクター(召喚物・アミュレットは除く)から、速度が コンボ数×10以下(最大10コンボ)のランダム1体と同名を召喚する
      const x = Math.min(e.maxCombo ?? 10, comboOf(state, source))
      const spd = x * (e.speedPerCombo ?? 10)
      const cands = state.units.filter((u) => u.alive && u.team === source.team && u.field === 'main' && !u.isAmulet && u.charDef && u.spd <= spd)
      if (!cands.length) { state.log.push(`コンボ${x}(速度${spd}以下)の場のキャラがいないので、召喚はなし`); continue }
      const rng = ctx.opts?.rng || Math.random
      const pick = cands[Math.floor(rng() * cands.length)]
      state.log.push(`コンボ${x}: 速度${spd}以下の場のキャラから${pick.name}が選ばれた`)
      summon(state, source, pick.charDef)
      continue
    }
    if (e.type === 'summon' && e.fromCatalog) { // 全カードのうち、条件(amulet / class / maxSpd)に合うものから、ランダムに count 種類を召喚する(トークン・テスト用を除く。満員なら出せない)
      const rng = ctx.opts?.rng || Math.random
      const w = e.fromCatalog
      const cands = (state.catalog || []).filter((c) => !c.token && !String(c.id).startsWith('test_') && (w.amulet == null || !!c.amulet === w.amulet) && (!w.class || c.class === w.class) && c.stats.spd <= (w.maxSpd ?? Infinity))
      let n = 0
      for (let i = 0; i < (e.count ?? 1) && cands.length; i++) {
        const c = cands.splice(Math.floor(rng() * cands.length), 1)[0]
        const nu = summon(state, source, c, { defer: true })
        if (nu) afterEnter(state, nu)
        n++
      }
      if (!n) state.log.push('召喚できるものがなかった')
      continue
    }
    if (e.type === 'summon' && e.fromOwned) { // 所持キャラクターから、速度が コンボ数×10(最大10コンボ)のキャラをランダムに1体召喚する
      const x = Math.min(e.maxCombo ?? 10, comboOf(state, source))
      const spd = x * (e.speedPerCombo ?? 10)
      const cands = (state.pool[source.team] || []).filter((c) => !c.amulet && c.stats.spd === spd)
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
      // 複数体は、まず全員を一気に召喚して、そのあとで「場に出たとき」の能力・付与(疾走・守護など)を働かせる
      // 続けて書かれた別々の召喚(例: ゴースト1体・バット1体)も、同じようにまとめて先に出す
      const entered = []
      const summonOne = (x, def) => { for (let i = 0; i < (x.count ?? 1); i++) { const nu = summon(state, source, x.randomUnits ? x.randomUnits[Math.floor(rng0() * x.randomUnits.length)] : def, { defer: true }); if (nu) { if (x.gainKeyword && !nu.keywords.includes(x.gainKeyword)) { nu.keywords.push(x.gainKeyword); state.log.push(`${nu.name}は【${KEYWORDS[x.gainKeyword]?.label || x.gainKeyword}】を持つ`) } entered.push(nu) } } } // gainKeyword: 召喚したキャラが、そのキーワード能力(疾走など)を持つ // randomUnits: 1体ごとに、候補からランダムに選ぶ
      summonOne(e, sdef)
      const simple = (x) => x && x.type === 'summon' && !x.condition && !x.mpCost && !COST_KEYS.some((k) => x[k]) && !x.optional && !x.timesPerType && !x.fromCrest && !x.repGroup && (x.unit || x.randomUnits || x.copySelf)
      while (simple(effects[idx + 1])) { idx++; const x = effects[idx]; summonOne(x, x.copySelf ? source.charDef : x.randomUnits ? x.randomUnits[0] : x.unit) }
      for (const nu of entered) afterEnter(state, nu)
      continue
    }
    if (e.type === 'copyAmulet') { // 選んだ自分のアミュレットと同名のアミュレットを、もう1つ場に出す(満員なら出せない)
      // from: 'destroyed' = このバトル中に破壊された自分のアミュレットから(maxSpd: 元の速度が最大のものの中から)ランダムに1つ。消滅したものは含まない
      let src = ctx.chosen ? getUnit(state, ctx.chosen) : null
      if (e.from === 'destroyed') {
        let pool = state.units.filter((u) => !u.alive && u.deathHandled && !u.vanished && u.isAmulet && u.team === source.team)
        if (e.maxSpd && pool.length) { const top = Math.max(...pool.map((u) => u.charDef?.stats?.spd ?? u.base.spd)); pool = pool.filter((u) => (u.charDef?.stats?.spd ?? u.base.spd) === top) }
        const rng = ctx.opts?.rng || Math.random
        src = pool.length ? pool[Math.floor(rng() * pool.length)] : null
        if (src) {
          const nu = summon(state, source, src.charDef, { defer: true })
          if (nu) afterEnter(state, nu)
        } else state.log.push(`${source.name}の効果: 破壊されたアミュレットがいなかった`)
        continue
      }
      if (src && src.alive && src.isAmulet) {
        const nu = summon(state, source, src.charDef, { defer: true })
        if (nu) afterEnter(state, nu)
      }
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
      const mm0 = state.mpMax[source.team]
      state.mpMax[source.team] = Math.min(MP_CAP, state.mpMax[source.team] + (e.amount ?? 1))
      if (seasonMpMax(state, source.team, mm0, state.mpMax[source.team], AWAKEN_MP)) recalc(state)
      state.log.push(`MP最大値が${state.mpMax[source.team]}になった`)
      continue
    }
    if (e.type === 'refreshSpells') { // 使用済みのスペルを、すべてもう一度使える状態に戻す(使える回数は増えない)
      for (const sp of state.spells[source.team]) sp.used = false
      state.log.push('すべてのスペルが有効になった')
      continue
    }
    if (e.type === 'mpFull') { // 自分のMPを上限まで回復する
      state.mp[source.team] = state.mpMax[source.team]
      state.log.push(`MPが上限(${state.mpMax[source.team]})まで回復した`)
      continue
    }
    if (e.type === 'mp') {
      state.mp[source.team] = Math.min(state.mpMax[source.team], state.mp[source.team] + (e.amount ?? 1))
      continue
    }

    let targets = resolveTargets(state, source, e.target || 'self', { ...ctx, only: e, followers: e.followers, units: e.units })
    const tf = filterOf(e, EFFECT_FILTER_KEYS) // 指定のクラス・タイプ・名前・場(main / summon)だけ
    if (hasFilter(tf)) targets = targets.filter((t) => matchUnit(t, tf))
    targets = targets.filter((t) => t && (t.alive || t.uid === source.uid)) // 破壊されたキャラ・召喚物は、割り振り・ランダム・効果の対象に含めない(ラストワードなど、倒れた本人が自分に使う効果だけは残す)
    if (e.exceptPrev) targets = targets.filter((t) => !(ctx.prevTargets || []).includes(t.uid)) // 「それ以外」: 直前の効果の対象は除く
    // ランダムな相手の人数: count(基本は1体)。comboCount: { combo: 3, count: 3 } なら、コンボが3以上のとき3体(重ならないように選ぶ)
    if (((e.target || 'self') === 'enemyRandom' || e.target === 'enemyFieldRandom') && (e.count != null || e.comboCount)) {
      let n = e.count ?? 1
      if (e.comboCount && comboOf(state, source) >= e.comboCount.combo) n = e.comboCount.count
      const rng = ctx.opts?.rng || Math.random
      const pool = [...enemiesOf(state, source).filter(abilityTargetable), ...(e.target === 'enemyFieldRandom' ? enemiesSummonsOf(state, source).filter(abilityTargetable) : [])]
      targets = []
      while (targets.length < n && pool.length) targets.push(pool.splice(Math.floor(rng() * pool.length), 1)[0])
    }
    else if (TARGETS[e.target]?.pick === 'random' && e.count > 1) { // ランダムに count 体(重ならないように選ぶ。味方側のランダムなど)。絞り込み(onlyName / onlyClass / filter など)をかけてから選ぶ
      const T0 = TARGETS[e.target]
      const rng = ctx.opts?.rng || Math.random
      const pool = poolOf(state, source, T0.side, T0.scope, { followers: e.followers, units: e.units }).filter((u) => matchUnit(u, tf) && (!T0.other || u.uid !== source.uid))
      targets = []
      while (targets.length < e.count && pool.length) targets.push(pool.splice(Math.floor(rng() * pool.length), 1)[0])
    }
    // 「割り振る」(split)の人数 = 実際に受けとれる対象の数(生きている者。アミュレットは体力がなくダメージも回復も受けないので数えない)。対象が1人だけなら、合計がすべてその1人に入る
    const splitN = Math.max(1, targets.filter((x) => x && x.alive && !x.isAmulet).length)
    let nDestroyed = 0 // この効果で破壊した数。あとの効果の perDestroyed(damage)で使う(「Xはアミュレットを破壊した総数」)
    for (const t of targets) {
      if (!t) continue
      switch (e.type) {
        case 'damage': {
          if (e.summonDestroy && t.field === 'summon') { // 相手が召喚物のときは、ダメージの代わりに破壊する(キャラクターなら、下のダメージ)
            if (e.logSummon && ctx.spell) noteAbility(state, 'スペル', source.team === 'A' ? '自分' : '相手', ctx.spellName || state.casting || '', e.desc || '', source.team, e.logSummon)
            if (!hasKw(t, 'earthSign') && t.alive) { t.hp = 0; t.alive = false; state.log.push(`${t.name}は破壊された`) }
            break
          }
          if (e.logChar && ctx.spell) noteAbility(state, 'スペル', source.team === 'A' ? '自分' : '相手', ctx.spellName || state.casting || '', e.desc || '', source.team, e.logChar) // 相手がキャラクターのときのログ
          if (e.perDestroyed != null && !(ctx.destroyed > 0)) break // perDestroyed: 破壊した数 X につき、ダメージが perDestroyed ずつ増える(1つも破壊しなかったら何もしない)
          if (e.perMpSpent != null && !(ctx.mpSpent > 0)) break // perMpSpent: 消費したMP1つにつき、倍率が perMpSpent ずつ増える(MPを使わなかったら何もしない)
          if (e.destroyIfSummon && t.alive && t.field === 'summon' && !hasKw(t, 'earthSign')) { t.hp = 0; t.alive = false; state.log.push(`${t.name}は破壊された`); break } // ターゲットが召喚物なら、ダメージは与えず破壊だけ(破壊のエフェクトを2回出さない)
          const skill = { stat: e.stat || 'atk', mult: (e.perMpSpent != null ? (e.mult ?? 0) + e.perMpSpent * ctx.mpSpent : e.mult ?? 1), add: (e.split && e.add != null ? e.add / splitN : (e.add || 0)) + (e.perDestroyed != null ? e.perDestroyed * (ctx.destroyed || 0) : 0) + perAmount(state, source, e), type: e.dmgType || 'physical' } // perEarth: 自分の場の土の印1つにつき、add が perEarth ずつ増える / perType: 自分の場の「そのタイプ」のキャラ1体につき、add が perTypeFlat(省くと1)ずつ増える
          const { damage } = calcDamage(source, t, skill, ctx.opts)
          const dealt = applyDamage(state, source, t, damage, skill.type === 'true', skill.type)
          loseStealth(source) // 能力でダメージを与えたら潜伏を失う
          if (dealt > 0) state.log.push(`${source.name}の効果で${t.name}に${Math.round(dealt)}ダメージ`)
          if (e.destroyIfSummon && t.alive && t.field === 'summon' && !hasKw(t, 'earthSign')) { t.hp = 0; t.alive = false; state.log.push(`${t.name}は破壊された`) } // ターゲットが召喚物だったときは、それを破壊する
          break
        }
        case 'heal': {
          const hb = (st, tt, n) => heal(st, tt, n * (1 + (source.healUp || 0) / 100)) // 治癒量%(遺物)
          if (e.pctMax != null) hb(state, t, (t.maxHp * e.pctMax) / 100) // 回復される本人の最大HPの○%
          else if (e.pctPerSummon != null) hb(state, t, (t.maxHp * e.pctPerSummon * summonsOf(state, source).length) / 100) // 回復する本人の最大HPの(pctPerSummon×召喚物の数)%
          else if (e.split && e.flat != null) hb(state, t, e.flat / splitN) // 回復量を、対象の人数で等分に割り振る(全体で合計 flat)
          else hb(state, t, (e.flat ?? (e.stat === 'maxHp' ? source.maxHp : source.atk) * (e.mult ?? 1)) + perAmount(state, source, e))
          break
        }
        case 'buff':
          if (t.isAmulet && e.stat !== 'spd') break // アミュレットは、速度以外のバフ・デバフを受けない(演出・ログも出さない)
          const bf = { stat: e.stat, pct: (e.pct || 0) + graveBonus(state, source, e), flat: (e.flat || 0) + perAmount(state, source, e, ['perGraveyard']), turns: e.turns ?? null, ...(e.turnsBy === 'source' ? { owner: source.uid } : {}) } // perCombo: コンボ1つにつき、flat がその分だけ増える
          t.buffs.push(bf)
          emit(state, 'buff', { target: t.uid, stat: e.stat, text: `${statLabel(e.stat)}${bf.flat ? ` ${bf.flat >= 0 ? '+' : ''}${bf.flat}${e.stat === 'dmgUp' ? '%' : ''}` : ''}${bf.pct ? ` ${bf.pct >= 0 ? '+' : ''}${bf.pct}%` : ''}`.replace(/\s+/g, ' ') })
          state.log.push(`${t.name}の${statLabel(e.stat)}が上がった`)
          break
        case 'countdown': { // カウントダウンを amount(負の数で減らす)だけ動かす。0になったら破壊される(カウントダウンを持つものだけ)
          if (t.countdown == null) break
          t.countdown += e.amount ?? -1
          emit(state, 'countdown', { target: t.uid, amount: e.amount ?? -1 })
          state.log.push(`${t.name}のカウントダウンが${t.countdown <= 0 ? 0 : t.countdown}になった`)
          if (t.countdown <= 0) { t.hp = 0; t.alive = false; t.killedBy = source.uid }
          break
        }
        case 'loseHp': { // 現在体力を直接減らす(ダメージではないので、防御・アーマー・バリアは関係なく、墓場も増えない)
          if (t.isAmulet || !t.alive) break
          const before = t.hp
          // to を書くと「現在体力が to になる」(いまの体力が to 以下なら、変わらない = 回復はしない)。amount を書くと、その分だけ減る
          const lost = loseHpOf(state, t, e.to != null ? Math.max(0, t.hp - Math.max(0, e.to)) : (e.amount || 0), source)
          state.log.push(`${t.name}の現在体力が${Math.round(lost)}減った`)
          break
        }
        case 'maxHp': { // 最大HPを元のHPの+%だけ増やす(現在HPも同じだけ増える。アミュレットには体力がない)
          if (t.isAmulet) break
          const up = Math.round((t.baseMaxHp * (e.pct || 0)) / 100) + (e.flat || 0) + perAmount(state, source, e)
          changeMaxHp(state, t, up, source)
          state.log.push(up >= 0 ? `${t.name}の最大HPが${up}増えた` : `${t.name}の最大HPが${-up}減った`)
          break
        }
        case 'armor':
        case 'shield': { // 'shield' は昔の書き方(アーマーと同じ)
          const amount = (e.flat ?? (e.stat === 'maxHp' ? source.maxHp : source.atk) * (e.mult ?? 1)) + perAmount(state, source, e)
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
        case 'giveArtifact': { // アーティファクトを手持ちに付与する(手持ちが MAX_HAND(9)で満杯なら、付与できない)
          const list = state.artifacts[source.team]
          const n = e.count ?? 1
          let given = 0
          for (let i = 0; i < n; i++) {
            if (list.length >= MAX_HAND) { state.log.push(`手持ちが満杯で、アーティファクト【${e.artifact.name}】は付与できなかった`); break }
            const next = Math.max(-1, ...list.map((x) => Number(x.slot.slice(2)))) + 1
            list.push(makeArtifact(e.artifact, next)); given++
          }
          if (given) state.log.push(`アーティファクト【${e.artifact.name}】が手持ちに${given}つ付与された`)
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
        case 'setHp': // HPを value にする(最大HPまで。体力の概念のないアミュレットには効かない)
          if (t.isAmulet || !t.alive) break
          t.hp = Math.min(t.maxHp, e.value)
          state.log.push(`${t.name}のHPは${Math.round(t.hp)}になった`)
          break
        case 'setBaseSpd': // 基礎速度を value に変える(バフ・デバフは、その上にかかる)
          if (t.isAmulet) break
          t.base.spd = e.value
          state.log.push(`${t.name}の基礎速度は${e.value}に変化した`)
          break
        case 'gainCombo': { // 自分の【コンボ】を+amount する(βは味方チーム共有のカウント、従来は本人のカウント)
          const n = e.amount ?? 1
          const cb = state.comboCount[source.team]
          state.comboCount[source.team] += n
          if (seasonComboUp(state, source.team, cb, state.comboCount[source.team])) recalc(state)
          state.log.push(`${source.name}の【コンボ】が${n}増えた(いま${comboOf(state, source)})`)
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
            if (e.untilTurnEnd) t.tempKeywords = [...(t.tempKeywords || []), k] // untilTurnEnd: 対象自身のターンが終わるときまで
            state.log.push(`${t.name}は【${KEYWORDS[k]?.label || k}】を持つ`)
            emit(state, 'keyword', { target: t.uid, keyword: k, label: KEYWORDS[k]?.label || k })
          }
          break
        }
        case 'gainPassive': { // 能力(パッシブ)を得る。e.passive は、キャラのパッシブと同じ書き方(戦闘中ずっと持つ)
          t.passiveObjs = [...(t.passiveObjs || []), JSON.parse(JSON.stringify(e.passive))]
          state.log.push(`${t.name}は「${e.passive.desc || e.passive.name}」を持つ`)
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
          vanishUnit(state, t, true, !!e.blast)
          break
        case 'destroy': // 破壊する(召喚物の「自身を破壊」など)
          if (hasKw(t, 'earthSign')) break // 土の印は、能力で破壊できない
          if (t.alive) { t.hp = 0; t.alive = false; nDestroyed++; state.log.push(`${t.name}は破壊された`) }
          if (e.settle) resolveDeaths(state, ctx.opts) // settle: 破壊の処理(ラストワード・倒された記録)を、次の効果より先に済ませる
          break
        case 'transform': { // 変身: 対象は、unit(キャラのデータ)に変わる。ステータス・HP・状態は新しいキャラのものになる(いる場所・チーム・uid はそのまま)。入場の能力は働かない
          const { ct } = t
          const from = t.name
          Object.assign(t, makeUnit(e.unit, t.team, 0, t.field, t.uid), { ct })
          recalc(state)
          state.log.push(`${from}は${t.name}に変身した`)
          break
        }
        case 'reenter': // 入場し直す: 入場直後の状態に戻る(次の自分のターン開始時にファンファーレがもう一度働き、そのターンはスキル攻撃ができない)
          { // 再出場: ステータス・HP・行動値・バフ・状態(進化など)がすべて初期値に戻る(いる場所・チーム・uid・クラス特性はそのまま)
            const { ct } = t
            Object.assign(t, makeUnit(t.charDef, t.team, 0, t.field, t.uid), { ct })
            if (state.active === t.uid || state.active?.uid === t.uid) t.reenteredNow = true // 自分のターン中に再出場した: 場を離れて入場し直したので、そのターンはここで終わる(ファンファーレは次の自分のターン開始時)
            recalc(state)
          }
          state.log.push(`${t.name}は再出場した`)
          afterEnter(state, t) // 再出場 = 場を離れて、もう一度出場する: 【場に出たとき】や味方の「場に出たとき」も働く(【ファンファーレ】は、次の自分のターン開始時にもう一度働く)
          break
        case 'advance': // 行動順アップ: いまの行動値(curAV)を、基準の行動値(baseAV)の pct% ぶん減らす(0未満にはならない)。
          // 減らすのはその1回だけ。そのキャラが行動すると行動値は基準に戻る(curAV = baseAV)ので、アップはそのターンにしか効かない
          advanceAV(state, t, (t.baseAV * (e.pct ?? 0)) / 100) // すでに行動値0で待っているユニットは、飛び越えられない
          state.log.push(`${t.name}の行動順が早まった`)
          emit(state, 'av', { target: t.uid, dir: 'up', pct: e.pct ?? 0 }) // アクションバーのエフェクト用
          break
        case 'delay': // 行動順ダウン: いまの行動値が、基準の行動値の pct% ぶん増える(行動が遅くなる)
          t.curAV = t.curAV + (t.baseAV * (e.pct ?? 0)) / 100
          state.log.push(`${t.name}の行動順が遅れた`)
          emit(state, 'av', { target: t.uid, dir: 'down', pct: e.pct ?? 0 })
          break
        default:
          break
      }
    }
    ctx = { ...ctx, prevTargets: targets.filter(Boolean).map((t) => t.uid), ...(nDestroyed ? { destroyed: (ctx.destroyed || 0) + nDestroyed } : {}) }
  }
  recalc(state)
}

// 【土の秘術_N】が最初の効果にあるのに、土の印が足りない能力は、発動しない(ログも出さない)
const earthShort = (state, team, effects) => { const e = effects && effects[0]; return !!(e && COST_KEYS.some((k) => e[k] && COSTS[k].quietShort && COSTS[k].have(state, team) < e[k])) }

// 左のログに出す文。logIf: [{ condition, log }, ...] は、条件(condition と同じ書き方: combo / awaken など)に合う最初のものを、log の代わりに出す
//   log を書かなかった能力は、desc から作る(deriveLog)
function logOf(state, unit, p) {
  const hit = (p.logIf || []).find((l) => checkCond(state, unit, l.condition))
  if (hit) return hit.log
  if (p.log === undefined && typeof p.desc === 'string') return deriveLog(state, unit, p.desc)
  return p.log
}

// desc から、左のログの文を作る(log を書いていない能力用)
//   1. 先頭の【コンボ_N】と、きっかけの前置き(「これが進化したとき、」「自分の兵士・フォロワーが場に出たとき、」)を削る
//   2. 「【条件】なら、a ではなく、b。」「【条件】a ではなく b。」は、あらかじめ文に組み込まれた置き換え。
//      条件を満たすときだけ、元の文の a を b に置き換える。満たさないときは、その文ごと出さない
//   3. 「X×50」「10×X」は、倍率が計算済みなので「X」だけにする。「(重なる)」は削る
const LOG_COND_TAGS = [[/^【コンボ_(\d+)】$/, (m) => ({ combo: +m[1] })], [/^【覚醒】$/, () => ({ awaken: true })], [/^【土の秘術_(\d+)】$/, (m) => ({ earth: +m[1] })]]
const condOfTag = (tag) => { for (const [re, f] of LOG_COND_TAGS) { const m = tag.match(re); if (m) return f(m) } return null }
function deriveLog(state, unit, desc) {
  let t = String(desc).replace(/[(（]重なる[)）]/g, '')
  const swaps = []
  t = t.replace(/(【[^】]+】)(?:なら、)?([^。]+?)ではなく、?([^。]+?)。/g, (m, tag, a, b) => { const cond = condOfTag(tag); if (cond) { swaps.push({ cond, a, b }); return '' } return m })
  t = t.replace(/^【コンボ_\d+】/, '').replace(/^[^。、]*(とき|たび)、/, '').replace(/自分のターン終了まで、/, '')
  for (const sw of swaps) if (checkCond(state, unit, sw.cond) && t.includes(sw.a)) t = t.replace(sw.a, sw.b)
  return t.replace(/X×\d+/g, 'X').replace(/\d+×X/g, 'X').trim()
}

// トリガー型パッシブ(ファンファーレ・攻撃時・交戦時・進化時・ラストワード)を発動する
function fire(state, trigger, unit, ctx = {}, from = 0) {
  if (!unit.alive && trigger !== 'lastWord') return
  for (let i = from; i < unit.passiveObjs.length; i++) {
    const p = unit.passiveObjs[i]
    if (p.trigger !== trigger || !checkCond(state, unit, p.condition)) continue
    const pf = filterOf(p, PASSIVE_FILTER_KEYS) // 出た / 倒れたユニット(ctx.other)の絞り込み
    if (hasFilter(pf) && !matchUnit(ctx.other, pf)) continue
    if (earthShort(state, unit.team, p.effects)) continue // 土の印が足りない【土の秘術】の能力は、発動しない(ログなし)
    if (p.oncePerTurn) { if (p.usedSeq === (state.turnSeq || 0)) continue; p.usedSeq = state.turnSeq || 0 } // oncePerTurn: true の能力は、1ターンに1回まで(「それぞれのキャラクターのターンごとに1回」)
    state.log.push(`${unit.name}の${bracket(p.name || TRIGGER_LABELS[trigger])}`)
    noteAbility(state, p.tag ?? TRIGGER_LABELS[trigger] ?? trigger, unit.name, p.name && p.name !== (p.tag ?? TRIGGER_LABELS[trigger]) ? p.name : '', p.desc, unit.team, logOf(state, unit, p), unit.uid)
    runEffects(state, unit, p.effects, { ...ctx, trigger, nextPassive: i + 1 })
    if (state.pending) return // 選ぶのを待つ。続きは、選ばれたあとに行う
  }
}

// クレストのトリガー(ラウンド開始時・味方のターン開始時)
// subject があるトリガー(自分のターン開始・終了 / 味方のターン開始・終了)は、subject が働く本人になる。
//   持ち主のターンのもの(turnStart / turnEnd)は、そのクレストを置いたキャラ自身のターンのときだけ働く
const CREST_OWNER_TRIGGERS = ['turnStart', 'turnEnd']
const CREST_SUBJECT_TRIGGERS = ['turnStart', 'turnEnd', 'allyTurnStart', 'allyTurnEnd']
function fireCrests(state, team, trigger, subject, opts) {
  if (trigger === 'allyTurnStart') for (const c of state.crests[team]) c.healUsed = false // 【味方が回復したとき】(oncePerTurn)の回数をリセット
  for (const crest of [...state.crests[team]]) {
    if (CREST_OWNER_TRIGGERS.includes(trigger) && crest.sourceUid !== subject.uid) continue
    for (const p of crest.passives) {
      if (p.trigger !== trigger) continue
      const source = CREST_SUBJECT_TRIGGERS.includes(trigger) ? subject : crestSource(state, crest)
      if (!source || !checkCond(state, source, p.condition) || earthShort(state, crest.team, p.effects)) continue
      if (p.everyTurns > 1) { // 「Nターンに1回有効」: 条件に合った回数を、クレストごとに数えて、N回に1回だけ働く(最初の1回目から)
        crest.everyCnt = crest.everyCnt || {}
        const n = crest.everyCnt[p.name] || 0
        crest.everyCnt[p.name] = n + 1
        if (n % p.everyTurns !== 0) continue
      }
      runCrestPassive(state, crest, p, source, { opts })
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
      runCrestPassive(state, crest, p, src, { opts, crest }, 'クレスト・ラストワード', `クレスト【${crest.name}】の【ラストワード】`)
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
        u.vanished = true
        u.buffs = []; u.armor = 0; u.barrier = 0; u.stealth = false
        state.log.push(`${u.name}は消滅した`)
        emit(state, 'vanish', { target: u.uid })
        noteAbility(state, TRIGGER_LABELS.onLeave, u.name, leave.name && leave.name !== TRIGGER_LABELS.onLeave ? leave.name : '', leave.desc, u.team, logOf(state, u, leave), u.uid)
        continue
      }
      u.deathHandled = true
      u.buffs = []
      u.armor = 0
      u.barrier = 0
      u.stealth = false
      state.log.push(`${u.name}は倒れた`)
      emit(state, 'destroy', { target: u.uid, grave: u.field === 'main', lw: (u.passiveObjs || []).some((p) => p.trigger === 'lastWord') }) // lw: ラストワードを持っている(ドクロの演出)。持っていないと、金色の粒になって散る
      // このターン中に倒されたキャラの記録(元の攻撃力・体力つき)。【場に出たとき】の growByDead が使う。前のターンの記録は捨てる
      state.deaths = (state.deaths || []).filter((d) => d.turn === state.turns)
      state.deaths.push({ turn: state.turns, team: u.team, type: u.type, atk: u.charDef?.stats?.atk ?? u.base.atk, hp: u.charDef?.stats?.hp ?? u.baseMaxHp })
      if (u.field === 'main') { state.graveyard[u.team] += GRAVE_PER_DEATH; seasonGrave(state, u.team, GRAVE_PER_DEATH) } // 倒されると墓場が大きく増える
      seasonDestroyed(state, u) // シーズン補正(ナイトメア)
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
  if (hasKw(actor, 'noAttackFollower')) return [] // 「フォロワーを攻撃できない」: 攻撃できる相手(キャラ・召喚物はみなフォロワー)がいない
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
// ---------- 1ターンにスキルを発動できる回数 ----------
// 基本は1回。【アクティブ】「1ターンに2回スキルを発動できる」(gainDoubleSkill)を持つと2回(2回目はMPを消費)。
// クレストの常時効果 { type: 'extraSkill', times: N, onlyName } があると、N回まで発動できる(MPは消費しない)。
//   onlyName を書くと、自分の場のその名前のキャラすべてが対象。書かないと、そのクレストを置いたキャラだけ。クレストが消えると元に戻る
function crestSkillMax(state, u) {
  let max = 1
  for (const crest of state.crests[u.team]) {
    const src = crestSource(state, crest)
    if (!src) continue
    for (const p of crest.passives) {
      if (p.trigger !== 'constant' || !checkCond(state, src, p.condition)) continue
      for (const e of p.effects) {
        if (e.type !== 'extraSkill') continue
        const sf = filterOf(e, EFFECT_FILTER_KEYS)
        if (hasFilter(sf) ? matchUnit(u, sf) : u.uid === src.uid) max = Math.max(max, e.times ?? 2)
      }
    }
  }
  return max
}
export const skillLimit = (state, u) => Math.max(u.doubleSkill ? 2 : 1, crestSkillMax(state, u))
// すでに done 回スキルを発動したあと、次の1回に必要なMP(クレストで増えた回数はMPなし、【アクティブ】の2回目はMPを消費)
const nextSkillMp = (state, u, done) => (done === 0 || done < crestSkillMax(state, u) ? 0 : u.doubleSkill ? u.doubleSkill.mpCost : 0)

export function legalActions(state) {
  const actor = getActiveUnit(state)
  if (!actor || state.winner || !actor.alive) return []
  // 効果の対象を選ぶ場面(ファンファーレなど): 選べる対象だけが行動になる
  if (state.pending) return state.pending.candidates.map((uid) => ({ type: 'choose', target: uid }))
  // アクセラレートの番: 実行する(特性を使う) か、見送る(endTurn)
  if (state.activeKind === 'accel') return [...accelActions(state, actor), { type: 'endTurn' }]
  const actions = []
  // 「1ターンにN回スキルを発動できる」(skillLimit)。2回目以降に必要なMPは nextSkillMp
  const skillsDone = actor.skillsThisTurn || 0
  const moreOk = skillsDone >= 1 && skillsDone < skillLimit(state, actor) && state.mp[actor.team] >= nextSkillMp(state, actor, skillsDone)
  const canUseSkill = !actor.isAmulet && !hasKw(actor, 'silence') && (actor.hasActed || hasKw(actor, 'rush') || hasKw(actor, 'dash')) && (skillsDone === 0 || moreOk)
  const targets = attackableTargets(state, actor)
  if (canUseSkill) for (const t of targets) actions.push({ type: 'skill', target: t.uid })

  if (state.actionsThisTurn < MAX_ACTIONS_PER_TURN) {
    for (const tr of actor.traits) {
      if (tr.charges != null && tr.charges <= 0) continue // 回数つきの特性は、使い切ったら使えない
      if (tr.wait > 0) continue // 『Nターンに一度』の特性は、待ち時間が終わるまで使えない
      if (!tr.repeatable && actor.usedTraits.includes(tr.id)) continue // 同じ特性は1ターンに1回(連続使用できる特性は除く)
      if (state.mp[actor.team] < tr.cost) continue
      if (!checkCond(state, actor, tr.condition)) continue
      for (const target of traitTargets(state, actor, tr)) actions.push({ type: 'trait', trait: tr.id, target })
    }
    if (actor.evolvable && !actor.evolved && state.ep[actor.team] >= 1) actions.push({ type: 'evolve' })
  }
  actions.push(...spellActions(state, actor)) // スペルはキャラの行動を消費しない
  actions.push(...artifactActions(state, actor)) // アーティファクトの【融合】・場に出す(これもキャラの行動を消費しない)
  actions.push({ type: 'endTurn' }) // ターン終了(スキル攻撃ができるときも、攻撃せずに終えられる。CPUは、攻撃できるなら攻撃を選ぶ)
  return actions
}

const sameAction = (a, b) =>
  a.type === b.type && (a.target ?? null) === (b.target ?? null) && (a.trait ?? null) === (b.trait ?? null) && (a.spell ?? null) === (b.spell ?? null) && (a.artifact ?? null) === (b.artifact ?? null) && (a.materials ?? []).join() === (b.materials ?? []).join()

// ---------- ターンとラウンドの進行 ----------

function startRound(state, opts) {
  state.round += 1
  for (const team of ['A', 'B']) {
    const mm1 = state.mpMax[team]
    state.mpMax[team] = Math.min(MP_CAP, state.mpMax[team] + 1 + (state.round === 1 && state.classTrait?.[team] === 'ドラゴン' ? 1 : 0)) // ドラゴン(クラス特性): ラウンド1の最大MP増加量+1
    seasonMpMax(state, team, mm1, state.mpMax[team], AWAKEN_MP) // シーズン補正(ドラゴン)。この後の recalc で反映される
    state.mp[team] = state.mpMax[team]
    if (state.round === EP_GRANT_ROUND) state.ep[team] = Math.min(EP_MAX, state.ep[team] + EP_GRANT)
  }
  if (state.round === EP_GRANT_ROUND) state.log.push(`ラウンド${EP_GRANT_ROUND}: 両チームにEP${EP_GRANT}が与えられた(進化できる)`)
  const waiting0 = new Set(state.units.filter((u) => u.alive && u.curAV < WAIT_AV).map((u) => u.uid)) // ラウンドの頭にすでに待っていた者(疾走の人どうしは、これまでどおり速度で並ぶ)
  for (const u of state.units) {
    if (u.alive && hasKw(u, 'dash')) { advanceAV(state, u, u.baseAV, waiting0); emit(state, 'av', { target: u.uid, dir: 'up', pct: 100 }) } // 疾走: 行動順100%アップ
  }
  for (const team of ['A', 'B']) {
    fireCrests(state, team, 'roundStart', null, opts)
  }
  resolveDeaths(state, opts)
  recalc(state) // ラウンドが進むと奥義ゲージも変わる
}

function beginTurn(state, unit, opts) {
  state.actionsThisTurn = 0
  state.turnSeq = (state.turnSeq || 0) + 1 // ターンの通し番号(oncePerTurn の能力が、ターンごとに1回までを数えるため)
  emit(state, 'turn', { uid: unit.uid, name: unit.name, team: unit.team })
  if (state.evolveReadyShown && !state.evolveReadyShown[unit.team] && state.round >= EP_GRANT_ROUND) {
    state.evolveReadyShown[unit.team] = true // 味方は味方のターン、敵は敵のターンの頭に、それぞれ1回
    if (state.ep[unit.team] >= 1) emit(state, 'evolveReady', { team: unit.team })
  }
  unit.usedTraits = []
  unit.skillsThisTurn = 0
  for (const tr of unit.traits || []) if (tr.wait > 0) tr.wait -= 1
  if (unit.stealthEvery && !unit.stealth && unit.stealthTimer != null) {
    unit.stealthTimer += 1
    if (unit.stealthTimer >= unit.stealthEvery) { unit.stealth = true; unit.stealthTimer = null; state.log.push(`${unit.name}は再び【潜伏】した`) }
  }
  recalc(state) // アクティブ(自ターン中だけ有効)をここで反映

  // カウントダウン: 自分のターン開始時に1つ進み、0になったら破壊される
  if (unit.countdown != null) {
    unit.countdown -= 1
    emit(state, 'countdown', { target: unit.uid, amount: -1 }) // 演出: 青い球と白い光(カウントダウンが進むたび)
    if (unit.countdown <= 0) {
      state.log.push(`${unit.name}のカウントダウンが0になり、破壊された`)
      unit.hp = 0
      unit.alive = false
      resolveDeaths(state, opts)
      return
    }
  }
  fireCrests(state, unit.team, 'turnStart', unit, opts) // クレストの【(持ち主の)ターン開始時】: カウントダウンを進める前に働く(カウントダウン_2なら2回働く)
  for (const crest of [...state.crests[unit.team]]) {
    if (crest.sourceUid === unit.uid) tickCrest(state, crest, opts)
  }
  fireCrests(state, unit.team, 'allyTurnStart', unit, opts)
  fire(state, 'turnStart', unit, { opts }) // 【自分のターン開始時】(バリア_N など)
  if (!unit.hasActed) fire(state, 'fanfare', unit, { opts, allowPending: true }) // 最初のターン開始時だけ(選ぶ効果は、プレイヤーが選ぶまで待つ)
  resolveDeaths(state, opts)
}

function endTurn(state, actor) {
  actor.hasActed = true
  if (actor.alive) { // クレストの【ターン終了時】: そのクレストを持つキャラ自身のターンが終わるときに働く
    fireCrests(state, actor.team, 'turnEnd', actor, undefined)
    fireCrests(state, actor.team, 'allyTurnEnd', actor, {}) // クレストの【味方のターン終了時】: 味方(自分のチームのキャラ・召喚物)のターンが終わるとき
    resolveDeaths(state)
  }
  if (actor.alive) { // 【ターン終了時】(自分のターンが終わるとき): 場のキャラ・召喚物自身の能力
    fire(state, 'turnEnd', actor, {})
    resolveDeaths(state)
  }
  for (const u of [...state.units]) { // 【味方のターン終了時】: 味方のキャラのターンが終わるとき、場の味方(キャラ・召喚物・アミュレット)の能力が働く
    if (!u.alive || u.team !== actor.team) continue
    fire(state, 'allyTurnEnd', u, { other: actor })
  }
  resolveDeaths(state)
  for (const u of [...state.units]) { // 【相手のターン終了時】: 相手のキャラのターンが終わるときに、場のキャラ・召喚物の能力が働く
    if (!u.alive || u.team === actor.team) continue
    fire(state, 'enemyTurnEnd', u, {})
  }
  resolveDeaths(state)
  actor.curAV = actor.baseAV
  actor.acts = (actor.acts || 0) + 1
  if (actor.tempKeywords?.length) { // 「自分のターン終了時まで」持つキーワード(スキル発動不可など)は、ここで無くなる
    actor.keywords = actor.keywords.filter((k) => !actor.tempKeywords.includes(k))
    actor.tempKeywords = []
  }
  tickBuffs(state, actor)
  state.turns += 1
  state.active = null
  state.activeKind = null
  recalc(state)
}

// 効果ターンの数え方: ふつうは、効果を持っている本人のターンが終わるたびに1減る。
// turnsBy: 'source' の効果(owner が付いている)は、かけた本人のターンが終わるたびに減る。かけた本人が倒れたら、消える
function tickBuffs(state, actor) {
  const ownerAlive = (uid) => state.units.some((x) => x.uid === uid && x.alive)
  for (const u of state.units) {
    u.buffs = u.buffs
      .map((b) => {
        if (b.turns == null) return b
        const mine = b.owner ? b.owner === actor.uid : u === actor
        return mine ? { ...b, turns: b.turns - 1 } : b
      })
      .filter((b) => (b.turns == null || b.turns > 0) && (!b.owner || ownerAlive(b.owner)))
  }
}

// 行動順アップ(%アップ・疾走など、すべて共通): 行動値を amount 減らす(0未満にはならない)。
// ただし、すでに行動値0付近で行動を待っているほかのユニットは飛び越えられない(その直後に並ぶ)。
// only を渡すと、待っている者をその中のユニットだけに限る
const WAIT_AV = 1e-4 // これより小さい行動値は「行動を待っている」
const WAIT_STEP = 1e-6 // 待っている者のすぐ後ろ(同じ行動値だと速度で追い越せてしまうので、わずかに後ろにする)
export function advanceAV(state, unit, amount, only = null) {
  if (unit.curAV < WAIT_AV) return // 自分がすでに待っているなら、そのまま
  let floor = 0
  const wait = (av) => { if (av < WAIT_AV && av + WAIT_STEP > floor) floor = av + WAIT_STEP }
  for (const o of state.units) {
    if (!o.alive || o === unit || o.uid === state.active || (only && !only.has(o.uid))) continue // 今まさに行動している者は、待っているとは数えない
    wait(o.curAV)
    if (o.accel) wait(o.accel.curAV)
  }
  unit.curAV = Math.max(floor, unit.curAV - amount)
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
  unit.accelActs = (unit.accelActs || 0) + 1
  if (executed) { unit.curAV = unit.baseAV; unit.acts = (unit.acts || 0) + 1 }
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
      slots.push({ u, kind: 'body', av: u.curAV, spd: u.base.spd }) // 行動値が同じときは、基礎速度が高いほうが先(速度バフなどの一時的な変化は見ない)
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
      if (seasonComboReset(state, slot.team)) recalc(state)
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
    if (actions.length === 1 && actions[0].type === 'endTurn' && !state.keepTurn?.[next.team]) {
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
  if (!target.alive) { // 攻撃時の能力で、ターゲットがもう破壊されていた(メドゥーサなど): 破壊だけで済ませ、スキルの攻撃は出さない(破壊のエフェクトを2回出さない)
    recalc(state)
    resolveDeaths(state, opts)
    if (actor.field === 'main') countLink(state, actor, opts)
    emit(state, 'sync')
    return
  }
  fire(state, 'onEngage', actor, { other: target, opts })
  fire(state, 'onEngage', target, { other: actor, opts })
  recalc(state)

  emit(state, 'attack', { src: actor.uid, target: target.uid, skill: skill.name })
  state.means = skill.name // これから与えるダメージの攻撃手段(攻撃時の能力が働いたあとに決める)
  const { damage, isCrit } = calcDamage(actor, target, skill, { ...opts, bySkill: true })
  // 必殺は、スキルのダメージより先に入る(最大HPの15%。防御は無視)。バリア・アミュレット相手は、ダメージが入らないので必殺も働かない
  let finDealt = 0
  const willHit = damage > 0 && target.alive && !target.isAmulet && !(target.barrier > 0)
  if (hasKw(actor, 'finisher') && willHit) {
    const fixed = Math.floor(target.maxHp * FINISHER_RATE)
    if (fixed > 0) {
      dealDamage(target, fixed, true)
      emit(state, 'damage', { src: actor.uid, target: target.uid, amount: fixed, means: '必殺', dmgType: 'finisher' })
      if (!target.alive) target.killedBy = actor.uid
      finDealt = fixed
      state.log.push(`【必殺】${target.name}に${fixed}の必殺ダメージ`)
    }
  }
  const dealt = applyDamage(state, actor, target, damage, skill.type === 'true', skill.type)
  if (dealt > 0 || finDealt > 0) {
    if (dealt > 0) {
      if (isCrit && state.rec) { const ev = [...state.events].reverse().find((e) => e.type === 'damage' && e.target === target.uid && e.means !== '必殺'); if (ev) ev.crit = true }
      state.log.push(`${actor.name}の「${skill.name}」! ${target.name}に${Math.round(dealt)}ダメージ${isCrit ? '(クリティカル!)' : ''}`)
    } else {
      state.log.push(`${actor.name}の「${skill.name}」!`)
    }
    const total = dealt + finDealt
    // 召喚物(アミュレットではない)がターゲットなら、そのまま破壊する
    if (hasKw(actor, 'finisher') && finDealt > 0 && target.field === 'summon' && !target.isAmulet) { // ダメージで先に倒れていても、必殺の破壊が働いた扱い(数字を出さない)
      const wasAlive = target.alive
      target.hp = 0
      target.alive = false
      target.killedBy = target.killedBy || actor.uid
      if (wasAlive) state.log.push(`【必殺】${target.name}は破壊された`)
      for (const e of state.events) if (e.type === 'damage' && e.target === target.uid && e.src === actor.uid) e.noNum = true // 必殺の破壊が働いたときは、ダメージの数字を画面に出さない(計算・ログは、そのまま)
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
  const cb0 = state.comboCount[actor.team]
  state.comboCount[actor.team] += 1 // コンボカウントはプレイヤー(チーム)に蓄積する(特性を使ったのが誰でも数える)
  if (seasonComboUp(state, actor.team, cb0, cb0 + 1)) recalc(state)
  for (const u of state.units) {
    if (!u.alive || u.team !== actor.team) continue
    const combos = u.passiveObjs.filter((p) => p.trigger === 'combo')
    if (!hasComboAbility(u)) continue
    const count = comboOf(state, u)
    for (const p of combos) {
      if (p.min !== count || !checkCond(state, u, p.condition)) continue
      state.log.push(`${u.name}の${bracket(p.name || 'コンボ')}(${count}コンボ)`)
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
  if (trait.cooldown) trait.wait = trait.cooldown // 使ったあと、自分のターンが cooldown 回まわってくるまで使えない
  recalc(state)
  state.log.push(`${actor.name}の特性【${trait.name}】(MP${trait.cost})`)
  noteAbility(state, '特性', actor.name, trait.name, trait.desc, actor.team, trait.log, actor.uid)
  // 【エンハンス】は、上位を発動すると、下位(同じキャラの、コストが低いエンハンス)もすべて発動する(汎用の仕様)。下位 → 上位の順に効果を行い、下位も、このターンは使い済みにする
  const lowers = isEnhance(trait) ? actor.traits.filter((t) => isEnhance(t) && t.id !== trait.id && t.cost < trait.cost).sort((a, b) => a.cost - b.cost) : []
  for (const lo of lowers) {
    if (!actor.usedTraits.includes(lo.id)) actor.usedTraits.push(lo.id)
    state.log.push(`${actor.name}の特性【${lo.name}】(エンハンスの累積)`)
    noteAbility(state, '特性', actor.name, lo.name, lo.desc, actor.team, lo.log, actor.uid)
    runEffects(state, actor, lo.effects, { opts, chosen: action.target })
  }
  runEffects(state, actor, trait.effects, { opts, chosen: action.target })
  // アミュレットの【アクト】をしたとき: 同じ側の場のキャラの【味方がアミュレットをアクトしたとき】が働く
  if (actor.isAmulet) for (const a of state.units.filter((x) => x.alive && x.team === actor.team && !x.isAmulet && x.field === 'main')) fire(state, 'allyAmuletAct', a, { other: actor, opts })
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
  noteAbility(state, 'スペル', actor.team === 'A' ? '自分' : '相手', sp.name, sp.desc, actor.team, sp.log)
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

// 進化: EPを1つ使い、HPと攻撃力が+200、突進と同じ効果(進化したターンからスキルを使える)を得る
const EVOLVE_BONUS = 200 // 進化で増える攻撃力・体力
function doEvolve(state, actor, opts, free = false) { // free: 能力の効果で進化する(EPは使わない。死亡の処理は、呼び出し元がまとめて行う)
  noteAbility(state, '進化', actor.name, '', '攻撃力・体力+200、【突進】を得る。', actor.team) // 能力の表示は、数値が変わる前の盤面で出す(演出の前に強くならないように)
  if (!free) state.ep[actor.team] -= 1
  actor.evolved = true
  actor.maxHp += EVOLVE_BONUS
  actor.hp += EVOLVE_BONUS
  actor.buffs.push({ stat: 'atk', pct: 0, flat: EVOLVE_BONUS, turns: null })
  if (!actor.keywords.includes('rush')) actor.keywords.push('rush')
  state.log.push(`${actor.name}は進化した!(攻撃力・体力+${EVOLVE_BONUS})`)
  recalc(state)
  emit(state, 'evolve', { target: actor.uid }) // 進化の演出(盤面の数字も、ここで進化後になる)
  if (!free) fire(state, 'onEvolve', actor, { opts, allowPending: true }) // 【進化時】は、EPを使った進化のときだけ働く。選ぶ効果は、プレイヤーが選ぶまで待つ
  if (!state.pending) fire(state, 'onEvolved', actor, { opts, allowPending: true }) // 【進化したとき】(これが進化したとき)は、EPを使わない進化でも働く
  if (!free && !state.pending) resolveDeaths(state, opts)
  emit(state, 'sync')
}

// 行動を実行して、次の行動待ちの状態を返す(元の状態は書き換えない)
//  特性・進化を使った場合は、同じユニットのターンが続く
let seasonRng = Math.random // シーズン補正(ウィッチ)の確率用。applyAction の opts.rng を使う
export function applyAction(prev, action, opts = {}) {
  seasonRng = opts.rng || Math.random
  const state = applyActionInner(prev, action, opts)
  if (state !== prev && state.active && !state.pending && !state.winner) { // 自分のターン中に自分が再出場したら、スキルを使わせずにターンを終える
    const actor = getActiveUnit(state)
    if (actor?.reenteredNow) {
      actor.reenteredNow = false
      state.log.push(`${actor.name}は入場し直したので、ターンが終わった`)
      endTurn(state, actor)
      actor.hasActed = false // 入場し直したので、まだ行動していない扱い(次の自分のターン開始時に、ファンファーレがもう一度働く)
      return advance(state, opts)
    }
  }
  return state
}
function applyActionInner(prev, action, opts = {}) {
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

  if (action.type === 'fuse') {
    doFuse(state, actor, action)
    return state // 融合しても、そのキャラのターンは続く
  }
  if (action.type === 'playArtifact') {
    doPlayArtifact(state, actor, action, opts)
    if (checkWinner(state) || !actor.alive) return advance(state, opts)
    return state
  }

  if (action.type === 'choose') {
    const p = state.pending
    state.pending = null
    if (p.copy) { // コピーするものを1つ選んだ(「やめる」なら、そこまでで召喚する)
      const idx = Number(String(action.target).replace('mode', ''))
      const stop = idx >= p.copy.keys.length
      state.log.push(stop ? 'コピーを選ぶのをやめた' : `${p.modes[idx]?.name}を選んだ`)
      const taken = stop ? [...p.copy.taken, '__stop'] : [...p.copy.taken, p.copy.keys[idx]]
      runEffects(state, actor, p.effects, { opts, copyTaken: taken.filter((k) => k !== '__stop'), copyStop: stop, trigger: p.trigger, spell: p.spell, spellName: p.spellName, allowPending: !!p.spell })
      if (p.spell && !state.pending) countCombos(state, actor, opts)
    } else if (p.modes) {
      const idx = Number(String(action.target).replace('mode', ''))
      state.log.push(p.mpPick ? `MPを${idx}消費することにした` : `モード【${p.modes[idx]?.name}】を選んだ`)
      runEffects(state, actor, p.effects, { opts, mode: p.mpPick ? undefined : idx, mpSpent: p.mpPick ? idx : undefined, trigger: p.trigger, spell: p.spell, spellName: p.spellName })
      if (p.spell && !state.pending) countCombos(state, actor, opts) // スペルは特性として数える
    } else if (p.confirm) {
      state.log.push(action.target === 'yes' ? '使うことにした' : '使わないことにした')
      runEffects(state, actor, p.effects, { opts, answer: action.target, trigger: p.trigger, spell: p.spell, allowPending: true })
      if (p.spell && !state.pending) countCombos(state, actor, opts)
    } else {
      state.log.push(`${getUnit(state, action.target).name}を選んだ`)
      runEffects(state, actor, p.effects, { opts, chosen: action.target, ...(p.multi ? { multi: true, chosenMap: { ...p.chosenMap, [p.key]: action.target } } : {}), trigger: p.trigger, spell: p.spell, spellName: p.spellName, allowPending: true })
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
    const done = actor.skillsThisTurn || 0
    if (done >= 1) { // 2回目以降のスキル発動(【アクティブ】の2回目はMPを消費する)
      const mp = nextSkillMp(state, actor, done)
      state.mp[actor.team] -= mp
      state.log.push(`${actor.name}は${done + 1}回目のスキルを発動${mp > 0 ? `(MP${mp})` : ''}`)
    }
    actor.skillsThisTurn = done + 1
    doSkill(state, actor, action.target, opts)
    // まだ発動できる回数が残っていて、打てるなら、ターンが続く
    if (actor.alive && !checkWinner(state) && actor.skillsThisTurn < skillLimit(state, actor) && legalActions(state).some((a) => a.type === 'skill')) return state
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

// テスト戦の検証用: 召喚物フィールドの空きを、ゴースト(トークン)で埋め続ける。mode = 'A' | 'B' | 'both'(自分 / 相手 / 両方)
// 行動のあとに呼ぶ。出た分の 'summon' イベントが、そのまま画面で1体ずつ再生される
export function addGhosts(state, mode) {
  if (!state || state.winner || !mode || mode === 'none') return state
  for (const team of mode === 'both' ? ['A', 'B'] : [mode]) {
    const src = state.units.find((u) => u.alive && u.team === team && u.field !== 'summon')
    if (!src) continue
    for (let n = 0; n < SUMMON_MAX && summonsOf(state, src).length < SUMMON_MAX; n++) if (!summon(state, src, ghostToken, {})) break
  }
  return state
}
