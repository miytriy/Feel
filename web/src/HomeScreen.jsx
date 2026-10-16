import { useIsDesktop, C, FONT, DISPLAY } from './ui.js'
import { ScreenHeader, Chip } from './chrome.jsx'
import { IconPlay, IconCareer, IconCollection, IconAgents, IconParty, IconStore, IconLock, IconRules, IconGem } from './icons.jsx'

// ホーム画面: 暗い灰色の背景に、まるい飾りの輪・左右のパネル・下の黄色い PLAY ボタンを並べる(説明文はなし)。
// account の項目は、アカウント(ログイン)がある人だけが使える(ログインなしだと、うすくなって🔒が付く)。

export const HOME_ITEMS = [
  { key: 'play', label: 'PLAY', account: false },
  { key: 'agents', label: 'AGENTS', account: true, Icon: IconAgents, side: 'left' },
  { key: 'party', label: 'PARTY', account: true, Icon: IconParty, side: 'left' },
  { key: 'store', label: 'STORE', account: true, Icon: IconStore, side: 'left' },
  { key: 'career', label: 'CAREER', account: true, Icon: IconCareer, side: 'right' },
  { key: 'codex', label: 'COLLECTION', account: false, Icon: IconCollection, side: 'right' },
]
export const ACCOUNT_SCREENS = HOME_ITEMS.filter((i) => i.account).map((i) => i.key)

const YELLOW = '#ffe600'
export const HOME_CSS = `
.hud { min-height: 100vh; min-height: 100dvh; color: #f1f1f2; font-family: ${FONT}; position: relative; overflow: hidden; display: flex; flex-direction: column;
  background: radial-gradient(ellipse 70% 60% at 50% 52%, #303034 0%, #17171a 55%, #0a0a0b 100%); }
.hud::before { content: ''; position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background: repeating-linear-gradient(135deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 7px); }
.hud > * { position: relative; }
.hud-top { display: flex; align-items: center; gap: 12px; padding: 16px 28px; padding-top: calc(16px + env(safe-area-inset-top)); }
.hud-brand { display: flex; align-items: center; gap: 10px; }
.hud-brand h1 { margin: 0; font-size: 28px; line-height: 1; letter-spacing: 0.16em; text-transform: uppercase; }
.hud-btn { padding: 8px 20px; border-radius: 999px; border: 1.5px solid rgba(255,255,255,0.35); background: rgba(255,255,255,0.06); color: #fff; min-height: 0;
  font-family: ${DISPLAY}; font-weight: 600; font-size: 13px; letter-spacing: 0.12em; cursor: pointer; transition: background 0.15s, border-color 0.15s; }
.hud-btn:hover { border-color: ${YELLOW}; }
.hud-btn.primary { background: ${YELLOW}; border-color: ${YELLOW}; color: #121212; }
.hud-main { flex: 1; display: grid; align-items: center; gap: 20px; padding: 0 5vw; grid-template-columns: minmax(200px, 1fr) minmax(320px, 1.15fr) minmax(190px, 1fr); grid-template-areas: "l c r"; }
.hud-left { grid-area: l; display: flex; flex-direction: column; gap: 14px; }
.hud-center { grid-area: c; display: flex; flex-direction: column; align-items: center; }
.hud-right { grid-area: r; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-content: center; }

/* パネル: 明るい灰色。選ぶと黄色になって、少し動く */
.hud-panel { position: relative; display: flex; align-items: center; gap: 16px; border: 0; cursor: pointer; text-align: left; color: #1c1c1f; min-height: 0;
  background: linear-gradient(135deg, #ececee 0%, #c6c6ca 100%); font-family: ${DISPLAY}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;
  transition: transform 0.16s ease, background 0.16s ease, filter 0.16s ease; }
.hud-panel .hud-ico { font-size: 40px; flex: none; display: block; }
.hud-panel .hud-label { font-size: 22px; line-height: 1.05; }
.hud-left .hud-panel { height: clamp(84px, 17vh, 130px); padding: 0 34px 0 36px; clip-path: polygon(7% 0, 100% 0, 93% 100%, 0 100%); }
.hud-left .hud-panel:nth-child(2) { margin-left: -2.5vw; }
.hud-left .hud-panel:nth-child(1), .hud-left .hud-panel:nth-child(3) { margin-left: 1vw; }
.hud-right .hud-panel { flex-direction: column; justify-content: center; gap: 10px; aspect-ratio: 1 / 1.05; padding: 12px 6px; text-align: center;
  clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px)); }
.hud-right .hud-panel .hud-label { font-size: 15px; letter-spacing: 0.06em; }
.hud-right .hud-panel .hud-ico { font-size: 46px; }
.hud-panel:focus-visible, .hud-panel:active { outline: none; background: linear-gradient(135deg, #fff35a 0%, ${YELLOW} 100%); transform: translateX(8px); }
@media (hover: hover) { .hud-panel:hover { background: linear-gradient(135deg, #fff35a 0%, ${YELLOW} 100%); transform: translateX(8px); } }
.hud-right .hud-panel:focus-visible, .hud-right .hud-panel:active { transform: translateY(-4px); }
@media (hover: hover) { .hud-right .hud-panel:hover { transform: translateY(-4px); } }
.hud-panel.locked { filter: grayscale(1) brightness(0.62); }
.hud-panel.locked:hover { filter: grayscale(1) brightness(0.8); }
.hud-lock { position: absolute; right: 16%; top: 12px; font-size: 18px; }
.hud-right .hud-lock { right: 18px; }
.hud-badge { position: absolute; right: 14%; top: -5px; width: 14px; height: 14px; background: var(--c-badge); transform: rotate(45deg); box-shadow: 0 0 10px rgba(255,122,0,0.7); }
.hud-right .hud-badge { right: 6px; top: 8px; }

/* まるい飾りの輪 + PLAY */
.hud-ring { width: min(48vh, 34vw, 430px); aspect-ratio: 1; }
.hud-ring svg { width: 100%; height: 100%; display: block; overflow: visible; }
.hud-spin { transform-origin: 0 0; animation: hud-spin 90s linear infinite; }
@keyframes hud-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .hud-spin { animation: none; } }
.hud-play-wrap { margin-top: -5%; width: min(440px, 96%); filter: drop-shadow(0 8px 20px rgba(255,230,0,0.28)); transition: transform 0.16s ease, filter 0.16s ease; }
.hud-play { width: 100%; height: 76px; display: flex; align-items: center; justify-content: center; gap: 14px; border: 0; cursor: pointer; color: #141414; min-height: 0;
  background: linear-gradient(180deg, #fff55c 0%, ${YELLOW} 55%, #e2cb00 100%); clip-path: polygon(6% 0, 100% 0, 94% 100%, 0 100%);
  font-family: ${DISPLAY}; font-weight: 700; font-size: 36px; letter-spacing: 0.16em; }
.hud-play .hud-ico { font-size: 34px; display: block; }
@media (hover: hover) { .hud-play-wrap:hover { transform: translateY(-3px); filter: drop-shadow(0 10px 26px rgba(255,230,0,0.55)); } }
.hud-play-wrap:active, .hud-play-wrap:focus-within { transform: translateY(-3px); }
.hud-play.sub { background: linear-gradient(135deg, #ececee 0%, #c6c6ca 100%); font-size: 26px; height: 64px; }
.hud-play-wrap.sub { filter: none; }
@media (hover: hover) { .hud-play.sub:hover { background: linear-gradient(135deg, #fff35a 0%, ${YELLOW} 100%); } }

/* 下: プレイヤーのカード */
.hud-foot { display: flex; align-items: flex-end; gap: 18px; padding: 10px 28px 22px; padding-bottom: calc(22px + env(safe-area-inset-bottom)); flex-wrap: wrap; }
.hud-card { display: flex; align-items: center; gap: 12px; padding: 8px 26px 8px 8px; background: rgba(0,0,0,0.55); border-left: 4px solid ${YELLOW}; clip-path: polygon(0 0, 100% 0, calc(100% - 14px) 100%, 0 100%); }
.hud-avatar { width: 46px; height: 46px; background: #2e2e33; display: grid; place-items: center; font-family: ${DISPLAY}; font-weight: 700; font-size: 22px; color: ${YELLOW}; overflow: hidden; }
.hud-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.hud-name { font-family: ${DISPLAY}; font-weight: 700; font-size: 18px; letter-spacing: 0.06em; line-height: 1.1; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hud-uid { font-size: 11px; color: #9b9ba3; letter-spacing: 0.06em; margin-top: 3px; }
.hud-toast { display: flex; align-items: center; gap: 14px; padding: 10px 16px; background: rgba(0,0,0,0.6); border-left: 4px solid ${YELLOW}; max-width: min(440px, 100%); }

@media (max-width: 899px) {
  .hud-top { padding: 12px 14px; padding-top: calc(12px + env(safe-area-inset-top)); }
  .hud-main { grid-template-columns: 1fr; grid-template-areas: "c" "l" "r"; align-content: start; gap: 16px; padding: 4px 14px 8px; }
  .hud-ring { width: min(58vw, 280px); }
  .hud-left, .hud-right { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .hud-left .hud-panel, .hud-right .hud-panel { height: 84px; aspect-ratio: auto; flex-direction: row; justify-content: flex-start; padding: 0 14px; gap: 12px; text-align: left; margin-left: 0 !important;
    clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px)); }
  .hud-left .hud-panel:nth-child(3) { grid-column: 1 / -1; }
  .hud-left .hud-panel .hud-label, .hud-right .hud-panel .hud-label { font-size: 16px; letter-spacing: 0.06em; }
  .hud-left .hud-panel .hud-ico, .hud-right .hud-panel .hud-ico { font-size: 32px; }
  .hud-lock, .hud-right .hud-lock { right: 12px; top: 8px; }
  .hud-badge, .hud-right .hud-badge { right: 8px; top: 8px; }
  .hud-panel:focus-visible, .hud-panel:active, .hud-right .hud-panel:focus-visible, .hud-right .hud-panel:active { transform: none; }
  .hud-foot { padding: 6px 14px 16px; padding-bottom: calc(16px + env(safe-area-inset-bottom)); }
  .hud-play { height: 68px; font-size: 32px; }
}
`

// まるい飾りの輪(中は、Feelのマーク)。ホームは、いつも暗い画面なので、色はそのまま書く
function Ring() {
  return (
    <div className="hud-ring" aria-hidden="true">
      <svg viewBox="-210 -210 420 420">
        <g className="hud-spin"><circle r="199" fill="none" stroke="#6d6d74" strokeWidth="2" strokeDasharray="1.5 9" /></g>
        <circle r="188" fill="none" stroke="#d8d8da" strokeWidth="5" pathLength="100" strokeDasharray="30 3 22 3 26 3 9 4" transform="rotate(-100)" />
        <circle r="188" fill="none" stroke={YELLOW} strokeWidth="5" pathLength="100" strokeDasharray="9 91" transform="rotate(-48)" />
        <circle r="168" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
        <circle r="136" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1.5" strokeDasharray="7 5" />
        <circle r="104" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" strokeDasharray="7 5" />
        <path d="M-210 0h22M188 0h22M0 -210v22M0 188v22" stroke="#9b9ba3" strokeWidth="2" />
        <circle r="9" fill="#ff5a36" /><circle r="28" fill="none" stroke={YELLOW} strokeWidth="3" /><circle r="52" fill="none" stroke={YELLOW} strokeWidth="1.6" opacity="0.5" />
        <text y="112" textAnchor="middle" fill="#fff" style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 56, letterSpacing: '0.2em' }}>FEEL</text>
        <rect x="-26" y="126" width="52" height="4" fill={YELLOW} />
      </svg>
    </div>
  )
}

function Panel({ item, locked, badge, onSelect }) {
  const { Icon } = item
  return (
    <button type="button" data-testid={`home-${item.key}`} className={`hud-panel${locked ? ' locked' : ''}`} onClick={() => onSelect(item.key)}>
      <Icon className="hud-ico" />
      <span className="hud-label">{item.label}</span>
      {locked && <IconLock className="hud-lock" aria-label="ログインが必要" />}
      {badge && <i className="hud-badge" aria-label="受け取れるものがあります" />}
    </button>
  )
}

export default function HomeScreen({ user, me, lockedKey, onSelect, onLogin, onLogout }) {
  useIsDesktop() // 画面の幅が変わったとき、すぐ作り直す(見た目は CSS が切り替える)
  const lockedLabel = HOME_ITEMS.find((i) => i.key === lockedKey)?.label
  const claimable = !!(user && me && me.loginBonus && me.loginBonus.canClaim)
  const items = (side) => HOME_ITEMS.filter((i) => i.side === side)
  const name = user ? user.displayName || user.email || 'PLAYER' : 'GUEST'
  return (
    <div className="hud theme-dark">
      <style>{HOME_CSS}</style>
      <header className="hud-top">
        <div className="hud-brand">
          <svg width="30" height="30" viewBox="-16 -16 32 32" aria-hidden="true"><circle r="3.6" fill="#ff5a36" /><circle r="8.6" fill="none" stroke={YELLOW} strokeWidth="2" /><circle r="14" fill="none" stroke={YELLOW} strokeWidth="1.2" opacity="0.5" /></svg>
          <h1>Feel</h1>
        </div>
        <div style={{ flex: 1 }} />
        {user && me && <Chip><IconGem style={{ color: YELLOW }} />{me.gems}</Chip>}
        {user ? <button className="hud-btn" onClick={onLogout}>LOGOUT</button> : <button className="hud-btn primary" onClick={onLogin}>LOGIN</button>}
      </header>

      <div className="hud-main">
        <div className="hud-left">
          {items('left').map((it) => <Panel key={it.key} item={it} locked={it.account && !user} badge={it.key === 'store' && claimable} onSelect={onSelect} />)}
        </div>
        <div className="hud-center">
          <Ring />
          <div className="hud-play-wrap">
            <button type="button" data-testid="home-play" className="hud-play" onClick={() => onSelect('play')}><IconPlay className="hud-ico" />PLAY</button>
          </div>
        </div>
        <div className="hud-right">
          {items('right').map((it) => <Panel key={it.key} item={it} locked={it.account && !user} onSelect={onSelect} />)}
        </div>
      </div>

      <footer className="hud-foot">
        <div className="hud-card">
          <div className="hud-avatar">{user && user.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : name.slice(0, 1).toUpperCase()}</div>
          <div>
            <div className="hud-name">{name}</div>
            <div className="hud-uid">UID: {user ? String(user.uid).slice(0, 10) : '----------'}</div>
          </div>
        </div>
        {lockedKey && !user && (
          <div className="hud-toast">
            <span style={{ fontSize: 14 }}><b style={{ fontFamily: DISPLAY, letterSpacing: '0.08em' }}>{lockedLabel}</b> はログインが必要です</span>
            <button className="hud-btn primary" onClick={onLogin}>LOGIN</button>
          </div>
        )}
      </footer>
    </div>
  )
}

// PLAY: 対戦メニュー(ホームと同じ見た目)
export function PlayMenu({ onBattle, onRules, onExit }) {
  return (
    <div className="hud theme-dark">
      <style>{HOME_CSS}</style>
      <ScreenHeader title="PLAY" onClose={onExit} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, padding: '24px 18px 60px' }}>
        <div className="hud-play-wrap" style={{ width: 'min(520px, 100%)' }}>
          <button type="button" data-testid="home-battle" className="hud-play" onClick={onBattle}><IconPlay className="hud-ico" />CPU対戦</button>
        </div>
        <div className="hud-play-wrap sub" style={{ width: 'min(520px, 100%)' }}>
          <button type="button" data-testid="home-rules" className="hud-play sub" onClick={onRules}><IconRules className="hud-ico" />ルール説明</button>
        </div>
      </div>
    </div>
  )
}
