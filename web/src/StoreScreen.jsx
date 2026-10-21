// Feel - 購買部: ログインボーナスと合言葉(あとで、買い物の機能を足す)
// 見た目は、エンドフィールドの購買部をお手本に: 黒い上の帯 + 角丸のタブ + 明るい舞台 + 左の一覧 + 黄色の大きなボタン
import { useEffect, useRef } from 'react'
import { C, FONT, DISPLAY } from './ui.js'
import { IconGem, IconStore, IconClose } from './icons.jsx'

const TABS = [
  { key: 'bonus', label: 'ログインボーナス', Icon: IconGem },
  { key: 'code', label: '合言葉', Icon: IconStore },
]

const CSS = `
.sp { position: relative; min-height: 100vh; overflow-x: hidden; color: #1b1b1f; font-family: ${FONT}; background: linear-gradient(160deg, #f2f2f3 0%, #dedee1 55%, #cbcbd0 100%); animation: sp-fade 0.25s ease-out backwards; }
.sp button, .sp input { font-family: ${FONT}; }
@keyframes sp-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes sp-rise { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: none; } }
@keyframes sp-side { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: none; } }

/* 舞台のかざり: 等高線と、黄色の斜めの帯 */
.sp-bg { position: absolute; inset: 0; pointer-events: none; overflow: hidden; background: repeating-radial-gradient(ellipse 1300px 460px at 80% 112%, transparent 0 64px, rgba(0,0,0,0.05) 64px 66px); }
.sp-bg i { position: absolute; top: -10%; height: 130%; transform: skewX(-24deg); }
.sp-bg i:nth-child(1) { right: 12%; width: 150px; background: ${C.player}; opacity: 0.5; }
.sp-bg i:nth-child(2) { right: 26%; width: 18px; background: ${C.player}; opacity: 0.75; }
.sp-bg i:nth-child(3) { right: 7%; width: 12px; background: #1b1b1f; opacity: 0.1; }

/* 黒い上の帯: // 購買部 ・ 持っているジェム ・ 丸い × / その下に、角丸のタブ */
.sp-bar { position: sticky; top: 0; z-index: 6; background: #0b0b0d; color: #fff; padding-top: env(safe-area-inset-top); }
.sp-row { display: flex; align-items: center; gap: 12px; padding: 10px 28px 4px; }
.sp-title { font-family: ${DISPLAY}; font-weight: 600; font-size: 16px; letter-spacing: 0.12em; color: #d6d6dc; }
.sp-title b { color: ${C.player}; font-style: italic; margin-right: 2px; }
.sp-chip { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; padding: 4px 18px; border-radius: 999px; background: #232327; font-family: ${DISPLAY}; font-weight: 600; font-size: 19px; }
.sp-chip svg { color: ${C.player}; font-size: 20px; }
.sp-x { width: 44px; height: 44px; padding: 0; min-height: 0; border: 0; border-radius: 50%; background: #f2f2f3; color: #1c1c1f; font-size: 26px; display: grid; place-items: center; cursor: pointer; transition: background 0.15s, transform 0.15s; }
.sp-x:hover, .sp-x:focus-visible { background: ${C.player}; transform: rotate(90deg); outline: none; }
.sp-tabs { display: flex; gap: 10px; padding: 8px 28px 12px; overflow-x: auto; scrollbar-width: none; }
.sp-tabs::-webkit-scrollbar { display: none; }
.sp-tab { flex: none; display: inline-flex; align-items: center; gap: 10px; min-height: 0; padding: 8px 30px 8px 22px; border-radius: 999px; border: 2px solid rgba(255,255,255,0.22); background: #1d1d21; color: #9c9ca4; font-family: ${DISPLAY}; font-weight: 600; font-size: 18px; letter-spacing: 0.03em; cursor: pointer; transition: background 0.15s, color 0.15s, border-color 0.15s; }
.sp-tab svg { font-size: 22px; }
.sp-tab:hover, .sp-tab:focus-visible { border-color: ${C.player}; color: #fff; outline: none; }
.sp-tab.on { background: #f2f2f3; border-color: #f2f2f3; color: #1b1b1f; }
.sp-tab.on svg { color: #d9b800; }

.sp-body { position: relative; z-index: 1; max-width: 1280px; margin: 0 auto; padding: 26px 32px 44px; display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 34px; align-items: start; }

/* 左の一覧(いまの状態): 黄色の印 + 灰色 */
.sp-side { background: linear-gradient(180deg, #f8f8f9, #e2e2e5); box-shadow: 0 10px 24px rgba(0,0,0,0.14); animation: sp-side 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.sp-sr { position: relative; padding: 13px 18px 13px 24px; border-bottom: 1px solid rgba(0,0,0,0.08); }
.sp-sr:last-child { border-bottom: 0; }
.sp-sr .lb { font-size: 12px; color: #66666e; }
.sp-sr .v { font-family: ${DISPLAY}; font-weight: 700; font-style: italic; font-size: 28px; line-height: 1.15; }
.sp-sr .v small { font-size: 14px; font-style: normal; font-weight: 600; margin-left: 4px; color: #66666e; }
.sp-sr.hi { background: #6f6f76; color: #fff; }
.sp-sr.hi .lb, .sp-sr.hi .v small { color: #d6d6dc; }
.sp-sr.hi::before { content: ''; position: absolute; left: -9px; top: 6px; bottom: 6px; width: 4px; background: ${C.player}; }

.sp-msg { margin-bottom: 18px; padding: 12px 18px; background: #1b1b1f; color: #fff; font-size: 15px; font-weight: 700; border-left: 6px solid ${C.player}; animation: sp-rise 0.3s ease-out backwards; }
.sp-msg.bad { border-left-color: #ff5a36; color: #ffd6cc; }

.sp-eb { font-family: ${DISPLAY}; font-weight: 700; font-size: 13px; letter-spacing: 0.3em; color: #6a6a72; }
.sp-h { margin: 2px 0 6px; font-size: 38px; font-weight: 800; letter-spacing: 0.02em; }
.sp-h::after { content: ''; display: block; width: 190px; height: 5px; margin-top: 6px; background: ${C.player}; }
.sp-sub { margin: 10px 0 22px; font-size: 14px; color: #55555c; line-height: 1.7; }

/* 7日ぶんのカード */
.sp-days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 12px; }
.sp-day { position: relative; display: flex; flex-direction: column; align-items: center; padding: 14px 6px 0; min-height: 250px; background: linear-gradient(#fbfbfb, #e4e4e8); box-shadow: 0 10px 20px rgba(0,0,0,0.15); clip-path: polygon(0 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%); animation: sp-rise 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; animation-delay: calc(var(--i, 0) * 55ms); }
.sp-day .dn { font-family: ${DISPLAY}; font-weight: 700; font-size: 13px; letter-spacing: 0.18em; color: #6a6a72; }
.sp-day .gm { margin: 18px 0 10px; font-size: 62px; color: #e6c800; filter: drop-shadow(0 6px 5px rgba(0,0,0,0.25)); }
.sp-day .am { font-family: ${DISPLAY}; font-weight: 700; font-style: italic; font-size: 34px; line-height: 1; }
.sp-day .bd { margin-top: auto; width: 100%; padding: 7px 0 9px; text-align: center; font-weight: 800; font-size: 14px; background: #d6d6da; color: #3a3a40; }
.sp-day.sp7 .bd { background: #ff5a36; color: #fff; }
.sp-day.done { opacity: 0.62; }
.sp-day.done .bd { background: #8b8b92; color: #fff; }
.sp-day.now { transform: translateY(-8px); box-shadow: 0 16px 26px rgba(0,0,0,0.22); background: linear-gradient(#fffbe0, #f6e98a); }
.sp-day.now .bd { background: ${C.player}; color: #141414; }

.sp-act { display: flex; align-items: center; justify-content: flex-end; gap: 22px; flex-wrap: wrap; margin-top: 28px; }
.sp-act .nt { margin-right: auto; font-size: 14px; color: #44444a; line-height: 1.7; }
.sp-buy { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 26px; min-width: 310px; min-height: 0; padding: 14px 26px 14px 78px; border: 0; background: linear-gradient(105deg, #e3c800 0 22%, ${C.player} 22% 100%); color: #141414; font-size: 21px; font-weight: 800; cursor: pointer; transition: transform 0.14s, filter 0.14s; }
.sp-buy .ar { font-family: ${DISPLAY}; font-size: 30px; line-height: 1; }
.sp-buy small { font-size: 14px; font-weight: 700; margin-left: 8px; }
.sp-buy:hover:not(:disabled), .sp-buy:focus-visible { transform: translateX(-4px); filter: brightness(1.05); outline: none; }
.sp-buy:disabled { background: linear-gradient(105deg, #aeaeb4 0 22%, #c4c4c9 22% 100%); color: #77777e; cursor: default; }

/* 合言葉 */
.sp-code { padding: 24px 28px 26px; background: linear-gradient(#fbfbfb, #e6e6e9); box-shadow: 0 10px 22px rgba(0,0,0,0.14); clip-path: polygon(0 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%); }
.sp-code label { display: block; font-weight: 700; font-size: 13px; letter-spacing: 0.06em; color: #6a6a72; margin-bottom: 8px; }
.sp-in { width: 100%; box-sizing: border-box; min-height: 0; border-radius: 0; padding: 12px 14px; border: 0; border-bottom: 4px solid ${C.player}; background: #fff; color: #1b1b1f; font-size: 26px; font-weight: 700; letter-spacing: 0.08em; outline: none; }
.sp-in::placeholder { color: #b4b4ba; font-weight: 400; letter-spacing: 0.02em; }
.sp-in:focus { box-shadow: 0 0 0 3px rgba(255,230,0,0.5); }
.sp-load { padding: 40px 0; text-align: center; color: #55555c; font-size: 16px; }

@media (max-width: 899px) {
  .sp-row { padding: 8px 14px 2px; } .sp-tabs { padding: 8px 14px 10px; } .sp-tab { padding: 7px 22px 7px 16px; font-size: 16px; }
  .sp-body > div { min-width: 0; }
  .sp-body { grid-template-columns: minmax(0, 1fr); gap: 20px; padding: 16px 14px calc(30px + env(safe-area-inset-bottom)); }
  .sp-side { display: grid; grid-template-columns: 1fr 1fr; }
  .sp-sr { border-bottom: 1px solid rgba(0,0,0,0.08); padding: 10px 12px 10px 18px; } .sp-sr .v { font-size: 24px; }
  .sp-sr.hi::before { left: -6px; }
  .sp-h { font-size: 30px; }
  .sp-days { grid-template-columns: repeat(7, 112px); overflow-x: auto; padding: 14px 4px 18px; margin: 0 -4px; scroll-snap-type: x proximity; }
  .sp-day { scroll-snap-align: start; min-height: 232px; }
  .sp-act { margin-top: 12px; } .sp-buy { min-width: 0; width: 100%; box-sizing: border-box; }
  .sp-in { font-size: 22px; }
}
@media (prefers-reduced-motion: reduce) { .sp, .sp-side, .sp-msg, .sp-day { animation: none !important; } .sp-buy, .sp-x { transition: none; } }
`

function Row({ label, value, unit, hi }) {
  return (
    <div className={`sp-sr${hi ? ' hi' : ''}`}>
      <div className="lb">{label}</div>
      <div className="v">{value}{unit && <small>{unit}</small>}</div>
    </div>
  )
}

export default function StoreScreen({ me, busy, notice, error, tab, onTab, code, onCode, onClaimBonus, onRedeem, pityCount = 40, onExit }) {
  const nowRef = useRef(null)
  const lb = me && me.loginBonus
  const cycle = (lb && lb.cycle) || []
  const len = cycle.length || 7
  // 今日(または、受け取った日)が、7日の何日目か。受け取る前は streak 日ぶん終わっている
  const todayIdx = lb ? (lb.canClaim ? lb.streak % len : (lb.streak - 1 + len) % len) : 0
  useEffect(() => {
    if (nowRef.current && nowRef.current.scrollIntoView) nowRef.current.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [tab, todayIdx, !!lb]) // eslint-disable-line react-hooks/exhaustive-deps

  const msg = (notice || error) && <div className={`sp-msg${error && !notice ? ' bad' : ''}`} role="status">{notice || error}</div>

  const bonus = lb && (
    <>
      <div className="sp-eb">LOGIN BONUS</div>
      <h2 className="sp-h">ログインボーナス</h2>
      <p className="sp-sub">毎日1回、ジェムがもらえます。連続でログインすると、7日目に特別な量になります。</p>
      <div className="sp-days" role="list">
        {cycle.map((amount, i) => {
          const done = lb.canClaim ? i < todayIdx : i <= todayIdx
          const now = lb.canClaim && i === todayIdx
          const last = i === len - 1
          return (
            <div key={i} role="listitem" ref={now ? nowRef : null} className={`sp-day${done ? ' done' : ''}${now ? ' now' : ''}${last ? ' sp7' : ''}`} style={{ '--i': i }}>
              <div className="dn">DAY {i + 1}</div>
              <IconGem className="gm" />
              <div className="am">{amount}</div>
              <div className="bd">{done ? '受取済 ✓' : now ? 'TODAY' : last ? 'スペシャル' : `あと${i - todayIdx}日`}</div>
            </div>
          )
        })}
      </div>
      <div className="sp-act">
        <div className="nt">
          {lb.canClaim ? `今日の分: +${lb.nextAmount} ジェム` : `今日は受け取り済みです(連続${lb.streak}日)。明日は +${lb.nextAmount} ジェム`}
        </div>
        <button type="button" className="sp-buy" disabled={busy || !lb.canClaim} onClick={onClaimBonus}>
          <span>{lb.canClaim ? '受け取る' : '受け取り済み'}{lb.canClaim && <small>+{lb.nextAmount}</small>}</span>
          <span className="ar" aria-hidden="true">{lb.canClaim ? '→' : '✓'}</span>
        </button>
      </div>
    </>
  )

  const codeTab = (
    <>
      <div className="sp-eb">CODE</div>
      <h2 className="sp-h">合言葉</h2>
      <p className="sp-sub">合言葉を入れると、ジェムなどを受け取れます。</p>
      <div className="sp-code">
        <label htmlFor="sp-code">合言葉を入力</label>
        <input id="sp-code" className="sp-in" value={code} maxLength={40} placeholder="ここに入力" autoComplete="off" onChange={(e) => onCode(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !busy && code.trim()) onRedeem() }} />
      </div>
      <div className="sp-act">
        <button type="button" className="sp-buy" disabled={busy || !code.trim()} onClick={onRedeem}>
          <span>受け取る</span><span className="ar" aria-hidden="true">→</span>
        </button>
      </div>
    </>
  )

  return (
    <div className="sp" data-testid="store">
      <style>{CSS}</style>
      <div className="sp-bg" aria-hidden="true"><i /><i /><i /></div>
      <div className="sp-bar">
        <div className="sp-row">
          <div className="sp-title"><b>//</b>購買部</div>
          {me && <div className="sp-chip" aria-label="ジェム"><IconGem />{me.gems}</div>}
          <button type="button" className="sp-x" onClick={onExit} aria-label="閉じる"><IconClose /></button>
        </div>
        <div className="sp-tabs" role="tablist">
          {TABS.map(({ key, label, Icon }) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} className={`sp-tab${tab === key ? ' on' : ''}`} onClick={() => onTab(key)}><Icon />{label}</button>
          ))}
        </div>
      </div>
      <div className="sp-body">
        <div className="sp-side">
          <Row hi label="ジェム" value={me ? me.gems : '-'} />
          <Row label="連続ログイン" value={lb ? lb.streak : '-'} unit="日" />
          <Row label="今日の対戦報酬" value={me && me.battle ? `${me.battle.todayCount}/${me.battle.dailyLimit}` : '-'} unit="回" />
          <Row label="ガチャの天井まで" value={me ? Math.max(0, pityCount - (me.pityCount || 0)) : '-'} unit="回" />
        </div>
        <div>
          {msg}
          {!me ? <div className="sp-load">読み込み中…</div> : tab === 'bonus' ? bonus : codeTab}
        </div>
      </div>
    </div>
  )
}
