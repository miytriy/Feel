// 署名システム(サーバー側が正)
// owned: { キャラid: 1 }  持っているキャラ(1体まで) / sig: { キャラid: 持っている署名の数 } / enh: { キャラid: 強化レベル }
// 同名キャラを引くと、キャラの代わりに「〇〇の署名」を1つもらう。署名100個ごとに1回強化でき、強化1回で全ステータス+10。
export const SIG_PER_LEVEL = 100
export const ENHANCE_STEP = 10

// 古いデータ(owned に所持数が入っていた)を新しい形にそろえる。2個目以降は署名に変える
export function normalizeOwned(data) {
  const owned = {}
  const sig = { ...(data.sig || {}) }
  const enh = { ...(data.enh || {}) }
  let changed = !data.sig || !data.enh
  for (const [id, n] of Object.entries(data.owned || {})) {
    if (!(n > 0)) { changed = true; continue }
    owned[id] = 1
    if (n > 1) { sig[id] = (sig[id] || 0) + (n - 1); changed = true }
  }
  return { owned, sig, enh, changed }
}

// ガチャの結果を所持に反映する。pulls[].characters[].id を順に見て、初めてならキャラ、2回目以降なら署名
export function applyPulls(state, pulls) {
  const owned = { ...state.owned }
  const sig = { ...state.sig }
  const gained = [] // pulls と同じ形の並びで、'char' か 'sig' を記録
  for (const pull of pulls) {
    gained.push(pull.characters.map((c) => {
      if (owned[c.id]) { sig[c.id] = (sig[c.id] || 0) + 1; return 'sig' }
      owned[c.id] = 1
      return 'char'
    }))
  }
  return { owned, sig, gained }
}

// 強化する(1回ぶん)。署名が足りない / キャラを持っていない場合は null
export function enhanceOnce(state, id) {
  if (!state.owned[id]) return null
  if ((state.sig[id] || 0) < SIG_PER_LEVEL) return null
  const sig = { ...state.sig, [id]: state.sig[id] - SIG_PER_LEVEL }
  const enh = { ...state.enh, [id]: (state.enh[id] || 0) + 1 }
  return { sig, enh }
}
