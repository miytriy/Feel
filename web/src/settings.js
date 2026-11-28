// Feel - 設定(この端末のブラウザに保存する)。対戦まわりのオン・オフ。演出と CPU の待ち時間は 700ms 固定(速さの設定は廃止)。
const KEY = 'feel.settings.v1'
export const CPU_DELAY_MS = 700 // 再生の速さ・CPUの待ち時間は固定(11/28 設定を廃止)
const DEFAULTS = { fitField: true, autoEnd: true, overlap: true } // overlap: 軽い演出(回復・強化・カウントダウンなど)は、前の演出が終わる前に次を流す(試験)。autoEnd: ユニットの行動手段がひとつも無いとき、自動でターンを終了する。fitField: 操作パネルで盤面が隠れるとき、盤面を自動で縮める(スマホ)

export function loadSettings(storage = globalThis.localStorage) {
  try {
    const s = JSON.parse(storage.getItem(KEY) || 'null')
    return { fitField: typeof s?.fitField === 'boolean' ? s.fitField : DEFAULTS.fitField, autoEnd: typeof s?.autoEnd === 'boolean' ? s.autoEnd : DEFAULTS.autoEnd, overlap: typeof s?.overlap === 'boolean' ? s.overlap : DEFAULTS.overlap }
  } catch {
    return { ...DEFAULTS }
  }
}
export function saveSettings(settings, storage = globalThis.localStorage) {
  try { storage.setItem(KEY, JSON.stringify(settings)); return true } catch { return false }
}
export const cpuDelayOf = () => CPU_DELAY_MS
