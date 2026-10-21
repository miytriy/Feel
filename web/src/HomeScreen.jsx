import { useState } from 'react'
import { C, FONT, DISPLAY } from './ui.js'
import { ScreenHeader } from './chrome.jsx'
import { IconPlay, IconCareer, IconCollection, IconAgents, IconParty, IconStore, IconLock, IconRules, IconGem, IconEvent, IconGacha, IconGear, IconMail, IconPower, IconPlus } from './icons.jsx'

// ホーム画面(参考: エンドフィールドのホーム)
//   上の行: 設定・メールボックス / 左の列: 人事・イベント・ガチャ・購買部 / 右の列: 足跡・Wiki・編成… / 中央: 輪と PLAY
//   account の項目は、アカウント(ログイン)がある人だけが使える(ログインなしだと、暗くなって🔒が付く)。
//   soon の項目は、まだ中身がない(押すと「準備中」と出る)。
// ★ 新しい機能は、右の列(side: 'right')の HOME_ITEMS の最後に足す。空きのパネルは、自動でへる。

export const HOME_ITEMS = [
  { key: 'agents', label: '人事', no: '01', side: 'left', account: true, Icon: IconAgents },
  { key: 'event', label: 'イベント', no: '02', side: 'left', soon: true, Icon: IconEvent },
  { key: 'gacha', label: 'ガチャ', no: '03', side: 'left', account: true, Icon: IconGacha },
  { key: 'store', label: '購買部', no: '04', side: 'left', account: true, Icon: IconStore },
  { key: 'career', label: '足跡', no: '05', side: 'right', account: true, Icon: IconCareer },
  { key: 'codex', label: 'Wiki', no: '06', side: 'right', Icon: IconCollection },
  { key: 'party', label: '編成', no: '07', side: 'right', account: true, Icon: IconParty },
]
export const TOP_ITEMS = [
  { key: 'settings', label: '設定', Icon: IconGear },
  { key: 'mail', label: 'メールボックス', account: true, Icon: IconMail },
]
const ALL = [...HOME_ITEMS, ...TOP_ITEMS]
export const ACCOUNT_SCREENS = ALL.filter((i) => i.account).map((i) => i.key)
// ジェム・ガチャ・メールのように、サーバーにあるデータを使う項目は、解放しても、ログインが必要なまま
export const SERVER_SCREENS = ['gacha', 'store', 'mail']
// 最高権限(レベル2)で、体験用に開ける、サーバーの項目(石もキャラも、この端末の中だけの仮のもの)
export const SANDBOX_SCREENS = ['gacha', 'mail']
// ログインしていなくても、この解放のレベルで開けるか
export const canOpen = (key, unlockLevel = 0) => (unlockLevel >= 1 && !SERVER_SCREENS.includes(key)) || (unlockLevel >= 2 && SANDBOX_SCREENS.includes(key))
const RIGHT_SLOTS = 6 // 右の列に並べる空きを含めた数(足りないぶんは、空きのパネルで埋める)

const YELLOW = '#ffe600'
// パネルの中の、細かい等高線(地形図のような線)
const TOPO = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="140" viewBox="0 0 220 140" fill="none" stroke="#000" stroke-opacity="0.09" stroke-width="1"><ellipse cx="150" cy="70" rx="120" ry="52" transform="rotate(-14 150 70)"/><ellipse cx="150" cy="70" rx="96" ry="40" transform="rotate(-14 150 70)"/><ellipse cx="150" cy="70" rx="72" ry="29" transform="rotate(-14 150 70)"/><ellipse cx="150" cy="70" rx="48" ry="19" transform="rotate(-14 150 70)"/><ellipse cx="150" cy="70" rx="24" ry="9" transform="rotate(-14 150 70)"/><path d="M0 120c40-14 70 6 110-6s70-22 110-8"/><path d="M0 100c40-14 70 6 110-6s70-22 110-8"/></svg>'
)}")`

export const HOME_CSS = `
.hud { min-height: 100vh; min-height: 100dvh; color: #f1f1f2; font-family: ${FONT}; position: relative; overflow: hidden; display: flex; flex-direction: column;
  background: radial-gradient(ellipse 62% 58% at 50% 50%, #2e2e32 0%, #151518 56%, #080809 100%); }
.hud::before { content: ''; position: absolute; inset: 0; pointer-events: none; opacity: 0.55;
  background: repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 7px); }
.hud > * { position: relative; }
.hud-mark { position: absolute !important; width: 14px; height: 14px; opacity: 0.5; pointer-events: none; }
.hud-mark::before, .hud-mark::after { content: ''; position: absolute; background: #cfcfd4; }
.hud-mark::before { left: 6px; top: 0; width: 2px; height: 14px; } .hud-mark::after { left: 0; top: 6px; width: 14px; height: 2px; }

/* 上の行 */
.hud-top { display: flex; align-items: center; gap: 14px; padding: 14px 28px; padding-top: calc(14px + env(safe-area-inset-top)); }
.hud-icon { position: relative; width: 46px; height: 46px; display: grid; place-items: center; background: none; border: 0; border-bottom: 3px solid rgba(255,255,255,0.18); color: #e8e8ea; font-size: 28px; cursor: pointer; padding: 0; min-height: 0; transition: color 0.15s, border-color 0.15s, transform 0.15s; }
.hud-icon:hover, .hud-icon:focus-visible { color: ${YELLOW}; border-color: ${YELLOW}; outline: none; transform: translateY(-2px); }
.hud-icon.locked { opacity: 0.5; }
.hud-icon .hud-badge { right: 2px; top: 2px; }
.hud-gems { display: flex; align-items: center; gap: 8px; padding: 4px 4px 4px 14px; background: rgba(255,255,255,0.1); border-radius: 999px; font-family: ${DISPLAY}; font-weight: 700; font-size: 18px; letter-spacing: 0.04em; transform: skewX(-8deg); }
.hud-gems > * { transform: skewX(8deg); }
.hud-plus { width: 30px; height: 30px; border-radius: 50%; border: 0; background: #f2f2f3; color: #1c1c1f; display: grid; place-items: center; font-size: 18px; cursor: pointer; padding: 0; min-height: 0; transition: background 0.15s; }
.hud-plus:hover, .hud-plus:focus-visible { background: ${YELLOW}; outline: none; }
.hud-btn { padding: 8px 20px; border-radius: 999px; border: 1.5px solid rgba(255,255,255,0.35); background: rgba(255,255,255,0.06); color: #fff; min-height: 0;
  font-family: ${DISPLAY}; font-weight: 600; font-size: 13px; letter-spacing: 0.12em; cursor: pointer; transition: background 0.15s, border-color 0.15s; }
.hud-btn:hover { border-color: ${YELLOW}; }
.hud-btn.primary { background: ${YELLOW}; border-color: ${YELLOW}; color: #121212; }

.hud-main { flex: 1; display: grid; align-items: center; gap: 18px; padding: 0 4vw; grid-template-columns: minmax(210px, 1fr) minmax(320px, 1.15fr) minmax(220px, 1fr); grid-template-areas: "l c r"; }
.hud-left { grid-area: l; display: flex; flex-direction: column; gap: 12px; }
.hud-center { grid-area: c; display: flex; flex-direction: column; align-items: center; }
.hud-right { grid-area: r; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-content: center; }

/* パネル: 明るい灰色 + 等高線。うしろに、少しずれた暗い板(重なって見える)。選ぶと黄色になって、少し動く */
.hud-cell { position: relative; }
.hud-cell::before { content: ''; position: absolute; inset: 0; background: #0a0a0b; opacity: 0.85; transform: translate(7px, 7px); }
.hud-left .hud-cell, .hud-left .hud-cell::before { clip-path: polygon(7% 0, 100% 0, 93% 100%, 0 100%); }
.hud-right .hud-cell, .hud-right .hud-cell::before { clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px)); }
.hud-cell { filter: drop-shadow(0 6px 10px rgba(0,0,0,0.45)); }
.hud-cell > .hud-panel { position: relative; width: 100%; height: 100%; }
.hud-panel { display: flex; align-items: center; gap: 16px; border: 0; cursor: pointer; text-align: left; color: #1c1c1f; min-height: 0; overflow: hidden;
  background: ${TOPO} right center / auto 100% no-repeat, linear-gradient(135deg, #ececee 0%, #c6c6ca 100%); font-family: ${DISPLAY}; font-weight: 700; letter-spacing: 0.08em;
  transition: transform 0.16s ease, background-color 0.16s ease, filter 0.16s ease; }
.hud-panel .hud-ico { font-size: 40px; flex: none; display: block; }
.hud-panel .hud-label { font-size: 21px; line-height: 1.1; }
.hud-panel .hud-no { position: absolute; left: 14%; top: 6px; font-size: 10px; letter-spacing: 0.1em; color: rgba(0,0,0,0.38); font-weight: 600; }
.hud-left .hud-panel { height: clamp(78px, 15vh, 118px); padding: 0 30px 0 38px; }
.hud-left .hud-cell:nth-child(2) { margin-left: -2.2vw; } .hud-left .hud-cell:nth-child(3) { margin-left: -2.2vw; }
.hud-left .hud-cell:nth-child(1), .hud-left .hud-cell:nth-child(4) { margin-left: 0.6vw; }
.hud-left .hud-cell::after { content: ''; position: absolute; left: 100%; top: 50%; width: 5vw; height: 7px; margin-left: 10px; border-top: 1px solid rgba(255,255,255,0.28); border-bottom: 1px solid rgba(255,255,255,0.28); opacity: 0.8; }
.hud-right .hud-panel { flex-direction: column; justify-content: center; gap: 8px; aspect-ratio: 1 / 0.95; padding: 10px 4px; text-align: center; }
.hud-right .hud-panel .hud-label { font-size: 15px; letter-spacing: 0.04em; }
.hud-right .hud-panel .hud-ico { font-size: 42px; }
.hud-right .hud-panel .hud-no { left: 12px; top: 8px; }
.hud-panel:focus-visible, .hud-panel:active { outline: none; background-color: ${YELLOW}; background-image: ${TOPO}, linear-gradient(135deg, #fff35a 0%, ${YELLOW} 100%); transform: translateX(8px); }
@media (hover: hover) { .hud-panel:hover { background-image: ${TOPO}, linear-gradient(135deg, #fff35a 0%, ${YELLOW} 100%); transform: translateX(8px); } }
.hud-right .hud-panel:focus-visible, .hud-right .hud-panel:active { transform: translateY(-4px); }
@media (hover: hover) { .hud-right .hud-panel:hover { transform: translateY(-4px); } }
.hud-panel.locked { filter: grayscale(1) brightness(0.6); }
.hud-panel.locked:hover { filter: grayscale(1) brightness(0.78); }
.hud-panel.soon { filter: grayscale(1) brightness(0.72); }
.hud-lock { position: absolute; right: 14%; top: 10px; font-size: 17px; }
.hud-right .hud-lock { right: 12px; top: 10px; }
.hud-soon { position: absolute; right: 16%; bottom: 8px; font-size: 9px; letter-spacing: 0.16em; font-weight: 700; color: rgba(0,0,0,0.5); }
.hud-right .hud-soon { right: 0; left: 0; bottom: 8px; text-align: center; }
.hud-badge { position: absolute; right: 14%; top: -5px; width: 14px; height: 14px; background: var(--c-badge); transform: rotate(45deg); box-shadow: 0 0 10px rgba(255,122,0,0.7); z-index: 2; }
.hud-right .hud-badge { right: 8px; top: 6px; }
.hud-empty { aspect-ratio: 1 / 0.95; background: rgba(255,255,255,0.05); border: 1px dashed rgba(255,255,255,0.18); display: grid; place-items: center; color: rgba(255,255,255,0.22); font-size: 22px; font-family: ${DISPLAY}; clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px)); }

/* まるい飾りの輪 + PLAY */
.hud-ring { width: min(46vh, 33vw, 420px); aspect-ratio: 1; }
.hud-ring svg { width: 100%; height: 100%; display: block; overflow: visible; }
.hud-spin { transform-origin: 0 0; animation: hud-spin 90s linear infinite; }
.hud-spin.rev { animation-direction: reverse; animation-duration: 140s; }
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
.hud-logo { margin-top: 12px; font-family: ${DISPLAY}; font-size: 11px; letter-spacing: 0.5em; color: rgba(255,255,255,0.4); text-align: center; }

/* 下: プレイヤーのカード */
.hud-foot { display: flex; align-items: flex-end; gap: 14px; padding: 10px 28px 22px; padding-bottom: calc(22px + env(safe-area-inset-bottom)); flex-wrap: wrap; }
.hud-power { width: 46px; height: 46px; display: grid; place-items: center; border: 0; padding: 0; cursor: pointer; color: #fff; font-size: 24px; min-height: 0;
  background: repeating-linear-gradient(135deg, #c0302c 0 3px, #8e1f1c 3px 6px); transition: filter 0.15s, transform 0.15s; }
.hud-power:hover, .hud-power:focus-visible { filter: brightness(1.25); transform: translateY(-2px); outline: none; }
.hud-power.in { background: ${YELLOW}; color: #121212; }
.hud-card { position: relative; display: flex; align-items: center; gap: 12px; padding: 8px 30px 8px 8px; background: rgba(0,0,0,0.6); border-left: 4px solid ${YELLOW}; border-top: 1px solid rgba(255,230,0,0.35); clip-path: polygon(0 0, 100% 0, calc(100% - 16px) 100%, 0 100%); }
.hud-avatar { width: 46px; height: 46px; background: #2e2e33; display: grid; place-items: center; font-family: ${DISPLAY}; font-weight: 700; font-size: 22px; color: ${YELLOW}; overflow: hidden; outline: 1px solid rgba(255,230,0,0.5); }
.hud-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.hud-name { font-family: ${DISPLAY}; font-weight: 700; font-size: 18px; letter-spacing: 0.06em; line-height: 1.1; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hud-uid { font-size: 11px; color: #9b9ba3; letter-spacing: 0.06em; margin-top: 3px; }
.hud-toast { display: flex; align-items: center; gap: 14px; padding: 10px 16px; background: rgba(0,0,0,0.65); border-left: 4px solid ${YELLOW}; max-width: min(440px, 100%); }

@media (max-width: 899px) {
  .hud-top { padding: 10px 14px; padding-top: calc(10px + env(safe-area-inset-top)); gap: 8px; }
  .hud-main { grid-template-columns: 1fr; grid-template-areas: "c" "l" "r"; align-content: start; gap: 18px; padding: 4px 14px 8px; }
  .hud-ring { width: min(56vw, 270px); }
  .hud-left, .hud-right { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .hud-cell { margin-left: 0 !important; } .hud-cell::after { display: none; }
  .hud-left .hud-cell, .hud-left .hud-cell::before, .hud-right .hud-cell, .hud-right .hud-cell::before { clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px)); }
  .hud-cell::before { transform: translate(5px, 5px); }
  .hud-left .hud-panel, .hud-right .hud-panel { height: 80px; aspect-ratio: auto; flex-direction: row; justify-content: flex-start; padding: 0 12px 0 14px; gap: 12px; text-align: left; }
  .hud-right .hud-cell:nth-child(3) { grid-column: 1 / -1; }
  .hud-empty { display: none; }
  .hud-panel .hud-label, .hud-right .hud-panel .hud-label { font-size: 17px; letter-spacing: 0.04em; }
  .hud-panel .hud-ico, .hud-right .hud-panel .hud-ico { font-size: 30px; }
  .hud-panel .hud-no, .hud-right .hud-panel .hud-no { left: auto; right: 14px; top: 6px; }
  .hud-lock, .hud-right .hud-lock { right: 12px; top: auto; bottom: 8px; }
  .hud-soon, .hud-right .hud-soon { right: 12px; left: auto; bottom: 8px; }
  .hud-badge, .hud-right .hud-badge { right: 6px; top: 4px; }
  .hud-panel:focus-visible, .hud-panel:active, .hud-right .hud-panel:focus-visible, .hud-right .hud-panel:active { transform: none; }
  .hud-foot { padding: 6px 14px 16px; padding-bottom: calc(16px + env(safe-area-inset-bottom)); }
  .hud-play { height: 68px; font-size: 32px; }
  .hud-mark { display: none; }
}
`

// まるい飾りの輪(中は、Feelのマーク)。ホームは、いつも暗い画面なので、色はそのまま書く
function Ring() {
  return (
    <div className="hud-ring" aria-hidden="true">
      <svg viewBox="-215 -215 430 430">
        <g className="hud-spin"><circle r="204" fill="none" stroke="#6d6d74" strokeWidth="2" strokeDasharray="1.5 9" /></g>
        {/* 外のふとい弧(左と右) */}
        <circle r="192" fill="none" stroke="#d8d8da" strokeWidth="6" pathLength="100" strokeDasharray="14 2 10 2 22 14 14 2 10 2 22 14" transform="rotate(-20)" />
        <circle r="192" fill="none" stroke={YELLOW} strokeWidth="5" pathLength="100" strokeDasharray="8 92" transform="rotate(-52)" />
        <circle r="176" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
        <g className="hud-spin rev"><circle r="166" fill="none" stroke="rgba(255,230,0,0.35)" strokeWidth="1.2" strokeDasharray="30 8 4 8" /></g>
        {/* 等高線 */}
        <g fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1.4">
          <ellipse rx="140" ry="112" transform="rotate(-18)" /><ellipse rx="112" ry="86" transform="rotate(-18)" strokeDasharray="7 5" />
          <ellipse rx="84" ry="62" transform="rotate(-18)" /><ellipse rx="56" ry="40" transform="rotate(-18)" strokeDasharray="7 5" />
          <path d="M-150 60c40-26 80 8 120-10s70-34 110-14 40 24 60 14" />
        </g>
        {/* しるし: 三角・十字 */}
        <polygon points="-218,-10 -200,0 -218,10" fill={YELLOW} opacity="0.9" /><polygon points="218,-10 200,0 218,10" fill={YELLOW} opacity="0.9" />
        <path d="M-215 0h14M201 0h14M0 -215v14M0 201v14" stroke="#9b9ba3" strokeWidth="2" />
        <path d="M-70 -192l6 0M64 -192l6 0M-132 -150l5 5M127 -145l5 -5" stroke="#9b9ba3" strokeWidth="2" strokeLinecap="round" />
        <circle r="9" fill="#ff5a36" /><circle r="28" fill="none" stroke={YELLOW} strokeWidth="3" /><circle r="52" fill="none" stroke={YELLOW} strokeWidth="1.6" opacity="0.5" />
        <text y="116" textAnchor="middle" fill="#fff" style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 54, letterSpacing: '0.2em' }}>FEEL</text>
        <rect x="-26" y="130" width="52" height="4" fill={YELLOW} />
      </svg>
    </div>
  )
}

function Panel({ item, locked, badge, onPress }) {
  const { Icon } = item
  return (
    <div className="hud-cell">
      <button type="button" data-testid={`home-${item.key}`} className={`hud-panel${locked ? ' locked' : ''}${item.soon ? ' soon' : ''}`} onClick={() => onPress(item)}>
        <span className="hud-no">{item.no}</span>
        <Icon className="hud-ico" />
        <span className="hud-label">{item.label}</span>
        {locked && <IconLock className="hud-lock" aria-label="ログインが必要" />}
        {item.soon && <span className="hud-soon">COMING SOON</span>}
        {badge && <i className="hud-badge" aria-label="受け取れるものがあります" />}
      </button>
    </div>
  )
}

export default function HomeScreen({ user, me, giftCount = 0, lockedKey, unlockLevel = 0, onSelect, onLogin, onLogout }) {
  const isLocked = (it) => !!(it.account && !user && !canOpen(it.key, unlockLevel))
  const [soon, setSoon] = useState('') // 「準備中」のお知らせ
  const lockedLabel = ALL.find((i) => i.key === lockedKey)?.label
  const claimable = !!(user && me && me.loginBonus && me.loginBonus.canClaim)
  const left = HOME_ITEMS.filter((i) => i.side === 'left')
  const right = HOME_ITEMS.filter((i) => i.side === 'right')
  const empties = Math.max(0, RIGHT_SLOTS - right.length)
  const name = user ? user.displayName || user.email || 'PLAYER' : 'GUEST'
  const press = (item) => {
    if (item.soon) { setSoon(`${item.label}は、準備中です`); return }
    setSoon('')
    onSelect(item.key)
  }
  return (
    <div className="hud theme-dark">
      <style>{HOME_CSS}</style>
      {[['6%', '22%'], ['93%', '30%'], ['3%', '68%'], ['96%', '74%'], ['50%', '9%']].map(([l, t], i) => <i key={i} className="hud-mark" style={{ left: l, top: t }} />)}

      <header className="hud-top">
        {TOP_ITEMS.map((it) => {
          const locked = isLocked(it)
          return (
            <button key={it.key} type="button" data-testid={`home-${it.key}`} className={`hud-icon${locked ? ' locked' : ''}`} onClick={() => press(it)} aria-label={it.label} title={it.label}>
              <it.Icon />
              {it.key === 'mail' && giftCount > 0 && <i className="hud-badge" aria-label="プレゼントがあります" />}
            </button>
          )
        })}
        <div style={{ flex: 1 }} />
        {user && me && (
          <div className="hud-gems"><IconGem style={{ color: YELLOW, fontSize: 18 }} /><span>{me.gems}</span>
            <button type="button" className="hud-plus" onClick={() => onSelect('store')} aria-label="購買部へ"><IconPlus /></button></div>
        )}
        <div style={{ flex: 1 }} />
        {!user && <button className="hud-btn primary" onClick={onLogin}>LOGIN</button>}
      </header>

      <div className="hud-main">
        <div className="hud-left">
          {left.map((it) => <Panel key={it.key} item={it} locked={isLocked(it)} badge={it.key === 'store' && claimable} onPress={press} />)}
        </div>
        <div className="hud-center">
          <Ring />
          <div className="hud-play-wrap">
            <button type="button" data-testid="home-play" className="hud-play" onClick={() => { setSoon(''); onSelect('play') }}><IconPlay className="hud-ico" />PLAY</button>
          </div>
          <div className="hud-logo">FEEL · BATTLE SYSTEM</div>
        </div>
        <div className="hud-right">
          {right.map((it) => <Panel key={it.key} item={it} locked={isLocked(it)} onPress={press} />)}
          {Array.from({ length: empties }, (_, i) => <div key={'e' + i} className="hud-empty" aria-hidden="true">＋</div>)}
        </div>
      </div>

      <footer className="hud-foot">
        {user
          ? <button type="button" className="hud-power" onClick={onLogout} aria-label="ログアウト" title="ログアウト"><IconPower /></button>
          : <button type="button" className="hud-power in" onClick={onLogin} aria-label="ログイン" title="ログイン"><IconPower /></button>}
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
        {soon && <div className="hud-toast"><span style={{ fontSize: 14 }}>{soon}</span></div>}
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
