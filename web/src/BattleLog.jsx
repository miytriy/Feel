import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { C, FONT, alpha } from './ui.js'
import { KEYWORDS, TRIGGER_LABELS } from './battle/engine.js'

// 戦闘実況(🎙️): 右上の「≡」から開く、全画面のオーバーレイ。開いている間は、対戦(CPUの行動・再生)を止める。
//   味方 / 相手 = キャラごとの詳細(ステータス・いまの値・強化)とスキル・能力 ・ ログ = 起きたことの文章の記録
//   ログ = 起きたことの文章の記録(全部) / 発動 = 発動した能力の履歴(ファンファーレ・特性・スペル・進化など) / 破壊 = 戦闘不能・破壊された順
// 履歴は、1回の行動ごとに collectHistory で集めて足していく(BattleScreen の commit)。

const rowKey = (x, i) => `${x.logLen}-${i}`

// 1回の行動(prev → next)で増えた「発動」と「破壊」を取り出す。prev は、対戦の最初は null
export function collectHistory(prev, next) {
  const evs = next.events || []
  const ab = evs
    .filter((e) => e.type === 'ability')
    .map((e) => ({ kind: e.kind, owner: e.owner, name: e.name, desc: e.desc, team: e.team, round: e.round, logLen: e.logLen }))
  const dead = []
  const prevOf = (uid) => (prev ? prev.units.find((u) => u.uid === uid) : null)
  for (const u of next.units) {
    if (u.alive) continue
    const was = prevOf(u.uid)
    if (was && !was.alive) continue
    const at = evs.findIndex((e) => e.units && e.units[u.uid] && e.units[u.uid].alive === false)
    const idx = at === -1 ? evs.length - 1 : at
    let cause = ''
    for (let k = idx; k >= 0; k--) {
      const e = evs[k]
      if (e.type === 'damage' && e.target === u.uid) {
        const src = next.units.find((x) => x.uid === e.src)
        cause = `${src ? src.name : ''}の${e.means || '攻撃'}`
        break
      }
    }
    const ref = evs[idx]
    dead.push({ name: u.name, team: u.team, field: u.field, round: ref ? ref.round : next.round, logLen: ref ? ref.logLen : next.log.length, cause })
  }
  return { ab, dead }
}

export const emptyHistory = () => ({ ab: [], dead: [] })
export const addHistory = (h, d) => (d.ab.length || d.dead.length ? { ab: [...h.ab, ...d.ab], dead: [...h.dead, ...d.dead] } : h)


const TABS = [['ally', '味方'], ['enemy', '相手'], ['log', 'ログ'], ['ab', '発動'], ['dead', '破壊']]
const STAT_ROWS = [['atk', '攻撃力'], ['mag', '魔力'], ['def', '防御力'], ['spd', '速度'], ['critRate', 'クリティカルレート'], ['critDmg', 'クリティカルダメージ'], ['dmgResist', 'ダメージ耐性']]
const STAT_LABEL = { atk: '攻撃力', mag: '魔力', def: '防御力', spd: '速度', critRate: 'クリティカルレート', critDmg: 'クリティカルダメージ', dmgResist: 'ダメージ耐性' }
const TYPE_LABEL = { physical: '物理', magic: '魔法', true: '確定' }
const tierPrefix = (cond) => (cond?.liberation ? '【解放奥義】' : cond?.ultimate ? '【奥義】' : '')
const passiveText = (p) => {
  const label = (TRIGGER_LABELS[p.trigger] ?? p.trigger) + (p.min != null && p.trigger !== 'combo' ? `_${p.min}` : '')
  const name = p.name && p.name !== label ? `${p.name}: ` : ''
  return `${tierPrefix(p.condition)}【${label}】${name}${p.desc ?? ''}`
}
const buffText = (b) => {
  const parts = []
  if (b.pct) parts.push(`${b.pct > 0 ? '+' : ''}${b.pct}%`)
  if (b.flat) parts.push(`${b.flat > 0 ? '+' : ''}${b.flat}`)
  return `${STAT_LABEL[b.stat] || b.stat} ${parts.join(' ') || ''}`.trim()
}
const num = (n) => Math.round(n).toLocaleString()

// 右上の「≡」ボタン(戦闘実況を開く)
export function CommentaryButton({ onClick }) {
  return (
    <button type="button" data-testid="commentary-btn" onClick={onClick} aria-label="戦闘実況" title="戦闘実況" style={{ marginLeft: 'auto', flex: 'none', width: 40, height: 40, minHeight: 0, padding: 0, display: 'grid', placeItems: 'center', border: 0, borderRadius: 8, background: 'rgba(255,255,255,0.14)', color: '#fff', fontFamily: FONT, fontSize: 26, lineHeight: 1, fontWeight: 700, cursor: 'pointer' }}>≡</button>
  )
}

const pill = (on, color) => ({ flex: 'none', padding: '6px 12px', whiteSpace: 'nowrap', borderRadius: 8, border: `1px solid ${on ? color : C.line}`, background: on ? alpha(color, 22) : C.card, color: on ? color : C.mute, fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: 'pointer' })
const sec = (t, color) => <div style={{ fontSize: 12, letterSpacing: 1, color: color || C.mute, margin: '12px 0 6px', fontWeight: 700 }}>◆ {t}</div>
const chip = (t, color) => <span key={t} style={{ fontSize: 11, padding: '1px 7px', borderRadius: 6, background: alpha(color || C.mute, 22), color: color || C.mute, whiteSpace: 'nowrap' }}>{t}</span>

function Bar({ pct, color, h = 6 }) {
  return <div style={{ flex: 1, height: h, borderRadius: h, background: alpha(C.mute, 25), overflow: 'hidden' }}><div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', background: color }} /></div>
}

function UnitDetail({ u, color, first }) {
  const b = u.base || {}
  const rows = [['HP', u.baseMaxHp ?? u.maxHp, u.maxHp, 'hp'], ...STAT_ROWS.filter(([k]) => k !== 'mag' || (b.mag || 0) > 0 || u.mag > 0).map(([k, l]) => [l, b[k] ?? 0, u[k] ?? 0, k])]
  const ratio = u.maxHp > 0 ? u.hp / u.maxHp : 0
  const hpc = ratio > 0.5 ? C.hp ?? '#3ddc97' : ratio > 0.25 ? '#ffd24a' : '#ff5a5a'
  const now = [
    !u.isAmulet && ['現在HP', `${num(Math.max(0, u.hp))} / ${num(u.maxHp)}`],
    u.armor > 0 && ['アーマー', num(u.armor)],
    u.barrier > 0 && ['バリア', 'あり'],
    u.stealth && ['潜伏', 'あり'],
    u.comboCount > 0 && ['コンボ', u.comboCount],
    u.boost > 0 && ['スペルブースト(X)', `${u.boost}回`],
    u.countdown != null && ['カウントダウン', `あと${u.countdown}回`],
    u.evolvable && ['進化', u.evolved ? '進化済み' : 'まだ(EP1で進化)'],
    u.accel && ['アクセラレート', `速度${u.accel.speed}`],
  ].filter(Boolean)
  return (
    <div>
      {sec('ステータス(基礎 → いま)')}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
        {rows.map(([label, base, cur]) => {
          const d = Math.round(cur - base)
          return (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 6, padding: '4px 8px', borderRadius: 6, background: C.card, border: `1px solid ${C.line}`, fontSize: 12 }}>
              <span style={{ color: C.mute }}>{label}</span>
              <b style={{ whiteSpace: 'nowrap' }}>{num(cur)}{d !== 0 && <span style={{ marginLeft: 4, fontSize: 11, color: d > 0 ? '#3ddc97' : '#ff5a5a' }}>{d > 0 ? '+' : ''}{num(d)}</span>}</b>
            </div>
          )
        })}
      </div>

      {sec('いまの状態', color)}
      <div style={{ padding: '8px 10px', borderRadius: 8, background: alpha(color, 10), border: `1px solid ${alpha(color, 30)}` }}>
        {now.map(([l, v]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}><span style={{ color: C.mute }}>{l}</span><b style={{ color }}>{v}</b></div>
        ))}
        {!u.isAmulet && <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}><span style={{ fontSize: 11, color: C.mute, width: 18 }}>HP</span><Bar pct={ratio * 100} color={hpc} h={7} /></div>}
      </div>

      {sec(`強化・弱体 (${u.buffs.length})`)}
      {u.buffs.length === 0 ? <div style={{ fontSize: 12, color: C.mute, padding: '2px 8px' }}>なし</div> : u.buffs.map((x, i) => {
        const up = (x.pct || 0) + (x.flat || 0) >= 0
        const c = up ? '#60a5fa' : '#f87171'
        return (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4, padding: '5px 9px', borderRadius: 6, background: alpha(c, 14), border: `1px solid ${alpha(c, 35)}`, fontSize: 12 }}>
            <span style={{ color: c, fontWeight: 700 }}>{buffText(x)}</span>
            <span style={{ fontSize: 11, color: c, padding: '1px 6px', borderRadius: 5, background: alpha(c, 18) }}>{x.turns == null ? '永続' : `${x.turns}T`}</span>
          </div>
        )
      })}
    </div>
  )
}

function UnitSkills({ u, color }) {
  const sk = u.skill || {}
  const kw = u.keywords.filter((k) => !(k === 'stealth' && !u.stealth) && !(k === 'barrier' && u.barrier <= 0))
  const used = new Set(u.usedTraits || [])
  const row = (t, i) => <div key={i} style={{ marginBottom: 4, padding: '5px 9px', borderRadius: 6, background: C.card, border: `1px solid ${C.line}`, fontSize: 12, lineHeight: 1.6 }}>{t}</div>
  return (
    <div>
      {!u.isAmulet && (
        <div style={{ padding: '9px 11px', borderRadius: 8, background: C.card, border: `1px solid ${C.line}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <b style={{ fontSize: 14, color }}>{sk.name}</b>{chip(TYPE_LABEL[sk.type] || sk.type, color)}
            <span style={{ marginLeft: 'auto', fontSize: 11, color: C.mute }}>{sk.stat === 'mag' ? '魔力' : '攻撃力'}{sk.mult != null ? ` ${Math.round(sk.mult * 100)}%` : ''}</span>
          </div>
        </div>
      )}
      {kw.length > 0 && <>{sec('キーワード')}{kw.map((k, i) => row(`【${KEYWORDS[k]?.label ?? k}】${KEYWORDS[k]?.desc ?? ''}`, i))}</>}
      {sec('能力', color)}
      {u.passiveObjs.length + u.traits.length === 0 && !u.accel ? <div style={{ fontSize: 12, color: C.mute, padding: '2px 8px' }}>能力なし</div> : null}
      {u.passiveObjs.map((p, i) => row(passiveText(p), `p${i}`))}
      {u.traits.map((t, i) => row(`${tierPrefix(t.condition)}【特性 MP${t.cost}${t.repeatable ? ' 連続使用可' : ''}】${t.name}: ${t.desc ?? ''}${!t.repeatable && used.has(t.name) ? ' (使用済み)' : ''}`, `t${i}`))}
      {u.accel && row(`【アクセラレート_${u.accel.speed}】${u.accel.name}(MP${u.accel.cost ?? 0}): ${u.accel.desc ?? ''}`, 'ac')}
    </div>
  )
}

// オーバーレイ本体。units: 場のすべて(view.units) / active: いま動くユニットの uid / log: ここまでの文章の記録 / ab, dead: 履歴
export function CommentaryOverlay({ units, active, round, log, ab, dead, onClose }) {
  const [tab, setTab] = useState('ally')
  const [pick, setPick] = useState({ A: null, B: null })
  const [sub, setSub] = useState('detail')
  const bodyRef = useRef(null)
  const limit = log.length
  const abShown = ab.filter((x) => x.logLen <= limit)
  const deadShown = dead.filter((x) => x.logLen <= limit)
  const teamColor = (t) => (t === 'B' ? C.enemy : C.player)

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  useEffect(() => {
    if (tab === 'log' && bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [tab, limit])

  const isTeam = tab === 'ally' || tab === 'enemy'
  const team = tab === 'enemy' ? 'B' : 'A'
  const list = isTeam ? units.filter((u) => u.team === team).sort((a, b) => (a.field === b.field ? 0 : a.field === 'main' ? -1 : 1)) : []
  const cur = list.find((u) => u.uid === pick[team]) || list.find((u) => u.alive) || list[0]
  const color = teamColor(team)
  const empty = (msg) => <div style={{ padding: '28px 8px', textAlign: 'center', color: C.mute, fontSize: 14 }}>{msg}</div>
  const tag = (x) => <span style={{ marginRight: 8, padding: '0 6px', borderRadius: 4, background: alpha(teamColor(x.team), 25), fontSize: 11 }}>R{x.round}</span>
  const card = (x, key, children) => <div key={key} style={{ marginBottom: 8, padding: '8px 10px', borderRadius: 8, background: C.card, border: `1px solid ${C.line}`, borderLeft: `6px solid ${teamColor(x.team)}` }}>{children}</div>

  if (typeof document === 'undefined') return null
  return createPortal(
    <div data-testid="commentary" role="dialog" aria-label="戦闘実況" style={{ position: 'fixed', inset: 0, zIndex: 2800, display: 'flex', flexDirection: 'column', background: C.paper, color: C.ink, fontFamily: FONT }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(0,0,0,0.6)', color: '#fff', flex: 'none' }}>
        <b style={{ fontSize: 16, letterSpacing: 2, whiteSpace: 'nowrap' }}>🎙️ 戦闘実況</b>
        <span style={{ fontSize: 12, opacity: 0.8, whiteSpace: 'nowrap' }}>ラウンド {round}</span>
        <button type="button" aria-label="閉じる" data-testid="commentary-close" onClick={onClose} style={{ marginLeft: 'auto', padding: '6px 14px', whiteSpace: 'nowrap', minHeight: 0, borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>✕ 閉じる</button>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '8px 12px', borderBottom: `1px solid ${C.line}`, flex: 'none' }}>
        {TABS.map(([id, label]) => {
          const n = id === 'ab' ? abShown.length : id === 'dead' ? deadShown.length : null
          return <button key={id} type="button" data-testid={`commentary-tab-${id}`} aria-pressed={tab === id} onClick={() => setTab(id)} style={pill(tab === id, id === 'enemy' ? C.enemy : C.player)}>{label}{n ? ` ${n}` : ''}</button>
        })}
      </div>

      {isTeam && (
        <>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '8px 12px 0', flex: 'none' }}>
            {list.map((u) => (
              <button key={u.uid} type="button" data-testid={`commentary-unit-${u.uid}`} onClick={() => setPick((p) => ({ ...p, [team]: u.uid }))} style={{ ...pill(cur && cur.uid === u.uid, color), opacity: u.alive ? 1 : 0.45, textAlign: 'center', padding: '5px 10px' }}>
                <div>{u.name}</div>
                <div style={{ fontSize: 10, fontWeight: 400 }}>{!u.alive ? '戦闘不能' : u.isAmulet ? 'アミュレット' : u.field === 'summon' ? '召喚物' : u.uid === active ? '行動中' : `HP ${Math.max(0, Math.ceil(u.hp))}`}</div>
              </button>
            ))}
          </div>
          {cur && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '8px 12px', flex: 'none' }}>
              <b style={{ fontSize: 16, color }}>{cur.name}</b>
              {cur.class && chip(cur.class)}{cur.type && chip(cur.type)}
              {cur.evolved && chip('進化済', color)}{cur.field === 'summon' && chip(cur.isAmulet ? 'アミュレット' : '召喚物')}
              {!cur.alive && chip('戦闘不能', '#ff5a5a')}{cur.uid === active && chip('行動中', '#ffb020')}
            </div>
          )}
          <div style={{ display: 'flex', borderBottom: `1px solid ${C.line}`, flex: 'none' }}>
            {[['detail', '詳細'], ['skill', 'スキル・能力']].map(([id, label]) => (
              <button key={id} type="button" data-testid={`commentary-sub-${id}`} onClick={() => setSub(id)} style={{ flex: 1, padding: '8px 4px', minHeight: 0, border: 0, borderBottom: `3px solid ${sub === id ? color : 'transparent'}`, background: 'transparent', color: sub === id ? color : C.mute, fontFamily: FONT, fontSize: 13, fontWeight: sub === id ? 700 : 400, cursor: 'pointer' }}>{label}</button>
            ))}
          </div>
        </>
      )}

      <div ref={bodyRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 12px 24px', fontSize: 13, lineHeight: 1.6, width: 'min(860px, 100%)', boxSizing: 'border-box', alignSelf: 'center' }}>
        {isTeam && (!cur ? empty('ユニットがいません') : sub === 'detail' ? <UnitDetail u={cur} color={color} /> : <UnitSkills u={cur} color={color} />)}

        {tab === 'log' && (log.length === 0 ? empty('まだログはありません') : log.map((line, i) => (
          <div key={i} style={{ fontWeight: i === log.length - 1 ? 700 : 400, color: i === log.length - 1 ? C.ink : C.mute }}>{line}</div>
        )))}

        {tab === 'ab' && (abShown.length === 0 ? empty('まだ能力は発動していません') : [...abShown].reverse().map((x, i) => card(x, rowKey(x, i), (
          <>
            <div style={{ fontWeight: 700 }}>{tag(x)}【{x.kind}】{x.owner}{x.name ? ` ― ${x.name}` : ''}</div>
            {x.desc && <div style={{ marginTop: 2, color: C.mute }}>{x.desc}</div>}
          </>
        ))))}

        {tab === 'dead' && (deadShown.length === 0 ? empty('まだ破壊されたものはありません') : [...deadShown].reverse().map((x, i) => card(x, rowKey(x, i), (
          <>
            <div style={{ fontWeight: 700 }}>{tag(x)}{x.team === 'B' ? '相手' : '自分'}の{x.name}{x.field === 'summon' ? '(召喚物)' : ''}</div>
            <div style={{ marginTop: 2, color: C.mute }}>{x.cause ? `${x.cause}で倒された` : '破壊された'}</div>
          </>
        ))))}
      </div>
    </div>,
    document.body
  )
}
