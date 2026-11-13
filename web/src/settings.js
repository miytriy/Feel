// Feel - 設定(この端末のブラウザに保存する)。いまは「CPUの行動の待ち時間」だけ。
const KEY = 'feel.settings.v1'
export const SPEEDS = [
  { key: 'fast', label: '速い', ms: 350 },
  { key: 'normal', label: 'ふつう', ms: 700 },
  { key: 'slow', label: 'ゆっくり', ms: 1200 },
]
const DEFAULTS = { speed: 'normal', fitField: true } // fitField: 操作パネルで盤面が隠れるとき、盤面を自動で縮める(スマホ)

export function loadSettings(storage = globalThis.localStorage) {
  try {
    const s = JSON.parse(storage.getItem(KEY) || 'null')
    return { speed: SPEEDS.some((x) => x.key === s?.speed) ? s.speed : DEFAULTS.speed, fitField: typeof s?.fitField === 'boolean' ? s.fitField : DEFAULTS.fitField }
  } catch {
    return { ...DEFAULTS }
  }
}
export function saveSettings(settings, storage = globalThis.localStorage) {
  try { storage.setItem(KEY, JSON.stringify(settings)); return true } catch { return false }
}
export const cpuDelayOf = (settings) => SPEEDS.find((x) => x.key === settings.speed)?.ms ?? 700
