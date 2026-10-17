import { useEffect, useMemo, useRef, useState } from 'react'
import { C, FONT, DISPLAY } from './ui.js'
import { IconClose, IconGem, IconMail } from './icons.jsx'

// メールボックス(プレゼント)。参考: エンドフィールドのメールボックス
//   左に、メールの一覧(選んでいるものは白) → 右に、本文と添付(ジェム)と、受け取りボタン → 下に、一括受取
//   開くと、左の一覧は左から・右の本文は右から入る。閉じるときは、その場でフェードアウト。
// gifts: [{ id, title, gems, message, claimed, read, star }]  /  onClaim(gift): 1通を受け取る  /  onClaimAll(): 全部受け取る
// onRead(gift): 既読にする  /  onStar(gift): ★の切り替え  /  onDelete(gift): 1通を消す(受け取り済みのみ)  /  onPurge(): 既読削除(受け取り済み・既読・★なしを消す)

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
.ml-help { margin-left: auto; width: 34px; height: 34px; border-radius: 50%; border: 1.5px solid #8d8d95; background: transparent; color: #cfcfd5; font-family: ${DISPLAY}; font-weight: 700; font-size: 16px; cursor: pointer; padding: 0; min-height: 0; transition: background 0.15s, color 0.15s; }
.ml-help:hover { background: ${C.player}; color: #111; border-color: ${C.player}; }
.ml-close { margin-left: 0; width: 40px; height: 40px; border-radius: 50%; border: 0; background: #f2f2f3; color: #1c1c1f; font-size: 24px; display: grid; place-items: center; cursor: pointer; padding: 0; min-height: 0; transition: background 0.15s, transform 0.15s; }
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
.ml-star { width: 36px; height: 34px; display: grid; place-items: center; border: 1px solid rgba(255,255,255,0.25); background: transparent; color: #cfcfd5; font-size: 20px; cursor: pointer; padding: 0; min-height: 0; transition: background 0.15s, color 0.15s; }
.ml-star.on { background: ${C.player}; color: #111; border-color: ${C.player}; }
.ml-star:disabled { opacity: 0.3; cursor: default; }
.ml-item.done { opacity: 0.7; }
.ml-back { position: fixed; inset: 0; z-index: 30; display: grid; place-items: center; background: rgba(0,0,0,0.55); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); animation: ml-fade 0.2s ease-out backwards; }
.ml-modal { width: min(760px, 92vw); max-height: 70vh; display: flex; flex-direction: column; background: #f1f1f2; color: #1c1c1f; animation: ml-pop 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
@keyframes ml-pop { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: none; } }
.ml-mhead { position: relative; padding: 14px 52px; text-align: center; font-weight: 700; font-size: 16px; border-bottom: 1px solid #c9c9ce; }
.ml-mhead button { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); width: 32px; height: 32px; border: 0; border-radius: 50%; background: #2a2a2e; color: #fff; font-size: 18px; display: grid; place-items: center; cursor: pointer; padding: 0; min-height: 0; }
.ml-mhead button:hover { background: ${C.player}; color: #111; }
.ml-mbody { padding: 18px 24px 22px; overflow-y: auto; font-size: 13.5px; line-height: 1.9; color: #3a3a3e; }
.ml-mbody b { display: block; color: #111; }
.ml-band { width: 100%; padding: 34px 6vw 30px; background: #f4f4f5; color: #1c1c1f; text-align: center; animation: ml-band 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
@keyframes ml-band { from { opacity: 0; transform: scaleY(0.2); } to { opacity: 1; transform: none; } }
.ml-band p { margin: 0 0 22px; font-size: 15px; font-weight: 600; line-height: 1.8; }
.ml-bbtns { display: flex; justify-content: center; gap: 16px; flex-wrap: wrap; }
.ml-bbtns button { display: inline-flex; align-items: center; gap: 22px; min-width: 150px; justify-content: space-between; padding: 9px 16px 9px 24px; border: 0; border-radius: 999px; font-family: ${FONT}; font-size: 14px; font-weight: 700; cursor: pointer; min-height: 0; transition: transform 0.15s; }
.ml-bbtns button:hover { transform: scale(1.04); }
.ml-bbtns .no { background: #3a3a3e; color: #fff; }
.ml-bbtns .yes { background: ${C.player}; color: #111; }
.ml-msg { font-size: 13px; font-weight: 700; }
@media (max-width: 899px) {
  .ml-top { padding: 10px 12px 4px; padding-top: calc(10px + env(safe-area-inset-top)); }
  .ml-main { grid-template-columns: 1fr; grid-template-rows: minmax(120px, 40%) 1fr; gap: 10px; padding: 4px 12px 6px; }
  .ml-foot { padding: 6px 12px calc(10px + env(safe-area-inset-bottom)); }
  .ml-sub { font-size: 16px; }
}
`

const IconStar = ({ on, ...p }) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" {...p}><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2 6.3 20.3l1.2-6.4L2.8 9.5l6.4-.8z" /></svg>
)

export default function MailboxScreen({ gifts, busy, notice, error, onClaim, onClaimAll, onRead, onStar, onDelete, onPurge, onExit }) {
  const [sel, setSel] = useState(null)
  const [dialog, setDialog] = useState(null) // 'help'(説明)/ 'purge'(既読削除の確認)/ null
  useEffect(() => {
    if (!dialog) return undefined
    const h = (e) => { if (e.key === 'Escape') setDialog(null) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [dialog])
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
  // 開いたメールは既読にする
  useEffect(() => { if (cur && !cur.read) onRead(cur) }, [cur?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const unclaimed = useMemo(() => gifts.filter((g) => !g.claimed).length, [gifts])
  const purgeable = useMemo(() => gifts.some((g) => g.read && g.claimed && !g.star), [gifts])

  return (
    <div className={`ml theme-dark${leaving ? ' leaving' : ''}`} data-testid="mailbox">
      <style>{CSS}</style>
      <div className="ml-top">
        <div className="ml-title">//<b>メールボックス</b></div>
        <button type="button" className="ml-help" onClick={() => setDialog('help')} aria-label="説明" aria-haspopup="dialog">?</button>
        <button type="button" className="ml-close" onClick={close} aria-label="閉じる"><IconClose /></button>
      </div>
      <div className="ml-main">
        <div className="ml-list">
          <div className="ml-head">受信箱<span>{unclaimed} 通 未受取</span></div>
          <div className="ml-scroll">
            {gifts.length === 0 && <div className="ml-empty">受け取れるプレゼントはありません</div>}
            {gifts.map((g, i) => (
              <button key={g.id} type="button" className={`ml-item${cur && cur.id === g.id ? ' on' : ''}${g.claimed ? ' done' : ''}`} style={{ '--i': i }} onClick={() => setSel(g.id)}>
                <i className="ml-dot" style={g.read ? { visibility: 'hidden' } : undefined} />
                <span className="ml-it"><b>{g.title}</b><small><IconGem />{g.gems} ジェム{g.claimed ? ' ・ 受取済' : ''}</small></span>
                {g.star && <IconStar on style={{ flex: 'none', color: g.id === (cur && cur.id) ? '#c9a800' : C.player }} />}
                <span
                  className="ml-tick"
                  role="button"
                  tabIndex={-1}
                  aria-label="受け取る"
                  aria-disabled={busy || g.claimed}
                  onClick={(e) => { e.stopPropagation(); if (!busy && !g.claimed) onClaim(g) }}
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
                {cur.claimed && <span className="lab">受取済</span>}
                <button type="button" className="ml-claim" disabled={busy || cur.claimed} onClick={() => onClaim(cur)} aria-label="受け取る"><IconCheck /></button>
              </div>
            </>
          ) : (
            <div className="ml-empty"><IconMail style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />メールはありません</div>
          )}
        </div>
      </div>
      <div className="ml-foot">
        <button type="button" className="ml-all" disabled={busy || unclaimed === 0} onClick={onClaimAll}>一括受取</button>
        <button type="button" className="ml-all" disabled={busy || !purgeable} onClick={() => setDialog('purge')}>既読削除</button>
        {busy && <span className="ml-msg" style={{ color: C.mute }}>通信中...</span>}
        {notice && <span className="ml-msg" style={{ color: C.ok }}>{notice}</span>}
        {error && <span className="ml-msg" style={{ color: C.bad }}>{error}</span>}
        <span style={{ flex: 1 }} />
        <button type="button" className={`ml-star${cur && cur.star ? ' on' : ''}`} disabled={!cur} onClick={() => cur && onStar(cur)} aria-label="★" aria-pressed={!!(cur && cur.star)}><IconStar on={!!(cur && cur.star)} /></button>
        <button type="button" className="ml-all" disabled={busy || !cur || !cur.claimed} onClick={() => cur && onDelete(cur)}>メール削除</button>
      </div>
      {dialog === 'help' && (
        <div className="ml-back" onClick={() => setDialog(null)}>
          <div className="ml-modal" role="dialog" aria-label="メールボックスの説明" onClick={(e) => e.stopPropagation()}>
            <div className="ml-mhead">メールボックスの説明<button type="button" onClick={() => setDialog(null)} aria-label="閉じる"><IconClose /></button></div>
            <div className="ml-mbody">
              <b>・メールボックス・</b>
              運営からのプレゼントや、お知らせを受け取る場所です。<br />
              メールを開くと既読になります。ジェムが付いているメールは、右下の受け取りボタン(または一覧の右のチェック)で受け取れます。「一括受取」では、まだ受け取っていないものを全部受け取ります。
              <br /><br />
              <b>・期限・</b>
              期限があるプレゼントは、期限を過ぎると受け取れなくなります。早めに受け取ってください。
              <br /><br />
              <b>・★(お気に入り)・</b>
              ★をつけたメールは、「既読削除」で消えません。残しておきたいメールにつけてください。
              <br /><br />
              <b>・削除・</b>
              「メール削除」は、開いているメールを1通消します。「既読削除」は、受け取り済みで既読のメールをまとめて消します。ジェムを受け取っていないメールと、★のついたメールは消えません。消したメールは元に戻せません。
            </div>
          </div>
        </div>
      )}
      {dialog === 'purge' && (
        <div className="ml-back" onClick={() => setDialog(null)}>
          <div className="ml-band" role="alertdialog" aria-label="既読削除の確認" onClick={(e) => e.stopPropagation()}>
            <p>既読をすべて削除しますか？お気に入りや未受取アイテム付きのメールは削除されません。</p>
            <div className="ml-bbtns">
              <button type="button" className="no" onClick={() => setDialog(null)}>キャンセル<IconClose /></button>
              <button type="button" className="yes" onClick={() => { setDialog(null); onPurge() }}>確定<IconCheck /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
