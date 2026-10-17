// Feel - 設定(この端末のブラウザに保存する)。いまは「CPUの行動の待ち時間」だけ。
const KEY = 'feel.settings.v1'
export const SPEEDS = [
  { key: 'fast', label: '速い', ms: 350 },
  { key: 'normal', label: 'ふつう', ms: 700 },
  { key: 'slow', label: 'ゆっくり', ms: 1200 },
]
const DEFAULTS = { speed: 'normal' }

export function loadSettings(storage = globalThis.localStorage) {
  try {
    const s = JSON.parse(storage.getItem(KEY) || 'null')
    return { speed: SPEEDS.some((x) => x.key === s?.speed) ? s.speed : DEFAULTS.speed }
  } catch {
    return { ...DEFAULTS }
  }
}
export function saveSettings(settings, storage = globalThis.localStorage) {
  try { storage.setItem(KEY, JSON.stringify(settings)); return true } catch { return false }
}
export const cpuDelayOf = (settings) => SPEEDS.find((x) => x.key === settings.speed)?.ms ?? 700
