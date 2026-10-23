import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { C, FONT, DISPLAY } from './ui.js'
import { CommentaryButton } from './BattleLog.jsx'
import { IconClose } from './icons.jsx'

// 戦闘画面の、上の表示と、重ねて出す部品。参考: エンドフィールドの戦闘画面
//   BattleHud     … 左上: 退出 / ステージ説明 ・ 中: ステージ名(CPU戦 Lv.) とラウンド ・ 右: 両チームの顔ぶれ(体力・いま動くキャラ)
//   StageIntro    … 「ステージ説明」(対戦の始まりに出る。(i)で、いつでも開ける)
//   ExitConfirm   … 退出の確認
//   ResultBanner  … 勝敗の表示(もう一度・レベルを選ぶ・チームを変える・退出)

const TEAM = { A: C.player, B: C.enemy }

// 画面のいちばん外(body)に出す。固定の上の行・下の操作パネルは、それぞれ重なり順の枠(stacking context)を持つので、
// その中に入れると、ほかの表示の下に隠れてしまう。ステージ説明などは、必ず、いちばん上の層に出す
function Top({ children }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}
// 「Lv.5」のような名前は、もう「Lv.5」と出しているので、くり返さない
const nameOf = (levelInfo) => (levelInfo && levelInfo.name && !/^Lv\.\d+$/.test(levelInfo.name) ? levelInfo.name : '')
const ExitIcon = (p) => <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true" {...p}><path d="M3 3h9v2H5v14h7v2H3zm13.6 4.6L21 12l-4.4 4.4-1.4-1.4 2-2H9v-2h8.2l-2-2z" /></svg>
const InfoIcon = (p) => <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></svg>

const CSS = `
@keyframes bh-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes bh-pop { from { opacity: 0; transform: translateY(14px) scale(0.96); } to { opacity: 1; transform: none; } }
@keyframes bh-band { from { transform: scaleX(0); } to { transform: none; } }
@keyframes bh-rise { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: none; } }
@keyframes bh-pulse { 0%, 100% { box-shadow: 0 0 0 2px var(--tc), 0 0 6px var(--tc); } 50% { box-shadow: 0 0 0 2px var(--tc), 0 0 16px var(--tc); } }

.bh { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.bh-leave { display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 16px 0 12px; border: 0; background: #f2f2f3; color: #1c1c1f; font-family: ${FONT}; font-size: 13px; font-weight: 700; cursor: pointer; min-height: 0; transition: background 0.15s; }
.bh-leave svg { font-size: 18px; }
.bh-leave:hover, .bh-leave:focus-visible { background: ${C.player}; outline: none; }
.bh-icon { width: 36px; height: 36px; display: grid; place-items: center; border: 0; background: rgba(255,255,255,0.12); color: #fff; font-size: 22px; cursor: pointer; padding: 0; min-height: 0; transition: background 0.15s, color 0.15s; }
.bh-icon:hover, .bh-icon:focus-visible { background: ${C.player}; color: #111; outline: none; }
.bh-auto { position: relative; width: 78px; height: 36px; min-height: 0; padding: 0; display: grid; place-items: center; border: 1px solid rgba(214,206,240,0.8); border-radius: 0; background: rgba(8,8,22,0.4); color: #f4f4f8; cursor: pointer; transition: border-color 0.15s, background 0.15s, color 0.15s; } /* 参考: 細い枠の横長の四角(約2.2:1)。中に細い線の⋈ */
.bh-auto:hover, .bh-auto:focus-visible { background: rgba(255,255,255,0.14); outline: none; }
.bh-auto svg { width: 38px; height: 22px; overflow: visible; }
.bh-auto .ba-base { fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linejoin: miter; stroke-linecap: butt; }
.bh-auto .ba-run { display: none; fill: none; stroke: #fff3a0; stroke-width: 2.2; stroke-linejoin: round; stroke-linecap: round; stroke-dasharray: 14 86; filter: drop-shadow(0 0 2px ${C.player}) drop-shadow(0 0 6px ${C.player}); }
.bh-auto::after { content: ''; display: none; position: absolute; left: 50%; bottom: -4px; width: 5px; height: 5px; margin-left: -2.5px; border-radius: 50%; background: #f6e6ee; box-shadow: 0 0 4px rgba(255,255,255,0.8); } /* 枠の下の中央の小さな点(ONの印) */
.bh-auto[aria-pressed="true"] { color: #e6c35a; border-color: rgba(214,206,240,0.95); }
.bh-auto[aria-pressed="true"]::after { display: block; }
.bh-auto[aria-pressed="true"] .ba-base { filter: drop-shadow(0 0 3px rgba(255,214,90,0.7)); }
.bh-auto[aria-pressed="true"] .ba-run { display: block; animation: bh-run 2.4s linear infinite; }
@keyframes bh-run { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -100; } }
.bh-stage { display: inline-flex; align-items: stretch; background: rgba(0,0,0,0.6); border-left: 4px solid ${C.player}; }
.bh-stage b { padding: 4px 12px; font-family: ${DISPLAY}; font-weight: 700; font-size: 16px; letter-spacing: 0.06em; }
.bh-stage span { padding: 4px 12px; background: rgba(255,255,255,0.12); font-size: 12px; display: grid; place-items: center; letter-spacing: 0.08em; }
.bh-teams { margin-left: auto; display: flex; gap: 14px; align-items: center; }
.bh-team { display: flex; gap: 5px; align-items: flex-end; padding: 0 0 0 8px; border-left: 2px solid var(--tc); }
.bh-p { position: relative; width: 40px; text-align: center; }
.bh-face { position: relative; width: 40px; height: 40px; border-radius: 50%; overflow: hidden; background: linear-gradient(165deg, #3a3a42, #1b1b20); box-shadow: 0 0 0 2px rgba(255,255,255,0.18); }
.bh-face svg { position: absolute; inset: 10%; width: 80%; height: 80%; }
.bh-p.act .bh-face { box-shadow: 0 0 0 2px var(--tc), 0 0 10px var(--tc); animation: bh-pulse 1.4s ease-in-out infinite; }
.bh-p.dead .bh-face { filter: grayscale(1) brightness(0.5); }
.bh-hp { height: 3px; margin-top: 4px; background: rgba(255,255,255,0.16); }
.bh-hp i { display: block; height: 100%; }
.bh.big .bh-p, .bh.big .bh-face { width: 46px; } .bh.big .bh-face { height: 46px; }
@media (max-width: 899px) {
  .bh { gap: 8px; }
  .bh-teams { margin-left: 0; width: 100%; justify-content: space-between; gap: 8px; }
  .bh-team { flex: 1; justify-content: flex-start; }
  .bh-p, .bh-face { width: 32px; } .bh-face { height: 32px; }
  .bh-stage b { font-size: 14px; padding: 3px 8px; } .bh-stage span { font-size: 11px; padding: 3px 8px; }
}

.bm { position: fixed; inset: 0; z-index: 3000; display: grid; place-items: center; padding: 16px; background: rgba(0,0,0,0.58); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); animation: bh-fade 0.2s ease-out backwards; }
.bm-win { width: min(860px, 100%); max-height: 86vh; display: flex; flex-direction: column; background: #f1f1f2; color: #1c1c1f; box-shadow: 0 16px 50px rgba(0,0,0,0.6); animation: bh-pop 0.28s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.bm-win.sm { width: min(460px, 100%); }
.bm-head { display: flex; align-items: center; justify-content: center; position: relative; padding: 12px 52px; background: #232326; color: #fff; font-weight: 700; font-size: 16px; letter-spacing: 0.08em; }
.bm-x { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); width: 30px; height: 30px; border: 0; background: none; color: #fff; font-size: 24px; display: grid; place-items: center; cursor: pointer; padding: 0; min-height: 0; }
.bm-x:hover, .bm-x:focus-visible { color: ${C.player}; outline: none; }
.bm-body { padding: 20px 28px 22px; overflow-y: auto; font-size: 14px; line-height: 1.8; color: #3a3a3e; }
.bm-body h4 { display: inline-block; margin: 0 0 8px; padding: 2px 12px; background: #d6d6da; color: #1c1c1f; font-size: 13px; }
.bm-body ul { margin: 6px 0 0; padding-left: 1.2em; }
.bm-body li::marker { color: #b89b00; }
.bm-foot { display: flex; justify-content: center; gap: 12px; padding: 0 20px 22px; flex-wrap: wrap; }
.bm-btn { min-width: 150px; height: 42px; padding: 0 22px; border-radius: 999px; border: 2px solid #3a3a3e; background: #3a3a3e; color: #fff; font-size: 14px; font-weight: 700; font-family: ${FONT}; cursor: pointer; min-height: 0; transition: transform 0.15s, filter 0.15s; }
.bm-btn.ok { background: ${C.player}; color: #111; }
.bm-btn:hover, .bm-btn:focus-visible { transform: translateY(-2px); filter: brightness(1.1); outline: none; }

.br { position: fixed; inset: 0; z-index: 2900; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 20px; color: #fff; font-family: ${FONT}; background: rgba(5,5,7,0.74); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px); animation: bh-fade 0.35s ease-out backwards; }
.br-band { width: 100%; padding: 22px 0 18px; text-align: center; background: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.78) 18%, rgba(0,0,0,0.78) 82%, transparent 100%); border-top: 2px solid var(--rc); border-bottom: 2px solid var(--rc); transform-origin: center; animation: bh-band 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.br-title { font-family: ${DISPLAY}; font-weight: 700; font-size: clamp(48px, 12vw, 104px); letter-spacing: 0.12em; line-height: 1; color: var(--rc); text-shadow: 0 0 24px color-mix(in srgb, var(--rc) 60%, transparent); animation: bh-rise 0.5s 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.br-sub { margin-top: 8px; font-size: 13px; letter-spacing: 0.2em; color: #cfcfd5; animation: bh-rise 0.5s 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.br-msg { font-size: 15px; color: ${C.player}; min-height: 1.5em; animation: bh-rise 0.5s 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.br-btns { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; animation: bh-rise 0.5s 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.br-btn { min-width: 150px; height: 44px; padding: 0 20px; border: 2px solid #f2f2f3; background: transparent; color: #f2f2f3; font-size: 14px; font-weight: 700; font-family: ${FONT}; cursor: pointer; min-height: 0; clip-path: polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%); transition: background 0.15s, color 0.15s; }
.br-btn.ok { background: ${C.player}; border-color: ${C.player}; color: #111; }
.br-btn:hover, .br-btn:focus-visible { background: #f2f2f3; color: #111; outline: none; }
.br-btn.ok:hover, .br-btn.ok:focus-visible { background: #fff35a; }
@media (prefers-reduced-motion: reduce) { .bh-auto[aria-pressed="true"] .ba-run { animation: none; stroke-dasharray: none; } .bm, .bm-win, .br, .br-band, .br-title, .br-sub, .br-msg, .br-btns, .bh-p.act .bh-face { animation: none !important; } }
`

export function BattleHud({ view, level, levelInfo, desktop, onLeave, onIntro, onCommentary, auto = false, onAuto }) {
  return (
    <div className={`bh${desktop ? ' big' : ''}`} data-testid="battle-hud">
      <style>{CSS}</style>
      <button type="button" className="bh-leave" data-testid="hud-leave" onClick={onLeave}><ExitIcon />退出</button>
      <button type="button" className="bh-icon" data-testid="hud-intro" onClick={onIntro} aria-label="ステージ説明" title="ステージ説明"><InfoIcon /></button>
      <div className="bh-stage"><b>CPU戦 Lv.{level}</b><span>{nameOf(levelInfo) ? `${nameOf(levelInfo)} ・ ` : ''}ラウンド {view.round}</span></div>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flex: 'none' }}>
        {onAuto && <button type="button" className="bh-auto" data-testid="hud-auto" aria-pressed={auto} aria-label="オート" title={auto ? 'オート: ON(おすと止まる)' : 'オート: OFF(おすと自分の番も自動で進む)'} onClick={onAuto}>
          {/* ⋈(横に1.5倍)。線は、上の左→中央→上の右→下の右→中央→下の左→もどる、の8の字になる。ONのときは、黄色の光がその線の上を走る */}
          <svg viewBox="0 0 56 32" aria-hidden="true"><path className="ba-base" d="M2 2 L28 16 L54 2 L54 30 L28 16 L2 30 Z" /><path className="ba-run" pathLength="100" d="M2 2 L28 16 L54 2 L54 30 L28 16 L2 30 Z" /></svg>
        </button>}
        {onCommentary && <CommentaryButton onClick={onCommentary} />}
      </div>
    </div>
  )
}

// ステージ説明(対戦の始まりに出る)。説明は、CPUの強さの説明 + 共通のルールの要点
export function StageIntro({ level, levelInfo, cpuChars, onClose, first }) {
  const ok = useRef(null)
  useEffect(() => { if (ok.current) ok.current.focus({ preventScroll: true }) }, [])
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <Top><div className="bm" data-testid="stage-intro" role="dialog" aria-label="ステージ説明" onClick={onClose}>
      <style>{CSS}</style>
      <div className="bm-win" onClick={(e) => e.stopPropagation()}>
        <div className="bm-head">ステージ説明<button type="button" className="bm-x" data-testid="intro-x" onClick={onClose} aria-label="閉じる"><IconClose /></button></div>
        <div className="bm-body">
          <h4>CPU戦 Lv.{level}{nameOf(levelInfo) ? ` ${nameOf(levelInfo)}` : ''}</h4>
          <p style={{ margin: '0 0 10px' }}>{levelInfo ? levelInfo.description : ''}</p>
          <h4>対戦のきまり</h4>
          <ul>
            <li>相手のキャラクターをすべて倒すと、勝ちです。</li>
            <li>入場した最初のターンは、スキルで攻撃できません(【突進】【疾走】は例外)。</li>
            <li>MPはターンごとに最大値が+1され、全回復します。進化にはEPが1必要です。</li>
            <li>{cpuChars === 'real' ? 'CPUは、本実装のキャラで戦います。' : 'CPUは、テスト用のキャラで戦います。'}{level >= 5 ? '' : '(クラスは毎回ランダム)'}</li>
            {levelInfo && levelInfo.rule && <li>{levelInfo.rule}</li>}
          </ul>
        </div>
        <div className="bm-foot"><button ref={ok} type="button" className="bm-btn ok" data-testid="intro-ok" onClick={onClose}>{first ? '対戦開始' : '閉じる'}</button></div>
      </div>
    </div></Top>
  )
}

export function ExitConfirm({ onCancel, onExit }) {
  return (
    <Top><div className="bm" data-testid="exit-confirm" role="dialog" aria-label="退出の確認" onClick={onCancel}>
      <style>{CSS}</style>
      <div className="bm-win sm" onClick={(e) => e.stopPropagation()}>
        <div className="bm-head">退出</div>
        <div className="bm-body" style={{ textAlign: 'center' }}>対戦をやめて、戻りますか?<br /><small style={{ color: '#6e6e76' }}>途中で退出すると、報酬はもらえません。</small></div>
        <div className="bm-foot">
          <button type="button" className="bm-btn" data-testid="exit-cancel" onClick={onCancel}>キャンセル</button>
          <button type="button" className="bm-btn ok" data-testid="exit-ok" onClick={onExit}>退出</button>
        </div>
      </div>
    </div></Top>
  )
}

// 勝敗の表示。buttons: [{ label, onClick, primary }]。「盤面を見る」は onDismiss
export function ResultBanner({ winner, message, buttons, onDismiss }) {
  const win = winner === 'A'
  const rc = win ? C.player : winner === 'B' ? C.enemy : '#cfcfd5'
  return (
    <Top><div className="br" data-testid="result-banner" role="dialog" aria-label="結果" style={{ '--rc': rc }}>
      <style>{CSS}</style>
      <div className="br-band">
        <div className="br-title">{win ? 'VICTORY' : winner === 'B' ? 'DEFEAT' : 'DRAW'}</div>
        <div className="br-sub">{win ? '勝利!' : winner === 'B' ? '敗北…' : '引き分け'}</div>
      </div>
      <div className="br-msg">{message}</div>
      <div className="br-btns">
        {buttons.map((b) => <button key={b.label} type="button" className={`br-btn${b.primary ? ' ok' : ''}`} onClick={b.onClick}>{b.label}</button>)}
        {onDismiss && <button type="button" className="br-btn" data-testid="result-dismiss" onClick={onDismiss}>盤面を見る</button>}
      </div>
    </div></Top>
  )
}
