import { useEffect, useRef, useState } from 'react'
import { C, FONT, DISPLAY } from './ui.js'
import { IconClose, IconGem, IconMail } from './icons.jsx'

// メールボックス(プレゼント)。参考: エンドフィールドのメールボックス
//   左に、メールの一覧(選んでいるものは白) → 右に、本文と添付(ジェム)と、受け取りボタン → 下に、一括受取
//   開くと、左の一覧は左から・右の本文は右から入る。閉じるときは、その場でフェードアウト。
// gifts: [{ id, title, gems, message }]  /  onClaim(gift): 1通を受け取る  /  onClaimAll(): 全部受け取る

const IconCheck = (p) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
)

const CSS = `
.ml { position: fixed; inset: 0; z-index: 20; display: flex; flex-direction: column; color: ${C.ink}; font-family: ${FONT}; overflow: hidden;
  background: radial-gradient(ellipse at 70% 0%, #1c1c20 0%, #0b0b0d 62%); animation: ml-fade 0.25s ease-out backwards; }
.ml.leaving { animation: ml-fadeout 0.2s ease-in forwards; }
@keyframes ml-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes ml-fadeout { from { opacity: 1; } to { opacity: 0; } }
@keyframes ml-left { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: none; } }
@keyframes ml-right { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: none; } }
@keyframes ml-row { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
.ml-top { display: flex; align-items: center; gap: 12px; padding: 14px 20px 6px; padding-top: calc(14px + env(safe-area-inset-top)); }
.ml-title { font-family: ${DISPLAY}; font-weight: 600; font-size: 18px; letter-spacing: 0.08em; color: ${C.mute}; font-style: italic; }
.ml-title b { color: ${C.ink}; font-style: normal; margin-left: 6px; }
.ml-close { margin-left: auto; width: 40px; height: 40px; border-radius: 50%; border: 0; background: #f2f2f3; color: #1c1c1f; font-size: 24px; display: grid; place-items: center; cursor: pointer; padding: 0; min-height: 0; transition: background 0.15s, transform 0.15s; }
.ml-close:hover, .ml-close:focus-visible { background: ${C.player}; transform: rotate(90deg); outline: none; }
.ml-main { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(280px, 400px) 1fr; gap: 20px; padding: 6px 4vw 10px 20px; }
.ml-list { min-height: 0; display: flex; flex-direction: column; animation: ml-left 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.ml-head { display: flex; justify-content: space-between; align-items: baseline; font-family: ${DISPLAY}; font-weight: 600; font-size: 14px; letter-spacing: 0.06em; color: ${C.player}; border-left: 3px solid ${C.player}; padding-left: 7px; margin: 6px 0 8px; }
.ml-head span { color: ${C.mute}; font-size: 12px; }
.ml-scroll { flex: 1; min-height: 0; overflow-y: auto; scrollbar-width: none; display: flex; flex-direction: column; gap: 6px; }
.ml-scroll::-webkit-scrollbar { display: none; }
.ml-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 10px 10px 14px; border: 0; text-align: left; cursor: pointer; min-height: 0; font-family: ${FONT};
  background: linear-gradient(90deg, #2a2a2e, #212125); color: #bdbdc4; border-top: 1px solid rgba(255,255,255,0.07); transition: background 0.15s, color 0.15s; animation: ml-row 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; animation-delay: calc(0.1s + var(--i, 0) * 0.05s); }
.ml-item:hover, .ml-item:focus-visible { background: linear-gradient(90deg, #36363b, #2b2b30); outline: none; }
.ml-item.on { background: #f2f2f3; color: #151517; }
.ml-dot { flex: none; width: 7px; height: 7px; background: ${C.badge}; transform: rotate(45deg); }
.ml-it { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ml-it b { font-size: 14px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ml-it small { font-size: 11px; opacity: 0.7; display: flex; align-items: center; gap: 4px; }
.ml-tick { flex: none; width: 30px; height: 30px; display: grid; place-items: center; border: 1px solid currentColor; opacity: 0.55; font-size: 18px; background: transparent; color: inherit; cursor: pointer; padding: 0; min-height: 0; transition: opacity 0.15s, background 0.15s, color 0.15s; }
.ml-tick:hover:not(:disabled), .ml-tick:focus-visible { opacity: 1; background: ${C.player}; color: #111; border-color: ${C.player}; outline: none; }
.ml-tick:disabled { opacity: 0.25; cursor: default; }
.ml-view { min-height: 0; overflow-y: auto; scrollbar-width: none; display: flex; flex-direction: column; animation: ml-right 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.ml-view::-webkit-scrollbar { display: none; }
.ml-sub { padding: 12px 18px; background: linear-gradient(90deg, rgba(255,230,0,0.2), rgba(255,230,0,0.08)); border-left: 4px solid ${C.player}; font-size: 18px; font-weight: 700; animation: ml-fade 0.3s ease-out backwards; }
.ml-text { flex: 1; padding: 18px 20px; background: rgba(255,255,255,0.04); font-size: 14px; line-height: 1.9; white-space: pre-wrap; overflow-wrap: anywhere; animation: ml-fade 0.35s ease-out backwards; animation-delay: 0.06s; }
.ml-attach { display: flex; align-items: center; gap: 14px; padding: 12px 18px; margin-top: 6px; background: rgba(255,255,255,0.06); border-top: 1px solid rgba(255,255,255,0.08); animation: ml-fade 0.35s ease-out backwards; animation-delay: 0.12s; }
.ml-attach .lab { font-size: 12px; color: ${C.mute}; letter-spacing: 0.1em; }
.ml-attach .gem { display: flex; align-items: center; gap: 6px; font-family: ${DISPLAY}; font-weight: 600; font-size: 18px; }
.ml-attach .gem svg { color: ${C.player}; }
.ml-claim { margin-left: auto; width: 48px; height: 48px; display: grid; place-items: center; border: 0; background: ${C.player}; color: #111; font-size: 26px; cursor: pointer; padding: 0; min-height: 0; transition: transform 0.15s, background 0.15s; }
.ml-claim:hover:not(:disabled) { transform: scale(1.06); }
.ml-claim:disabled { background: #3a3a3f; color: #77777e; cursor: default; }
.ml-empty { padding: 30px 6px; color: ${C.mute}; font-size: 14px; animation: ml-fade 0.4s ease-out backwards; }
.ml-foot { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 8px 4vw calc(12px + env(safe-area-inset-bottom)) 20px; }
.ml-all { padding: 8px 22px; border: 0; background: #f2f2f3; color: #111; font-family: ${FONT}; font-size: 13px; font-weight: 700; cursor: pointer; min-height: 0; transition: background 0.15s; animation: ml-left 0.4s ease-out backwards; }
.ml-all:hover:not(:disabled), .ml-all:focus-visible { background: ${C.player}; outline: none; }
.ml-all:disabled { background: #3a3a3f; color: #77777e; cursor: default; }
.ml-msg { font-size: 13px; font-weight: 700; }
@media (max-width: 899px) {
  .ml-top { padding: 10px 12px 4px; padding-top: calc(10px + env(safe-area-inset-top)); }
  .ml-main { grid-template-columns: 1fr; grid-template-rows: minmax(120px, 40%) 1fr; gap: 10px; padding: 4px 12px 6px; }
  .ml-foot { padding: 6px 12px calc(10px + env(safe-area-inset-bottom)); }
  .ml-sub { font-size: 16px; }
}
`

export default function MailboxScreen({ gifts, busy, notice, error, onClaim, onClaimAll, onExit }) {
  const [sel, setSel] = useState(null)
  const [leaving, setLeaving] = useState(false)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const close = () => {
    if (leaving) return
    setLeaving(true)
    timer.current = setTimeout(onExit, 200)
  }

  // 選んでいるメールが受け取り済みで消えたら、いちばん上のメールを選ぶ
  const cur = gifts.find((g) => g.id === sel) || gifts[0] || null

  return (
    <div className={`ml theme-dark${leaving ? ' leaving' : ''}`} data-testid="mailbox">
      <style>{CSS}</style>
      <div className="ml-top">
        <div className="ml-title">//<b>メールボックス</b></div>
        <button type="button" className="ml-close" onClick={close} aria-label="閉じる"><IconClose /></button>
      </div>
      <div className="ml-main">
        <div className="ml-list">
          <div className="ml-head">受信箱<span>{gifts.length} 通</span></div>
          <div className="ml-scroll">
            {gifts.length === 0 && <div className="ml-empty">受け取れるプレゼントはありません</div>}
            {gifts.map((g, i) => (
              <button key={g.id} type="button" className={`ml-item${cur && cur.id === g.id ? ' on' : ''}`} style={{ '--i': i }} onClick={() => setSel(g.id)}>
                <i className="ml-dot" />
                <span className="ml-it"><b>{g.title}</b><small><IconGem />{g.gems} ジェム</small></span>
                <span
                  className="ml-tick"
                  role="button"
                  tabIndex={-1}
                  aria-label="受け取る"
                  aria-disabled={busy}
                  onClick={(e) => { e.stopPropagation(); if (!busy) onClaim(g) }}
                ><IconCheck /></span>
              </button>
            ))}
          </div>
        </div>
        <div className="ml-view" key={cur ? cur.id : 'none'}>
          {cur ? (
            <>
              <div className="ml-sub">{cur.title}</div>
              <div className="ml-text">{cur.message || 'プレゼントが届いています。受け取りボタンを押してください。'}</div>
              <div className="ml-attach">
                <span className="lab">添付</span>
                <span className="gem"><IconGem />+{cur.gems}</span>
                <button type="button" className="ml-claim" disabled={busy} onClick={() => onClaim(cur)} aria-label="受け取る"><IconCheck /></button>
              </div>
            </>
          ) : (
            <div className="ml-empty"><IconMail style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />メールはありません</div>
          )}
        </div>
      </div>
      <div className="ml-foot">
        <button type="button" className="ml-all" disabled={busy || gifts.length === 0} onClick={onClaimAll}>一括受取</button>
        {busy && <span className="ml-msg" style={{ color: C.mute }}>通信中...</span>}
        {notice && <span className="ml-msg" style={{ color: C.ok }}>{notice}</span>}
        {error && <span className="ml-msg" style={{ color: C.bad }}>{error}</span>}
      </div>
    </div>
  )
}
