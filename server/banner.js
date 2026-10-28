// ガチャのバナー(通常 / ピックアップ)と、ピックアップの切り替え
// ピックアップは、毎月1日の日本時間 0:00:00 に次のローテーションへ移る(30日ごと=毎月)。
// ローテーション1(伝説の幕開け)の開始月は、PICKUP_START で決める。ローテーションが尽きたら、最後のものを続ける。
import { ROTATION_NAMES, hasPool } from './gacha.js'

export const PICKUP_START = { year: 2026, month: 10 } // ローテーション1が始まる月(日本時間)
const JST_MS = 9 * 3600 * 1000

const jst = (now) => new Date(now.getTime() + JST_MS)
const monthIndex = (now) => { const d = jst(now); return (d.getUTCFullYear() - PICKUP_START.year) * 12 + (d.getUTCMonth() + 1 - PICKUP_START.month) }
// 次の切り替え(来月1日 日本時間0時)の時刻
export const nextSwitch = (now) => { const d = jst(now); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) - JST_MS) }

const numericKeys = Object.keys(ROTATION_NAMES).filter((k) => /^\d+$/.test(k)).map(Number).sort((a, b) => a - b)

// いまのピックアップのローテーション(キー)。始まる前は null
export function currentPickupKey(now = new Date()) {
  const idx = monthIndex(now)
  if (idx < 0 || !numericKeys.length) return null
  const key = numericKeys[Math.min(idx, numericKeys.length - 1)]
  return String(key)
}

// 画面用: 2つのバナーの情報
export function bannersInfo(now = new Date()) {
  const key = currentPickupKey(now)
  return {
    normal: { id: 'normal', name: '通常ガチャ', rotation: 'basic', rotationName: ROTATION_NAMES.basic, available: hasPool('basic') },
    pickup: {
      id: 'pickup', name: 'ピックアップガチャ', rotation: key, rotationName: key ? ROTATION_NAMES[key] : null,
      available: !!key && hasPool(key), endsAt: nextSwitch(now).toISOString(),
    },
  }
}

// banner('normal'|'pickup') から、引くローテーションを決める。引けなければ null
export function rotationForBanner(banner, now = new Date()) {
  if (banner === 'normal') return hasPool('basic') ? 'basic' : null
  if (banner === 'pickup') { const k = currentPickupKey(now); return k && hasPool(k) ? k : null }
  return null
}
