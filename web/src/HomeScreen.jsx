import { useIsDesktop, C, FONT } from './ui.js'

// ホーム画面: 項目の名前だけを並べる(説明文はなし)。選ぶと、それぞれの画面が開く。
// locked の項目は、アカウント(ログイン)がある人だけが使える。

export const HOME_ITEMS = [
  { key: 'play', label: 'PLAY', color: '#2f5bea', account: false },
  { key: 'career', label: 'CAREER', color: '#1a7f4b', account: true },
  { key: 'codex', label: 'COLLECTION', color: '#8b5cf6', account: false },
  { key: 'agents', label: 'AGENTS', color: '#b83a6b', account: true },
  { key: 'party', label: 'PARTY', color: '#e0a100', account: true },
  { key: 'store', label: 'STORE', color: '#c2570c', account: true },
]
export const ACCOUNT_SCREENS = HOME_ITEMS.filter((i) => i.account).map((i) => i.key)

const pill = (primary) => ({
  padding: '8px 14px', borderRadius: 10, fontSize: 14, fontWeight: 700, fontFamily: FONT, cursor: 'pointer',
  border: `1.5px solid ${primary ? C.player : C.line}`, background: primary ? C.player : C.card, color: primary ? '#fff' : C.ink,
})

export default function HomeScreen({ user, me, lockedKey, onSelect, onLogin, onLogout }) {
  const desktop = useIsDesktop()
  return (
    <div style={{ minHeight: '100vh', background: C.paper, color: C.ink, fontFamily: FONT }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: desktop ? '14px 36px' : '12px 14px', background: C.card, borderBottom: `1px solid ${C.line}` }}>
        <h1 style={{ margin: 0, fontSize: desktop ? 30 : 26, letterSpacing: 1 }}>Feel</h1>
        <div style={{ flex: 1 }} />
        {user && me && <div style={{ fontSize: 15 }}>通貨 <b>{me.gems}</b></div>}
        {user
          ? <button onClick={onLogout} style={{ ...pill(false), padding: '6px 10px', fontSize: 12 }}>ログアウト</button>
          : <button onClick={onLogin} style={pill(true)}>Googleでログイン</button>}
      </div>

      <div style={{ maxWidth: desktop ? 980 : 560, margin: '0 auto', padding: desktop ? '36px 36px' : '16px 12px calc(20px + env(safe-area-inset-bottom))' }}>
        <div style={{ display: 'grid', gap: desktop ? 20 : 12, gridTemplateColumns: desktop ? 'repeat(3, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))' }}>
          {HOME_ITEMS.map((it) => {
            const locked = it.account && !user
            return (
              <button
                key={it.key}
                data-testid={`home-${it.key}`}
                onClick={() => onSelect(it.key)}
                style={{
                  position: 'relative', textAlign: 'left', cursor: 'pointer', fontFamily: FONT,
                  padding: desktop ? '44px 24px' : '30px 14px', borderRadius: 14, color: C.ink,
                  border: `1px solid ${C.line}`, borderLeft: `8px solid ${it.color}`, background: C.card,
                  boxShadow: '0 1px 3px rgba(31,42,68,0.06)', opacity: locked ? 0.5 : 1,
                }}
              >
                <span style={{ fontSize: desktop ? 26 : 19, fontWeight: 800, letterSpacing: 1.5 }}>{it.label}</span>
                {locked && <span aria-label="ログインが必要" style={{ position: 'absolute', right: 12, top: 10, fontSize: 16 }}>🔒</span>}
              </button>
            )
          })}
        </div>

        {lockedKey && !user && (
          <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: C.card, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, flex: 1, minWidth: 160 }}>
              <b>{HOME_ITEMS.find((i) => i.key === lockedKey)?.label}</b> はログインが必要です
            </span>
            <button onClick={onLogin} style={pill(true)}>Googleでログイン</button>
          </div>
        )}
      </div>
    </div>
  )
}

// PLAY: 対戦メニュー
export function PlayMenu({ onBattle, onRules, onExit }) {
  const desktop = useIsDesktop()
  const big = { width: '100%', padding: desktop ? '26px 20px' : '22px 16px', borderRadius: 14, fontSize: desktop ? 22 : 19, fontWeight: 800, fontFamily: FONT, letterSpacing: 1, cursor: 'pointer' }
  return (
    <div style={{ minHeight: '100vh', background: C.paper, color: C.ink, fontFamily: FONT }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: desktop ? '14px 36px' : '12px 14px', background: C.card, borderBottom: `1px solid ${C.line}` }}>
        <button onClick={onExit} style={pill(false)}>← もどる</button>
        <h1 style={{ margin: 0, fontSize: desktop ? 24 : 20 }}>PLAY</h1>
      </div>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: desktop ? '36px 24px' : '16px 12px', display: 'grid', gap: 12 }}>
        <button onClick={onBattle} style={{ ...big, border: `1.5px solid ${C.player}`, background: C.player, color: '#fff' }}>CPU対戦</button>
        <button onClick={onRules} style={{ ...big, border: `1.5px solid ${C.line}`, background: C.card, color: C.ink, fontSize: desktop ? 17 : 16 }}>ルール説明</button>
      </div>
    </div>
  )
}
