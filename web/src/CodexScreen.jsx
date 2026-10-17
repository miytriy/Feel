import { useMemo, useState } from 'react'
import { useIsDesktop, C, FONT } from './ui.js'
import { ScreenHeader } from './chrome.jsx'
import { ALL_CHARACTERS, charById } from './battle/characters/index.js'
import { ALL_SPELLS, spellById } from './battle/spells/index.js'
import { KEYWORDS, TRIGGER_LABELS, RELICS } from './battle/engine.js'
import { CLASSES } from './battle/characters/validate.js'

// 資料集: キャラクター/スペルをタブで分け、さらにクラスで絞り込み、名前や効果の文字で検索できる。
// データは characters/ と spells/ から自動で集まるので、キャラやスペルを足すと、ここにも自動で載る。

const RARITY = {
  legend: { label: 'レジェンド', color: '#e879f9', order: 0 },
  gold: { label: 'ゴールド', color: '#facc15', order: 1 },
  silver: { label: 'シルバー', color: '#cbd5e1', order: 2 },
  bronze: { label: 'ブロンズ', color: '#fb923c', order: 3 },
}
const TARGET_LABELS = {
  self: '自分', opponent: '相手', allies: '味方全体', otherAllies: '自分以外の味方全体', allyOne: '味方1体', otherAllyOne: '自分以外の味方1体',
  enemies: '相手全体', enemyOne: '相手1体', enemyRandom: '相手ランダム', summons: '召喚物', allyField: '自分の場', otherAllyField: '自分以外の場', entered: '入場したキャラ',
}
const STAT_ROWS = [
  ['hp', 'HP'], ['atk', '攻撃力'], ['def', '防御力'], ['spd', '速度'],
  ['mag', '魔力'], ['critRate', 'クリ率'], ['critDmg', 'クリダメ'], ['dmgResist', 'ダメージ耐性'],
]
const DEFAULTS = { critRate: 5, critDmg: 50 } // ルールの初期値(クリティカルレート5%/ダメージ50%)
const DMG_TYPE = { physical: '物理', magic: '魔法', true: '確定' }

// ---------- 検索の下ごしらえ: 全角半角・大文字小文字・ひらがな/カタカナの違いを無視する ----------
const fold = (s) =>
  String(s ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u3041-\u3096]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60))

const passiveLabel = (p) => (typeof p === 'string' ? (KEYWORDS[p]?.label || (/^stealth_(\d+)$/.test(p) ? `潜伏_${p.split('_')[1]}` : p)) : p.name)
const passiveDesc = (p) => {
  if (typeof p !== 'string') return p.desc || ''
  const m = /^stealth_(\d+)$/.exec(p)
  if (m) return `${m[1]}ターンごとに【潜伏】が戻る。${KEYWORDS.stealth.desc}`
  return KEYWORDS[p]?.desc || ''
}
const triggerLabel = (p) => (typeof p === 'object' && p.trigger ? TRIGGER_LABELS[p.trigger] || p.trigger : '')

// 効果の中から、召喚するキャラ・有効化するスペルを集める(「関連」として詳細に出す)
function collectRelated(def) {
  const units = []
  const spells = []
  const walk = (effects) => {
    for (const e of effects || []) {
      if (!e || typeof e !== 'object') continue
      if (e.unit) units.push(e.unit)
      if (Array.isArray(e.randomUnits)) units.push(...e.randomUnits)
      if (e.spell) spells.push(e.spell)
      if (e.trait) walk(e.trait.effects)
      if (Array.isArray(e.modes)) e.modes.forEach((m) => walk(m && m.effects))
      if (e.crest) {
        for (const p of e.crest.passives || []) if (typeof p === 'object') walk(p.effects)
      }
    }
  }
  for (const p of def.passives || []) if (typeof p === 'object') walk(p.effects)
  for (const t of def.traits || []) walk(t.effects)
  if (def.accelerate) walk(def.accelerate.effects)
  walk(def.effects) // スペル
  const uniq = (arr) => arr.filter((x, i) => arr.findIndex((y) => y.id === x.id) === i)
  return { units: uniq(units), spells: uniq(spells) }
}

function searchText(def, isSpell) {
  const parts = [def.name, def.id, def.class, def.type, RARITY[def.rarity]?.label, def.desc]
  if (!isSpell) {
    parts.push(def.skill?.name, def.relic)
    for (const p of def.passives || []) parts.push(passiveLabel(p), passiveDesc(p), triggerLabel(p))
    for (const t of def.traits || []) parts.push(t.name, t.desc)
    if (def.accelerate) parts.push(def.accelerate.name, def.accelerate.desc, 'アクセラレート')
    if (def.countdown != null) parts.push('カウントダウン')
  }
  const rel = collectRelated(def)
  for (const u of rel.units) parts.push(u.name)
  for (const s of rel.spells) parts.push(s.name)
  return fold(parts.filter(Boolean).join(' '))
}

const spellClassName = (sp) => String(sp.class || '').split('/')[0]

// ---------- 小さな部品 ----------
const chip = (active) => ({
  padding: '6px 12px', borderRadius: 999, fontSize: 13, fontWeight: 700, fontFamily: FONT, whiteSpace: 'nowrap', flex: '0 0 auto',
  border: `1.5px solid ${active ? C.player : C.line}`, background: active ? C.player : C.card, color: active ? C.onAccent : C.ink, cursor: 'pointer',
})
const tabBtn = (active) => ({
  flex: 1, padding: '12px 8px', fontSize: 16, fontWeight: 800, fontFamily: FONT, cursor: 'pointer',
  border: 'none', borderBottom: `3px solid ${active ? C.player : 'transparent'}`, background: 'transparent', color: active ? C.player : C.mute,
})

function RarityBadge({ rarity }) {
  const r = RARITY[rarity]
  if (!r) return null
  return <span style={{ fontSize: 11, fontWeight: 800, color: C.onAccent, background: r.color, borderRadius: 4, padding: '1px 6px' }}>{r.label}</span>
}

function Section({ title, children }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.mute, borderBottom: `1px solid ${C.line}`, paddingBottom: 3, marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  )
}

function Tag({ children, color = C.player }) {
  return <span style={{ fontSize: 11, fontWeight: 800, color, border: `1px solid ${color}`, borderRadius: 4, padding: '0 5px', marginRight: 6, whiteSpace: 'nowrap' }}>{children}</span>
}

function AbilityRow({ head, tag, desc }) {
  return (
    <div style={{ margin: '0 0 8px', fontSize: 14, lineHeight: 1.6 }}>
      <div>{tag && <Tag>{tag}</Tag>}<b>{head}</b></div>
      {desc && <div style={{ color: C.ink, opacity: 0.85 }}>{desc}</div>}
    </div>
  )
}

// ---------- 詳細 ----------
function CharDetail({ def, onOpen }) {
  const rel = collectRelated(def)
  const relic = def.relic ? RELICS[def.relic] : null
  return (
    <>
      <Section title="ステータス">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 16px', fontSize: 14 }}>
          {STAT_ROWS.map(([k, label]) => {
            const v = def.stats[k]
            if (v == null && DEFAULTS[k] == null && k !== 'mag' && k !== 'dmgResist') return null
            if (v == null && ['mag', 'dmgResist'].includes(k)) return null
            const shown = v ?? DEFAULTS[k]
            return (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px dotted ${C.line}` }}>
                <span style={{ color: C.mute }}>{label}{v == null ? '(初期値)' : ''}</span>
                <b>{shown}{k === 'critRate' || k === 'critDmg' ? '%' : ''}</b>
              </div>
            )
          })}
        </div>
      </Section>

      <Section title="スキル">
        <AbilityRow
          head={def.skill.name}
          desc={`${DMG_TYPE[def.skill.type] || def.skill.type}ダメージ(参照: ${def.skill.stat === 'mag' ? '魔力' : '攻撃力'} ×${def.skill.mult}${def.skill.add ? ` +${def.skill.add}` : ''})`}
        />
      </Section>

      {(def.passives || []).length > 0 && (
        <Section title="パッシブ">
          {def.passives.map((p, i) => (
            <AbilityRow key={i} head={`【${passiveLabel(p)}】`} tag={triggerLabel(p) || (typeof p === 'string' ? 'キーワード' : '')} desc={passiveDesc(p)} />
          ))}
        </Section>
      )}

      {(def.traits || []).length > 0 && (
        <Section title="特性">
          {def.traits.map((t) => (
            <AbilityRow key={t.id} head={t.name} tag={`MP${t.cost}`} desc={`${t.desc || ''}${t.target ? `(対象: ${TARGET_LABELS[t.target] || t.target})` : ''}${t.repeatable ? ' ※1ターンに複数回使える' : ''}`} />
          ))}
        </Section>
      )}

      {def.accelerate && (
        <Section title="アクセラレート">
          <AbilityRow head={`【${def.accelerate.name || 'アクセラレート'}_${def.accelerate.speed}】`} tag={`MP${def.accelerate.cost}`} desc={`${def.accelerate.desc || ''}(速度 ${def.accelerate.speed}・対象: ${TARGET_LABELS[def.accelerate.target] || def.accelerate.target})`} />
        </Section>
      )}

      <Section title="その他">
        <div style={{ fontSize: 14, lineHeight: 1.7 }}>
          {def.type && <div>タイプ: {def.type}</div>}
          <div>進化: {def.evolvable === false ? 'できない' : 'できる'}</div>
          {def.countdown != null && <div>カウントダウン: {def.countdown}</div>}
          {relic && <div>遺物「{def.relic}」: {relic.desc}</div>}
          {def.amulet && <div>アミュレット(召喚されたときは、スキル攻撃できない)</div>}
        </div>
      </Section>

      <Related rel={rel} onOpen={onOpen} />
    </>
  )
}

function SpellDetail({ def, onOpen }) {
  const rel = collectRelated(def)
  const token = def.type === 'トークン'
  return (
    <>
      <Section title="スペル">
        <AbilityRow head={`消費MP: ${def.cost}`} desc={def.desc} />
        <div style={{ fontSize: 13, color: C.mute }}>自分のキャラのターン中、1ターンに1回まで使える(キャラの行動は消費しない)</div>
      </Section>
      <Section title="その他">
        <div style={{ fontSize: 14, lineHeight: 1.7 }}>
          {def.type && <div>タイプ: {def.type}</div>}
          <div>スペルセット: {token ? '入れられない(他のスペルから有効化されるトークン)' : '入れられる'}</div>
        </div>
      </Section>
      <Related rel={rel} onOpen={onOpen} />
    </>
  )
}

function Related({ rel, onOpen }) {
  if (!rel.units.length && !rel.spells.length) return null
  return (
    <Section title="関連(召喚・有効化)">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {rel.units.map((u) => {
          const known = charById(u.id)
          return (
            <button key={'u' + u.id} disabled={!known} onClick={() => onOpen('chars', u.id)} style={{ ...chip(false), cursor: known ? 'pointer' : 'default' }}>
              {u.name}(HP{u.stats.hp}/攻{u.stats.atk}){known ? '' : '※召喚専用'}
            </button>
          )
        })}
        {rel.spells.map((s) => {
          const known = spellById(s.id)
          return (
            <button key={'s' + s.id} disabled={!known} onClick={() => onOpen('spells', s.id)} style={{ ...chip(false), cursor: known ? 'pointer' : 'default' }}>
              スペル: {s.name}
            </button>
          )
        })}
      </div>
    </Section>
  )
}

function Detail({ tab, def, onOpen, onClose, desktop, count = null }) {
  if (!def) {
    return <div style={{ color: C.mute, padding: 24, textAlign: 'center', fontSize: 14 }}>左の一覧から選ぶと、くわしい情報が見られます</div>
  }
  return (
    <div style={{ padding: desktop ? 20 : 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>{def.name}</h2>
            <RarityBadge rarity={def.rarity} />
          </div>
          <div style={{ fontSize: 12, color: C.mute, marginTop: 2 }}>{def.class} ・ {def.id}{count != null ? ` ・ 所持 ×${count}` : ''}</div>
        </div>
        {!desktop && <button onClick={onClose} style={{ ...chip(false), padding: '8px 14px' }}>閉じる</button>}
      </div>
      {tab === 'chars' ? <CharDetail def={def} onOpen={onOpen} /> : <SpellDetail def={def} onOpen={onOpen} />}
    </div>
  )
}

// ---------- 一覧の1件 ----------
function ListItem({ tab, def, selected, onClick, count = null }) {
  const r = RARITY[def.rarity]
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left', width: '100%', padding: '10px 12px', borderRadius: 10, fontFamily: FONT, cursor: 'pointer',
        // 左の色帯(レアリティ)は、選んでも消えないようにする。border と borderLeft を混ぜると、再描画のときに左の色が上書きされて消えるため、長さ・種類・色を別々に指定する
        borderStyle: 'solid', borderWidth: '1.5px 1.5px 1.5px 6px',
        borderColor: `${selected ? C.player : C.line} ${selected ? C.player : C.line} ${selected ? C.player : C.line} ${r?.color || C.line}`,
        background: selected ? C.soft : C.card, color: C.ink,
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 14, display: 'flex', justifyContent: 'space-between', gap: 8 }}><span>{def.name}</span>{count != null && <span style={{ color: C.player }}>×{count}</span>}</div>
      <div style={{ fontSize: 11, color: C.mute, marginTop: 2 }}>
        {tab === 'chars'
          ? `${def.class}${def.type ? ' / ' + def.type : ''} ・ HP ${def.stats.hp} ・ 攻撃 ${def.stats.atk} ・ 防御 ${def.stats.def} ・ 速度 ${def.stats.spd}`
          : `${spellClassName(def)} ・ MP ${def.cost}${def.type ? ' / ' + def.type : ''}`}
      </div>
      {tab === 'spells' && <div style={{ fontSize: 12, marginTop: 3, opacity: 0.85 }}>{def.desc}</div>}
    </button>
  )
}

// ---------- 画面 ----------
// ownedMap を渡すと「所持キャラクター」になる(持っているキャラだけ・キャラのタブだけ・所持数つき)
export default function CodexScreen({ onExit, title = 'Wiki', ownedMap = null }) {
  const desktop = useIsDesktop()
  const agents = !!ownedMap
  const [tab, setTab] = useState('chars') // chars | spells
  const [cls, setCls] = useState('all')
  const [rarity, setRarity] = useState('all')
  const [query, setQuery] = useState('')
  const [selId, setSelId] = useState(null)

  const isSpell = tab === 'spells'
  const source = isSpell ? ALL_SPELLS : ALL_CHARACTERS
  const classOf = (d) => (isSpell ? spellClassName(d) : d.class)

  // 検索用の文字は最初に1回だけ作る
  const indexed = useMemo(() => ({
    chars: ALL_CHARACTERS.filter((d) => !agents || ownedMap[d.id] > 0).map((d) => ({ d, t: searchText(d, false) })),
    spells: ALL_SPELLS.map((d) => ({ d, t: searchText(d, true) })),
  }), [agents, ownedMap])

  // クラスごとの件数(検索・レアリティの結果に合わせて数える)
  const terms = fold(query).split(/\s+/).filter(Boolean)
  const base = indexed[tab].filter(({ d, t }) => (rarity === 'all' || d.rarity === rarity) && terms.every((w) => t.includes(w)))
  const counts = {}
  for (const { d } of base) counts[classOf(d)] = (counts[classOf(d)] || 0) + 1
  const shown = base.filter(({ d }) => cls === 'all' || classOf(d) === cls).map(({ d }) => d)
  const selected = source.find((d) => d.id === selId) || null

  const switchTab = (t) => { setTab(t); setCls('all'); setSelId(null) }
  // 関連のキャラ・スペルを開く(別のタブでも移れる)
  const open = (t, id) => {
    if (t !== tab) { setTab(t); setCls('all'); setRarity('all'); setQuery('') }
    setSelId(id)
  }

  const classChips = (
    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '2px 0 6px' }}>
      <button style={chip(cls === 'all')} onClick={() => setCls('all')}>すべて {base.length}</button>
      {CLASSES.map((c) => (
        <button key={c} style={{ ...chip(cls === c), opacity: counts[c] ? 1 : 0.45 }} onClick={() => setCls(c)}>{c} {counts[c] || 0}</button>
      ))}
    </div>
  )

  const rarityChips = (
    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 0 6px' }}>
      <button style={{ ...chip(rarity === 'all'), padding: '4px 10px', fontSize: 12 }} onClick={() => setRarity('all')}>全レアリティ</button>
      {Object.entries(RARITY).sort((a, b) => a[1].order - b[1].order).map(([k, r]) => (
        <button key={k} style={{ ...chip(rarity === k), padding: '4px 10px', fontSize: 12, ...(rarity === k ? { background: r.color, borderColor: r.color } : {}) }} onClick={() => setRarity(k)}>{r.label}</button>
      ))}
    </div>
  )

  const list = (
    <div style={{ display: 'grid', gap: 8, gridTemplateColumns: desktop ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))' }}>
      {shown.length === 0 && <div style={{ color: C.mute, fontSize: 14, padding: 16 }}>{agents && indexed.chars.length === 0 ? 'まだキャラクターを持っていません。STOREで手に入れましょう。' : '見つかりませんでした。検索の言葉やクラス・レアリティの絞り込みを変えてみてください。'}</div>}
      {shown.map((d) => <ListItem key={d.id} tab={tab} def={d} selected={d.id === selId} onClick={() => setSelId(d.id)} count={agents ? ownedMap[d.id] : null} />)}
    </div>
  )

  const header = (
    <div style={{ background: C.card, borderBottom: `1px solid ${C.line}`, position: 'sticky', top: 0, zIndex: 5 }}>
      <ScreenHeader
        title={title}
        onClose={onExit}
        right={<span style={{ fontSize: 12, color: C.mute }}>{agents ? `所持 ${indexed.chars.length}種 / 全${ALL_CHARACTERS.length}種` : `${ALL_CHARACTERS.length}キャラ ・ ${ALL_SPELLS.length}スペル`}</span>}
      />
      {!agents && (
        <div style={{ display: 'flex', padding: desktop ? '0 36px' : '0 12px' }}>
          <button style={tabBtn(!isSpell)} onClick={() => switchTab('chars')}>キャラクター</button>
          <button style={tabBtn(isSpell)} onClick={() => switchTab('spells')}>スペル</button>
        </div>
      )}
      {agents && <div style={{ height: 8 }} />}
    </div>
  )

  const filters = (
    <div>
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isSpell ? '名前・効果で検索(例: 召喚 ヒール)' : '名前・効果・キーワードで検索(例: 疾走 ファンファーレ)'}
          style={{ width: '100%', fontSize: 16, padding: '10px 36px 10px 12px', borderRadius: 10, border: `1.5px solid ${C.line}`, background: C.card, color: C.ink }}
        />
        {query && <button onClick={() => setQuery('')} aria-label="検索をクリア" style={{ position: 'absolute', right: 6, top: 6, width: 32, height: 32, border: 'none', background: 'transparent', fontSize: 18, color: C.mute, cursor: 'pointer' }}>×</button>}
      </div>
      {classChips}
      {rarityChips}
    </div>
  )

  const page = { minHeight: '100vh', background: C.paper, color: C.ink, fontFamily: FONT }
  const themeClass = agents ? '' : 'theme-light' // 資料集(COLLECTION)は明るい灰色、AGENTSは暗い画面

  if (desktop) {
    return (
      <div className={themeClass} style={page}>
        {header}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 420px) 1fr', gap: 20, padding: '16px 36px', alignItems: 'start' }}>
          <div>
            {filters}
            <div style={{ maxHeight: 'calc(100vh - 290px)', overflowY: 'auto', paddingRight: 4 }}>{list}</div>
          </div>
          <div style={{ position: 'sticky', top: 120, background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, maxHeight: 'calc(100vh - 150px)', overflowY: 'auto' }}>
            <Detail tab={tab} def={selected} onOpen={open} desktop count={agents && selected ? ownedMap[selected.id] ?? null : null} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={themeClass} style={page}>
      {header}
      <div style={{ padding: '10px 12px calc(20px + env(safe-area-inset-bottom))', maxWidth: 720, margin: '0 auto' }}>
        {filters}
        {list}
      </div>
      {selected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 20, background: C.card, overflowY: 'auto', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <Detail tab={tab} def={selected} onOpen={open} onClose={() => setSelId(null)} desktop={false} count={agents && selected ? ownedMap[selected.id] ?? null : null} />
        </div>
      )}
    </div>
  )
}
