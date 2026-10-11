// Feel Battle - 標準編成とCPUの編成(キャラのidだけを書きます。キャラ本体は characters/ フォルダ)
// 自分側は、編成画面を一度も保存していないときの初期編成です。
import { NEUTRAL, MAX_SLOTS } from './formation.js'

export const DEFAULT_PLAYER_IDS = ['test_17', 'test_18', 'test_19', 'test_20', 'test_21']
export const CPU_TEAM_IDS = ['test_06', 'test_09', 'test_10', 'test_15', 'test_16'] // テストキャラ用の、固定のCPU編成

// ---- 開発者設定: CPUが使うキャラ('test' = テストキャラ / 'real' = 本実装キャラ) ----
export const DEV_CPU_KEY = 'feel.dev.cpuChars'
export const isTestChar = (c) => c.id.startsWith('test_') // id が test_ で始まるキャラは、テスト用

export function loadCpuCharSetting(storage = globalThis.localStorage) {
  try {
    return storage.getItem(DEV_CPU_KEY) === 'real' ? 'real' : 'test'
  } catch {
    return 'test'
  }
}
export function saveCpuCharSetting(mode, storage = globalThis.localStorage) {
  try {
    storage.setItem(DEV_CPU_KEY, mode)
  } catch {
    /* 保存できなくても、そのまま続ける */
  }
}

const shuffle = (list, rng) => {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// CPUの編成を作る。'test' は固定の編成。'real' は、本実装キャラから「同じクラス(+ニュートラル)」で最大5体をランダムに選ぶ
// (本実装キャラが1体もいないときは、テストキャラの編成に戻す)
export function buildCpuTeam(allChars, mode = 'test', rng = Math.random) {
  const byId = (id) => allChars.find((c) => c.id === id)
  const fixed = () => CPU_TEAM_IDS.map(byId).filter(Boolean)
  if (mode !== 'real') return fixed()
  const real = allChars.filter((c) => !isTestChar(c))
  if (!real.length) return fixed()
  const classes = [...new Set(real.map((c) => c.class).filter((k) => k !== NEUTRAL))]
  const cls = classes.length ? classes[Math.floor(rng() * classes.length)] : null
  const pool = real.filter((c) => c.class === NEUTRAL || c.class === cls)
  return shuffle(pool, rng).slice(0, MAX_SLOTS)
}
