import { useEffect, useState } from 'react'
import { C, FONT, DISPLAY } from './ui.js'
import { ACTIONS, GROUPS, keysOf, isCustom, subscribeKeys, assignKey, resetKey, resetAllKeys, keyName, keyLabel, pauseKeys, useHotkey } from './keys.js'

const CSS = `
.kc-g { margin: 14px 0 6px; font-family: ${DISPLAY}; font-weight: 600; font-size: 13px; letter-spacing: 0.06em; color: ${C.mute}; }
.kc-keys { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; min-width: 0; }
.kc-key { min-width: 30px; padding: 4px 9px; border: 1px solid rgba(255,255,255,0.22); border-bottom-width: 3px; background: #141417; color: #fff; font-family: ${DISPLAY}; font-weight: 600; font-size: 13px; text-align: center; border-radius: 5px; }
.kc-key.wait { border-color: ${C.player}; color: ${C.player}; animation: kc-blink 1s ease-in-out infinite; }
.kc-key.none { color: ${C.mute}; }
@keyframes kc-blink { 50% { opacity: 0.45; } }
.kc-btns { display: flex; gap: 6px; flex: none; }
.kc-btns button { padding: 6px 12px; border: 0; background: #3a3a3f; color: #f1f1f2; font-family: ${FONT}; font-size: 12px; cursor: pointer; min-height: 0; }
.kc-btns button:hover, .kc-btns button:focus-visible { background: ${C.player}; color: #111; outline: none; }
.kc-btns button.main { background: #f2f2f3; color: #111; }
.kc-msg { margin: 4px 2px 0; font-size: 12px; color: ${C.player}; }
.kh { position: fixed; inset: 0; z-index: 300; display: grid; place-items: center; background: rgba(0,0,0,0.6); }
.kh-box { width: min(640px, 94%); max-height: 88%; overflow-y: auto; padding: 20px 24px; background: #1b1b1f; color: ${C.ink}; border: 1px solid rgba(255,255,255,0.14); font-family: ${FONT}; }
.kh-h { font-family: ${DISPLAY}; font-weight: 700; font-size: 18px; margin-bottom: 4px; }
.kh-r { display: flex; justify-content: space-between; gap: 12px; padding: 5px 0; font-size: 14px; border-bottom: 1px dotted rgba(255,255,255,0.12); }
.kh-n { margin-top: 10px; font-size: 12px; color: ${C.mute}; }
`

// 設定の「コンフィグ」: 操作ごとに、キーを変える・足す・初期値に戻す
export function KeyConfig() {
  const [, force] = useState(0)
  const [wait, setWait] = useState(null) // { id, add }
  const [msg, setMsg] = useState('')
  useEffect(() => subscribeKeys(() => force((n) => n + 1)), [])
  useEffect(() => {
    if (!wait) return undefined
    pauseKeys(true)
    const onKey = (e) => {
      e.preventDefault(); e.stopPropagation()
      const name = keyName(e)
      if (!name) return
      if (name === 'Escape') { setWait(null); setMsg(''); return }
      const taken = assignKey(wait.id, name, { add: wait.add })
      setMsg(taken.length ? `「${keyLabel(name)}」は、「${taken.map((a) => a.label).join('」「')}」から、ここに移しました。` : '')
      setWait(null)
    }
    window.addEventListener('keydown', onKey, true)
    return () => { window.removeEventListener('keydown', onKey, true); pauseKeys(false) }
  }, [wait])
  return (
    <div>
      <style>{CSS}</style>
      {GROUPS.map((g) => (
        <div key={g}>
          <div className="kc-g">{g}</div>
          {ACTIONS.filter((a) => a.group === g).map((a) => {
            const ks = keysOf(a.id), waiting = wait && wait.id === a.id
            return (
              <div className="st-row" key={a.id} data-testid={`key-${a.id}`}>
                <span className="st-label">{a.label}</span>
                <span className="kc-keys">
                  {waiting ? <span className="kc-key wait">キーを押す(Escで中止)</span> : ks.length ? ks.map((k) => <span className="kc-key" key={k}>{keyLabel(k)}</span>) : <span className="kc-key none">なし</span>}
                </span>
                <span className="kc-btns">
                  <button type="button" className="main" onClick={() => { setWait({ id: a.id, add: false }); setMsg('') }}>変更</button>
                  <button type="button" disabled={ks.length >= 3} onClick={() => { setWait({ id: a.id, add: true }); setMsg('') }}>追加</button>
                  <button type="button" disabled={!isCustom(a.id)} onClick={() => { resetKey(a.id); setMsg('') }}>初期値</button>
                </span>
              </div>
            )
          })}
        </div>
      ))}
      {msg && <div className="kc-msg">{msg}</div>}
      <div className="st-row" style={{ marginTop: 10 }}>
        <span className="st-label">すべての割り当て</span>
        <span className="kc-btns"><button type="button" onClick={() => { resetAllKeys(); setMsg('') }}>すべて初期値に戻す</button></span>
      </div>
    </div>
  )
}

export function KeyHelpHost() {
  const [open, setOpen] = useState(false)
  return <KeyHelp open={open} onClose={(v) => setOpen(typeof v === 'boolean' ? v : false)} />
}

// 「?」で出る、キー操作の一覧
export function KeyHelp({ open, onClose }) {
  useHotkey('nav.close', () => { if (!open) return false; onClose() })
  useHotkey('nav.back', () => { if (!open) return false; onClose() })
  useHotkey('ui.help', () => { onClose(!open) })
  if (!open) return null
  return (
    <div className="kh" onClick={() => onClose()} role="dialog" aria-label="キー操作の一覧">
      <style>{CSS}</style>
      <div className="kh-box" onClick={(e) => e.stopPropagation()}>
        <div className="kh-h">キー操作</div>
        {ACTIONS.filter((a) => !a.id.startsWith('wiki.') || a.id === 'wiki.1').map((a) => (
          <div className="kh-r" key={a.id}><span>{a.id === 'wiki.1' ? 'Wikiの項目(1〜6)' : `${a.group === '共通' ? '' : a.group + ' / '}${a.label}`}</span><span>{a.id === 'wiki.1' ? [1, 2, 3, 4, 5, 6].map((n) => keyLabel(keysOf(`wiki.${n}`)[0] || '-')).join(' ') : keysOf(a.id).map(keyLabel).join(' / ') || '-'}</span></div>
        ))}
        <div className="kh-n">キーは、設定の「コンフィグ」で変えられます。</div>
      </div>
    </div>
  )
}
