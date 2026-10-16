import { useIsDesktop, C, FONT, DISPLAY } from './ui.js'

// ホーム画面: 暗いティールの背景に、白い大きな項目名だけを縦に並べる(説明文はなし)。
// PLAY だけ赤くて一回り大きい。カーソルを乗せると、ネオン色になって右に少し動く(見た目は ui.js の .feel-menu-item)。
// account の項目は、アカウント(ログイン)がある人だけが使える。

export const HOME_ITEMS = [
  { key: 'play', label: 'PLAY', primary: true, account: false },
  { key: 'career', label: 'CAREER', account: true },
  { key: 'codex', label: 'COLLECTION', account: false },
  { key: 'agents', label: 'AGENTS', account: true },
  { key: 'party', label: 'PARTY', account: true },
  { key: 'store', label: 'STORE', account: true },
]
export const ACCOUNT_SCREENS = HOME_ITEMS.filter((i) => i.account).map((i) => i.key)

// 背景(暗いティール)。ホームと、PLAYのメニューで共通
export const backdrop = {
  minHeight: '100vh', color: C.ink, fontFamily: FONT, position: 'relative', overflow: 'hidden',
  background: 'radial-gradient(900px 620px at 24% 38%, rgba(38,150,150,0.55) 0%, rgba(20,90,100,0.18) 55%, rgba(0,0,0,0) 100%), linear-gradient(165deg, #0d4048 0%, #08252c 48%, #050f13 100%)',
}

const ghost = (primary) => ({
  padding: '8px 14px', borderRadius: 4, fontSize: 14, fontWeight: 700, fontFamily: DISPLAY, letterSpacing: '0.06em', cursor: 'pointer', minHeight: 0,
  border: `1.5px solid ${primary ? C.neon : 'rgba(255,255,255,0.35)'}`, background: primary ? C.neon : 'rgba(0,0,0,0.25)', color: primary ? C.onAccent : '#fff',
})

function Brand() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg width="34" height="30" viewBox="0 0 34 30" aria-hidden="true"><polygon points="0,0 12,0 34,30 22,30" fill={C.red} /><polygon points="22,0 34,0 28,8" fill={C.red} opacity="0.85" /></svg>
      <h1 style={{ margin: 0, fontSize: 40, lineHeight: 1, color: '#fff', textTransform: 'uppercase' }}>Feel</h1>
    </div>
  )
}

// 項目のリスト(ホームとPLAYで共通)。items: { key, label, primary, locked }
export function MenuList({ items, onSelect }) {
  return (
    <nav aria-label="メニュー">
      <ul className="feel-menu">
        {items.map((it) => (
          <li key={it.key}>
            <button
              type="button"
              data-testid={`home-${it.key}`}
              className={`feel-menu-item${it.primary ? ' primary' : ''}${it.locked ? ' locked' : ''}`}
              onClick={() => onSelect(it.key)}
            >
              <span className="bullet" />
              <span className="label">{it.label}{it.locked && <span aria-label="ログインが必要" style={{ fontSize: '0.4em', marginLeft: 12, verticalAlign: 'middle' }}>🔒</span>}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default function HomeScreen({ user, me, lockedKey, onSelect, onLogin, onLogout }) {
  const desktop = useIsDesktop()
  const items = HOME_ITEMS.map((it) => ({ ...it, locked: it.account && !user }))
  return (
    <div style={backdrop}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: desktop ? '18px 40px' : '14px 16px' }}>
        <Brand />
        <div style={{ flex: 1 }} />
        {user && me && <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 20, color: '#fff', letterSpacing: '0.04em' }}><span style={{ color: C.neon }}>◆</span> {me.gems}</div>}
        {user
          ? <button onClick={onLogout} style={ghost(false)}>LOGOUT</button>
          : <button onClick={onLogin} style={ghost(true)}>GOOGLEでログイン</button>}
      </div>

      <div style={{ padding: desktop ? '5vh 0 40px 6vw' : '3vh 0 40px 6vw', display: 'flex', flexDirection: 'column', gap: 28 }}>
        <MenuList items={items} onSelect={onSelect} />

        {lockedKey && !user && (
          <div style={{ alignSelf: 'flex-start', maxWidth: 'min(420px, 88vw)', padding: '14px 16px', borderLeft: `4px solid ${C.neon}`, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, flex: 1, minWidth: 150, color: '#fff' }}>
              <b style={{ fontFamily: DISPLAY, fontSize: 18, letterSpacing: '0.04em' }}>{HOME_ITEMS.find((i) => i.key === lockedKey)?.label}</b> はログインが必要です
            </span>
            <button onClick={onLogin} style={ghost(true)}>GOOGLEでログイン</button>
          </div>
        )}
      </div>
    </div>
  )
}

// PLAY: 対戦メニュー(ホームと同じ見た目)
export function PlayMenu({ onBattle, onRules, onExit }) {
  const desktop = useIsDesktop()
  return (
    <div style={backdrop}>
      <div style={{ padding: desktop ? '18px 40px' : '14px 16px' }}>
        <button className="feel-back" onClick={onExit}>← BACK</button>
      </div>
      <div style={{ padding: desktop ? '5vh 0 40px 6vw' : '3vh 0 40px 6vw' }}>
        <MenuList
          items={[{ key: 'battle', label: 'CPU対戦', primary: true }, { key: 'rules', label: 'ルール説明' }]}
          onSelect={(k) => (k === 'battle' ? onBattle() : onRules())}
        />
      </div>
    </div>
  )
}
