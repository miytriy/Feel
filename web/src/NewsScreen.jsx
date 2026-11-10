import { useState } from 'react'
import { C, FONT, DISPLAY, useRemembered } from './ui.js'
import { ScreenHeader, PillTabs } from './chrome.jsx'
import { NEWS, NEWS_CATS, isUnread, markRead } from './news.js'

// ニュース。カテゴリのタブ → 記事の一覧(タップで本文が開く)。
// タブと開いている記事は、画面を出て戻ってきても、最後のまま(useRemembered)。
// 動きは transform と opacity だけ(web/EFFECTS.md)。
const CSS = `
.nw { position: fixed; inset: 0; z-index: 20; display: flex; flex-direction: column; color: ${C.ink}; font-family: ${FONT}; overflow: hidden;
  background: radial-gradient(ellipse at 70% 0%, #1c1c20 0%, #0b0b0d 62%); animation: nw-fade 0.25s ease-out backwards; }
@keyframes nw-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes nw-row { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes nw-body { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
.nw-tabs { padding: 4px 20px 8px; overflow-x: auto; scrollbar-width: none; }
.nw-tabs::-webkit-scrollbar { display: none; }
.nw-tabs .fx-pills { width: max-content; max-width: none; flex-wrap: nowrap; }
.nw-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 4px 20px calc(24px + env(safe-area-inset-bottom)); scrollbar-width: none; }
.nw-scroll::-webkit-scrollbar { display: none; }
.nw-list { max-width: 820px; margin: 0 auto; display: flex; flex-direction: column; gap: 8px; }
.nw-item { background: linear-gradient(90deg, #2a2a2e, #212125); border-top: 1px solid rgba(255,255,255,0.07); animation: nw-row 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; animation-delay: var(--i, 0ms); }
.nw-item.on { background: #f2f2f3; color: #151517; }
.nw-head { display: flex; align-items: center; gap: 12px; width: 100%; padding: 14px 16px; border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; font-family: ${FONT}; }
.nw-cat { flex: none; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; padding: 3px 8px; background: ${C.player}; color: #111; }
.nw-item.on .nw-cat { background: #151517; color: #fff; }
.nw-t { flex: 1; font-size: 15px; font-weight: 700; line-height: 1.4; }
.nw-d { flex: none; font-family: ${DISPLAY}; font-size: 12px; color: ${C.mute}; }
.nw-item.on .nw-d { color: #55555c; }
.nw-new { flex: none; width: 10px; height: 10px; background: var(--c-badge, #ff7a00); transform: rotate(45deg); }
.nw-body { padding: 2px 16px 18px; font-size: 14px; line-height: 1.8; animation: nw-body 0.28s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.nw-body p { margin: 0 0 8px; }
.nw-empty { text-align: center; color: ${C.mute}; padding: 40px 0; }
@media (max-width: 560px) { .nw-head { flex-wrap: wrap; } .nw-t { flex-basis: 100%; order: 3; } .nw-d { margin-left: auto; } }
@media (prefers-reduced-motion: reduce) { .nw, .nw-item, .nw-body { animation: none; } }
`

export default function NewsScreen({ onExit }) {
  const [cat, setCat] = useRemembered('news.cat', 'all')
  const [open, setOpen] = useRemembered('news.open', null)
  const [, bump] = useState(0)
  const list = NEWS.filter((n) => cat === 'all' || n.cat === cat)
  // 画面を開いたとき、開いたままの記事は既読にする。タップで開いたときも既読にする
  if (open) markRead(open)
  const toggle = (id) => { const next = open === id ? null : id; if (next) markRead(next); setOpen(next); bump((x) => x + 1) }
  return (
    <div className="nw theme-dark" data-testid="news-screen">
      <style>{CSS}</style>
      <ScreenHeader title="ニュース" onClose={onExit} />
      <div className="nw-tabs"><PillTabs tabs={[{ key: 'all', label: 'すべて' }, ...NEWS_CATS.map((c) => ({ key: c, label: c }))]} value={cat} onChange={setCat} /></div>
      <div className="nw-scroll">
        <div className="nw-list">
          {list.length === 0 && <div className="nw-empty">ニュースはありません。</div>}
          {list.map((n, i) => {
            const on = open === n.id
            return (
              <article key={n.id} className={`nw-item${on ? ' on' : ''}`} style={{ '--i': `${Math.min(i, 8) * 50}ms` }} data-testid={`news-${n.id}`}>
                <button type="button" className="nw-head" aria-expanded={on} onClick={() => toggle(n.id)}>
                  <span className="nw-cat">{n.cat}</span>
                  <span className="nw-d">{n.date.replace(/-/g, '.')}</span>
                  {!on && isUnread(n.id) && <i className="nw-new" aria-label="未読" />}
                  <span className="nw-t">{n.title}</span>
                </button>
                {on && <div className="nw-body">{n.body.map((p, j) => <p key={j}>{p}</p>)}</div>}
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}
