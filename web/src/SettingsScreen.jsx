import { useEffect, useRef, useState } from 'react'
import { C, FONT, DISPLAY } from './ui.js'
import { SPEEDS } from './settings.js'
import { IconClose, IconAgents, IconRules } from './icons.jsx'

// 設定画面。参考: エンドフィールドの設定
//   左に、分類のアイコンの縦列(選ぶと黄色の四角になる) → 右に、黒い行が並ぶ(左に名前、右に操作)
//   分類を切り替えると、右の行が順番にふわっと出る。閉じるときは、その場でフェードアウト。
// ★ 設定を足すときは、下の PAGES に行(rows)を足す。type: 'choice'(選ぶ)/ 'text'(文字を出す)/ 'action'(ボタン)
//   'choice' は options: [{ key, label }] と、いまの値 value、変えたときの onPick を持つ。

const IconSliders = (p) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...p}>
    <path d="M3 7h10M17 7h4M3 17h4M11 17h10" /><circle cx="15" cy="7" r="2.2" /><circle cx="9" cy="17" r="2.2" />
  </svg>
)

const CSS = `
.st { position: fixed; inset: 0; z-index: 20; display: flex; flex-direction: column; color: ${C.ink}; font-family: ${FONT}; overflow: hidden;
  background: radial-gradient(ellipse at 70% 0%, #1c1c20 0%, #0b0b0d 62%); animation: st-fade 0.25s ease-out backwards; }
.st.leaving { animation: st-fadeout 0.2s ease-in forwards; }
@keyframes st-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes st-fadeout { from { opacity: 1; } to { opacity: 0; } }
@keyframes st-rail { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: none; } }
@keyframes st-row { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
.st-top { display: flex; align-items: center; padding: 14px 20px 6px; padding-top: calc(14px + env(safe-area-inset-top)); }
.st-title { font-family: ${DISPLAY}; font-weight: 600; font-size: 18px; letter-spacing: 0.08em; color: ${C.mute}; font-style: italic; }
.st-title b { color: ${C.ink}; font-style: normal; margin-left: 6px; }
.st-close { margin-left: auto; width: 40px; height: 40px; border-radius: 50%; border: 0; background: #f2f2f3; color: #1c1c1f; font-size: 24px; display: grid; place-items: center; cursor: pointer; padding: 0; min-height: 0; transition: background 0.15s, transform 0.15s; }
.st-close:hover, .st-close:focus-visible { background: ${C.player}; transform: rotate(90deg); outline: none; }
.st-main { flex: 1; min-height: 0; display: flex; }
.st-rail { flex: none; width: 64px; display: flex; flex-direction: column; gap: 2px; padding-top: 6px; animation: st-rail 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.st-tab { width: 64px; height: 64px; border: 0; background: transparent; color: #b9b9c0; font-size: 28px; display: grid; place-items: center; cursor: pointer; padding: 0; min-height: 0; position: relative; transition: background 0.15s, color 0.15s; }
.st-tab:hover, .st-tab:focus-visible { color: #fff; background: rgba(255,255,255,0.08); outline: none; }
.st-tab.on { background: ${C.player}; color: #111; }
.st-tab .st-lab { position: absolute; left: 100%; top: 50%; transform: translateY(-50%); margin-left: 8px; padding: 3px 10px; background: #f2f2f3; color: #111; font-size: 12px; white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity 0.15s; z-index: 2; }
.st-tab:hover .st-lab { opacity: 1; }
.st-body { flex: 1; min-width: 0; overflow-y: auto; padding: 6px 4vw 40px 22px; scrollbar-width: none; }
.st-body::-webkit-scrollbar { display: none; }
.st-page { max-width: 1000px; margin: 0; }
.st-head { display: flex; align-items: center; gap: 8px; font-family: ${DISPLAY}; font-weight: 600; font-size: 14px; letter-spacing: 0.06em; color: ${C.player}; border-left: 3px solid ${C.player}; padding-left: 7px; margin: 10px 0 8px; animation: st-row 0.35s ease-out backwards; }
.st-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; min-height: 46px; padding: 6px 12px 6px 16px; margin-bottom: 6px; background: linear-gradient(90deg, #2a2a2e, #212125); border-top: 1px solid rgba(255,255,255,0.07);
  font-size: 15px; animation: st-row 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; animation-delay: calc(0.08s + var(--i, 0) * 0.05s); }
.st-label { min-width: 0; overflow-wrap: anywhere; }
.st-val { color: ${C.mute}; font-size: 13px; text-align: right; overflow-wrap: anywhere; min-width: 0; }
.st-note { margin: 4px 2px 0; font-size: 12px; color: ${C.mute}; animation: st-row 0.4s ease-out backwards; animation-delay: 0.3s; }
.st-seg { display: flex; flex: none; background: #141417; border: 1px solid rgba(255,255,255,0.1); }
.st-seg button { border: 0; background: transparent; color: #8d8d95; font-family: ${DISPLAY}; font-weight: 600; font-size: 13px; letter-spacing: 0.06em; padding: 7px 16px; cursor: pointer; min-height: 0; transition: background 0.15s, color 0.15s; }
.st-seg button:hover { color: #fff; }
.st-seg button.on { background: #f2f2f3; color: #111; }
.st-go { flex: none; display: inline-flex; align-items: center; gap: 14px; padding: 7px 14px 7px 18px; border: 0; background: #f2f2f3; color: #111; font-family: ${FONT}; font-size: 13px; font-weight: 600; cursor: pointer; min-height: 0; transition: background 0.15s; }
.st-go:hover, .st-go:focus-visible { background: ${C.player}; outline: none; }
.st-go.dark { background: #3a3a3f; color: #f1f1f2; }
.st-go.dark:hover { background: #4a4a50; }
.st-foot { flex: none; padding: 6px 20px calc(8px + env(safe-area-inset-bottom)); font-size: 11px; color: #6b6b73; font-family: ${DISPLAY}; letter-spacing: 0.06em; }
@media (max-width: 899px) {
  .st-top { padding: 10px 12px 4px; padding-top: calc(10px + env(safe-area-inset-top)); }
  .st-rail { width: 52px; }
  .st-tab { width: 52px; height: 56px; font-size: 24px; }
  .st-tab .st-lab { display: none; }
  .st-body { padding: 4px 12px 30px 10px; }
  .st-row { flex-wrap: wrap; font-size: 14px; }
  .st-seg button { padding: 7px 12px; }
}
`

export default function SettingsScreen({ user, settings, onChange, onLogin, onLogout, onOpenRules, onExit }) {
  const [tab, setTab] = useState('battle')
  const [leaving, setLeaving] = useState(false)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const close = () => {
    if (leaving) return
    setLeaving(true)
    timer.current = setTimeout(onExit, 200)
  }

  const PAGES = [
    {
      key: 'battle', label: '対戦', Icon: IconSliders, head: '対戦',
      rows: [
        { type: 'choice', label: 'CPUの行動の待ち時間', options: SPEEDS.map((s) => ({ key: s.key, label: s.label })), value: settings.speed, onPick: (k) => onChange({ ...settings, speed: k }) },
      ],
      note: 'この端末のブラウザに保存されます。',
    },
    {
      key: 'account', label: 'アカウント', Icon: IconAgents, head: 'アカウント',
      rows: [
        { type: 'text', label: '名前', value: user ? user.displayName || user.email || 'PLAYER' : 'GUEST(ログインしていません)' },
        { type: 'text', label: 'UID', value: user ? user.uid : '-' },
        user
          ? { type: 'action', label: 'ログアウト', button: 'ログアウト', dark: true, onClick: onLogout }
          : { type: 'action', label: 'ログイン', button: 'Googleでログイン', onClick: onLogin },
      ],
    },
    {
      key: 'rules', label: 'ルール', Icon: IconRules, head: 'ルール',
      rows: [
        { type: 'action', label: 'ルール説明', button: '移動', arrow: true, onClick: onOpenRules },
      ],
    },
  ]
  const page = PAGES.find((p) => p.key === tab) || PAGES[0]

  return (
    <div className={`st theme-dark${leaving ? ' leaving' : ''}`} data-testid="settings">
      <style>{CSS}</style>
      <div className="st-top">
        <div className="st-title">//<b>設定</b></div>
        <button type="button" className="st-close" onClick={close} aria-label="閉じる"><IconClose /></button>
      </div>
      <div className="st-main">
        <nav className="st-rail" aria-label="設定の分類">
          {PAGES.map((p) => (
            <button key={p.key} type="button" className={`st-tab${tab === p.key ? ' on' : ''}`} aria-label={p.label} aria-current={tab === p.key} onClick={() => setTab(p.key)}>
              <p.Icon />
              <span className="st-lab">{p.label}</span>
            </button>
          ))}
        </nav>
        <div className="st-body">
          <div className="st-page" key={page.key}>
            <div className="st-head">{page.head}</div>
            {page.rows.map((r, i) => (
              <div className="st-row" key={r.label} style={{ '--i': i }}>
                <span className="st-label">{r.label}</span>
                {r.type === 'text' && <span className="st-val">{r.value}</span>}
                {r.type === 'choice' && (
                  <span className="st-seg" role="radiogroup" aria-label={r.label}>
                    {r.options.map((o) => (
                      <button key={o.key} type="button" role="radio" aria-checked={r.value === o.key} className={r.value === o.key ? 'on' : ''} onClick={() => r.onPick(o.key)}>{o.label}</button>
                    ))}
                  </span>
                )}
                {r.type === 'action' && (
                  <button type="button" className={`st-go${r.dark ? ' dark' : ''}`} onClick={r.onClick}>{r.button}{r.arrow && <span aria-hidden="true">»</span>}</button>
                )}
              </div>
            ))}
            {page.note && <div className="st-note">{page.note}</div>}
          </div>
        </div>
      </div>
      <div className="st-foot">{user ? `UID: ${user.uid}` : 'GUEST'}</div>
    </div>
  )
}
