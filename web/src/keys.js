// Feel - キーボード操作。キーの割り当ては、設定の「コンフィグ」で変えられる(この端末のブラウザに保存)。
// ★ 操作を足すときは、下の ACTIONS に1つ足す(id・名前・分類・初めのキー)。
//    画面の中で使うときは、その画面で useHotkey('分類.名前', () => { ... }) と書く(false を返すと、次の候補に回る)。
//    矢印・決定・戻る・閉じるは、画面のボタンを探して押す(どの画面でも使える)。
import { useEffect, useRef } from 'react'

const KEY = 'feel.keys.v1'
export const GROUPS = ['共通', '戦闘', 'Wiki']

export const ACTIONS = [
  { id: 'nav.up', group: '共通', label: '上を選ぶ', keys: ['ArrowUp'] },
  { id: 'nav.down', group: '共通', label: '下を選ぶ', keys: ['ArrowDown'] },
  { id: 'nav.left', group: '共通', label: '左を選ぶ', keys: ['ArrowLeft'] },
  { id: 'nav.right', group: '共通', label: '右を選ぶ', keys: ['ArrowRight'] },
  { id: 'nav.confirm', group: '共通', label: '決定・開く', keys: ['Enter'] },
  { id: 'nav.back', group: '共通', label: '戻る', keys: ['Backspace'] },
  { id: 'nav.close', group: '共通', label: '閉じる・スキップ(ガチャ)', keys: ['Escape'] },
  { id: 'nav.tabPrev', group: '共通', label: '前のタブ', keys: ['[', 'PageUp'] },
  { id: 'nav.tabNext', group: '共通', label: '次のタブ', keys: [']', 'PageDown'] },
  { id: 'ui.help', group: '共通', label: 'キー操作の一覧を出す', keys: ['?'] },
  { id: 'battle.menu', group: '戦闘', label: 'バトルメニュー(ポーズ)', keys: ['Escape'] },
  { id: 'battle.log', group: '戦闘', label: 'バトルログ', keys: ['Tab'] },
  { id: 'battle.endTurn', group: '戦闘', label: 'ターン終了', keys: ['Space'] },
  { id: 'battle.attack', group: '戦闘', label: '攻撃する(選択中の対象)', keys: ['a'] },
  { id: 'battle.auto', group: '戦闘', label: 'オート', keys: ['z'] },
  { id: 'battle.field', group: '戦闘', label: 'カーソルをフィールドに移す', keys: ['w'] },
  ...[1, 2, 3, 4].map((n) => ({ id: `battle.trait${n}`, group: '戦闘', label: `特性${n}(上から${n}番目)`, keys: [String(n)] })),
  ...[1, 2, 3, 4, 5, 6].map((n) => ({ id: `wiki.${n}`, group: 'Wiki', label: `${n}番目の項目`, keys: [String(n)] })),
]
const BY_ID = Object.fromEntries(ACTIONS.map((a) => [a.id, a]))

// ---- 保存 ----
let custom = null // { id: [key,...] }
const listeners = new Set()
function load() {
  if (custom) return custom
  custom = {}
  try {
    const s = JSON.parse(globalThis.localStorage.getItem(KEY) || 'null')
    if (s && typeof s === 'object') for (const [id, ks] of Object.entries(s)) if (BY_ID[id] && Array.isArray(ks)) custom[id] = ks.filter((k) => typeof k === 'string').slice(0, 3)
  } catch { /* 保存できない環境では、初めのキーのまま */ }
  return custom
}
function persist() { try { globalThis.localStorage.setItem(KEY, JSON.stringify(custom)) } catch { /* ignore */ } }
function save() {
  persist()
  listeners.forEach((f) => f())
  if (onSaved) onSaved(custom)
}
// アカウントに保存するための窓口: 変えたときに呼ぶ関数を、アプリが入れる
let onSaved = null
export const setKeysSaver = (f) => { onSaved = f }
export const customKeys = () => ({ ...load() })
// アカウントに保存してあった割り当てを、この端末に反映する(保存し直しはしない)。null なら、何もしない
export function applyRemoteKeys(obj) {
  if (!obj || typeof obj !== 'object') return
  load()
  custom = {}
  for (const [id, ks] of Object.entries(obj)) if (BY_ID[id] && Array.isArray(ks)) custom[id] = ks.filter((k) => typeof k === 'string').slice(0, 3)
  persist()
  listeners.forEach((f) => f())
}
export const keysOf = (id) => (load()[id] ?? BY_ID[id]?.keys ?? [])
export const isCustom = (id) => id in load()
export function setKeys(id, keys) { load(); custom[id] = keys.slice(0, 3); save() }
export function resetKey(id) { load(); delete custom[id]; save() }
export function resetAllKeys() { custom = {}; save() }
export function subscribeKeys(f) { listeners.add(f); return () => listeners.delete(f) }

// 同じ範囲で、すでに使っているキーを探す(共通は、どの分類とも重なる)
export function conflictOf(id, key) {
  const me = BY_ID[id]
  return ACTIONS.find((a) => a.id !== id && (a.group === me.group || a.group === '共通' || me.group === '共通') && keysOf(a.id).includes(key)) || null
}
// いまのキーの割り当てを、他の操作から取り上げて、割り当てる
export function assignKey(id, key, { add = false } = {}) {
  load()
  const taken = []
  for (const a of ACTIONS) {
    if (a.id === id || !keysOf(a.id).includes(key)) continue
    const me = BY_ID[id]
    if (!(a.group === me.group || a.group === '共通' || me.group === '共通')) continue
    custom[a.id] = keysOf(a.id).filter((k) => k !== key); taken.push(a)
  }
  const cur = add ? keysOf(id).filter((k) => k !== key) : []
  custom[id] = [...cur, key].slice(0, 3)
  save()
  return taken
}

// ---- キーの名前 ----
export function keyName(e) {
  if (e.key === ' ' || e.code === 'Space') return 'Space'
  if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return null
  if (e.key.length === 1) return e.key.toLowerCase()
  return (e.shiftKey ? 'Shift+' : '') + e.key
}
const SHOW = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Escape: 'Esc', Backspace: 'Backspace', PageUp: 'PgUp', PageDown: 'PgDn' }
export const keyLabel = (k) => k.replace(/^Shift\+/, 'Shift+').split('+').map((p) => SHOW[p] || (p.length === 1 ? p.toUpperCase() : p)).join('+')

// ---- 画面ごとの操作の登録(あとから登録したものが先に呼ばれる) ----
const stack = [] // { id, ref }
export function useHotkey(id, fn) {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    const entry = { id, ref }
    stack.push(entry)
    return () => { const i = stack.indexOf(entry); if (i >= 0) stack.splice(i, 1) }
  }, [id])
}

// キーの割り当てを変えている間は、ふだんの操作を止める
let capturing = 0
export function pauseKeys(on) { capturing = Math.max(0, capturing + (on ? 1 : -1)) }

// ---- 画面のボタンを探して押す(矢印・決定・戻る・閉じる・タブ) ----
const FOCUSABLE = 'button:not([disabled]), a[href], [role="button"]:not([aria-disabled="true"]), [role="tab"], [role="radio"], input:not([type="hidden"]):not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
const visible = (el) => {
  const r = el.getBoundingClientRect()
  if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) return false
  const cs = getComputedStyle(el)
  if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.05) return false
  // 手前に別のもの(ダイアログなど)がかぶっていたら、選べない
  const cx = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), cy = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2))
  const top = document.elementFromPoint(cx, cy)
  return !!top && (top === el || el.contains(top) || top.contains(el))
}
const candidates = () => [...document.querySelectorAll(FOCUSABLE)].filter((el) => el.getAttribute('data-alive') !== 'false' && visible(el)) // 戦闘不能のユニット(data-alive=false)は、選べない札なので飛ばす
const rect = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r } }

export function moveFocus(dir) {
  const list = candidates()
  if (!list.length) return false
  const cur = document.activeElement && list.includes(document.activeElement) ? document.activeElement : null
  if (!cur) { // まだ何も選んでいなければ、左上から数えて最初のものを選ぶ
    const main = list.filter((el) => !el.matches(CLOSERS)) // 閉じるボタン以外があれば、そちらを先に選ぶ
    const pool = main.length ? main : list
    pool.sort((a, b) => rect(a).y - rect(b).y || rect(a).x - rect(b).x)
    pool[0].focus({ preventScroll: false }); return true
  }
  const c = rect(cur)
  const scored = []
  for (const el of list) {
    if (el === cur) continue
    const p = rect(el)
    const dx = p.x - c.x, dy = p.y - c.y
    const main = dir === 'left' ? -dx : dir === 'right' ? dx : dir === 'up' ? -dy : dy
    if (main < 2) continue
    const side = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx)
    scored.push({ el, score: main + side * 2.2 })
  }
  scored.sort((a, b) => a.score - b.score)
  for (const { el } of scored) { // 近い順に試す。フォーカスできないもの(戦闘不能の札など)は飛ばして、その先へ
    el.focus()
    if (document.activeElement === el) { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); break }
  }
  return true // これ以上先がなければ、その場にとどまる
}
const lastVisible = (sel) => { const l = [...document.querySelectorAll(sel)].filter(visible); return l[l.length - 1] || null }
const clickLast = (sel) => { const el = lastVisible(sel); if (el) { el.click(); return true } return false }
const CLOSERS = 'button[aria-label="閉じる"], button[aria-label="戻る"], button[aria-label="前の場所へ"], .fx-close'
function step(delta) {
  const tabs = [...document.querySelectorAll('[role="tab"], .st-tab')].filter(visible)
  if (tabs.length < 2) return false
  let i = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true' || t.getAttribute('aria-current') === 'true' || t.classList.contains('on'))
  if (i < 0) i = 0
  const t = tabs[(i + delta + tabs.length) % tabs.length]
  t.click(); t.focus({ preventScroll: true }); return true
}
// ---- 層(Enterで1つ奥へ、Esc・Backspaceで1つ手前へ)。人事の動きを、すべての画面の基準にする ----
// Enter で奥の層(画面・ダイアログ)が開いたら、押した項目を覚えておく。戻る・閉じるで手前の層に戻ったら、その項目にカーソルを戻す
const layers = [] // { key }
const keyOf = (el) => el.getAttribute('data-testid') ? `[data-testid="${el.getAttribute('data-testid')}"]` : el.getAttribute('aria-label') ? `[aria-label="${el.getAttribute('aria-label')}"]` : null
const closerCount = () => [...document.querySelectorAll(CLOSERS)].filter(visible).length
function enterLayer(el) {
  const key = keyOf(el)
  if (!key) return
  const before = closerCount(), sig = document.body.innerText.length
  setTimeout(() => {
    const changed = !document.contains(el) || !visible(el) || closerCount() > before || Math.abs(document.body.innerText.length - sig) > 40
    if (changed) { layers.push({ key }); if (layers.length > 24) layers.shift() }
  }, 260)
}
function leaveLayer() {
  const l = layers.pop()
  if (!l) return
  let tries = 0
  const t = setInterval(() => { // 画面が切り替わる間は、少し待ってから戻す
    const el = document.querySelector(l.key)
    if (el && visible(el)) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); clearInterval(t) }
    else if (++tries > 20) clearInterval(t)
  }, 80)
}
const BUILTIN = {
  'nav.up': () => moveFocus('up'), 'nav.down': () => moveFocus('down'), 'nav.left': () => moveFocus('left'), 'nav.right': () => moveFocus('right'),
  'nav.confirm': () => {
    const a = document.activeElement
    if (a && a !== document.body && visible(a)) { enterLayer(a); a.click(); return true }
    return moveFocus('down')
  },
  'nav.back': () => { const ok = clickLast(CLOSERS); if (ok) leaveLayer(); return ok },
  'nav.close': () => { if (clickLast('[data-testid="gs-skip"]')) return true; const ok = clickLast(CLOSERS); if (ok) leaveLayer(); return ok },
  'nav.tabPrev': () => step(-1), 'nav.tabNext': () => step(1),
  ...Object.fromEntries([1, 2, 3, 4, 5, 6].map((n) => [`wiki.${n}`, () => { const t = [...document.querySelectorAll('.wk-tile')].filter(visible)[n - 1]; if (!t) return false; t.click(); return true }])),
}

// 入力欄にいるときは、文字の入力をじゃましない(Esc だけは、入力欄から抜ける)
const typing = (el) => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && !['button', 'checkbox', 'radio', 'submit'].includes(el.type))

let installed = false
const swallow = new Set()
export function installKeys() {
  if (installed || typeof document === 'undefined') return
  installed = true
  const style = document.createElement('style')
  style.textContent = 'html.feel-kb :focus-visible { outline: 3px solid #ffd23f !important; outline-offset: 2px; border-radius: 4px; }'
  document.head.appendChild(style)
  document.addEventListener('pointerdown', () => document.documentElement.classList.remove('feel-kb'), true)
  document.addEventListener('keydown', (e) => {
    if (capturing || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return
    const name = keyName(e)
    if (!name) return
    if (typing(e.target)) { if (name === 'Escape') e.target.blur(); return }
    const ids = ACTIONS.filter((a) => keysOf(a.id).includes(name)).map((a) => a.id)
    for (const id of ids) {
      let done = false
      for (let i = stack.length - 1; i >= 0 && !done; i--) if (stack[i].id === id && stack[i].ref.current(e) !== false) done = true
      if (!done && BUILTIN[id]) done = BUILTIN[id](e) !== false
      if (done) {
        document.documentElement.classList.add('feel-kb')
        e.preventDefault(); swallow.add(name); return
      }
    }
  }, true)
  // ボタンにいるときの Space は、離したときに押されてしまうので、そちらも止める
  document.addEventListener('keyup', (e) => {
    const name = keyName(e)
    if (name && swallow.delete(name)) e.preventDefault()
  }, true)
}
