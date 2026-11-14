import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { addEvents, buildMatch, newStats } from './career.js'
import { createBattle, applyAction, addGhosts, getActiveUnit, legalActions, getUnit, gaugeOf, calcDamage, KEYWORDS, TRIGGER_LABELS, bracket, isEnhance, enhanceBody } from './battle/engine.js'
import { chooseAction, CPU_LEVELS, SPELL_LEVEL } from './battle/ai.js'
import { DEFAULT_PLAYER_IDS, buildCpuTeam, buildCpuSpells, loadCpuCharSetting, saveCpuCharSetting, isTestChar } from './battle/teams.js'
import { enhanceDef } from './enhance.js'
import { ALL_CHARACTERS, charById } from './battle/characters/index.js'
import { ALL_SPELLS } from './battle/spells/index.js'
import FormationScreen from './FormationScreen.jsx'
import { createPortal } from 'react-dom'
import { BattleHud, StageIntro, ExitConfirm, ResultBanner, BattleMenu } from './BattleHud.jsx'
import { CommentaryOverlay, collectHistory, addHistory, emptyHistory } from './BattleLog.jsx'
import { useIsDesktop, C as BASE, alpha, DISPLAY, useRemembered } from './ui.js'
import { StatIcon } from './icons.jsx'
import { withRelicPieces } from './relicInv.js'
import { ME, OPP, setMe, winnerView } from './perspective.js'
import { VanishFx, VANISH_BASE_MS } from './VanishFx.jsx'
import { useHotkey } from './keys.js'
import { loadSettings } from './settings.js'
// 強化のエフェクトで、文字ではなくアイコンで見せるステータス
const BUFF_ICON = new Set(['hp', 'atk', 'def', 'spd', 'mag', 'critRate', 'critDmg', 'dmgResist'])
const SI = ({ k }) => <StatIcon stat={k} style={{ fontSize: '1em', verticalAlign: '-0.14em', margin: '0 2px 0 0' }} />

// 色: 自分=青、相手=赤紫、行動中=琥珀
const C = { ...BASE, hp: '#3ddc97', hpMid: '#ffd24a', hpLow: '#ff5a5a' } // 色は ui.js の共通の色 + HPバー
const FONT = '"Hiragino Sans","Noto Sans JP",system-ui,sans-serif'
// 自分のチームは自分の色、相手は相手の色(対人戦で自分が B でも、色は自分から見て決まる)
const TEAM_COLOR = { get A() { return ME === 'A' ? C.player : C.enemy }, get B() { return ME === 'A' ? C.enemy : C.player } }
const TYPE_LABEL = { physical: '物理', magic: '魔法', true: '確定' }

// これから行動する順番(アクションバー)。ラウンドの区切りも入れる
// 並ぶのは各ユニットの「次の1回」だけ。行動を終えたユニットは、行動値が初期値(baseAV)に戻って、そこで初めてバーに差し込まれる
// (先の先の順番は、速度が変わったり行動順が動いたりして決まらないので、あらかじめ並べない)
export function buildTimeline(state, count = 12) {
  const items = []
  for (const u of state.units) {
    if (!u.alive) continue
    items.push({ time: u.curAV, unit: u, k: 0 })
    if (u.accel) items.push({ time: u.accel.curAV, unit: u, accel: true, k: 0 })
  }
  for (const team of ['A', 'B']) {
    const cr = state.comboReset?.[team]
    if (cr) items.push({ time: cr.curAV, sys: team })
    // 持ち主のいないクレストのカウントダウン(次の1回だけ)
    for (const c of state.crests?.[team] || []) {
      if (c.slot && c.countdown > 0) items.push({ time: c.slot.curAV, crestTeam: team, crest: c, left: c.countdown })
    }
  }
  // ラウンドの区切りは、いちばん遠い行動のあとまで(最低でも次の1つ)
  const last = items.reduce((m, it) => Math.max(m, it.time), 0)
  const toNext = state.round * 100 - state.totalAV
  for (let k = 0; k < count; k++) { const time = toNext + 100 * k; if (k === 0 || time <= last) items.push({ time, round: state.round + 1 + k }) }
  items.sort((a, b) => a.time - b.time || (a.round ? 1 : 0) - (b.round ? 1 : 0) || (b.unit?.spd ?? -1) - (a.unit?.spd ?? -1))
  return items.slice(0, count)
}

// 数字がなめらかに変わる(行動値が100→0へ減っていく見せ方)
function AnimNum({ value, ms = 450 }) {
  const [shown, setShown] = useState(value)
  const cur = useRef(value)
  useEffect(() => {
    const from = cur.current
    if (from === value) return undefined
    let raf = 0
    const t0 = performance.now()
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms)
      const v = Math.round(from + (value - from) * (1 - (1 - k) * (1 - k)))
      cur.current = v
      setShown(v)
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, ms])
  return <>{shown}</>
}

export function ActionBar({ state, big = false, avFx = null }) {
  const items = buildTimeline(state, big ? 18 : 12)
  const nodes = useRef({})
  const prevPos = useRef({})
  const [ghosts, setGhosts] = useState([])
  const prevItems = useRef({})
  const keyOf = (it, i) => {
    if (it.round) return `r${it.round}`
    if (it.crest) return `crest-${it.crest.name}-${i}`
    if (it.sys) return `sys${it.sys}-${i}`
    const b = `${it.unit.uid}${it.accel ? 'a' : ''}`
    return `${b}-${(it.accel ? it.unit.accelActs || 0 : it.unit.acts || 0) + (it.k || 0)}`
  }
  const keys = items.map(keyOf)
  // 並びが変わったとき、前の位置から滑るように動かす(FLIP)
  useLayoutEffect(() => {
    const next = {}
    const cur = {}
    items.forEach((it, i) => { cur[keys[i]] = it })
    const before = prevItems.current
    // 行動を終えたユニットは、元の位置から上へフェードアウトして消え、新しい位置に上からフェードインして入る(横には滑らせない)
    const gone = Object.keys(before).filter((k) => !cur[k] && prevPos.current[k] != null && before[k].unit && prevPos.current[k] < window.innerWidth)
    prevItems.current = cur
    if (gone.length) {
      const gs = gone.map((k) => ({ key: k, it: before[k], left: prevPos.current[k] }))
      setGhosts((g) => [...g, ...gs])
      setTimeout(() => setGhosts((g) => g.filter((x) => !gs.includes(x))), 450)
    }
    for (const k of keys) {
      const n = nodes.current[k]
      if (!n) continue
      const left = n.offsetLeft
      next[k] = left
      const old = prevPos.current[k]
      if (!n.animate) continue
      if (old == null) {
        if (Object.keys(prevPos.current).length) n.animate([{ opacity: 0, transform: 'translateY(-22px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 400, easing: 'ease-out' })
      } else if (Math.abs(old - left) > 1) {
        n.animate([{ transform: `translateX(${old - left}px)`, zIndex: 2 }, { transform: 'translateX(0)', zIndex: 2 }], { duration: 450, easing: 'ease-in-out' })
      }
    }
    prevPos.current = next
  })
  const W = big ? 100 : 72 // 1つ分の幅
  const H = big ? 58 : 50
  const F = big ? 13 : 11
  const unitTile = (it, i, key, ghost = null) => (
      <div
        key={key}
        ref={ghost ? undefined : (n) => { nodes.current[key] = n }}
        style={{
          ...(ghost ? { position: 'absolute', left: ghost.left, top: 6, zIndex: 1, pointerEvents: 'none', animation: 'feel-bar-out 0.4s ease-in forwards' } : null),
          flex: '0 0 auto', width: i === 0 ? W + (big ? 20 : 12) : W, height: H, boxSizing: 'border-box', padding: '3px 4px',
          borderRadius: 6, fontSize: F, lineHeight: 1.25, overflow: 'hidden', position: ghost ? 'absolute' : 'relative',
          color: it.accel ? TEAM_COLOR[it.unit.team] : it.unit.team === ME ? C.onAccent : '#fff',
          background: it.accel ? C.card : TEAM_COLOR[it.unit.team],
          border: i === 0 ? `2px solid ${C.active}` : it.accel ? `2px dashed ${TEAM_COLOR[it.unit.team]}` : '2px solid transparent',
          fontWeight: i === 0 ? 700 : 400, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
        }}
      >
        {it.accel ? '⚡' : ''}{it.unit.team === ME ? '' : '敵 '}{it.unit.name}
        <span data-testid="av-value" style={{ position: 'absolute', right: 3, bottom: 1, fontSize: big ? 11 : 9, fontWeight: 700, lineHeight: 1, padding: '1px 3px', borderRadius: 4, background: 'rgba(0,0,0,0.45)', color: '#fff' }}>{ghost ? Math.round(it.time) : <AnimNum value={Math.round(it.time)} />}</span>
        {!ghost && avFx && avFx[it.unit.uid] && !it.accel && (
          // 行動順アップ(▲ 緑)/ダウン(▼ 青): その枠が光って、矢印が動く
          <span key={`${avFx[it.unit.uid].dir}-${avFx.tick}`} aria-hidden="true" data-testid={`fx-av-${avFx[it.unit.uid].dir}`} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 4, willChange: 'opacity', ...(avFx[it.unit.uid].dir === 'up' ? { boxShadow: 'inset 0 0 0 2px rgba(80,240,210,1)', background: 'rgba(40,200,180,0.4)' } : { boxShadow: 'inset 0 0 0 2px rgba(122,150,255,1)', background: 'rgba(60,80,200,0.45)' }), animation: `${avFx[it.unit.uid].dir === 'up' ? 'feel-av-up' : 'feel-av-down'} 1s ease-out both` }}>
            <span style={{ position: 'absolute', top: 0, bottom: 0, left: '-10%', right: '-10%', background: avFx[it.unit.uid].dir === 'up' ? 'linear-gradient(90deg, rgba(60,170,255,0) 0%, rgba(70,180,255,0.95) 35%, rgba(70,200,255,0.8) 65%, rgba(60,170,255,0) 100%)' : 'linear-gradient(90deg, rgba(90,110,255,0) 0%, rgba(90,110,255,0.95) 35%, rgba(110,130,255,0.8) 65%, rgba(90,110,255,0) 100%)', animation: 'feel-av-band 1s ease-out both' }} />
            <svg viewBox="0 0 40 40" style={{ position: 'absolute', left: '50%', top: '50%', width: big ? 40 : 34, height: big ? 40 : 34, marginLeft: big ? -20 : -17, marginTop: big ? -20 : -17, overflow: 'visible', transform: avFx[it.unit.uid].dir === 'up' ? 'none' : 'rotate(180deg)', filter: 'drop-shadow(0 0 4px rgba(150,170,255,0.95))', animation: 'feel-av-chev 1s ease-out both' }}>
              <path d="M5 22 L20 8 L35 22 L35 28 L20 14 L5 28 Z" fill="none" stroke="#e9e4ff" strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M5 33 L20 19 L35 33" fill="none" stroke="#e9e4ff" strokeWidth="2.2" strokeLinejoin="round" opacity="0.8" />
            </svg>
          </span>
        )}
      </div>
  )
  return (
    <div className="no-sb" style={{ display: 'flex', gap: big ? 6 : 4, overflowX: 'auto', overflowY: 'hidden', padding: '6px 2px', alignItems: 'stretch', position: 'relative' }}>
      {/* いまのラウンド: 左端に、ずっと残す(これから先のラウンドの区切りは、下の R○ で並ぶ) */}
      <div
        data-testid="av-round-now"
        style={{
          flex: '0 0 auto', width: big ? 36 : 30, display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch',
          fontSize: big ? 12 : 11, fontWeight: 800, color: C.ink, background: C.softWarn, borderRadius: 6, marginRight: 4,
        }}
      >
        R{state.round}
      </div>
      {ghosts.map((g) => unitTile(g.it, 1, g.key + '-out', { left: g.left }))}
      {items.map((it, i) =>
        it.round ? (
          <div
            key={`r${it.round}`}
            style={{
              flex: '0 0 auto', width: big ? 36 : 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: big ? 11 : 10, color: C.mute, borderLeft: `2px dashed ${C.line}`, borderRight: `2px dashed ${C.line}`,
            }}
          >
            R{it.round}
          </div>
        ) : it.crest ? (
          <div
            key={`crest-${it.crest.name}-${i}`}
            title={`クレスト【${it.crest.name}】のカウントダウン(持ち主の速度で進む)`}
            style={{
              flex: '0 0 auto', width: W, height: H, boxSizing: 'border-box', padding: '3px 4px', borderRadius: 6, fontSize: big ? 11 : 9, lineHeight: 1.25,
              overflow: 'hidden', background: '#2a2350', color: '#c9b8ff', border: `2px dotted ${TEAM_COLOR[it.crestTeam]}`,
            }}
          >
            CD{it.left} {it.crest.name}
          </div>
        ) : it.sys ? (
          <div
            key={`sys${it.sys}-${i}`}
            title="コンボリセット(システムターン): 味方のコンボ数が0に戻ります"
            style={{
              flex: '0 0 auto', width: W, height: H, boxSizing: 'border-box', padding: '3px 4px', borderRadius: 6, fontSize: big ? 11 : 9, lineHeight: 1.25,
              overflow: 'hidden', background: C.softWarn, color: C.active, border: `2px dotted ${TEAM_COLOR[it.sys]}`,
            }}
          >
            コンボリセット
          </div>
        ) : (
          unitTile(it, i, keys[i])
        )
      )}
    </div>
  )
}

// 予想ダメージを受けたとき、体力がいくつ減るか(アーマーが先に受け持つ分と、バリアで防がれる分を考える)
function hpLossOf(unit, dmg, isTrue) {
  if (dmg == null || unit.barrier > 0 || unit.isAmulet) return 0
  const mult = isTrue ? 0.5 : 1
  const covered = Math.min(dmg * unit.armorRate, unit.armor / mult)
  return Math.max(0, Math.min(unit.hp, dmg - covered))
}
// 体力バーの上で点滅して、「どこまで削れるか」を見せる部分
function LossBlink({ unit, loss, radius = 3 }) {
  if (!loss || loss <= 0) return null
  const left = Math.max(0, (unit.hp - loss) / unit.maxHp) * 100
  const width = Math.min(100 - left, (loss / unit.maxHp) * 100)
  return <div data-testid="loss-blink" style={{ position: 'absolute', top: 0, bottom: 0, left: `${left}%`, width: `${width}%`, borderRadius: radius, background: '#ff2d2d', animation: 'feel-blink 0.7s ease-in-out infinite' }} />
}

function badgesOf(unit) {
  const badges = []
  for (const k of unit.keywords) {
    if (k === 'stealth' && !unit.stealth) continue
    if (k === 'barrier' && unit.barrier <= 0) continue
    badges.push(KEYWORDS[k]?.label ?? k)
  }
  if (unit.relic) badges.push(`遺物:${unit.relic}`)
  if (unit.isAmulet) badges.push('アミュレット')
  else if (unit.field === 'summon') badges.push('召喚物')
  if (unit.accel) badges.push(`アクセ${unit.accel.speed}`)
  if (unit.evolved) badges.push('進化済')
  if (unit.countdown != null) badges.push(`CD ${unit.countdown}`)
  if (unit.comboCount > 0) badges.push(`コンボ${unit.comboCount}`)
  if (unit.buffs.some((b) => b.turns != null)) badges.push('強化')
  return badges
}

// ダメージの数字。物理=白 / 魔法=青 / 確定=虹(レジェンドのように、色が流れる)
function DmgNum({ part, crit, big }) {
  const size = (big ? 30 : 22) + (crit ? 6 : 0)
  const base = { fontWeight: 900, fontSize: size, lineHeight: 1.1, letterSpacing: '0.02em', fontFamily: DISPLAY }
  if (part.dmgType === 'true') {
    return (
      <span style={{ ...base, backgroundImage: 'linear-gradient(90deg, #ff4d4d, #ffb02e, #ffee55, #4dff88, #4dc3ff, #b06bff, #ff4dd2, #ff4d4d)', backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 2px #000) drop-shadow(0 0 2px #000) drop-shadow(0 0 6px rgba(255,255,255,0.6))', animation: 'feel-rainbow 0.9s linear infinite' }}>{part.text}</span>
    )
  }
  const magic = part.dmgType === 'magic'
  const color = magic ? '#5cb8ff' : '#ffffff'
  const glow = magic ? 'rgba(60,150,255,0.9)' : 'rgba(255,255,255,0.7)'
  return <span style={{ ...base, color, textShadow: `0 0 2px #000, 0 0 2px #000, 0 0 3px #000, 0 2px 0 #000, 0 0 12px ${glow}` }}>{part.text}</span>
}

// ---- 破壊・消滅の演出の部品(絵文字は使わず、すべてSVGで描く) ----
// ドクロ(黒いシルエット。目・鼻・歯のすきまは、穴になって下の赤い円が透ける)
function Skull() {
  return (
    <svg viewBox="0 0 100 100" style={{ position: 'absolute', left: '17%', top: '16%', width: '66%', height: '66%', overflow: 'visible', animation: 'feel-d-skull 0.48s ease-out 0.12s both' }}>
      <path fillRule="evenodd" fill="#1a0a08" d="M50 4 C75 4 88 17 88 36 C88 48 83 56 77 61 L73 66 L73 84 Q73 92 65 92 L35 92 Q27 92 27 84 L27 66 L23 61 C17 56 12 48 12 36 C12 17 25 4 50 4 Z
        M19 37 Q19 29 27 29 L40 30 Q48 31 47 40 L45 51 Q44 57 36 57 L28 56 Q19 54 19 46 Z
        M81 37 Q81 29 73 29 L60 30 Q52 31 53 40 L55 51 Q56 57 64 57 L72 56 Q81 54 81 46 Z
        M50 59 L43 73 Q50 75 57 73 Z" />
    </svg>
  )
}
// 飛び散る紙片(破壊): 白くて透ける、三角や四角の破片。火の粉(黄色)と、暗い赤のかけら
const GOLD = Array.from({ length: 34 }, (_, n) => { const a = n * 2.4 + 0.3; const d = 22 + ((n * 7) % 9) * 9; return { dx: `${Math.round(Math.cos(a) * d)}px`, dy: `${Math.round(Math.sin(a) * d - 14)}px`, size: 3 + (n % 4) * 1.6, col: n % 3 === 0 ? '#ffffff' : n % 3 === 1 ? '#fff0a8' : '#ffd45e', delay: 0.1 + (n % 6) * 0.045, dur: 0.5 + (n % 5) * 0.1 } })
const CONFETTI = Array.from({ length: 16 }, (_, n) => { const a = n * 2.4 + 0.4; const d = 26 + ((n * 7) % 5) * 9; return { x: `${Math.round(Math.cos(a) * 10)}px`, y: `${Math.round(Math.sin(a) * 10)}px`, dx: `${Math.round(Math.cos(a) * d)}px`, dy: `${Math.round(Math.sin(a) * d)}px`, rot: `${(n % 2 ? 1 : -1) * (90 + n * 30)}deg`, size: 6 + (n % 3) * 2, tri: n % 2 === 0, delay: 0.1 + (n % 5) * 0.02 } })
const EMBERS = Array.from({ length: 10 }, (_, n) => { const a = n * 0.63 + 0.2; const d = 18 + (n % 4) * 9; return { dx: `${Math.round(Math.cos(a) * d)}px`, dy: `${Math.round(Math.sin(a) * d)}px`, dark: n % 3 === 0 } })

// 召喚物の並びが変わったとき(破壊・消滅・新しい召喚)、動いたカードを元の位置から新しい位置へ滑らせる(FLIP)。
// 毎回の描画のあとに、召喚物カードの位置(offsetLeft/Top)を前回と比べる。transform ではなく独立の translate を使うので、ほかの演出と重ならない
const slidePrev = new Map()
function useSummonSlide() {
  useLayoutEffect(() => {
    if (typeof document === 'undefined') return
    const seen = new Set()
    document.querySelectorAll('[data-field="summon"][data-uid]').forEach((el) => {
      const uid = el.getAttribute('data-uid')
      seen.add(uid)
      const x = el.offsetLeft; const y = el.offsetTop
      const prev = slidePrev.get(uid)
      slidePrev.set(uid, { x, y })
      if (!prev || (Math.abs(prev.x - x) < 2 && Math.abs(prev.y - y) < 2)) return
      el.style.transition = 'none'
      el.style.translate = `${prev.x - x}px ${prev.y - y}px`
      void el.offsetWidth // 位置を確定させてから、動かす
      el.style.transition = 'translate 0.3s ease-out'
      el.style.translate = '0 0'
    })
    for (const k of [...slidePrev.keys()]) if (!seen.has(k)) slidePrev.delete(k)
  })
}

const EVO_IMG = (n) => `url(${import.meta.env?.BASE_URL || '/'}fx/evolve/${n}.webp)`
const EVO_L = { position: 'absolute', inset: 0, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', willChange: 'transform, opacity' }
const EVO_RB = [[0, 0.9], [0.13, 0.7]]
const EVO_SPARK = Array.from({ length: 16 }, (_, n) => { const a = n * 2.39996; const rr = 30 + (n % 5) * 9; return { x: 50 + Math.cos(a) * rr * 0.8, y: 50 + Math.sin(a) * rr * 0.9, s: 2 + (n % 3) * 1.5, dx: Math.round(Math.cos(a) * 14), dy: -10 - (n % 4) * 6, d: 0.74 + (n % 6) * 0.06, dur: 0.5 + (n % 4) * 0.1 } })
// 名前が枠に入り切らないときは、2行にせず、1行に収まるまで文字を小さくする(動かさない)。
// 小さくしすぎて読めなくならないよう、下限(元の約55%)で止め、それでも入らない分は「…」で省く
const NAME_MIN_RATIO = 0.55
function NameFit({ text, style }) {
  const box = useRef(null)
  const one = useRef(null)
  const [ratio, setRatio] = useState(1)
  useLayoutEffect(() => {
    const measure = () => {
      const b = box.current, t = one.current
      if (!b || !t) return
      t.style.fontSize = '' // 元の大きさで測る
      const natural = t.offsetWidth, room = b.clientWidth
      setRatio(natural > room && room > 0 ? Math.max(NAME_MIN_RATIO, room / natural) : 1)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(measure)
    ro.observe(box.current)
    return () => ro.disconnect()
  }, [text])
  return (
    <div ref={box} style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', ...style }}>
      <span ref={one} style={{ display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'top', ...(ratio < 1 ? { fontSize: `${(ratio * 100).toFixed(1)}%` } : {}) }}>{text}</span>
    </div>
  )
}

export function UnitCard({ unit, active, selected, selectable, inspected, onClick, onFocusCard, big = false, fx = null, hl = false, tick = 0, loss = 0, role = null }) {
  // 破壊: HPの数字とバーが、同じ速さで0へ減っていく。消滅: HPは減らないので、消える直前の値のまま(0にしない)
  const lastHp = useRef(unit.hp)
  if (unit.alive) lastHp.current = unit.hp
  const vanishing = !!(fx && fx.die === 'vanish')
  const hpShown = vanishing && !unit.alive ? lastHp.current : unit.hp
  const ratio = Math.max(0, hpShown / unit.maxHp)
  const hpColor = ratio > 0.5 ? C.hp : ratio > 0.25 ? C.hpMid : C.hpLow
  const badges = unit.alive ? badgesOf(unit) : []
  // 破壊・消滅の演出中は、まだ生きているときの見た目のまま(演出のあと、暗い半透明の「戦闘不能」の札に変わって残らないように)。演出が終わったら、そっと消す
  const dying = !!(fx && fx.die)
  const gone = !unit.alive && !dying
  return (
    <div
      data-uid={unit.uid}
      data-field={unit.field}
      data-alive={unit.alive ? 'true' : 'false'}
      data-selectable={selectable ? 'true' : 'false'}
      data-field-card={unit.alive ? '1' : undefined}
      data-selected={selected ? '1' : undefined}
      tabIndex={unit.alive ? 0 : undefined}
      role="button"
      aria-label={unit.name}
      onClick={onClick}
      onFocus={onFocusCard}
      style={{
        minWidth: 0, boxSizing: 'border-box', padding: big ? 10 : 4, ...(big ? { minHeight: 112 } : { height: 106, overflow: 'visible' }), // 戦闘画面が動かないように、スマホ幅のカードは高さを固定 borderRadius: big ? 10 : 8, fontSize: big ? 13 : 10, lineHeight: 1.3,
        background: C.card,
        opacity: 1,
        border: `2px solid ${selected ? C.active : selectable ? C.ink : active ? TEAM_COLOR[unit.team] : inspected ? C.mute : C.line}`,
        boxShadow: selected ? `0 0 0 3px ${alpha(C.active, 33)}` : active ? `0 0 0 3px ${alpha(TEAM_COLOR[unit.team], 20)}` : 'none',
        cursor: 'pointer', position: 'relative',
        ...(hl ? { boxShadow: `0 0 0 4px ${C.active}`, transform: 'scale(1.03)', zIndex: 2 } : {}),
        ...(fx && fx.kind === 'evolve' ? { zIndex: 4 } : {}),
        ...(fx && fx.kind === 'damage' ? { animation: `${tick % 2 ? 'feel-shake' : 'feel-shake2'} 0.4s${fx.die === 'destroy' ? ', feel-d-melt 0.18s ease-in forwards, ' + (unit.field === 'main' ? 'feel-d-fadem' : 'feel-d-fade') + ' 0.27s ease-in 0.24s forwards' : fx.die === 'vanish' ? ', feel-d-frame 0.03s ease-in 0.04s forwards' : ''}` } : fx && fx.die === 'destroy' ? { animation: `feel-d-melt 0.18s ease-in forwards, ${unit.field === 'main' ? 'feel-d-fadem' : 'feel-d-fade'} 0.27s ease-in 0.24s forwards` } : fx && fx.die === 'vanish' ? { animation: 'feel-d-frame 0.03s ease-in 0.04s forwards' } : {}), // 破壊: ドクロが出る前に、ユニットがぼやけて、下へ溶けるように崩れる
        // 攻撃する側: チームの色で光って、相手のほうへ少し出る / 受ける側: 赤く縁どる(揺れとダメージの数字は、いままでどおり)
        ...(role === 'attacker' ? { boxShadow: `0 0 0 3px ${TEAM_COLOR[unit.team]}, 0 0 18px 2px ${alpha(TEAM_COLOR[unit.team], 60)}`, zIndex: 3, animation: `${unit.team === 'A' ? 'feel-lunge-up' : 'feel-lunge-down'} 0.5s ease-out` } : {}),
        ...(fx && fx.die ? { zIndex: 6 } : {}), // 破壊・消滅のエフェクトは、カードより大きい。となりのカードの下に隠れて途切れないよう、このカードを前に出す
        // 倒れたキャラ: 外枠と背景を消して、名前とHPバーだけを薄く残す(場所はそのまま。並びがずれない)
        ...(gone ? { opacity: 0.4, background: 'transparent', border: '2px solid transparent', boxShadow: 'none', pointerEvents: 'none', transition: 'background 0.35s, border-color 0.35s, box-shadow 0.35s' } : {}),
        ...(role === 'target' || role === 'guard' ? { boxShadow: `0 0 0 3px ${role === 'guard' ? C.player : C.bad}, 0 0 16px 2px ${alpha(role === 'guard' ? C.player : C.bad, 55)}`, zIndex: 2 } : {}),
      }}
    >
      {fx && fx.die === 'destroy' && <span key={`dg-${tick}`} aria-hidden="true" style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: '#fff', pointerEvents: 'none', zIndex: 4, opacity: 0, animation: 'feel-d-glow 0.27s ease-in forwards', willChange: 'opacity' }} />}
      {fx && fx.die === 'destroy' && (
        // 破壊の演出: 白熱のフラッシュ → 赤い円(縁は桃色の輪、外側に暗い赤のにじみ。墓場が増えるときは、黒いドクロ入り)→ 透ける白い破片が散り、ドクロが溶け、円が赤いもやになって、火の粉と暗いかけらを散らして消える
        <span key={`des-${tick}`} aria-hidden="true" data-testid="fx-destroy" style={{ position: 'absolute', left: '50%', top: '50%', height: '120%', aspectRatio: '1', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 9 }}>
          <span style={{ position: 'absolute', inset: '8%', borderRadius: '24%', background: 'radial-gradient(circle, #fff 0%, #ffe2b0 45%, rgba(255,150,70,0.8) 75%, rgba(255,120,60,0) 100%)', boxShadow: '0 0 20px 6px rgba(255,170,90,0.8)', opacity: 0, animation: 'feel-d-flash 0.12s ease-out 0.12s forwards' }} />
          {fx.lw && (
            <>
          <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle at 50% 46%, #ff9a7e 0%, #fb6a50 55%, #ec4733 85%, #ffa58c 100%)', boxShadow: 'inset 0 0 0 2px rgba(255,205,180,0.85), 0 0 12px 3px rgba(255,80,60,0.85), 0 0 30px 12px rgba(120,10,10,0.55)', animation: 'feel-d-orb 0.48s ease-out 0.12s both' }}>
            {fx.lw && <Skull />}
          </span>
          {CONFETTI.map((c, n) => (
            <span key={n} style={{ position: 'absolute', left: '50%', top: '50%', width: c.size, height: c.size, marginLeft: -c.size / 2, marginTop: -c.size / 2, clipPath: c.tri ? 'polygon(0 100%, 50% 0, 100% 100%)' : 'polygon(10% 0, 100% 20%, 90% 100%, 0 80%)', background: 'linear-gradient(135deg, #ffffff 0%, #d6e8ff 50%, #ffe0ea 100%)', '--x': c.x, '--y': c.y, '--dx': c.dx, '--dy': c.dy, '--rot': c.rot, animation: `feel-d-conf 0.36s ease-out ${(c.delay + 0.2) * 0.6}s both` }} />
          ))}
          {EMBERS.map((m, n) => (
            <span key={`e${n}`} style={{ position: 'absolute', left: '50%', top: '50%', width: m.dark ? 4 : 5, height: m.dark ? 4 : 5, marginLeft: -2, marginTop: -2, borderRadius: m.dark ? 1 : '50%', background: m.dark ? '#5a1210' : '#ffd27a', boxShadow: m.dark ? 'none' : '0 0 6px 2px rgba(255,160,50,0.9)', '--dx': m.dx, '--dy': m.dy, animation: `feel-d-ember 0.48s ease-out 0.12s both` }} />
          ))}
            </>
          )}
          {!fx.lw && (
            // ラストワードなし: 金白の閃光 → 金色のもやと、きらめく粒が散って消える(ドクロも赤い円も出ない)
            <>
              <span style={{ position: 'absolute', inset: '-6%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,246,200,0.95) 0%, rgba(255,214,110,0.6) 40%, rgba(255,190,70,0) 72%)', opacity: 0, animation: 'feel-d-haze 0.8s ease-out 0.1s both', willChange: 'transform, opacity' }} />
              {GOLD.map((g, n) => (
                <span key={`g${n}`} style={{ position: 'absolute', left: '50%', top: '50%', width: g.size, height: g.size, marginLeft: -g.size / 2, marginTop: -g.size / 2, borderRadius: '50%', background: g.col, boxShadow: '0 0 6px 2px rgba(255,205,90,0.9)', opacity: 0, '--dx': g.dx, '--dy': g.dy, animation: `feel-d-gold ${g.dur}s ease-out ${g.delay}s both`, willChange: 'transform, opacity' }} />
              ))}
            </>
          )}
        </span>
      )}
      {fx && fx.die === 'vanish' && <VanishFx key={`van-${tick}`} ms={VANISH_BASE_MS * VANISH_SLOW} />}
      {unit.alive && (unit.keywords || []).includes('guard') && (
        // 【守護】の盤面エフェクト: 縦長の盾(カードに収まる比率)の輪郭が、内側から現れて外側へ広がりながら消える。2枚が半周期ずらして繰り返す
        <span aria-hidden="true" data-testid="fx-guard-idle" style={{ position: 'absolute', left: '50%', top: '50%', height: '94%', aspectRatio: '0.78', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 4 }}>
          {[0, 1].map((n) => (
            <svg key={n} viewBox="0 0 78 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', animation: `feel-guard-wave 2.2s ease-out ${n * -1.1}s infinite both`, filter: 'drop-shadow(0 0 3px rgba(150,255,60,0.9))' }}>
              <path d="M39 2 L74 10 V44 C74 70 57 88 39 98 C21 88 4 70 4 44 V10 Z" fill="rgba(150,255,60,0.07)" stroke="#b6ff4a" strokeWidth="2.2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              <path d="M39 9 L67 15 V43 C67 65 53 80 39 89 C25 80 11 65 11 43 V15 Z" fill="none" stroke="rgba(214,255,120,0.9)" strokeWidth="1.2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
          ))}
        </span>
      )}
      {unit.alive && (unit.keywords || []).includes('intimidate') && (
        // 【威圧】の盤面エフェクト(元動画どおり): ユニットの上に重なる◇(ひし形)の黄緑の光の帯。中は空いていて、帯はやわらかく、炎のようにギザギザとゆらめく。カードの縁には、淡い青緑の光の線
        <span aria-hidden="true" data-testid="fx-intimidate-idle" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }}>
          {/* 炎のゆらぎは、事前に作った8コマの高解像度画像(public/fx)を順に切り替えて出す。フィルターの計算は使わない(動かすのは opacity だけ) */}
          <span style={{ position: 'absolute', inset: 0, opacity: 0.95, animation: 'feel-int-pulse 2.4s ease-in-out infinite', willChange: 'opacity' }}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => (
              <img key={k} src={`/fx/intimidate-${k}.webp`} alt="" draggable={false} decoding="async" style={{ position: 'absolute', left: '50%', top: '50%', height: '200%', aspectRatio: '1', transform: 'translate(-50%, -50%)', opacity: 0, animation: `feel-int-f8 0.9s steps(1, end) ${k * 0.1125}s infinite` }} />
            ))}
          </span>
          <span style={{ position: 'absolute', inset: 0, borderRadius: 8, border: '1.5px solid rgba(160,245,205,0.85)', boxShadow: '0 0 6px 1px rgba(150,245,190,0.7), inset 0 0 6px rgba(150,245,190,0.5)' }} />
        </span>
      )}
      {unit.alive && (unit.keywords || []).includes('stealth') && unit.stealth && (
        // 【潜伏】の盤面エフェクト(元動画どおり): ユニットの上に、薄紫がかった灰色のもくもくした煙がかかる。縁・外側ほど濃く、中央はユニットの絵が見える。明るい筋と暗い影がまだらに混ざり、2層が逆向きにゆっくり渦を巻く。カードの枠からはみ出し、輪郭は雲のように不定形
        <span aria-hidden="true" data-testid="fx-stealth-idle" style={{ position: 'absolute', inset: '-24% -30%', overflow: 'hidden', pointerEvents: 'none', zIndex: 5, WebkitMaskImage: 'radial-gradient(ellipse closest-side, #000 58%, rgba(0,0,0,0.7) 78%, transparent 100%)', maskImage: 'radial-gradient(ellipse closest-side, #000 58%, rgba(0,0,0,0.7) 78%, transparent 100%)', animation: 'feel-stl-in 0.6s ease-out both' }}>
          {/* 元動画: 煙は回らず、その場でゆっくり形を変える(もくもく)。事前に作った高解像度の煙の画像(public/fx)を、順にクロスフェードして形を変え、ごくゆっくり漂わせる。動かすのは transform と opacity だけなので、GPUで60fps以上で動く */}
          <span style={{ position: 'absolute', inset: 0, WebkitMaskImage: 'radial-gradient(ellipse 40% 38% at 50% 50%, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.9) 100%)', maskImage: 'radial-gradient(ellipse 40% 38% at 50% 50%, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.9) 100%)', animation: 'feel-stl-breathe 3.2s ease-in-out infinite', willChange: 'opacity' }}>
            {[['d2', 0, 1, 6.8, 9], ['d1', -3.4, 2, 6.8, 9], ['l1', 0, 2, 7.2, 8], ['l2', -2.4, 1, 7.2, 8], ['l3', -4.8, 2, 7.2, 8]].map(([id, off, dr, xf, dd]) => (
              <span key={id} style={{ position: 'absolute', inset: '-20%', opacity: id[0] === 'd' ? 0.8 : 1, animation: `feel-stl-drift${dr} ${dd}s ease-in-out ${off}s infinite alternate`, willChange: 'transform' }}>
                <img src={`/fx/stealth-${id}.webp`} alt="" draggable={false} decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', animation: `feel-stl-xf ${xf}s linear ${off}s infinite`, willChange: 'opacity' }} />
              </span>
            ))}
          </span>
        </span>
      )}
      {unit.alive && (unit.keywords || []).includes('earthSign') && (
        // 【土の印】を持つユニットの盤面エフェクト: オレンジの円(縁は左側がやや太い)。縁がゆっくり脈打ち、上のほうから、オレンジのもやが内側へ湧いては引くのを繰り返す。縁に明るい筋が回る
        <span aria-hidden="true" data-testid="fx-earth-idle" style={{ position: 'absolute', left: '50%', top: '50%', height: '100%', aspectRatio: '1', borderRadius: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 3, overflow: 'hidden',
          background: 'radial-gradient(circle at 56% 50%, rgba(255,140,30,0) 0%, rgba(255,140,30,0.08) 42%, rgba(255,140,20,0.62) 62%, rgba(255,148,22,1) 84%, rgba(255,172,48,0.97) 95%, rgba(255,172,48,0) 100%)',
          boxShadow: '0 0 10px 2px rgba(255,140,20,0.55)', animation: 'feel-earth-idle 2.6s ease-in-out infinite' }}>
          <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(ellipse 70% 38% at 40% 22%, rgba(255,175,60,0.75) 0%, rgba(255,160,40,0.35) 55%, rgba(255,150,30,0) 100%)', animation: 'feel-earth-haze 2.6s ease-in-out infinite' }} />
          <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(ellipse 45% 30% at 68% 30%, rgba(255,185,80,0.6) 0%, rgba(255,160,40,0) 100%)', animation: 'feel-earth-haze 2.6s ease-in-out -1.3s infinite' }} />
          <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'conic-gradient(from 0deg, rgba(255,230,140,0) 0%, rgba(255,230,140,0.40) 12%, rgba(255,230,140,0) 30%, rgba(255,230,140,0) 55%, rgba(255,230,140,0.32) 68%, rgba(255,230,140,0) 85%)', WebkitMaskImage: 'radial-gradient(circle, transparent 52%, #000 74%)', maskImage: 'radial-gradient(circle, transparent 52%, #000 74%)', animation: 'feel-earth-spin 9s linear infinite' }} />
        </span>
      )}
      {unit.alive && ((unit.keywords || []).includes('aura') || (unit.keywords || []).includes('earthSign')) && ( // 【土の印】は、オーラと同じ効果(相手の能力で選ばれない)を持つので、オーラのエフェクトも出る
        // 【オーラ】の盤面エフェクト: 7枚の淡い緑のひし形(1-2-1-2-1の並び)が、上から順に、グラデーションのようにフェードイン → フェードアウトを繰り返す
        <span aria-hidden="true" data-testid="fx-aura-idle" style={{ position: 'absolute', left: '50%', top: '50%', height: '108%', aspectRatio: '0.84', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 4 }}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
            {[[50, 12], [29, 29], [71, 29], [50, 46], [29, 63], [71, 63], [50, 80]].map(([cx, cy], n) => (
              <path key={n} d={`M${cx} ${cy - 15.5} L${cx + 19.5} ${cy} L${cx} ${cy + 15.5} L${cx - 19.5} ${cy} Z`} fill="rgba(170,232,170,0.42)" stroke="rgba(225,255,225,0.9)" strokeWidth="1.3" strokeLinejoin="round" vectorEffect="non-scaling-stroke" style={{ animation: `feel-aura-idle 2.6s ease-in-out ${[0, 0.14, 0.14, 0.28, 0.42, 0.42, 0.56][n]}s infinite both`, filter: 'drop-shadow(0 0 2px rgba(200,255,200,0.7))' }} />
            ))}
          </svg>
        </span>
      )}
      {(role === 'target' || role === 'guard') && (
        // 共通の攻撃エフェクト: 当たった瞬間に、白い閃光・×の切り筋・広がる輪が出る(ガードのときは、黄色い輪が広がる)。カードの外にも少しはみ出して、目立たせる
        <span key={`hit-${tick}`} aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 8 }}>
          {role === 'target' ? (
            <>
              <span style={{ position: 'absolute', inset: -10, borderRadius: 14, background: 'radial-gradient(circle at 50% 50%, #fff 0%, rgba(255,120,110,0.85) 35%, rgba(255,60,60,0) 72%)', animation: 'feel-flash 0.55s ease-out forwards' }} />
              <span style={{ position: 'absolute', left: '-20%', top: '50%', width: '140%', height: 7, marginTop: -3, borderRadius: 4, background: '#fff', boxShadow: '0 0 10px 3px rgba(255,255,255,0.95), 0 0 18px 6px rgba(255,90,90,0.8)', transformOrigin: 'center', animation: 'feel-slash 0.5s ease-out forwards' }} />
              <span style={{ position: 'absolute', left: '-20%', top: '50%', width: '140%', height: 7, marginTop: -3, borderRadius: 4, background: '#fff', boxShadow: '0 0 10px 3px rgba(255,255,255,0.95), 0 0 18px 6px rgba(255,90,90,0.8)', transformOrigin: 'center', animation: 'feel-slash2 0.5s ease-out 0.06s both' }} />
              <span style={{ position: 'absolute', left: '50%', top: '50%', width: '70%', aspectRatio: '1', borderRadius: '50%', border: '4px solid #fff', boxShadow: '0 0 12px 2px rgba(255,110,110,0.9)', animation: 'feel-guard 0.5s ease-out forwards' }} />
            </>
          ) : (
            <span style={{ position: 'absolute', left: '50%', top: '50%', width: '70%', aspectRatio: '1', borderRadius: '50%', border: `4px solid ${C.player}`, boxShadow: `0 0 12px 2px ${C.player}`, animation: 'feel-guard 0.55s ease-out forwards' }} />
          )}
        </span>
      )}
      {fx && (fx.kind === 'buff' || fx.kind === 'keyword') && (
        // 強化・能力付与のエフェクト: カードの周りに光(強化=金 / 付与=水色)が広がり、記号(▲ / ✦)が昇る
        <span key={`aura-${tick}`} aria-hidden="true" data-testid={`fx-${fx.kind}`} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 7 }}>
          <span style={{ position: 'absolute', inset: -8, borderRadius: 14, border: `3px solid ${fx.kind === 'buff' ? '#ffd24a' : '#66e0ff'}`, boxShadow: `0 0 18px 4px ${fx.kind === 'buff' ? 'rgba(255,210,74,0.75)' : 'rgba(102,224,255,0.75)'}, inset 0 0 18px 2px ${fx.kind === 'buff' ? 'rgba(255,210,74,0.45)' : 'rgba(102,224,255,0.45)'}`, animation: 'feel-aura 0.9s ease-out both' }} />
          {[0, 1, 2].map((n) => (
            <span key={n} style={{ position: 'absolute', left: `${22 + n * 28}%`, bottom: '14%', fontSize: big ? 22 : 16, fontWeight: 900, color: fx.kind === 'buff' ? '#ffd24a' : '#66e0ff', textShadow: '0 0 3px #000, 0 0 8px currentColor', animation: `feel-rise 0.9s ${n * 0.12}s ease-out both` }}>{fx.kind === 'buff' ? '▲' : '✦'}</span>
          ))}
        </span>
      )}
      {fx && fx.kind === 'evolve' && (
        // 進化のエフェクト(参考動画の再現。ユニットはひっくり返さない): ①虹色の波紋が広がり、細い光の筋が出る → ②白金の放射状の光が弾ける
        // → ③縁が金色に光る → ④白い光の球がユニットを包む → ⑤白い鎖状の輪が回って消える。質感は web/tools/bake-evolve.py で画像に焼き込み済み(動かすのは transform と opacity だけ)
        <span key={`evo-${tick}`} aria-hidden="true" data-testid="fx-evolve" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 8 }}>
          <span style={{ position: 'absolute', left: '50%', top: '50%', height: '280%', aspectRatio: '1', transform: 'translate(-50%, -50%)' }}>
            {EVO_RB.map(([d, o], n) => <span key={`rb${n}`} style={{ ...EVO_L, backgroundImage: EVO_IMG('rainbow'), opacity: 0, animation: `feel-ev2-rb 0.6s ease-out ${d}s both`, '--o': o }} />)}
            <span style={{ ...EVO_L, backgroundImage: EVO_IMG('rays'), opacity: 0, animation: 'feel-ev2-ray 0.5s ease-out 0.04s both' }} />
            <span style={{ ...EVO_L, backgroundImage: EVO_IMG('rays'), opacity: 0, animation: 'feel-ev2-burst 0.34s ease-out 0.26s both' }} />
          </span>
          <span style={{ position: 'absolute', inset: 0, borderRadius: 8, background: '#fff', opacity: 0, animation: 'feel-ev2-flash 0.36s ease-out 0.26s both' }} />
          <span style={{ position: 'absolute', inset: -2, borderRadius: 10, boxShadow: '0 0 16px 5px rgba(255,236,150,0.95), inset 0 0 14px 2px rgba(255,244,190,0.8)', opacity: 0, animation: 'feel-ev2-rim 1.15s ease-in-out 0.3s both', willChange: 'opacity' }} />
          <span style={{ position: 'absolute', left: '50%', top: '50%', height: '122%', aspectRatio: '1', transform: 'translate(-50%, -50%)' }}><span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.98) 0%, rgba(255,235,250,0.95) 45%, rgba(255,214,240,0.75) 72%, rgba(255,255,255,0) 100%)', opacity: 0, animation: 'feel-ev2-orb 0.34s ease-in-out 0.58s both', willChange: 'transform, opacity' }} /></span>
          <span style={{ position: 'absolute', left: '50%', top: '50%', height: '210%', aspectRatio: '1', transform: 'translate(-50%, -50%)' }}>
            <span style={{ ...EVO_L, backgroundImage: EVO_IMG('chain'), opacity: 0, animation: 'feel-ev2-chain 0.72s ease-out 0.7s both' }} />
            <span style={{ ...EVO_L, backgroundImage: EVO_IMG('chain'), opacity: 0, animation: 'feel-ev2-chain2 0.72s ease-out 0.78s both' }} />
          </span>
          {EVO_SPARK.map((q, n) => <span key={`sp${n}`} style={{ position: 'absolute', left: `${q.x}%`, top: `${q.y}%`, width: q.s, height: q.s, marginLeft: -q.s / 2, marginTop: -q.s / 2, borderRadius: '50%', background: '#fff', boxShadow: '0 0 5px 1px rgba(255,240,190,0.95)', opacity: 0, '--dx': `${q.dx}px`, '--dy': `${q.dy}px`, animation: `feel-ev2-spark ${q.dur}s ease-out ${q.d}s both`, willChange: 'transform, opacity' }} />)}
        </span>
      )}
      {unit.alive && unit.barrier > 0 && !(fx && fx.kind === 'block') && (
        // バリアの盤面エフェクト(元動画どおり): カードを包む水色の円。内側は薄い水色のもや、縁は太くやわらかい水色の輪。縁を淡い明るい筋がゆっくり回り、全体がゆっくり脈打つ
        <span aria-hidden="true" data-testid="fx-barrier" style={{ position: 'absolute', left: '50%', top: '50%', height: '118%', aspectRatio: '1', borderRadius: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 3, overflow: 'hidden',
          background: 'radial-gradient(circle, rgba(170,240,253,0.1) 0%, rgba(170,240,253,0.14) 58%, rgba(140,232,252,0.62) 66%, rgba(80,200,246,0.84) 78%, rgba(62,186,240,0.9) 90%, rgba(100,214,250,0.75) 97%, rgba(120,224,252,0) 100%)',
          boxShadow: '0 0 12px 3px rgba(80,210,250,0.5)', animation: 'feel-earth-idle 2.6s ease-in-out infinite, feel-bar-appear 0.35s ease-out 0.4s backwards' }}>
          <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'conic-gradient(from 0deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 8%, rgba(255,255,255,0) 20%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.32) 58%, rgba(255,255,255,0) 70%)', WebkitMaskImage: 'radial-gradient(circle, transparent 62%, #000 74%, #000 96%, transparent 100%)', maskImage: 'radial-gradient(circle, transparent 62%, #000 74%, #000 96%, transparent 100%)', animation: 'feel-earth-spin 6s linear infinite' }} />
        </span>
      )}
      {fx && fx.kind === 'block' && (
        // バリアが壊れるエフェクト: 泡の中が白く発光 → 放射状の光が走る → 泡ごとサッと消散していく
        <span key={`bb-${tick}`} aria-hidden="true" data-testid="fx-barrier-break" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 8 }}>
          <span style={{ position: 'absolute', left: '50%', top: '50%', height: '118%', aspectRatio: '1', transform: 'translate(-50%, -50%)' }}>
          <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle, rgba(170,240,253,0.1) 0%, rgba(170,240,253,0.14) 58%, rgba(140,232,252,0.62) 66%, rgba(80,200,246,0.84) 78%, rgba(62,186,240,0.9) 90%, rgba(100,214,250,0.75) 97%, rgba(120,224,252,0) 100%)', boxShadow: '0 0 14px 4px rgba(70,205,255,0.65)', animation: 'feel-bb-bubble 0.7s ease-out both' }} />
          <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(ellipse at 50% 50%, #fff 0%, #fff 55%, rgba(220,250,255,0.9) 100%)', boxShadow: '0 0 22px 8px rgba(255,255,255,0.9)', opacity: 0, animation: 'feel-bb-flash 0.7s ease-out both' }} />
          </span>
          <span style={{ position: 'absolute', left: '50%', top: '50%', width: 220, height: 220, marginLeft: -110, marginTop: -110, borderRadius: '50%', background: 'repeating-conic-gradient(from 6deg, rgba(255,255,255,0.95) 0deg 1.6deg, rgba(255,255,255,0) 1.6deg 17deg)', WebkitMaskImage: 'radial-gradient(circle, #000 0%, #000 22%, transparent 68%)', maskImage: 'radial-gradient(circle, #000 0%, #000 22%, transparent 68%)', opacity: 0, animation: 'feel-bb-rays 0.7s ease-out both' }} />
          <span style={{ position: 'absolute', left: '50%', top: '50%', width: 220, height: 220, marginLeft: -110, marginTop: -110, borderRadius: '50%', background: 'repeating-conic-gradient(from 15deg, rgba(190,245,255,0.8) 0deg 1deg, rgba(255,255,255,0) 1deg 29deg)', WebkitMaskImage: 'radial-gradient(circle, #000 0%, #000 18%, transparent 62%)', maskImage: 'radial-gradient(circle, #000 0%, #000 18%, transparent 62%)', opacity: 0, animation: 'feel-bb-rays 0.7s ease-out 0.03s both' }} />
          {[[18, 22, 9], [78, 18, 7], [88, 62, 8], [12, 70, 6], [50, 90, 7], [60, 8, 6]].map(([x, y, r], n) => (
            <span key={n} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: r, height: r, marginLeft: -r / 2, marginTop: -r / 2, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #fff, rgba(190,240,255,0.5))', '--dx': `${(x - 50) * 0.7}px`, '--dy': `${(y - 50) * 0.7}px`, opacity: 0, animation: `feel-bb-mote 0.55s ease-out ${0.2 + n * 0.02}s both` }} />
          ))}
        </span>
      )}
      {role && (
        <span aria-hidden="true" style={{ position: 'absolute', left: 6, top: -9, zIndex: 6, padding: '0 6px', borderRadius: 999, fontSize: big ? 11 : 9, fontWeight: 800, lineHeight: '16px', color: '#121212', background: role === 'attacker' ? TEAM_COLOR[unit.team] : role === 'guard' ? C.player : C.bad, whiteSpace: 'nowrap', pointerEvents: 'none' }}>
          {role === 'attacker' ? '攻撃' : role === 'guard' ? 'ガード' : '被弾'}
        </span>
      )}
      {fx && (
        fx.kind === 'damage' && fx.parts ? (
          // ダメージの数字: 物理=白 / 魔法=青 / 確定=虹。大きく太く出す
          <span key={tick} style={{ position: 'absolute', left: '50%', top: '22%', zIndex: 9, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, whiteSpace: 'nowrap', animation: 'feel-float 1.3s ease-out forwards' }}>
            {fx.parts.map((pt, n) => <DmgNum key={n} part={pt} crit={fx.crit && n === 0} big={big} />)}
          </span>
        ) : (
        <span key={tick} style={{ position: 'absolute', left: '50%', top: '30%', zIndex: 5, pointerEvents: 'none', fontWeight: 800, fontSize: fx.crit ? (big ? 26 : 20) : (big ? 22 : 17), color: fx.kind === 'heal' ? '#3ddc97' : fx.kind === 'damage' ? '#ff5a5a' : fx.kind === 'buff' ? '#ffd24a' : fx.kind === 'keyword' ? '#66e0ff' : C.player, textShadow: '0 0 3px #000, 0 0 3px #000, 0 0 3px #000', whiteSpace: 'nowrap', animation: 'feel-float 1.2s ease-out forwards' }}>
          {fx.kind === 'buff' && fx.buffs ? fx.buffs.map((b, n) => (
            <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, marginRight: n < fx.buffs.length - 1 ? 8 : 0 }}>
              {BUFF_ICON.has(b.stat)
                ? <StatIcon stat={b.stat} style={{ width: '1.15em', height: '1.15em', filter: 'drop-shadow(0 0 2px #000)' }} />
                : b.label}
              {b.val}↑
            </span>
          )) : fx.text}
        </span>
        )
      )}
      <NameFit text={unit.name} style={{ height: big ? 36 : 26, fontWeight: big ? 700 : 400, ...(vanishing ? { animation: 'feel-d-fade2 0.03s ease-in 0.04s forwards', willChange: 'opacity' } : {}) }} /> {/* 消滅: 名前も、青い光の円が広がりきる0.07秒までに消す */}
      {!unit.isAmulet && (
        <div style={{ background: '#1b3a43', height: big ? 9 : 6, borderRadius: 3, marginTop: 3, position: 'relative' }}>
          <div style={{ width: '100%', height: '100%', borderRadius: 3, background: hpColor, transformOrigin: '0 50%', transform: `scaleX(${ratio})`, transition: 'transform 0.3s' }} />
          <LossBlink unit={unit} loss={loss} />
        </div>
      )}
      <div style={{ marginTop: 2, color: C.mute, ...(dying && !unit.isAmulet ? { animation: `feel-d-fade2 ${vanishing ? '0.03s ease-in 0.04s' : '0.2s ease-in 0.3s'} forwards`, willChange: 'opacity' } : {}) }}>{unit.isAmulet ? (unit.alive ? (unit.earthCount > 0 ? `土の印 ${unit.earthCount}` : '体力なし') : '消えた') : unit.alive || dying ? <><AnimNum value={Math.ceil(unit.alive || vanishing ? hpShown : 0)} ms={300} />/{unit.maxHp}</> : ''}</div>
      {unit.armor > 0 && <div style={{ color: C.player }}>アーマー {Math.ceil(unit.armor)}{unit.armorRate < 1 ? `(${Math.round(unit.armorRate * 100)}%)` : ''}</div>}
      {badges.length > 0 && (
        <div style={{ marginTop: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {badges.map((b) => (
            <span key={b} style={{ fontSize: big ? 11 : 9, padding: '0 3px', borderRadius: 3, background: C.soft, color: C.player }}>{b}</span>
          ))}
        </div>
      )}
    </div>
  )
}

// 奥義ゲージの段階(10以上で奥義、15以上で解放奥義)
const tierOf = (g) => (g >= 15 ? '【解放奥義】' : g >= 10 ? '【奥義】' : '')

// チームの資源(MP・EP・信仰値・連携・奥義ゲージ)と、置かれているクレスト
function TeamStatus({ state, team, big = false, inline = false }) {
  const crests = state.crests[team]
  const chips = [
    ['MP', `${state.mp[team]}/${state.mpMax[team]}`, true],
    ['EP', state.ep[team], true],
    ['コンボ', state.comboCount?.[team] ?? 0, true],
    ['信仰', state.faith[team], state.faith[team] > 0],
    ['スペルブースト', state.boost?.[team] ?? 0, (state.boost?.[team] ?? 0) > 0],
    ['土の印', state.earth?.[team] ?? 0, (state.earth?.[team] ?? 0) > 0],
    ['墓場', state.graveyard[team], state.graveyard[team] > 0],
    ['連携', state.link[team], state.link[team] > 0],
    ['奥義', `${gaugeOf(state, team)}${tierOf(gaugeOf(state, team))}`, true],
  ]
  const col = TEAM_COLOR[team]
  return (
    <div style={{ fontSize: big ? 13 : 11, marginTop: inline ? 0 : 4, lineHeight: 1.4, display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', fontWeight: 400 }}>
      {!inline && <b style={{ color: col, marginRight: 2 }}>{team === ME ? '自分' : '相手'}</b>}
      {chips.filter((c) => c[2]).map(([k, v]) => (
        <span key={k} style={{ padding: big ? '2px 8px' : '1px 6px', borderRadius: 999, border: `1px solid ${col}`, color: C.ink, background: alpha(col, 14), whiteSpace: 'nowrap' }}>
          <span style={{ color: col, fontWeight: 700 }}>{k}</span> {v}
        </span>
      ))}
      {crests.map((c) => (
        <span key={c.name} title={c.desc} style={{ padding: big ? '2px 8px' : '1px 6px', borderRadius: 999, background: C.softWarn, color: C.active, whiteSpace: 'nowrap' }}>
          クレスト {c.name}{c.countdown != null ? `(${c.countdown})` : ''}
        </span>
      ))}
    </div>
  )
}

function Row({ title, color, children, big = false, extra = null, tight = false }) {
  return (
    <div style={{ marginTop: big ? 0 : tight ? 4 : 10 }}>
      <div style={{ fontSize: big ? 13 : 11, color, fontWeight: 700, marginBottom: 4, display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>{title}{extra}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: big ? 10 : 4 }}>{children}</div>
    </div>
  )
}

// いま起きたことの履歴(新しいものが下・いちばん新しいものが目立つ)。ログを開かなくても、流れが分かるように
function RecentFeed({ feed, big }) {
  const rows = feed.slice(-5)
  return (
    <div data-testid="feed" style={{ height: big ? 170 : 150, boxSizing: 'border-box', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: big ? '8px 12px' : '6px 8px', borderRadius: 10, background: C.card, border: `1px solid ${C.line}`, fontSize: big ? 14 : 12, lineHeight: 1.5 }}>
      {rows.length === 0 && <div style={{ color: C.mute }}>ここに、いま起きたことが出ます</div>}
      {rows.map((r, i) => {
        const latest = i === rows.length - 1
        return (
          <div key={r.k} style={{ display: 'flex', gap: 6, opacity: latest ? 1 : 0.45 + i * 0.1, fontWeight: latest ? 800 : 400, color: C.ink }}>
            <span style={{ flex: '0 0 auto', width: 6, borderRadius: 3, background: r.team ? TEAM_COLOR[r.team] : C.line }} />
            <span style={{ minWidth: 0 }}>{r.text}</span>
          </div>
        )
      })}
    </div>
  )
}

// 選んで働く能力の情報パネル(画面の左・小さめ)。ユニット名と、その能力の文。タップの邪魔にならない
export function AbilityNote({ unit, title, text, big = false }) {
  const col = TEAM_COLOR[unit.team]
  return (
    <div data-testid="ability-note" aria-live="polite" style={{ position: 'fixed', zIndex: 12, pointerEvents: 'none', left: big ? 16 : 6, ...(big ? { bottom: 200 } : { top: 160 }), width: big ? 340 : 'min(260px, 62vw)', maxHeight: big ? '42vh' : '34vh', overflow: 'hidden', borderRadius: 8, background: `color-mix(in srgb, ${col} 9%, ${C.card})`, border: `2px solid ${col}`, boxShadow: `0 0 0 1px ${alpha(col, 35)}, 0 6px 18px ${alpha('#000000', 40)}`, fontSize: big ? 14 : 12, lineHeight: 1.6, animation: 'feel-note-in 0.22s ease-out backwards' }}>
      <div style={{ padding: big ? '6px 12px' : '5px 10px', fontWeight: 800, background: `linear-gradient(90deg, ${alpha(col, 34)}, ${alpha(col, 8)})`, overflowWrap: 'anywhere' }}>{title || unit.name}</div>
      <div style={{ padding: big ? '8px 12px 10px' : '6px 10px 8px', overflowWrap: 'anywhere' }}>{text}</div>
    </div>
  )
}

// 選択したユニットの性能メモを、画面の左上か右上に出す。選んだユニットが左半分にいれば右上、右半分にいれば左上(邪魔にならない側)
function SelInfoPanel({ uid, big = false, children }) {
  const [side, setSide] = useState('right')
  useLayoutEffect(() => {
    const measure = () => {
      const el = document.querySelector(`[data-uid="${uid}"]`)
      if (!el) return
      const r = el.getBoundingClientRect()
      setSide(r.left + r.width / 2 < window.innerWidth / 2 ? 'right' : 'left')
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [uid])
  return (
    <div data-testid="sel-info" data-side={side} style={{ position: 'fixed', top: big ? 136 : 160, [side]: big ? 16 : 6, zIndex: 10, width: big ? 360 : 'min(300px, 64vw)', maxHeight: big ? 'calc(100vh - 110px)' : '48vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }} className="no-sb">
      {children}
    </div>
  )
}

// 左側のログ(最大 SIDE_LOG_MAX 個。超えると古いものから消える。出てから SIDE_LOG_LIFE_MS 経つとフェードアウトして消える)。表示: 「名前 / 内容」
const SIDE_LOG_MAX = 3
const SIDE_LOG_LIFE_MS = 3000
const SIDE_LOG_FADE_MS = 400
function SideLogItem({ it, big, onGone, setRef }) {
  const [fading, setFading] = useState(false)
  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), SIDE_LOG_LIFE_MS)
    const t2 = setTimeout(() => onGone(it.k), SIDE_LOG_LIFE_MS + SIDE_LOG_FADE_MS)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [it.k]) // eslint-disable-line react-hooks/exhaustive-deps
  const col = it.team ? TEAM_COLOR[it.team] : C.active
  return (
    <div ref={(el) => setRef(it.k, el)} style={{ willChange: 'transform, opacity' }}>
      <div style={{ animation: fading ? `feel-log-out ${SIDE_LOG_FADE_MS}ms ease-in forwards` : 'feel-log-in 0.22s ease-out both', borderRadius: '0 8px 8px 0', overflow: 'hidden', background: alpha(C.card, 94), border: `1px solid ${alpha(col, 60)}`, borderLeft: 'none', boxShadow: `0 3px 10px ${alpha('#000000', 30)}`, fontSize: big ? 13 : 12, lineHeight: 1.5 }}>
        <div style={{ padding: big ? '5px 12px' : '4px 10px', fontWeight: 800, color: C.ink, background: `linear-gradient(90deg, ${alpha(col, 38)}, ${alpha(col, 8)})`, overflowWrap: 'anywhere' }}>{it.name}</div>
        <div style={{ padding: big ? '5px 12px 7px' : '4px 10px 6px', color: C.ink, overflowWrap: 'anywhere' }}>{it.text}</div>
      </div>
    </div>
  )
}
// 常に一番新しいログが一番下。新しいログが出ると、古いログは下から上へ滑って移動する(位置は下端を基準に固定。transform だけで動かす)
function SideLog({ items, big = false, onGone }) {
  const els = useRef(new Map())
  const tops = useRef(new Map())
  const setRef = (k, el) => { if (el) els.current.set(k, el); else els.current.delete(k) }
  useLayoutEffect(() => {
    const next = new Map()
    for (const [k, el] of els.current) {
      const top = el.getBoundingClientRect().top
      next.set(k, top)
      const prev = tops.current.get(k)
      if (prev != null && Math.abs(prev - top) > 0.5) {
        el.style.transition = 'none'
        el.style.transform = `translateY(${prev - top}px)`
        el.getBoundingClientRect() // 反映してから、元の位置へ滑らせる
        el.style.transition = 'transform 0.25s ease-out'
        el.style.transform = 'translateY(0)'
      }
    }
    tops.current = next
  }, [items])
  if (!items.length) return null
  return (
    <div data-testid="side-log" aria-live="polite" style={{ position: 'fixed', left: 0, bottom: big ? '38%' : 'calc(min(168px, 30vh) + 8px + env(safe-area-inset-bottom))', zIndex: 8, width: big ? 320 : 'min(230px, 56vw)', display: 'flex', flexDirection: 'column', gap: 6, pointerEvents: 'none' }}>
      {items.map((it) => <SideLogItem key={it.k} it={it} big={big} onGone={onGone} setRef={setRef} />)}
    </div>
  )
}

// 奥義・解放奥義の条件がついた能力には、頭に【奥義】【解放奥義】を付ける
const tierPrefix = (cond) => (cond?.liberation ? '【解放奥義】' : cond?.ultimate ? '【奥義】' : '')

function passiveLine(p) {
  const label = (p.tag ?? TRIGGER_LABELS[p.trigger] ?? p.trigger) + (p.min != null && p.trigger !== 'combo' ? `_${p.min}` : '')
  if (p.name && /^.+?【.+】$/.test(p.name)) return `${tierPrefix(p.condition)}${bracket(p.name)}${p.desc ?? ''}` // 『ファンファーレ【コンボ_3】』は、【ファンファーレ】【コンボ_3】と分けて出す
  const name = p.name && p.name !== label ? `${p.name}: ` : ''
  return `${tierPrefix(p.condition)}【${label}】${name}${p.desc ?? ''}`
}

// 選択・確認したキャラの情報カード(共通)
// 1行目: 速度アイコン 速度/名前   2行目: クラス/タイプ HP 攻撃力 防御力   以降: 【スキル】【ファンファーレ】…、クレスト
const STAT_NAME = { atk: '攻撃力', mag: '魔力', def: '防御力' }
function skillText(sk) {
  if (sk.desc) return sk.desc
  const pct = Math.round((sk.mult ?? 1) * 100)
  const add = sk.add ? `+${sk.add}` : ''
  return `相手単体に${STAT_NAME[sk.stat] ?? '攻撃力'}${pct}%${add}分の${TYPE_LABEL[sk.type] ?? '物理'}ダメージを与える。`
}
// 能力が持たせるクレスト(あれば)。「」の区画として、最後にまとめて見せる
function crestsOf(unit) {
  const out = []
  const walk = (effects) => { for (const e of effects || []) if (e?.type === 'crest' && e.crest) out.push(e.crest) }
  for (const p of unit.passiveObjs || []) walk(p.effects)
  for (const t of unit.traits || []) walk(t.effects)
  return out
}

// ---- 性能表の書き方(上の行ほど先に書く。グループの境目に ── を引く) ----
// [グループ, [同じ行に並ぶ見出し]]。グループ: 0=召喚・融合・ブースト / 1=スキルと各種能力 / 2=キーワードと戦闘中の能力 / 3=進化時
const TABLE = [
  [0, ['直接召喚']], [0, ['融合']], [0, ['スペルブースト時']],
  [1, ['スキル']], [1, ['ファンファーレ', 'モード', 'コンボ', '連携', '土の秘術', '土の印', '覚醒', 'ネクロマンス', 'リアニメイト']], [1, ['常時', 'アクティブ']], [1, ['エンハンス']], [1, ['奥義']], [1, ['解放奥義']],
  [2, ['突進']], [2, ['疾走']], [2, ['必殺']], [2, ['守護']], [2, ['威圧']], [2, ['オーラ']], [2, ['潜伏']], [2, ['バリア']], [2, ['ドレイン']], [2, ['交戦時']], [2, ['攻撃時']], [2, ['ラストワード']],
  [3, ['進化時']],
]
const ROW_OTHER = TABLE.findIndex((r) => r[1][0] === 'ラストワード') + 0.5 // 表にない能力(ターン終了時など)は、ラストワードの次(進化時の前)に置く
const rowOf = (label) => { const i = TABLE.findIndex((r) => r[1].some((n) => label.includes(n))); return i }
const groupOfRow = (i) => (i < 0 ? 2 : TABLE[i][0])

const hasFaith = (p) => p.condition?.faith != null || JSON.stringify(p.effects || []).includes('"type":"faith"')

// 能力を、表の順に並べたグループ(g)と、「」の区画(boxes)にする
function abilityTable(unit, { full }) {
  const items = [] // { row, g, head, body, order }
  const add = (row, head, body, kw) => items.push({ row: row < 0 ? ROW_OTHER : row, g: groupOfRow(row), head, body, kw, order: items.length })
  const boxes = []
  const faithLines = []
  const amulet = unit.isAmulet
  const crystal = { lines: [], act: [] }
  if (!amulet && unit.skill) add(rowOf('スキル'), `【スキル】${skillText(unit.skill)}`)
  for (const k of unit.keywords) {
    if (!full && k === 'stealth' && !unit.stealth) continue
    if (!full && k === 'barrier' && unit.barrier <= 0) continue
    const label = KEYWORDS[k]?.label ?? k
    add(rowOf(label), `【${label}】`, KEYWORDS[k]?.desc ?? '', label)
  }
  for (const p of unit.passiveObjs) {
    const text = passiveLine(p)
    if (hasFaith(p)) { faithLines.push(text); continue }
    if (amulet) { crystal.lines.push(text); continue }
    const tier = p.condition?.liberation ? '解放奥義' : p.condition?.ultimate ? '奥義' : null
    const label = p.tag ?? TRIGGER_LABELS[p.trigger] ?? p.trigger
    add(tier ? rowOf(tier) : rowOf(`${p.name ?? ''}${label}`), text)
  }
  for (const t of unit.traits) {
    const text = isEnhance(t) ? `【${t.name}】${enhanceBody(t)}` : `${tierPrefix(t.condition)}【特性 MP${t.cost}${t.repeatable ? ' 連続使用可' : ''}】${t.name}: ${t.desc ?? ''}`
    if (amulet) { crystal.act.push(text); continue }
    const tier = t.condition?.liberation ? '解放奥義' : t.condition?.ultimate ? '奥義' : t.id === 'enhance' ? 'エンハンス' : 'アクティブ'
    add(rowOf(tier), text)
  }
  items.sort((x, y) => x.row - y.row || x.order - y.order)
  const groups = [[], [], [], []]
  for (const it of items) groups[it.g].push(it)
  for (const c of crestsOf(unit)) {
    const lines = []
    if (c.countdown != null && !(c.desc ?? '').includes('カウントダウン')) lines.push(`【カウントダウン_${c.countdown}】`)
    lines.push(c.desc ?? '')
    boxes.push({ icon: 'crest', title: 'クレスト', sub: `『${c.name}』`, parts: [lines] })
  }
  if (faithLines.length) boxes.push({ icon: 'faith', title: '信仰', parts: [['信仰値は0から始まる。'], faithLines] })
  if (amulet) {
    const parts = []
    const cd = unit.countdown != null && full ? [`【カウントダウン】あと${unit.countdown}回自分のターンが始まると破壊される`] : []
    if (cd.length || crystal.lines.length) parts.push([...cd, ...crystal.lines])
    if (crystal.act.length) parts.push(crystal.act)
    boxes.push({ icon: 'spd', title: '結晶', parts })
  } else if (full && unit.countdown != null) {
    groups[2].push({ head: `【カウントダウン】あと${unit.countdown}回自分のターンが始まると破壊される` })
  }
  if (unit.accel) boxes.push({ icon: 'spd', title: 'アクセラレート', parts: [[`【アクセラレート_${unit.accel.speed}】${unit.accel.name}(MP${unit.accel.cost ?? 0}): ${unit.accel.desc ?? ''}`]] })
  return { groups, boxes }
}

const Rule = () => <div aria-hidden="true" style={{ height: 0, borderTop: `1px solid ${alpha(C.mute, 55)}`, margin: '2px 0' }} />
const CrestMark = () => <svg viewBox="0 0 24 24" width="1.1em" height="1.1em" style={{ verticalAlign: '-0.2em', marginRight: 4 }} fill="currentColor" aria-hidden="true"><path d="M12 2l8 3v6c0 5-3.4 9-8 11-4.6-2-8-6-8-11V5z" /></svg>
const FaithMark = () => <svg viewBox="0 0 24 24" width="1.1em" height="1.1em" style={{ verticalAlign: '-0.2em', marginRight: 4 }} fill="currentColor" aria-hidden="true"><path d="M12 2l2.4 7.6H22l-6.2 4.5 2.4 7.4-6.2-4.6-6.2 4.6 2.4-7.4L2 9.6h7.6z" /></svg>

// 表の順に、グループごとに ── を引いて並べる。「」の区画は、前のグループから続けて(── なしで)書く
// キーワードの説明は出さない。キーワードをタップすると「能力詳細」が開き、そこに説明が出る
function Abilities({ unit, full }) {
  const [open, setOpen] = useState(null) // 開いたとき、タップしたキーワードの名前
  const { groups, boxes } = abilityTable(unit, { full })
  const filled = groups.filter((g) => g.length)
  const kws = groups.flat().filter((it) => it.kw)
  const out = []
  filled.forEach((g, gi) => {
    if (gi) out.push(<Rule key={`r${gi}`} />)
    out.push(
      <div key={`g${gi}`} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {g.map((it, i) => (it.kw
          ? <div key={i}><button type="button" data-testid="kw-open" onClick={(e) => { e.stopPropagation(); setOpen(it.kw) }} style={{ all: 'unset', cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: 3 }}>{it.head}</button></div>
          : <div key={i}>{it.head}</div>))}
      </div>,
    )
  })
  if (!out.length && !boxes.length) return <div style={{ color: C.mute }}>能力なし</div>
  for (const [bi, b] of boxes.entries()) {
    out.push(
      <div key={`b${bi}`} style={{ marginTop: bi || out.length ? 4 : 0, padding: '5px 9px', borderRadius: 6, background: tint(C.active, 12), borderLeft: `4px solid ${C.active}` }}>
        <div style={{ fontWeight: 700 }}>{b.icon === 'crest' ? <CrestMark /> : b.icon === 'faith' ? <FaithMark /> : <SI k="spd" />}{b.title}{b.sub && <span style={{ color: C.mute, fontWeight: 400 }}> {b.sub}</span>}</div>
        {b.parts.map((lines, pi) => (
          <div key={pi}>
            {pi > 0 && <Rule />}
            {lines.map((l, li) => <div key={li}>{l}</div>)}
          </div>
        ))}
      </div>,
    )
  }
  const ordered = open ? [...kws.filter((k) => k.kw === open), ...kws.filter((k) => k.kw !== open)] : []
  return (
    <>
      {out}
      {open && (
        <div role="dialog" aria-label="能力詳細" data-testid="kw-modal" onClick={(e) => { e.stopPropagation(); setOpen(null) }} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: alpha('#000000', 60), display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(520px, 100%)', maxHeight: '80vh', display: 'flex', flexDirection: 'column', borderRadius: 12, overflow: 'hidden', background: C.card, border: `2px solid ${C.active}`, boxShadow: `0 8px 30px ${alpha('#000000', 50)}`, color: C.ink, fontSize: 14, lineHeight: 1.6 }}>
            <div style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800, fontSize: 16, background: `linear-gradient(90deg, ${alpha(C.active, 28)}, ${alpha(C.active, 8)})` }}>能力詳細</div>
            <div style={{ overflowY: 'auto', padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {ordered.map((k) => (
                <div key={k.kw}>
                  <div style={{ color: C.active, fontWeight: 700 }}>{k.kw}</div>
                  <div>{k.body}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: 10, display: 'flex', justifyContent: 'center' }}>
              <button type="button" data-testid="kw-close" onClick={() => setOpen(null)} style={buttonStyle(true, false)}>閉じる</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// 不透明な背景: カード色に、チーム色などをうっすら混ぜる(alpha と違い、透けない)
const tint = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, ${C.card})`
function InfoCard({ testid, unit, accent, children, big = false, style }) {
  const edge = accent ?? C.active
  const hp = Math.ceil(unit.hp) === unit.maxHp ? `${unit.maxHp}` : `${Math.ceil(unit.hp)}/${unit.maxHp}`
  const kind = [unit.class, ...String(unit.type || '').split('/')].filter(Boolean).join('/')
  const mag = unit.skill?.stat === 'mag' || unit.mag > 0
  return (
    <div data-testid={testid} style={{ borderRadius: 10, overflow: 'hidden', background: tint(edge, 9), border: `2px solid ${edge}`, boxShadow: `0 0 0 1px ${alpha(edge, 35)}, 0 4px 14px ${alpha('#000000', 28)}`, fontSize: big ? 13 : 12, lineHeight: 1.55, ...style }}>
      <div style={{ padding: big ? '8px 12px 6px' : '6px 10px 5px', background: `linear-gradient(90deg, ${alpha(edge, 30)}, ${alpha(edge, 6)})` }}>
        <div style={{ fontWeight: 800, fontSize: big ? 16 : 14, overflowWrap: 'anywhere' }}><SI k="spd" />{Math.round(unit.spd)}/{unit.name}{unit.evolved ? '(進化済)' : ''}{unit.field === 'summon' ? '(召喚物)' : ''}</div>
        {!unit.isAmulet && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 12px', alignItems: 'baseline', color: C.mute, fontSize: big ? 12 : 11, fontWeight: 600 }}>
            {import.meta.env.DEV && unit.unitType && <span title="ユニットタイプ(開発用。本番では出さない)" style={{ opacity: 0.6 }}>[{unit.unitType}{unit.token ? '・トークン' : ''}]</span>}
            {kind && <span>{kind}</span>}
            <span><SI k="hp" />{hp}</span>
            <span><SI k="atk" />{Math.round(unit.atk)}</span>
            <span><SI k="def" />{Math.round(unit.def)}</span>
            {mag && <span><SI k="mag" />{Math.round(unit.mag)}</span>}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: big ? 10 : 8 }}>{children}</div>
    </div>
  )
}

// キャラの詳細(能力の説明)
function InspectBox({ unit, big = false }) {
  return (
    <InfoCard testid="inspect" big={big} style={{ marginTop: 8 }} accent={TEAM_COLOR[unit.team]} unit={unit}>
      <Abilities unit={unit} full />
    </InfoCard>
  )
}

// 選択中の相手(攻撃・特性の対象)の情報。予想ダメージつき
function TargetInfo({ unit, expected, loss = 0, big = false }) {
  const ratio = Math.max(0, unit.hp / unit.maxHp)
  return (
    <InfoCard testid="target-info" big={big} style={{ marginBottom: 8 }} unit={unit}>
      {!unit.isAmulet && (
        <div>
          <div style={{ background: '#1b3a43', height: 10, borderRadius: 4, marginBottom: 3, position: 'relative' }}>
            <div style={{ width: `${ratio * 100}%`, height: '100%', borderRadius: 4, background: ratio > 0.5 ? C.hp : ratio > 0.25 ? C.hpMid : C.hpLow }} />
            <LossBlink unit={unit} loss={loss} radius={4} />
          </div>
          {(unit.armor > 0 || unit.barrier > 0) && <div style={{ color: C.mute }}>{unit.armor > 0 ? `アーマー ${Math.ceil(unit.armor)}` : ''}{unit.armor > 0 && unit.barrier > 0 ? ' ・ ' : ''}{unit.barrier > 0 ? 'バリア' : ''}</div>}
        </div>
      )}
      {expected != null && (
        <div style={{ fontWeight: 700, color: C.player }}>
          予想ダメージ 約{Math.round(expected)}{expected >= unit.hp + unit.armor ? '(倒せる!)' : ''}
          {unit.barrier > 0 ? '(バリアで防がれる)' : !unit.isAmulet && <span style={{ color: C.mute, fontWeight: 400 }}> → HP {Math.ceil(unit.hp - loss)}/{unit.maxHp}</span>}
        </div>
      )}
      <Abilities unit={unit} full={false} />
    </InfoCard>
  )
}

const buttonStyle = (primary, disabled) => ({
  padding: '10px 14px', borderRadius: 8, fontSize: 14, fontFamily: FONT, cursor: disabled ? 'default' : 'pointer',
  border: `1px solid ${primary ? C.ink : C.line}`,
  background: disabled ? C.disabledBg : primary ? C.player : C.card,
  color: disabled ? C.disabledInk : primary ? C.onAccent : C.ink,
})

// rewardApi: ログイン中だけ渡される。{ start(level) → { ticketId }, finish(ticketId, 'win'|'lose') → { reward, reason } }
// ---- 再生(起きたことを、1つずつ順番に見せる。速さは、設定の「CPUの行動の待ち時間」に合わせる) ----
// 連続する同じ種類の出来事(複数の召喚・複数への攻撃・複数のヒール)は、1つにまとめて一気に見せる。
// 返す値は、まとめの最後の番号(まとまらなければ i のまま)。攻撃は、同じ攻撃元・同じ手段のものだけ。同じ相手が2回出たら、そこで区切る
const GROUP_TYPES = ['damage', 'heal', 'summon', 'buff', 'keyword', 'destroy', 'vanish', 'av']
function groupEnd(events, i) {
  const e = events[i]
  if (!e || !GROUP_TYPES.includes(e.type)) return i
  const seen = new Set([e.target])
  let j = i
  while (j + 1 < events.length) {
    const n = events[j + 1]
    const dying = (t) => t === 'destroy' || t === 'vanish'
    if (dying(n.type) && (e.type === 'damage' || dying(e.type))) { seen.add(n.target); j += 1; continue } // HPが0になった瞬間に、破壊・消滅の演出を、ダメージと一緒に出す
    if (n.type !== e.type) break
    const finisher = e.type === 'damage' && n.means === '必殺' && n.src === e.src // 【必殺】の追加ダメージは、スキルのダメージと合わせて1回で見せる(同じ相手でもよい)
    const boostT = n.type === 'buff' || n.type === 'keyword' || n.type === 'av' // 強化・能力付与は、同じ相手に重なってもひとまとめ
    if (!finisher && !boostT && seen.has(n.target)) break
    if (e.type === 'damage' && !finisher && (n.src !== e.src || n.means !== e.means)) break
    seen.add(n.target)
    j += 1
  }
  return j
}
// 召喚のあとに、1体ずつ「能力の表示 → 強化 → 能力付与」が交互に起きる(例: 3体召喚 → 1体ごとに強化と付与)場合は、見せる順を
// 「(能力の表示)→ 全員に強化 → (能力の表示)→ 全員に能力付与」に並べ替える。同じ能力の表示は、1回にまとめる
function reorderBoost(evs) {
  const isB = (e) => e.type === 'buff' || e.type === 'keyword'
  const out = []
  for (let i = 0; i < evs.length;) {
    if (!isB(evs[i]) && !(evs[i].type === 'ability' && evs.slice(i + 1).findIndex((e) => e.type !== 'ability') >= 0 && isB(evs[i + 1 + evs.slice(i + 1).findIndex((e) => e.type !== 'ability')]))) { out.push(evs[i++]); continue }
    let j = i
    while (j < evs.length && (isB(evs[j]) || evs[j].type === 'ability')) j++
    const run = evs.slice(i, j)
    const buckets = { buff: { abs: [], evs: [] }, keyword: { abs: [], evs: [] } }
    let pending = []; const tail = []
    for (const e of run) {
      if (e.type === 'ability') { pending.push(e); continue }
      const bk = buckets[e.type]
      for (const a of pending) if (!bk.abs.some((x) => x.owner === a.owner && x.name === a.name)) bk.abs.push(a)
      pending = []; bk.evs.push(e)
    }
    tail.push(...pending)
    const last = (arr, d) => arr.length ? arr[arr.length - 1] : d
    const snapOf = (e) => ({ units: e.units, logLen: e.logLen, mp: e.mp, ep: e.ep })
    // 能力付与の前の盤面を見せるとき(強化の再生中・強化の能力表示)は、あとで付く能力を、まだ付いていないことにする
    const before = i > 0 ? evs[i - 1].units : null
    const noKw = (sn) => {
      if (!before) return sn
      const units = {}
      for (const [uid, u] of Object.entries(sn.units)) units[uid] = before[uid] ? { ...u, keywords: before[uid].keywords, barrier: before[uid].barrier, stealth: before[uid].stealth } : u
      return { ...sn, units }
    }
    const bs = noKw(snapOf(last(buckets.buff.evs, run[run.length - 1]))); const ks = snapOf(run[run.length - 1])
    out.push(...buckets.buff.abs.map((e) => ({ ...e, ...noKw(snapOf(e)) })), ...buckets.buff.evs.map((e) => ({ ...e, ...bs })), ...buckets.keyword.abs.map((e) => ({ ...e, ...bs })), ...buckets.keyword.evs.map((e) => ({ ...e, ...ks })), ...tail)
    i = j
  }
  return out
}
export const VANISH_SLOW = 1 // 消滅エフェクトの長さの倍率。1 = 0.9秒(ルール画面と同じ基準・56コマで約62fps)。EFFECTS.mdの基準値。
const EVENT_MS = { turn: 700, ability: 300, attack: 300, damage: 900, heal: 800, summon: 800, block: 800, buff: 900, keyword: 900, evolve: 1500, destroy: 800, vanish: Math.round(950 * VANISH_SLOW), av: 800, sync: 300 }

// 案内所 → CPU戦 → チーム を通って来たとき(flow)は、levelInit / teamInit / spellsInit が渡され、すぐ対戦が始まる。onBackLevel: レベルを選ぶ画面へ / onBackTeam: チームを選ぶ画面へ
export default function BattleScreen({ settingsView = null, onExit, cpuDelay = 700, rewardApi: rewardApiProp = null, partyApi = null, levelInit = null, teamInit = null, spellsInit = null, onBackLevel = null, onBackTeam = null, online = null, testInit = null }) {
  // online(対人戦): { client, side, opp, init(サーバーが決めた最初の状態), left, turnMs }。サーバーが審判で、行動はサーバーに送り、返ってきた状態を再生する
  if (online) setMe(online.side); else setMe('A')
  const rewardApi = testInit ? null : rewardApiProp // テスト戦(検証用): 報酬も戦績も、記録しない
  const [probe, setProbe] = useState('')
  // テスト戦: ゴースト無限湧き(なし / 自分 / 相手 / 両方)。最後に選んだものを覚えておく
  const [ghostMode, setGhostMode] = useRemembered('test.ghosts', 'none')
  const ghostRef = useRef('none')
  ghostRef.current = testInit ? ghostMode : 'none'
  const GHOST_NEXT = { none: 'A', A: 'B', B: 'both', both: 'none' }
  const GHOST_LABEL = { none: 'なし', A: '自分', B: '相手', both: '両方' }
  const step = (st, a) => addGhosts(applyAction(st, a), ghostRef.current === 'A' ? ME : ghostRef.current === 'B' ? OPP() : ghostRef.current)
  useEffect(() => { if (!testInit) return undefined; const h = (e) => setProbe(e.detail); window.addEventListener('feel-fxprobe', h); return () => window.removeEventListener('feel-fxprobe', h) }, [testInit])
  const flow = !!teamInit || !!online
  const [spellSet, setSpellSet] = useState(spellsInit || []) // 編成画面で決めたスペルセット(スペル定義の配列。同じスペルを複数入れてよい)
  const [team, setTeam] = useState(teamInit || (online ? [] : null)) // 編成画面で決めた自分のチーム(キャラ定義の配列)。nullなら編成画面を出す
  const [level, setLevel] = useState(levelInit || 2)
  const [intro, setIntro] = useState(false) // ステージ説明を出している(出している間は、CPUは動かない)
  const [introFirst, setIntroFirst] = useState(false) // 対戦の始まりの、最初のステージ説明
  const [leaveAsk, setLeaveAsk] = useState(false) // 退出の確認を出している
  const [menuOpen, setMenuOpen] = useState(false) // バトルメニュー(Esc・ポーズ)を出している
  const [settingsOpen, setSettingsOpen] = useState(false) // バトルメニューから開いた設定
  const [resultShown, setResultShown] = useState(true) // 勝敗の表示を出してよいか(「盤面を見る」で、一度しまえる)
  const [cpuCharsSetting, setCpuChars] = useState(() => loadCpuCharSetting()) // 開発者設定: CPUが使うキャラ(test / real)
  const cpuChars = flow ? 'real' : cpuCharsSetting // 通常戦(案内所 → CPU戦 から来たとき)は、いつも本実装キャラ。開発者設定は、単体のテスト画面だけ
  const [state, setState] = useState(online ? online.init : null)
  const [waitingSend, setWaitingSend] = useState(false) // 対人戦: 行動を送って、サーバーの返事を待っている
  const [inbox, setInbox] = useState([]) // 対人戦: 届いたが、再生中でまだ反映していない知らせ
  const [oppOffline, setOppOffline] = useState(false)
  const [rankInfo, setRankInfo] = useState(null) // ランクマッチ: 結果のBPの増減 { bp, delta, label }
  const [netMsg, setNetMsg] = useState('') // 対人戦: 通信の状態の表示(切断中など)
  const [endInfo, setEndInfo] = useState(null) // 対人戦: { winner, reason }
  const [deadlineAt, setDeadlineAt] = useState(() => (online && online.left != null ? Date.now() + online.left : null)) // 手番の期限(この端末の時計)
  const [, setTick] = useState(0)
  const [selected, setSelected] = useState(null)
  const [mode, setMode] = useState(null) // 選択中の特性のid(nullならスキル攻撃)
  const [inspect, setInspect] = useState(null)
  const [cpuError, setCpuError] = useState('') // CPUの思考でエラーが起きたときの表示
  const [ticketId, setTicketId] = useState(null) // 対戦の報酬用の「対戦券」(サーバーが発行)
  const [rewardMsg, setRewardMsg] = useState('') // 報酬の結果の表示
  const [careerMsg, setCareerMsg] = useState('') // 戦績の記録の結果の表示
  const mult = cpuDelay / 700 // 再生の速さ(設定の待ち時間に合わせる: 速い≒0.5 / ふつう=1 / ゆっくり≒1.7)
  const [auto, setAuto] = useState(false) // オート(∞): 自分の番も、CPUと同じ考え方で自動で進める
  const [play, setPlay] = useState(null) // 再生中の記録 { events, i, prevActive, prevAbility }。null なら再生していない
  const playing = !!play
  const statsRef = useRef(newStats()) // キャリア用: この対戦のダメージの集計
  const namesRef = useRef({ A: [], B: [] })
  const savedRef = useRef(null) // 記録ずみの対戦(二重に記録しない)
  const desktop = useIsDesktop() // 画面の幅が広い(PC)ときは、画面全体を使うレイアウトにする

  const actor = state ? getActiveUnit(state) : null
  const cpuTurn = !online && !!actor && actor.team === 'B' && !state.winner
  const playerTurn = !!actor && actor.team === ME && !state.winner && !playing && !(online && waitingSend)
  const legal = playerTurn ? legalActions(state) : []
  const selectedGone = !!(selected && state && !state.units.some((u) => u.uid === selected && u.alive))
  useEffect(() => { // 選んでいた対象が倒れて(いなくなって)いたときだけ、選択を消す。スキルを使えない番(入場直後など)を挟んでも、選択は残す
    if (selectedGone) setSelected(null)
  }, [selectedGone])
  const skillTargets = legal.filter((a) => a.type === 'skill').map((a) => a.target)
  const traitActions = (id) => legal.filter((a) => a.type === 'trait' && a.trait === id)
  const spellActs = legal.filter((a) => a.type === 'spell')
  const canEnd = legal.some((a) => a.type === 'endTurn')
  const canEvolve = legal.some((a) => a.type === 'evolve')
  const isAccel = !!state && state.activeKind === 'accel'
  const accelActs = legal.filter((a) => a.type === 'accelerate')
  const chooseActs = legal.filter((a) => a.type === 'choose') // 効果の対象を選ぶ場面(ファンファーレなど)
  const choosing = chooseActs.length > 0
  const modePicking = !!(state && state.pending && state.pending.modes) // 【モード】を選ぶ場面
  const confirming = !!(state && state.pending && state.pending.confirm) // 「使う/使わない」を選ぶ場面
  const selectableSet = choosing
    ? chooseActs.map((a) => a.target)
    : isAccel
    ? accelActs.map((a) => a.target).filter(Boolean)
    : mode ? traitActions(mode).map((a) => a.target).filter(Boolean) : skillTargets

  const [feed, setFeed] = useState([]) // 「いま起きたこと」の履歴(再生に合わせて増える)
  const [sideLog, setSideLog] = useState([]) // 左側のログ({ k, name, text, team })。最大 SIDE_LOG_MAX 個
  const pendingLog = useRef([]) // 能力の表示のあと、盤面に働くまで保留している左のログ
  const sideSeq = useRef(0)
  const dropSideLog = (k) => setSideLog((l) => l.filter((x) => x.k !== k))
  const [showDesc, setShowDesc] = useState(() => { try { return localStorage.getItem('feel-show-desc') === '1' } catch { return false } }) // 操作パネルの説明文を出すか
  const toggleDesc = () => { const v = !showDesc; setShowDesc(v); try { localStorage.setItem('feel-show-desc', v ? '1' : '0') } catch { /* 保存できなくても動く */ } }
  useSummonSlide() // 召喚物が消えたとき、隣のカードが一瞬で詰まらず、すっと滑って詰まる
  const [hist, setHist] = useState(emptyHistory) // バトルログの「発動」「破壊」の履歴
  const [logOpen, setLogOpen] = useState(false) // 戦闘実況のオーバーレイを開いている
  // キーボード: バトルログ(Tab)・ターン終了(Space)・攻撃(A)。ボタンが出ていて押せるときだけ働く(キーは、設定の「コンフィグ」で変えられる)
  const pressBtn = (testid) => { const b = document.querySelector(`[data-testid="${testid}"]`); if (!b || b.disabled) return false; b.click(); return true }
  // 操作パネルで盤面が隠れるときは、フィールドのユニット(カード)だけを小さくして、画面内に収める(スマホ・小さいPC。設定でオン・オフ。小さくするのは、最大で約半分まで)
  // 盤面ぜんたいを拡大縮小するのではなく、カードの大きさ(--fit)を変えるので、見出しや文字はそのまま。カードが小さくなったぶん、盤面の高さが縮む
  const fitOn = useRef(loadSettings().fitField !== false).current
  const FIT_MIN = 0.5
  const headRef = useRef(null), panelRef = useRef(null), boardRef = useRef(null)
  useEffect(() => {
    if (!fitOn) return undefined
    const calc = () => {
      const p = panelRef.current, b = boardRef.current
      if (!p || !b) return
      const heightAt = (v) => { b.style.setProperty('--fit', String(v)); return b.getBoundingClientRect().height }
      const top = b.getBoundingClientRect().top + window.scrollY
      const wrapBottom = desktop ? 28 : 12
      const avail = window.innerHeight - top - p.offsetHeight - wrapBottom - 8
      const full = heightAt(1)
      let s = 1
      if (full > avail) {
        const small = heightAt(FIT_MIN)
        s = full - small > 1 ? FIT_MIN + (1 - FIT_MIN) * ((avail - small) / (full - small)) : FIT_MIN // 高さは、カードの大きさにほぼ比例する
        s = Math.max(FIT_MIN, Math.min(1, s))
      }
      b.style.setProperty('--fit', String(Math.floor(s * 100) / 100))
    }
    calc()
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(calc) : null
    ;[headRef.current, panelRef.current].forEach((el) => el && ro && ro.observe(el))
    window.addEventListener('resize', calc)
    return () => { ro && ro.disconnect(); window.removeEventListener('resize', calc) }
  }, [fitOn, desktop, state])
  useHotkey('battle.menu', () => { if (!state || leaveAsk) return false; setMenuOpen(true); return true }) // Esc: バトルメニュー(開いている間の Esc は「バトルへ戻る」が受ける)
  useHotkey('battle.log', () => { if (!state) return false; setLogOpen((v) => !v) })
  useHotkey('battle.endTurn', () => pressBtn('end-turn'))
  useHotkey('battle.attack', () => pressBtn('attack-go'))
  useHotkey('battle.auto', () => pressBtn('hud-auto'))
  useHotkey('battle.field', () => { // カーソルをフィールドに移す(選んでいるカードがあればそこ、なければ相手の先頭)
    const cards = [...document.querySelectorAll('[data-field-card]')]
    const el = cards.find((c) => c.dataset.selected === '1') || cards[0]
    if (!el) return false
    el.focus(); el.scrollIntoView({ block: 'nearest' })
  })
  ;[1, 2, 3, 4].forEach((n) => useHotkey(`battle.trait${n}`, () => { // 特性を、上から順に使う
    const b = [...document.querySelectorAll('[data-trait-btn]')][n - 1]
    if (!b || b.disabled) return false
    b.click()
  }))

  // CPUの番になったら少し待ってから行動する(特性を使ったあとも番が続くので、何度か動く)
  useEffect(() => {
    if (online) return
    if (!state || state.winner || play || intro || leaveAsk || logOpen || menuOpen) return // バトルメニューを開いている間も止める。戦闘実況を開いている間も止める。再生が終わってから・ステージ説明などを閉じてから動く
    const current = getActiveUnit(state)
    if (!current || (current.team !== 'B' && !auto)) return // オート(∞)のときは、自分の番も進める
    const timer = setTimeout(() => {
      let action
      try {
        action = chooseAction(state, level)
      } catch (e) {
        // CPUの思考でエラーが起きても、ゲームが止まらないようにする(かんたんな行動に切り替え、原因を画面に出す)
        console.error(e)
        setCpuError(`CPUの思考でエラー: ${e.message}`)
        const acts = legalActions(state)
        action = acts.find((a) => a.type === 'skill') || acts.find((a) => a.type === 'endTurn') || acts[0]
      }
      try {
        commit(step(state, action))
      } catch (e) {
        console.error(e)
        setCpuError(`CPUの行動でエラー: ${e.message}`)
        commit(step(state, { type: 'endTurn' }))
      }
    }, cpuDelay)
    return () => clearTimeout(timer)
  }, [state, level, cpuDelay, play, intro, leaveAsk, logOpen, menuOpen, auto])

  // 再生に合わせて、「いま起きたこと」の履歴に1行ずつ足す
  useEffect(() => {
    if (!play || !state || play.i >= play.events.length) return
    const nm = (uid) => state.units.find((u) => u.uid === uid)?.name ?? ''
    const tm = (uid) => state.units.find((u) => u.uid === uid)?.team ?? null
    const lineOf = (e) => {
    let line = null
    if (e.type === 'turn') line = { team: e.team, text: `▶ ${e.team !== ME ? '相手の' : ''}${e.name}の番` }
    else if (e.type === 'damage') line = { team: tm(e.src), text: `${nm(e.src)}の${e.means || '攻撃'} → ${nm(e.target)}に ${e.amount} ダメージ${e.crit ? '(クリティカル!)' : ''}` }
    else if (e.type === 'block') line = { team: tm(e.src), text: `${nm(e.src)}の${e.means || '攻撃'} → ${nm(e.target)}のバリアが防いだ` }
    else if (e.type === 'heal') line = { team: tm(e.target), text: `${nm(e.target)}が ${e.amount} 回復` }
    else if (e.type === 'summon') line = { team: e.team, text: `${e.name}が登場` }
    else if (e.type === 'buff') line = { team: tm(e.target), text: `${nm(e.target)}の${e.text}` }
    else if (e.type === 'keyword') line = { team: tm(e.target), text: `${nm(e.target)}は【${e.label}】を得た` }
    else if (e.type === 'ability') line = { team: e.team, text: `${/^.+?【.+】$/.test(e.name || '') ? bracket(e.name) : `【${e.kind}】`}${e.owner}${e.name && !/^.+?【.+】$/.test(e.name) ? ` ― ${e.name}` : ''}${e.desc ? `：${e.desc}` : ''}` }
    return line
    }
    const lines = []
    for (let k = play.i; k <= groupEnd(play.events, play.i); k++) { const l = lineOf(play.events[k]); if (l) lines.push(l) }
    // 左のログは、その能力が盤面に実際に働くタイミング(能力のあとの、ダメージ・召喚・強化などが映るとき)に出す。
    // 能力の表示の瞬間には出さず、保留しておき、次の「働き」の出来事と一緒に出す。後ろに働きがなければ、そのまま出す
    const gEnd = groupEnd(play.events, play.i)
    let hasEffect = false
    for (let k = play.i; k <= gEnd; k++) {
      const e = play.events[k]
      if (e.type === 'ability') {
        if (e.kind !== '進化' && !e.nolog) pendingLog.current.push({ k: `sl${sideSeq.current++}`, name: e.kind === 'スペル' ? e.name : e.owner, text: e.log || e.desc || `【${e.kind}】${e.name ?? ''}`, team: e.team })
      } else hasEffect = true
    }
    const logs = hasEffect || (gEnd >= play.events.length - 1 && !(state && state.pending)) ? pendingLog.current.splice(0) : [] // 対象を選ぶ能力(選択式)は、選んで効果が働くまで、ログを保留したままにする
    if (logs.length) setSideLog((l) => [...l, ...logs].slice(-SIDE_LOG_MAX))
    if (lines.length) setFeed((f) => [...f, ...lines.map((line, n) => ({ k: `${Date.now()}-${f.length}-${play.i}-${n}`, ...line }))].slice(-8))
  }, [play && play.events, play && play.i]) // eslint-disable-line react-hooks/exhaustive-deps

  // 再生を1つずつ進める
  useEffect(() => {
    if (!play || logOpen) return // 戦闘実況を開いている間は、再生を止める
    if (play.i >= play.events.length) { setPlay(null); return }
    const grp = play.events.slice(play.i, groupEnd(play.events, play.i) + 1)
    const t = setTimeout(() => setPlay((p) => (p ? { ...p, i: groupEnd(p.events, p.i) + 1 } : p)), Math.max(...grp.map((x) => (x.type === 'vanish' ? EVENT_MS.vanish : (EVENT_MS[x.type] ?? 500) * mult))))
    return () => clearTimeout(t)
  }, [play, mult, logOpen])

  // 対戦が終わって再生も終わったら、キャリア(アカウントの対戦記録)に残す
  useEffect(() => {
    if (online) return
    if (!state || !state.winner || play || savedRef.current === state) return
    savedRef.current = state
    // ログイン中なら、アカウントに記録する(失敗しても対戦には影響しない)
    try {
      if (rewardApi && typeof rewardApi.record === 'function') {
        setCareerMsg('戦績を記録しています…')
        Promise.resolve(rewardApi.record(buildMatch(state, level, statsRef.current, namesRef.current)))
          .then(() => setCareerMsg('戦績を記録しました(キャリアで見られます)'))
          .catch((e) => { console.error('キャリアの記録に失敗', e); setCareerMsg(`戦績を記録できませんでした: ${e.message}`) })
      } else {
        setCareerMsg(testInit ? 'テスト戦なので、戦績は記録されません' : 'ログインしていないので、戦績は記録されません')
      }
    } catch (e) {
      console.error('キャリアの記録に失敗', e)
    }
  }, [state, play, level, rewardApi])

  // 対戦が終わったら、サーバーに結果を送って報酬をもらう(1つの対戦券につき1回だけ)
  useEffect(() => {
    if (!state || !state.winner || !rewardApi || !ticketId) return
    const id = ticketId
    setTicketId(null)
    setRewardMsg('報酬を確認しています…')
    rewardApi
      .finish(id, state.winner === ME ? 'win' : 'lose')
      .then((r) => setRewardMsg(r.reward > 0 ? `報酬 +${r.reward} 交易石` : r.reason || '報酬はありません'))
      .catch((e) => setRewardMsg(`報酬を受け取れませんでした: ${e.message}`))
  }, [state, rewardApi, ticketId])

  // 新しい状態にする。起きたことの記録があれば、1つずつ再生する
  const commit = (next) => {
    try { const d = collectHistory(state, next); setHist((h) => addHistory(h, d)) } catch (e) { console.error('バトルログの集計に失敗', e) } // 失敗しても、対戦は止めない
    try { addEvents(statsRef.current, next.events || [], (uid) => next.units.find((u) => u.uid === uid)) } catch (e) { console.error('キャリアの集計に失敗', e) } // 記録が失敗しても、対戦は止めない
    const evs = reorderBoost(next.events || [])
    setPlay(evs.length ? { events: evs, i: 0, prevActive: state?.active ?? null, prevAbility: state?.lastAbility ?? null } : null)
    setState(next)
  }
  const reset = () => {
    setSelected(null)
    setMode(null)
  }
  // 行動のあとは、選んでいた対象(相手など)をそのまま残す。ターンをまたいでも保持し、自分の番で選べなくなっていたら消す(下の useEffect)
  // 所持キャラクター(「所持キャラから召喚する」能力の候補)。いまはガチャの所持データとはつないでいないので、実装済みの本実装キャラ全員を所持とみなす
  const ownedPool = (cpuMode) => {
    const real = ALL_CHARACTERS.filter((c) => !isTestChar(c))
    return { A: real, B: cpuMode === 'real' ? real : ALL_CHARACTERS.filter(isTestChar) }
  }
  const startBattle = () => {
    reset()
    setAuto(false)
    setInspect(null)
    setCpuError('')
    setRewardMsg('')
    setCareerMsg('')
    setTicketId(null)
    setResultShown(true)
    setLeaveAsk(false)
    setIntro(true) // 対戦の始まりに、ステージ説明を出す
    setIntroFirst(true)
    if (rewardApi) {
      rewardApi
        .start(level)
        .then((r) => setTicketId(r.ticketId))
        .catch((e) => setRewardMsg(`この対戦では報酬がもらえません: ${e.message}`))
    }
    setPlay(null)
    setFeed([])
    setSideLog([])
    const cpuTeam = testInit ? testInit.team : buildCpuTeam(ALL_CHARACTERS, cpuChars, Math.random, level, ALL_SPELLS) // Lv.5以上は、シナジーのある編成。テスト戦は、自分で選んだ相手のチーム
    const cpuSpells = testInit ? testInit.spells : level >= SPELL_LEVEL ? buildCpuSpells(ALL_SPELLS, cpuTeam, Math.random, level) : [] // Lv.5以上のCPUは、編成に合う強いスペルを持つ
    const first = createBattle(team.map((d) => enhanceDef(withRelicPieces(d))), cpuTeam, { pool: ownedPool(cpuChars), spells: { A: spellSet, B: cpuSpells } })
    statsRef.current = newStats()
    const firstActor = first.units.find((u) => u.uid === first.active)
    if (firstActor) statsRef.current.turns[firstActor.team]++ // 最初のターンも数える
    savedRef.current = null
    const mains = (t) => first.units.filter((u) => u.team === t && u.field === 'main' && !u.isAmulet).map((u) => u.name)
    namesRef.current = { A: mains('A'), B: mains('B') }
    try { setHist(collectHistory(null, first)) } catch (e) { console.error(e); setHist(emptyHistory()) }
    setLogOpen(false)
    setState(first)
  }
  // 案内所 → CPU戦 → チーム を通って来たときは、開いたらすぐ対戦を始める
  const autoRef = useRef(false)
  useEffect(() => {
    if (online) {
      if (!autoRef.current) { autoRef.current = true; statsRef.current = newStats(); try { setHist(collectHistory(null, online.init)) } catch (e) { console.error(e); setHist(emptyHistory()) }; namesRef.current = { A: [], B: [] } }
      return
    }
    if (flow && !autoRef.current) { autoRef.current = true; startBattle() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const act = (action) => {
    setMode(null) // 相手の選択(selected)は残す。味方を選んでいたとき(特性など)は消す(次の攻撃のボタンが押せなくならないように)
    if (selected && state?.units.find((u) => u.uid === selected)?.team === ME) setSelected(null)
    if (action.type !== 'choose' || action.target === 'no') pendingLog.current = [] // 選ばなかった(使わない・ほかの行動)なら、保留中のログは捨てる
    if (online) { if (waitingSend) return; setWaitingSend(true); online.client.action(action); return }
    commit(step(state, action))
  }
  // ---- 対人戦: サーバーからの知らせ ----
  useEffect(() => {
    if (!online) return
    return online.client.on((m) => {
      if (m.type === 'update' || m.type === 'end' || (m.type === 'start' && m.resume)) setInbox((q) => [...q, m])
      else if (m.type === 'rank') setRankInfo(m)
      else if (m.type === 'opp-offline') setOppOffline(true)
      else if (m.type === 'opp-online') setOppOffline(false)
      else if (m.type === 'offline') setNetMsg('通信が切れました。つなぎ直しています…')
      else if (m.type === 'online') setNetMsg('')
      else if (m.type === 'error') { setWaitingSend(false); setNetMsg(m.message || '通信エラー') }
      else if (m.type === 'closed') setNetMsg(m.reason || '部屋が閉じられました')
    })
  }, [online])
  // 届いた知らせを、再生が終わってから順に反映する
  useEffect(() => {
    if (!online || !inbox.length || play) return
    const [m, ...rest] = inbox
    setInbox(rest)
    if (m.type === 'end') {
      setEndInfo({ winner: m.winner, reason: m.reason })
      if (m.state && m.state.seq !== undefined) { /* 予約 */ }
      if (m.state && (!state || m.state.turns !== state.turns || m.state.winner !== state.winner)) commit(m.state)
      else setState((st) => (st && !st.winner ? { ...st, winner: m.winner, events: [] } : st))
      setWaitingSend(false); setDeadlineAt(null)
      return
    }
    if (m.seq !== undefined && lastSeq.current >= m.seq && !m.resume) return
    lastSeq.current = m.seq ?? lastSeq.current
    setWaitingSend(false)
    setNetMsg('')
    setOppOffline(false)
    setDeadlineAt(m.left != null ? Date.now() + m.left : null)
    if (m.type === 'start') { setPlay(null); setState(m.state); return } // 再接続: 続きの状態にそろえる(演出は出さない)
    commit(m.state)
  }, [inbox, play]) // eslint-disable-line react-hooks/exhaustive-deps
  const lastSeq = useRef(-1)
  // 手番の残り時間の表示(秒)
  useEffect(() => {
    if (!online || deadlineAt == null) return
    const id = setInterval(() => setTick((x) => x + 1), 250)
    return () => clearInterval(id)
  }, [online, deadlineAt])
  const leftSec = online && deadlineAt != null && state && !state.winner ? Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000)) : null
  const handleTrait = (trait) => {
    const acts = traitActions(trait.id)
    if (!acts.length) return
    if (acts.every((a) => a.target == null)) return act(acts[0]) // 対象を選ばない特性はすぐ使う
    setSelected(null)
    setMode(mode === trait.id ? null : trait.id)
  }
  const handleConfirm = () => {
    if (!selected || !selectableSet.includes(selected)) return
    act(mode ? { type: 'trait', trait: mode, target: selected } : { type: 'skill', target: selected })
  }
  const handleAccel = () => {
    if (!accelActs.length) return
    if (accelActs.every((a) => a.target == null)) return act(accelActs[0])
    if (selected) act({ type: 'accelerate', trait: actor.accel.id, target: selected })
  }
  // キーボードでカーソルを合わせたカードは、自動で選ぶ(確定は押さない: 対象を選ぶ場面では、Enterで決める)
  const handleFocus = (u) => {
    if (!u.alive || choosing || !document.documentElement.classList.contains('feel-kb')) return
    if (selected === u.uid && inspect === u.uid) return
    setSelected(u.uid)
    setInspect(u.uid)
  }
  const handleCard = (u) => {
    if (playerTurn && choosing && selectableSet.includes(u.uid)) {
      act({ type: 'choose', target: u.uid }) // 選んだらすぐに効果が働く
      return
    }
    if (playerTurn && selectableSet.includes(u.uid)) {
      setSelected(u.uid)
      setInspect(u.uid)
    } else if (u.team !== ME && u.alive && !choosing) {
      setSelected(u.uid) // 相手の番・再生中・スキルを使えない番でも、相手を選んでおける(選んだままターンをまたぐ)
      setInspect(u.uid)
    } else {
      setInspect(inspect === u.uid ? null : u.uid)
    }
  }

  const wrap = desktop
    ? { maxWidth: 1100, margin: '0 auto', padding: '28px 32px', minHeight: '100vh', boxSizing: 'border-box', background: C.paper, color: C.ink, fontFamily: FONT }
    : { maxWidth: 520, margin: '0 auto', padding: 12, paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', minHeight: '100vh', boxSizing: 'border-box', background: C.paper, color: C.ink, fontFamily: FONT }

  // ---- 編成画面 ----
  if (!team) {
    return (
      <FormationScreen
        allChars={ALL_CHARACTERS}
        defaultIds={DEFAULT_PLAYER_IDS}
        allSpells={ALL_SPELLS.filter((sp) => !sp.token)}
        parties={partyApi ? partyApi.parties : null}
        partyIdxInit={partyApi ? partyApi.activeIdx : null}
        onSaveParty={partyApi ? partyApi.save : null}
        onPartyChange={partyApi ? partyApi.setActive : null}
        onStart={(chars, spells) => { setTeam(chars); setSpellSet(spells || []) }}
        onExit={onExit}
      />
    )
  }

  // ---- 開始前: CPUの強さを選ぶ ----
  if (flow && !state) return <div style={{ minHeight: '100vh', background: C.paper }} />
  if (!state) {
    return (
      <div style={wrap}>
        <h2 style={{ margin: '4px 0 12px', fontSize: desktop ? 28 : 22 }}>CPU対戦</h2>
        <p style={{ margin: '0 0 8px', fontSize: desktop ? 15 : 13 }}>CPUの強さを選んでください</p>
        <div style={desktop ? { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginBottom: 6 } : undefined}>
        {CPU_LEVELS.map((l) => (
          <button
            key={l.level}
            onClick={() => setLevel(l.level)}
            style={{
              display: 'block', width: '100%', textAlign: 'left', marginBottom: 6, padding: '10px 12px', borderRadius: 8,
              fontFamily: FONT, cursor: 'pointer', color: C.ink,
              border: `2px solid ${level === l.level ? C.player : C.line}`,
              background: level === l.level ? C.soft : C.card,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 14 }}>{l.name}</div>
            <div style={{ fontSize: 12, color: C.mute }}>{l.description}</div>
          </button>
        ))}
        </div>
        <p style={{ fontSize: 12, color: C.mute, margin: '8px 0 4px' }}>編成: {team.map((c, i) => `${i + 1}.${c.name}`).join(' → ')}</p>
        <p style={{ fontSize: 12, color: C.mute, margin: '0 0 4px' }}>スペル: {spellSet.length ? spellSet.map((sp) => sp.name).join(' / ') : 'なし'}</p>
        <p style={{ fontSize: 11, color: C.mute, margin: '0 0 4px' }}>
          {cpuChars === 'real' ? 'CPUは本実装キャラ(クラスは毎回ランダム)で対戦します。' : 'CPUはテスト用の仮キャラで対戦します。'}
        </p>
        <details style={{ margin: '0 0 8px', fontSize: 12 }}>
          <summary style={{ cursor: 'pointer', color: C.mute }}>開発者設定</summary>
          <div style={{ marginTop: 6 }}>
            <div style={{ marginBottom: 4 }}>CPUが使うキャラ</div>
            {[['test', 'テストキャラ'], ['real', '本実装キャラ']].map(([v, label]) => (
              <button
                key={v}
                onClick={() => { setCpuChars(v); saveCpuCharSetting(v) }}
                style={{ ...buttonStyle(cpuChars === v, false), marginRight: 6 }}
              >
                {label}
              </button>
            ))}
          </div>
        </details>
        <p style={{ fontSize: 11, color: C.mute, margin: '0 0 12px' }}>
          {testInit ? 'テスト戦(検証用): 報酬・戦績は記録されません。' : rewardApi ? '勝利すると報酬(交易石)がもらえます。' : 'ログインして対戦すると、勝利で報酬がもらえます。'}
        </p>
        <button onClick={startBattle} style={buttonStyle(true, false)}>バトル開始</button>{' '}
        <button onClick={() => setTeam(null)} style={buttonStyle(false, false)}>編成を変える</button>{' '}
        <button onClick={onExit} style={buttonStyle(false, false)}>戻る</button>
      </div>
    )
  }

  // ---- バトル中 ----
  // 再生中は、その時点の盤面(体力・状態)と、その時点までのログを見せる
  let view = state
  let ev = null
  let gStart = 0
  let gEnd = 0
  if (play) {
    gStart = Math.min(play.i, play.events.length - 1)
    gEnd = groupEnd(play.events, gStart)
    ev = play.events[gEnd] // まとまった出来事は、最後の時点の盤面を見せる(体力の変化が一気に出る)
    let active = play.prevActive
    let lastAbility = play.prevAbility
    for (let k = 0; k <= gEnd && k < play.events.length; k++) {
      const e = play.events[k]
      if (e.type === 'turn') active = e.uid
      if (e.type === 'ability') lastAbility = { seq: k, kind: e.kind, owner: e.owner, name: e.name, desc: e.desc, team: e.team }
    }
    view = {
      ...state,
      units: state.units.filter((u) => ev.units[u.uid]).map((u) => {
        const sn = ev.units[u.uid]
        return { ...u, ...sn, accel: u.accel && sn.accelAV != null ? { ...u.accel, curAV: sn.accelAV } : u.accel }
      }),
      round: ev.round ?? state.round,
      totalAV: ev.totalAV ?? state.totalAV,
      comboReset: ev.comboReset ?? state.comboReset,
      crests: ev.crestSlots ? Object.fromEntries(['A', 'B'].map((t) => [t, (state.crests?.[t] || []).map((c, ci) => ({ ...c, ...(ev.crestSlots[t][ci] || {}) }))])) : state.crests,
      log: state.log.slice(0, ev.logLen),
      mp: { ...state.mp, ...ev.mp }, ep: { ...state.ep, ...ev.ep }, comboCount: { ...state.comboCount, ...ev.comboCount },
      winner: null, active, lastAbility,
    }
  }
  const groupEvs = play ? play.events.slice(gStart, gEnd + 1) : []
  const avFx = (() => { const m = {}; for (const x of groupEvs) if (x.type === 'av') m[x.target] = { dir: x.dir }; return Object.keys(m).length ? { ...m, tick: play ? play.i : 0 } : null })() // 行動順の上昇・下降: アクションバーの該当ユニットに出す
  const fxFor0 = (uid) => {
    const mine = groupEvs.filter((x) => x.target === uid) // まとまった出来事の中から、この人に起きたものを探す
    const dieEv = mine.find((x) => x.type === 'destroy' || x.type === 'vanish') // 倒れる・消える演出は、ダメージの表示と重ねる
    const ev = [...mine].reverse().find((x) => x.type !== 'destroy' && x.type !== 'vanish') || mine[mine.length - 1]
    if (!ev) return null
    if (ev.type === 'damage') {
      // スキルのダメージと、【必殺】の追加ダメージは、数字を2段に分けて1回で見せる(種類で色が変わる: 物理=白 / 魔法=青 / 確定=虹)
      const dmgs = mine.filter((x) => x.type === 'damage')
      const main = dmgs.filter((x) => x.means !== '必殺')
      const fin = dmgs.filter((x) => x.means === '必殺')
      const crit = main.some((x) => x.crit)
      const parts = []
      if (main.length) parts.push({ text: `${main.reduce((a, x) => a + x.amount, 0)}${crit ? '!!' : ''}`, dmgType: main[0].dmgType || 'physical' })
      if (fin.length) parts.push({ text: `必殺 ${fin.reduce((a, x) => a + x.amount, 0)}`, dmgType: 'true' })
      return { kind: 'damage', text: parts.map((x) => x.text).join(' '), crit, parts }
    }
    if (ev.type === 'buff') { // 強化: ステータスは文字ではなくアイコンで見せる(アイコンがないステータスだけ、文字のまま)
      const bs = mine.filter((x) => x.type === 'buff')
      return { kind: 'buff', text: bs.map((x) => `${x.text}↑`).join(' '), buffs: bs.map((x) => ({ stat: x.stat, label: String(x.text).split(' ')[0], val: String(x.text).split(' ').slice(1).join(' ') })) }
    }
    if (ev.type === 'keyword') return { kind: 'keyword', text: mine.filter((x) => x.type === 'keyword').map((x) => `【${x.label}】`).join('') + '獲得' } // 能力付与
    if (ev.type === 'evolve') return { kind: 'evolve', text: '' } // 進化: 光の柱・光の輪・舞い上がる光
    if (ev.type === 'destroy') return { kind: 'destroy', text: '', grave: !!ev.grave, lw: !!ev.lw } // 破壊: 砕け散る
    if (ev.type === 'vanish') return { kind: 'vanish', text: '' } // 消滅: 青い光になって、円の中心へ収束して消える
    if (ev.type === 'heal') return { kind: 'heal', text: `+${ev.amount}` }
    if (ev.type === 'summon') return { kind: 'summon', text: '登場!' }
    if (ev.type === 'block') return { kind: 'block', text: '' }
    return null
  }
  const fxFor = (uid) => {
    const mine = groupEvs.filter((x) => x.target === uid)
    const dieEv = mine.find((x) => x.type === 'destroy' || x.type === 'vanish')
    const f = fxFor0(uid)
    return dieEv ? { ...(f && f.kind !== 'destroy' && f.kind !== 'vanish' ? f : { kind: 'none', text: '' }), die: dieEv.type, grave: !!dieEv.grave, lw: !!dieEv.lw } : f
  }
  // 攻撃した側・受けた側の印(まとまった出来事の全員ぶん)。全体攻撃なら、攻撃側1体と、受ける側が全員
  const attackerIds = new Set(); const targetIds = new Map()
  for (const x of groupEvs) {
    if ((x.type === 'damage' || x.type === 'block' || x.type === 'attack') && x.src && x.target && x.src !== x.target) {
      attackerIds.add(x.src)
      if (x.type === 'attack') continue // 攻撃の宣言の時点では、まだ当たっていない(エフェクトは、ダメージ・ガードのときの1回だけ)
      if (x.type === 'block') continue; else if (targetIds.get(x.target) !== 'guard') targetIds.set(x.target, 'target')
    }
  }
  const roleFor = (uid) => (attackerIds.has(uid) ? 'attacker' : targetIds.get(uid) || null)
  const hlFor = (uid) => !!ev && ev.type === 'attack' && (ev.src === uid || ev.target === uid)
  const levelInfo = CPU_LEVELS.find((l) => l.level === level)
  const enemies = view.units.filter((u) => u.team !== ME && u.field === 'main')
  const players = view.units.filter((u) => u.team === ME && u.field === 'main')
  // 破壊・消滅する召喚物は、その演出が終わるまで盤面に残す(演出の前に消えないように)
  const dyingUids = new Set(play ? play.events.slice(gStart).filter((x) => x.type === 'destroy' || x.type === 'vanish').map((x) => x.target) : [])
  const shown = (u) => u.field === 'summon' && (u.alive || dyingUids.has(u.uid))
  const enemySummons = view.units.filter((u) => u.team !== ME && shown(u))
  const playerSummons = view.units.filter((u) => u.team === ME && shown(u))
  const summonCards = (list) => (list.length ? list.map(card) : <div aria-hidden="true" style={{ gridColumn: '1 / -1', height: desktop ? 112 : 106, minHeight: desktop ? 112 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: `1px dashed ${C.line}`, color: C.mute, fontSize: 11, opacity: 0.6 }}>召喚物なし</div>) // 召喚物がいなくても場所は空けておく(画面が動かないように)
  const resultText = state.winner === ME ? '勝利!' : state.winner === 'A' || state.winner === 'B' ? '敗北…' : '引き分け'
  const inspected = inspect && inspect !== selected ? getUnit(state, inspect) : null // 選択中の相手は、操作パネルに詳しく出すので、ここでは重ねて出さない
  const modeTrait = mode ? actor.traits.find((t) => t.id === mode) : null
  const selectedUnit = selected ? getUnit(state, selected) : null // いつでも(相手の番でも)選んでおける
  let expectedDmg = null
  if (selectedUnit && !mode && !isAccel && skillTargets.includes(selected)) {
    try { expectedDmg = calcDamage(actor, selectedUnit, actor.skill, { expected: true, bySkill: true }).damage } catch { expectedDmg = null }
  }

  const lossShown = selectedUnit && expectedDmg != null ? hpLossOf(selectedUnit, expectedDmg, actor.skill.type === 'true') : 0

  const card = (u) => (
    <UnitCard
      key={u.uid}
      unit={u}
      active={u.uid === view.active}
      fx={fxFor(u.uid)}
      hl={hlFor(u.uid)}
      role={roleFor(u.uid)}
      tick={play ? play.i : 0}
      loss={u.uid === selected ? lossShown : 0}
      selected={u.uid === selected}
      selectable={playerTurn && selectableSet.includes(u.uid)}
      inspected={u.uid === inspect}
      onClick={() => handleCard(u)}
      onFocusCard={() => handleFocus(u)}
      big={desktop}
    />
  )

  // 操作パネル(スキル・特性・スペル・進化・ターン終了など)。PCは右側、スマホは画面の下に固定
  // 「レベルを選ぶ / 強さを選び直す」。下の panelInner より前に置く(あとに置くと、勝敗がついた画面で「初期化する前に使っている」エラーになる)
  const backLevel = () => { if (flow) (onBackLevel || onExit)(); else setState(null) }
  // スペル: 場の下の空いているところに出す(自分の番のとき)
  const spellsBlock = state.spells[ME].length > 0 && !state.winner && !playing && !cpuTurn && !choosing && !isAccel && (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11, color: C.mute, marginBottom: 4 }}>スペル(MPを使う・1枠につき1回・行動は消えません)</div>
      {state.spells[ME].map((sp) => {
        const usable = spellActs.some((a) => a.spell === sp.slot)
        const why = sp.used ? '使用済み' : state.mp[ME] < sp.cost ? 'MP不足' : '使えません'
        return (
          <div key={sp.slot} style={{ marginBottom: 4 }}>
            <button
              onClick={() => act({ type: 'spell', spell: sp.slot })}
              disabled={!usable}
              style={{ ...buttonStyle(false, !usable), padding: '6px 10px', fontSize: 13 }}
            >
              ✦{sp.name}(MP{sp.cost}){!usable ? ` ${why}` : ''}
            </button>
            {showDesc && <span style={{ fontSize: 11, color: C.mute, ...(desktop ? null : { display: 'block', marginTop: 2 }) }}> {sp.desc}</span>}
          </div>
        )
      })}
    </div>
  )
  // 選択したユニットの性能メモ: 左上か右上。選んだユニットと重ならない側に出す
  // 性能メモは常に1つだけ。最後にタップしたユニット(なければ選択中のユニット)のものを出す
  const infoUnit = (inspect && getUnit(state, inspect)) || selectedUnit
  const selInfo = infoUnit && (
    <SelInfoPanel uid={infoUnit.uid} big={desktop}>
      {infoUnit.uid === selected
        ? <TargetInfo unit={infoUnit} expected={expectedDmg} loss={lossShown} big={desktop} />
        : <InspectBox unit={infoUnit} big={desktop} />}
    </SelInfoPanel>
  )
  const panelInner = (
    <>
      <div style={{ textAlign: 'right', marginBottom: 4 }}><button type="button" data-testid="toggle-desc" onClick={toggleDesc} style={{ border: `1px solid ${C.line}`, background: 'transparent', color: C.mute, borderRadius: 999, padding: '1px 10px', fontSize: 11, cursor: 'pointer' }}>{showDesc ? '説明を隠す' : '説明を見る'}</button></div>
        {state.winner && !playing ? (
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{resultText}</div>
            {rewardMsg && <div style={{ fontSize: 13, color: C.player, marginBottom: 8 }}>{rewardMsg}</div>}
            {careerMsg && <div data-testid="career-msg" style={{ fontSize: 12, color: careerMsg.includes('できませんでした') ? C.bad : C.mute, marginBottom: 8 }}>{careerMsg}</div>}
            <button onClick={startBattle} style={buttonStyle(true, false)}>もう一度</button>{' '}
            <button onClick={backLevel} style={buttonStyle(false, false)}>{flow ? 'レベルを選ぶ' : '強さを選び直す'}</button>
          </div>
        ) : playing ? (
          <div style={{ fontSize: 13, color: C.mute }}>動きを再生中…</div>
        ) : cpuTurn ? (
          <div style={{ fontSize: 13, color: C.mute }}>{actor.name}(相手)が考えています…</div>
        ) : choosing && modePicking ? (
          <div>
            <div style={{ fontSize: 13, marginBottom: 6 }}>{state.pending.mpPick ? `【${actor.name}】` : '【モード】'}{state.pending.prompt}</div>
            <div style={state.pending.mpPick ? { display: 'flex', flexWrap: 'wrap', gap: 6 } : { display: 'flex', flexDirection: 'column', gap: 6 }}>
              {state.pending.modes.map((m, i) => (
                <button key={i} onClick={() => act({ type: 'choose', target: `mode${i}` })} style={{ ...buttonStyle(true, false), textAlign: 'left' }}>
                  {state.pending.mpPick ? `${m.name}${m.desc ? `(${m.desc})` : ''}` : `(${i + 1}) ${m.name}${m.desc ? ` — ${m.desc}` : ''}`}
                </button>
              ))}
            </div>
          </div>
        ) : choosing && confirming ? (
          <div>
            <div style={{ fontSize: 13, marginBottom: 6 }}>
              <b>{actor.name}</b> の効果: {state.pending.prompt}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => act({ type: 'choose', target: 'yes' })} style={buttonStyle(true, false)}>使う</button>
              <button onClick={() => act({ type: 'choose', target: 'no' })} style={buttonStyle(false, false)}>使わない</button>
            </div>
          </div>
        ) : choosing ? (
          <div style={desktop ? undefined : { display: 'contents' }}>
            <div style={{ fontSize: 13, marginBottom: 6 }}>
              <b>{actor.name}</b> の効果: 対象を選んでください
            </div>
            <div style={{ fontSize: 12, color: C.mute }}>
              {state.pending && state.pending.effects.some((e) => e.type === 'reenter')
                ? '選んだ味方が入場し直します(次のターンの開始時にファンファーレがもう一度働き、そのターンはスキル攻撃ができません)。'
                : '光っている枠のキャラをタップしてください。'}
            </div>
          </div>
        ) : isAccel ? (
          <div>
            <div style={{ fontSize: 13, marginBottom: 6 }}>
              <b>{actor.name}</b> の【アクセラレート_{actor.accel.speed}】の番です
            </div>
            <div style={{ fontSize: 12, color: C.mute, marginBottom: 6 }}>
              {actor.accel.name}(MP{actor.accel.cost ?? 0}): {actor.accel.desc} 実行すると本体の番を消費します。見送ると、本体の番はそのままです。
            </div>
            <div style={{ fontSize: 12, color: C.mute, marginBottom: 8 }}>
              {accelActs.length === 0
                ? 'MPが足りないなど、いまは実行できません'
                : accelActs.every((a) => a.target == null)
                  ? ''
                  : selected
                    ? `対象: ${getUnit(state, selected)?.name}`
                    : '対象をタップ(光っているキャラ)'}
            </div>
            {accelActs.length > 0 && (
              <button
                onClick={handleAccel}
                disabled={!accelActs.every((a) => a.target == null) && !selected}
                style={buttonStyle(true, !accelActs.every((a) => a.target == null) && !selected)}
              >
                実行する
              </button>
            )}{' '}
            <button onClick={() => act({ type: 'endTurn' })} style={buttonStyle(false, false)}>見送る</button>
          </div>
        ) : (
          <div style={desktop ? undefined : { display: 'contents' }}>
            <div style={{ fontSize: 13, marginBottom: 6 }}>
              <b>{actor.name}</b> の番: スキル「{actor.skill.name}」({TYPE_LABEL[actor.skill.type]}){actor.doubleSkill ? ` ・1ターンに2回(2回目はMP${actor.doubleSkill.mpCost})${(actor.skillsThisTurn || 0) >= 1 ? ' ・1回目は済み' : ''}` : ''}
            </div>

            {actor.traits.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: C.mute, marginBottom: 4 }}>特性(MPを使う。使ってもターンは続きます)</div>
                {actor.traits.map((t) => {
                  const usable = traitActions(t.id).length > 0
                  const why = t.charges != null && t.charges <= 0 ? '回数切れ' : !t.repeatable && actor.usedTraits.includes(t.id) ? '使用済み' : state.mp[ME] < t.cost ? 'MP不足' : t.condition ? '条件未達' : '対象なし'
                  return (
                    <div key={t.id} style={{ marginBottom: 4 }}>
                      <button
                        data-trait-btn="1"
                        onClick={() => handleTrait(t)}
                        disabled={!usable}
                        style={{ ...buttonStyle(mode === t.id, !usable), padding: '6px 10px', fontSize: 13 }}
                      >
                        {t.name}(MP{t.cost}{t.charges != null ? `・残り${t.charges}回` : ''}){!usable ? ` ${why}` : ''}
                      </button>
                      {showDesc && <span style={{ fontSize: 11, color: C.mute, ...(desktop ? null : { display: 'block', marginTop: 2 }) }}> {t.desc}</span>}
                    </div>
                  )
                })}
              </div>
            )}

            {(actor.evolvable || actor.evolved) && (
              <div style={{ marginBottom: 8 }}>
                <button
                  onClick={() => act({ type: 'evolve' })}
                  disabled={!canEvolve}
                  style={{ ...buttonStyle(false, !canEvolve), padding: '6px 10px', fontSize: 13 }}
                >
                  進化(EP1){!canEvolve ? ` ${actor.evolved ? '進化済み' : state.ep[ME] < 1 ? 'EPなし' : ''}` : ''}
                </button>
                {showDesc && <span style={{ fontSize: 11, color: C.mute, ...(desktop ? null : { display: 'block', marginTop: 2 }) }}> 攻撃力・体力+200。進化したターンからスキルを使える</span>}
              </div>
            )}

            <div style={{ fontSize: 12, color: C.mute, marginBottom: 8 }}>
              {mode
                ? selected
                  ? `対象: ${getUnit(state, selected)?.name}`
                  : `【${modeTrait?.name}】の対象をタップ(光っているキャラ)`
                : skillTargets.length === 0
                  ? '入場直後など、いまはスキルを使えません'
                  : selected
                    ? `対象: ${getUnit(state, selected)?.name}`
                    : '上の「相手」から攻撃する相手をタップ'}
            </div>

            <div style={desktop ? undefined : { position: 'sticky', bottom: -10, background: C.card, padding: '6px 0 2px', marginTop: 4 }}>
            {(mode || skillTargets.length > 0) && (
              <button data-testid="attack-go" onClick={handleConfirm} disabled={!selected || !selectableSet.includes(selected)} style={buttonStyle(true, !selected || !selectableSet.includes(selected))}>
                {mode ? `${modeTrait?.name}を使う` : '攻撃する'}
              </button>
            )}{' '}
            {mode && <button onClick={() => { setMode(null); setSelected(null) }} style={buttonStyle(false, false)}>やめる</button>}{' '}
            {canEnd && !mode && <button data-testid="end-turn" onClick={() => act({ type: 'endTurn' })} style={buttonStyle(skillTargets.length === 0, false)}>ターン終了</button>}
            </div>
          </div>
        )}
    </>
  )
  // 空いている所(カード・ボタン・性能メモ・操作バー以外)をタップすると、選択と性能メモを消す
  const dismissInfo = (e) => {
    if (e.target.closest('[data-uid], button, a, input, select, label, [data-testid="sel-info"], [data-keep], [role="dialog"]')) return
    if (selected) setSelected(null)
    if (inspect) setInspect(null)
  }
  const speedBar = null // スキップボタンは廃止(再生の速さは設定で決める)
  const nameOf = (uid) => state.units.find((u) => u.uid === uid)?.name ?? ''
  const nowText = !ev ? '' : ev.type === 'damage' ? `⚔ ${nameOf(ev.src)}の${ev.means || '攻撃'}!${nameOf(ev.target)}に${ev.amount}ダメージ${ev.crit ? '(クリティカル!)' : ''}` : ev.type === 'block' ? `⚔ ${nameOf(ev.src)}の${ev.means || '攻撃'}!${nameOf(ev.target)}のバリアが防いだ(0ダメージ)` : ev.type === 'turn' ? `${ev.team === 'B' ? '相手' : 'あなた'}のターン: ${ev.name}` : ''
  // 選んで働く能力(対象を選ぶファンファーレ・特性など)の、小さな情報パネル: 名前と、能力の文
  const abilNote = (() => {
    if (!state || state.winner || playing || cpuTurn) return null
    if (choosing && state.pending) {
      const pd = state.pending
      const src = getUnit(state, pd.uid)
      if (!src) return null
      if (pd.spell) return { unit: src, title: pd.spellName || 'スペル', text: pd.prompt || '対象を選んでください' }
      const p = pd.nextPassive != null ? src.passiveObjs?.[pd.nextPassive - 1] : null
      if (p) return { unit: src, text: passiveLine(p) }
      const e0 = JSON.stringify(pd.effects?.[0] ?? null)
      const t = (src.traits || []).find((x) => JSON.stringify(x.effects || []).includes(e0))
      if (t) return { unit: src, text: isEnhance(t) ? `【${t.name}】${enhanceBody(t)}` : `【特性 MP${t.cost}】${t.name}: ${t.desc ?? ''}` }
      return { unit: src, text: pd.prompt || '対象を選んでください' }
    }
    if (mode && actor && !isAccel) {
      const t = (actor.traits || []).find((x) => x.id === mode)
      if (t) return { unit: actor, text: isEnhance(t) ? `【${t.name}】${enhanceBody(t)}` : `【特性 MP${t.cost}${t.repeatable ? ' 連続使用可' : ''}】${t.name}: ${t.desc ?? ''}` }
    }
    return null
  })()
  const hud = <BattleHud view={view} level={level} levelInfo={levelInfo} desktop={desktop} onLeave={() => setLeaveAsk(true)} onIntro={online ? null : () => { setIntroFirst(false); setIntro(true) }} onCommentary={() => setLogOpen(true)} auto={auto} onAuto={online ? null : () => setAuto((v) => !v)} stage={online ? (online.ranked ? 'ランクマッチ' : 'カジュアルマッチ') : null} sub={online ? `vs ${online.opp || '相手'}${leftSec != null ? ` ・ 残り ${leftSec}秒` : ''}` : null} />
  const leave = () => { setLeaveAsk(false); if (online) { if (state && !state.winner) online.client.surrender(); online.client.leave(); onExit(); return } if (flow) onExit(); else setState(null) }
  const backTeam = () => { if (flow && onBackTeam) onBackTeam(); else setTeam(null) }
  const reasonText = { surrender: '相手が降参しました', forfeit: '相手の接続が戻らず、不戦勝になりました', disconnect: '相手の接続が戻りませんでした', timeout: '時間切れ' }
  const myWin = state.winner === ME
  const rankText = rankInfo ? `ランクポイント(BP) ${rankInfo.delta >= 0 ? '+' : ''}${rankInfo.delta}(合計 ${rankInfo.bp} BP ・ ${rankInfo.label})` : online && online.ranked && state.winner && state.winner !== 'draw' ? 'ランクポイントを計算しています…' : ''
  const onlineResultMsg = !online || !endInfo ? '' : (endInfo.reason === 'surrender' ? (myWin ? '相手が降参しました' : '降参しました') : endInfo.reason === 'forfeit' || endInfo.reason === 'disconnect' ? (myWin ? reasonText.forfeit : '接続が戻らず、負けになりました') : '') + (rankText ? `\n${rankText}` : '')
  const netBanner = online && !state.winner && (netMsg || oppOffline || (waitingSend && !playing))
    ? (netMsg || (oppOffline ? '相手の接続が切れています。戻るのを待っています…' : '送信中…'))
    : null
  const resultButtons = online ? [{ label: '退出', primary: true, onClick: () => { online.client.leave(); onExit() } }] : [
    { label: 'もう一度', primary: true, onClick: startBattle },
    { label: flow ? 'レベルを選ぶ' : '強さを選び直す', onClick: backLevel },
    { label: 'チームを変える', onClick: backTeam },
    { label: '退出', onClick: flow ? onExit : () => setState(null) },
  ]
  const overlays = (
    <>
      {netBanner && <div data-testid="pvp-net" style={{ position: 'fixed', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 200, padding: '6px 14px', borderRadius: 999, background: 'rgba(20,20,28,.88)', color: '#fff', fontSize: 13, pointerEvents: 'none' }}>{netBanner}</div>}
      {!online && intro && <StageIntro level={level} levelInfo={levelInfo} cpuChars={cpuChars} first={introFirst} onClose={() => { setIntro(false); setIntroFirst(false) }} />}
      {testInit && !online && <button type="button" data-testid="ghost-mode" onClick={() => setGhostMode(GHOST_NEXT[ghostMode] || 'none')} style={{ position: 'fixed', top: 3, right: 4, zIndex: 9500, background: ghostMode === 'none' ? 'rgba(0,0,0,0.75)' : 'rgba(120,70,200,0.9)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)', padding: '1px 6px', borderRadius: 6, fontSize: 9, lineHeight: 1.3, opacity: 0.85, cursor: 'pointer' }}>ゴースト:{GHOST_LABEL[ghostMode] || 'なし'}</button>}
      {testInit && probe && <div data-testid="fx-probe" style={{ position: 'fixed', top: 6, left: '50%', transform: 'translateX(-50%)', zIndex: 9500, background: 'rgba(0,0,0,0.8)', color: '#9ff', padding: '3px 10px', borderRadius: 6, fontSize: 12, pointerEvents: 'none' }}>{probe}</div>}
      {logOpen && <CommentaryOverlay units={view.units} active={view.active} round={view.round} log={view.log} ab={hist.ab} dead={hist.dead} events={hist.ev} onClose={() => setLogOpen(false)} />}
      {menuOpen && !settingsOpen && (
        <BattleMenu
          online={!!online}
          mode={online ? (online.ranked ? 'ランクマッチ' : 'カジュアルマッチ') : `CPU戦 Lv.${level ?? ''}`}
          me={{ name: '自分', units: players.map((u) => u.name) }}
          foe={{ name: online ? (online.opp || '相手') : (levelInfo?.name && !/^Lv\.\d+$/.test(levelInfo.name) ? levelInfo.name : `CPU Lv.${level ?? ''}`), units: enemies.map((u) => u.name) }}
          onResume={() => setMenuOpen(false)}
          onRetire={() => { setMenuOpen(false); setLeaveAsk(true) }}
          onSettings={settingsView ? () => setSettingsOpen(true) : null}
        />
      )}
      {settingsOpen && settingsView && createPortal(<div style={{ position: 'fixed', inset: 0, zIndex: 3100 }}>{settingsView(() => setSettingsOpen(false))}</div>, document.body)}
      {abilNote && <AbilityNote unit={abilNote.unit} title={abilNote.title} text={abilNote.text} big={desktop} />}
      {leaveAsk && <ExitConfirm onCancel={() => setLeaveAsk(false)} onExit={leave} online={!!online} />}
      {state.winner && !playing && resultShown && !intro && <ResultBanner winner={state.winner} message={online ? onlineResultMsg : rewardMsg} buttons={resultButtons} onDismiss={() => setResultShown(false)} />}
    </>
  )
  const errBox = cpuError && <div style={{ marginTop: 6, padding: 6, borderRadius: 6, background: C.dangerBg, color: C.hpLow, fontSize: 12 }}>{cpuError}</div>

  // ---- PC: 画面全体を使う(左=盤面、右=詳細・ログ・操作) ----
  if (desktop) {
    return (
      <div onClick={dismissInfo} style={{ height: '100vh', display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 24px 16px', background: C.paper, color: C.ink, fontFamily: FONT, boxSizing: 'border-box', overflow: 'hidden' }}>
        <SideLog items={sideLog} big onGone={dropSideLog} />
        {hud}
        {overlays}
        {speedBar}
        {errBox}
        <ActionBar state={view} big avFx={avFx} />
        {selInfo}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="no-sb" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: 8, width: '100%', maxWidth: 1100, margin: '0 auto', paddingRight: 4, boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Row big extra={<TeamStatus state={view} team={OPP()} big inline />} title="相手" color={C.enemy}>{enemies.map(card)}</Row>
              <Row big title="相手の召喚物" color={C.enemy}>{summonCards(enemySummons)}</Row>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Row big title="自分の召喚物" color={C.player}>{summonCards(playerSummons)}</Row>
              <Row big extra={<TeamStatus state={view} team={ME} big inline />} title="自分" color={C.player}>{players.map(card)}</Row>
            </div>
            {spellsBlock}
          </div>
          <div data-keep="1" className="no-sb" style={{ flex: '0 0 auto', maxHeight: '34vh', overflowY: 'auto', width: '100%', maxWidth: 1100, margin: '0 auto', boxSizing: 'border-box', padding: 14, borderRadius: 10, background: C.card, border: `1px solid ${C.line}`, fontSize: 14 }}>
            {panelInner}
          </div>
        </div>
      </div>
    )
  }

  // ---- スマホ: 1列。上に行動バーを固定、下に操作パネルを固定して、盤面をスクロールで見る ----
  return (
    <div style={{ ...wrap, display: 'flex', flexDirection: 'column', minHeight: '100dvh' }} onClick={dismissInfo}>{/* 内容が短くても、操作パネルを画面の下に付ける(下に黒い余白が出ないように) */}
      {selInfo}
      <SideLog items={sideLog} onGone={dropSideLog} />
      <div ref={headRef} style={{ position: 'sticky', top: 0, zIndex: 9, background: C.paper, margin: '-12px -12px 0', padding: '8px 12px 2px', borderBottom: `1px solid ${C.line}` }}>
        {hud}
        {overlays}
        <ActionBar state={view} avFx={avFx} />
      </div>

      {speedBar}
      {errBox}

      <div style={{ flex: 'none' }}>
        <div ref={boardRef} className="fit-board">
      <Row extra={<TeamStatus state={view} team={OPP()} inline />} title="相手" color={C.enemy}>{enemies.map(card)}</Row>
      <Row tight title="相手の召喚物" color={C.enemy}>{summonCards(enemySummons)}</Row>

      <Row tight title="自分の召喚物" color={C.player}>{summonCards(playerSummons)}</Row>
      <Row extra={<TeamStatus state={view} team={ME} inline />} title="自分" color={C.player}>{players.map(card)}</Row>
      {spellsBlock && <div style={{ marginTop: 8 }}>{spellsBlock}</div>}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 10 }} />
      <div ref={panelRef} data-keep="1" className="no-sb" style={{ position: 'sticky', bottom: 0, zIndex: 9, margin: '0 -12px', padding: '6px 12px calc(6px + env(safe-area-inset-bottom))', height: 'min(168px, 30vh)', boxSizing: 'border-box', overflowY: 'auto', background: C.card, borderTop: `2px solid ${C.line}`, boxShadow: '0 -4px 12px rgba(31,42,68,0.12)' }}>
        {panelInner}
      </div>
    </div>
  )
}
