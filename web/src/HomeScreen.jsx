import { useIsDesktop, C, FONT, DISPLAY, NEON_RGB } from './ui.js'

// ホーム画面: 暗いティールの背景に、白い大きな項目名だけを縦に並べる(説明文はなし)。
// PLAY だけ赤くて一回り大きい。カーソルを乗せると、ネオン色になって右に少し動き、左の線が伸びる(見た目は ui.js の .feel-menu-item)。
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
  background: `radial-gradient(1000px 700px at 82% 8%, rgba(110,90,255,0.32) 0%, rgba(110,90,255,0) 62%), radial-gradient(rgba(${NEON_RGB},0.10) 1px, transparent 1.2px) 0 0 / 28px 28px, linear-gradient(170deg, #141c3d 0%, #0b1128 52%, #070a16 100%)`,
}

const ghost = (primary) => ({
  padding: '8px 18px', borderRadius: 999, fontSize: 13, fontWeight: 600, fontFamily: DISPLAY, letterSpacing: '0.1em', cursor: 'pointer', minHeight: 0,
  border: `1.5px solid ${primary ? C.neon : 'rgba(255,255,255,0.3)'}`, background: primary ? C.neon : 'rgba(255,255,255,0.06)', color: primary ? C.onAccent : '#fff',
})

function Brand() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><circle cx="17" cy="17" r="4" fill={C.red} /><circle cx="17" cy="17" r="9.5" fill="none" stroke={C.neon} strokeWidth="2" /><circle cx="17" cy="17" r="15" fill="none" stroke={C.neon} strokeWidth="1.2" opacity="0.5" /></svg>
      <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1, color: '#fff', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Feel</h1>
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
        {user && me && <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 18, color: '#fff', letterSpacing: '0.06em' }}><span style={{ color: C.neon }}>●</span> {me.gems}</div>}
        {user
          ? <button onClick={onLogout} style={ghost(false)}>LOGOUT</button>
          : <button onClick={onLogin} style={ghost(true)}>GOOGLEでログイン</button>}
      </div>

      <div style={{ padding: desktop ? '5vh 0 40px 6vw' : '3vh 0 40px 6vw', display: 'flex', flexDirection: 'column', gap: 28 }}>
        <MenuList items={items} onSelect={onSelect} />

        {lockedKey && !user && (
          <div style={{ alignSelf: 'flex-start', maxWidth: 'min(420px, 88vw)', padding: '14px 16px', border: `1px solid rgba(${NEON_RGB},0.45)`, borderRadius: 14, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, flex: 1, minWidth: 150, color: '#fff' }}>
              <b style={{ fontFamily: DISPLAY, fontSize: 16, letterSpacing: '0.08em' }}>{HOME_ITEMS.find((i) => i.key === lockedKey)?.label}</b> はログインが必要です
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
