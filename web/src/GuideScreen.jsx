import { useEffect, useRef, useState } from 'react'
import { C, FONT, DISPLAY } from './ui.js'
import { ScreenHeader, Chip } from './chrome.jsx'
import { IconPlay, IconAgents, IconRules, IconGem, IconCareer } from './icons.jsx'

// 案内所(PLAYを押したあとの画面)。参考: エンドフィールドの「案内所」
//   上のタブ(CPU戦 / 対人戦 / ルール)→ 左に分類 → 右に項目(報酬のしるし + 「移動」ボタン)
//   「移動」を押すと、その項目の画面へ進む。CPU戦 → レベルを選ぶ画面 → チーム → 対戦
// ★ 新しい対戦の種類を足すときは、TABS に1つ足す(soon: true なら、準備中として出る)
//   props: gems(あれば、右上に出す) onCpu() onRules() onExit()

const CSS = `
.gd { min-height: 100vh; min-height: 100dvh; color: ${C.ink}; font-family: ${FONT}; display: flex; flex-direction: column; background: radial-gradient(ellipse 80% 60% at 70% 30%, #26281c 0%, #121214 55%, #08080a 100%); }
@keyframes gd-up { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@keyframes gd-left { from { opacity: 0; transform: translateX(-28px); } to { opacity: 1; transform: none; } }
.gd-tabs { display: flex; justify-content: center; gap: 4px; padding: 14px 16px 0; animation: gd-up 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.gd-tab { position: relative; display: inline-flex; align-items: center; gap: 8px; min-width: 120px; justify-content: center; padding: 12px 22px; border: 0; background: rgba(255,255,255,0.1); color: #e8e8ea; font-family: ${DISPLAY}; font-weight: 600; font-size: 17px; letter-spacing: 0.08em; cursor: pointer; min-height: 0;
  clip-path: polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%); transition: background 0.15s, color 0.15s; }
.gd-tab svg { font-size: 20px; }
.gd-tab:hover, .gd-tab:focus-visible { background: rgba(255,255,255,0.2); outline: none; }
.gd-tab.on { background: ${C.player}; color: #111; }
.gd-tab.soon { opacity: 0.55; }
.gd-tab .sm { font-size: 10px; letter-spacing: 0.1em; }
.gd-body { flex: 1; display: flex; justify-content: center; align-items: flex-start; padding: 0 16px 40px; }
.gd-panel { width: min(1080px, 100%); display: grid; grid-template-columns: 240px 1fr; background: #ececee; color: #1c1c1f; box-shadow: 0 10px 40px rgba(0,0,0,0.5); min-height: min(62vh, 520px); animation: gd-up 0.45s 0.08s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.gd-cats { display: flex; flex-direction: column; gap: 4px; padding: 14px 0 14px 14px; background: #dcdcdf; }
.gd-cat { display: flex; align-items: center; gap: 10px; padding: 0 14px; height: 54px; border: 0; background: none; border-bottom: 1px solid rgba(0,0,0,0.12); color: #3a3a3e; font-size: 16px; font-weight: 600; font-family: ${FONT}; text-align: left; cursor: pointer; min-height: 0; transition: background 0.15s; animation: gd-left 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.gd-cat svg { font-size: 20px; color: #6e6e76; }
.gd-cat:hover, .gd-cat:focus-visible { background: rgba(255,255,255,0.55); outline: none; }
.gd-cat.on { background: ${C.player}; color: #111; font-weight: 700; } .gd-cat.on svg { color: #111; }
.gd-list { padding: 14px; display: flex; flex-direction: column; gap: 12px; }
.gd-entry { background: #f7f7f8; border: 1px solid #c9c9ce; animation: gd-up 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; animation-delay: calc(var(--i) * 70ms + 120ms); }
.gd-eh { display: flex; align-items: center; gap: 10px; padding: 7px 14px; background: #2a2a2e; color: #fff; font-weight: 700; font-size: 15px; letter-spacing: 0.04em; }
.gd-eh .sub { margin-left: auto; font-size: 12px; font-weight: 500; color: #c9c9ce; }
.gd-eb { display: flex; align-items: center; gap: 12px; padding: 14px; flex-wrap: wrap; }
.gd-desc { flex: 1; min-width: 160px; font-size: 13px; line-height: 1.7; color: #4a4a50; }
.gd-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.gd-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; background: #1f1f23; color: #fff; font-family: ${DISPLAY}; font-weight: 700; font-size: 14px; }
.gd-chip svg { color: ${C.player}; }
.gd-go { display: inline-flex; align-items: center; gap: 12px; min-width: 130px; justify-content: space-between; height: 40px; padding: 0 8px 0 20px; border: 2px solid #3a3a3e; border-radius: 999px; background: #f2f2f3; color: #1c1c1f; font-weight: 700; font-size: 14px; font-family: ${FONT}; cursor: pointer; min-height: 0; transition: background 0.15s, transform 0.15s; }
.gd-go i { width: 24px; height: 24px; border-radius: 50%; background: #2a2a2e; color: #fff; display: grid; place-items: center; font-style: normal; font-size: 12px; }
.gd-go:hover, .gd-go:focus-visible { background: ${C.player}; transform: translateY(-2px); outline: none; }
.gd-soon { padding: 40px 20px; text-align: center; color: #6e6e76; font-size: 15px; letter-spacing: 0.1em; }
/* 閉じる動き: 出てきたときの逆向き(タブは上へ・パネルは下へ沈む) */
@keyframes gd-out { to { opacity: 0; } }
@keyframes gd-up-out { to { opacity: 0; translate: 0 -24px; } }
@keyframes gd-down-out { to { opacity: 0; translate: 0 30px; } }
.gd.leaving { animation: gd-out 0.3s 0.06s ease-in forwards; pointer-events: none; }
.gd.leaving .gd-tabs { animation: gd-up-out 0.26s ease-in forwards; }
.gd.leaving .gd-panel { animation: gd-down-out 0.26s ease-in forwards; }
@media (prefers-reduced-motion: reduce) { .gd-tabs, .gd-panel, .gd-cat, .gd-entry, .gd.leaving, .gd.leaving * { animation: none !important; } }
@media (max-width: 899px) {
  .gd-tab { min-width: 0; flex: 1; padding: 11px 6px; font-size: 14px; gap: 5px; }
  .gd-body { padding: 0 10px 28px; }
  .gd-panel { grid-template-columns: 1fr; }
  .gd-cats { flex-direction: row; padding: 10px 10px 0; overflow-x: auto; background: #dcdcdf; }
  .gd-cat { flex: none; height: 44px; border-bottom: 0; }
  .gd-eb { align-items: stretch; flex-direction: column; }
  .gd-go { width: 100%; }
}
`

export default function GuideScreen({ gems = null, onCpu, onRules, onExit }) {
  // 閉じる: すぐ消さずに、閉じる動き(出てきたときの逆向き)を見せてから、onExit を呼ぶ
  const [leaving, setLeaving] = useState(false)
  const leaveTimer = useRef(null)
  useEffect(() => () => clearTimeout(leaveTimer.current), [])
  const close = () => {
    if (leaving || !onExit) return
    const calm = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (calm) { onExit(); return }
    setLeaving(true)
    leaveTimer.current = setTimeout(onExit, 320)
  }
  // ★ ここに足す: { key, label, Icon, soon?, cats: [{ key, label, Icon, entries: [{ key, title, sub?, desc, rewards?: [{ label }], go }] }] }
  const TABS = [
    {
      key: 'cpu', label: 'CPU戦', Icon: IconPlay,
      cats: [{
        key: 'normal', label: '通常戦', Icon: IconPlay,
        entries: [{ key: 'cpu', title: 'CPU戦', sub: 'Lv.1〜4', desc: 'CPUの強さを選んで対戦します。勝つと、ジェムがもらえます(ログイン中のみ・1日5回まで)。', rewards: [{ label: '10〜40' }], go: onCpu }],
      }],
    },
    { key: 'pvp', label: '対人戦', Icon: IconAgents, soon: true, cats: [] },
    {
      key: 'rules', label: 'ルール', Icon: IconRules,
      cats: [{ key: 'rules', label: 'ルール', Icon: IconRules, entries: [{ key: 'rules', title: 'ルール説明', desc: '対戦のルール(行動順・MP・進化など)を、順に読めます。', go: onRules }] }],
    },
  ]
  const [tab, setTab] = useState('cpu')
  const [cat, setCat] = useState(null)
  const t = TABS.find((x) => x.key === tab)
  const c = t.cats.find((x) => x.key === cat) || t.cats[0] || null
  const pick = (key) => { setTab(key); setCat(null) }
  return (
    <div className={`gd theme-dark${leaving ? ' leaving' : ''}`}>
      <style>{CSS}</style>
      <ScreenHeader title="案内所" onClose={close} right={gems != null && <Chip><IconGem style={{ color: '#ffe600' }} />{gems}</Chip>} />
      <div className="gd-tabs" role="tablist">
        {TABS.map((x) => (
          <button key={x.key} type="button" role="tab" aria-selected={tab === x.key} data-testid={`gd-tab-${x.key}`} className={`gd-tab${tab === x.key ? ' on' : ''}${x.soon ? ' soon' : ''}`} onClick={() => pick(x.key)}>
            <x.Icon />{x.label}{x.soon && <span className="sm">準備中</span>}
          </button>
        ))}
      </div>
      <div className="gd-body">
        <div className="gd-panel theme-light">
          {c ? (
            <>
              <div className="gd-cats">
                {t.cats.map((k, i) => (
                  <button key={k.key} type="button" className={`gd-cat${c.key === k.key ? ' on' : ''}`} style={{ animationDelay: `${i * 60 + 100}ms` }} onClick={() => setCat(k.key)}><k.Icon />{k.label}</button>
                ))}
              </div>
              <div className="gd-list">
                {c.entries.map((e, i) => (
                  <div key={e.key} className="gd-entry" style={{ '--i': i }}>
                    <div className="gd-eh">{e.title}{e.sub && <span className="sub">{e.sub}</span>}</div>
                    <div className="gd-eb">
                      <div className="gd-desc">{e.desc}</div>
                      {e.rewards && <div className="gd-chips">{e.rewards.map((r, j) => <span key={j} className="gd-chip"><IconGem />{r.label}</span>)}</div>}
                      <button type="button" className="gd-go" data-testid={`gd-go-${e.key}`} onClick={e.go}>移動<i>▶</i></button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="gd-soon" style={{ gridColumn: '1 / -1' }}>準備中です</div>
          )}
        </div>
      </div>
    </div>
  )
}
