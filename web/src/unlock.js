// Feel - 機能の解放(マスターパスワード2・最高権限): 設定で打つと、ログインが必要な機能を、ログインなしでも使える
//   レベル1 = 人事・編成・足跡 / レベル2(最高権限) = さらに、ガチャとメールボックス(この端末の中だけの体験用)
// ※入室のマスターパスワード(サーバーで確認)とは別のもの。この端末のブラウザだけで確認・保存する。
// ※パスワードそのものは、コードに書かない(公開リポジトリのため)。比べるのは、ハッシュだけ。
//   ただしブラウザ側の確認なので、強い守りではない。ゲームの中身をかえる解放は、サーバーで確認すること。
const KEY = 'feel.unlock.v1'
const SALT = 'feel-unlock:'
const HASH = '76b02897b80ecd093ac74b4fb6a2d56363ed41b4c41b3819a84a13108b1ba656' // レベル1
const HASH2 = '962255388d5b3db96433bbda6758179ad5e89a5f88e86b12c53d031c1d9fd736' // レベル2(最高権限)

// SHA-256(http のページなどで crypto.subtle が使えないときの代わり)
function sha256Fallback(str) {
  const bytes = new TextEncoder().encode(str)
  const K = []
  for (let n = 2, c = 0; c < 64; n++) {
    let prime = true
    for (let d = 2; d * d <= n; d++) if (n % d === 0) { prime = false; break }
    if (prime) { K.push(Math.floor((n ** (1 / 3) % 1) * 2 ** 32) >>> 0); c++ }
  }
  const H = []
  for (let n = 2, c = 0; c < 8; n++) {
    let prime = true
    for (let d = 2; d * d <= n; d++) if (n % d === 0) { prime = false; break }
    if (prime) { H.push(Math.floor((n ** 0.5 % 1) * 2 ** 32) >>> 0); c++ }
  }
  const len = bytes.length
  const total = (((len + 8) >> 6) + 1) << 6
  const buf = new Uint8Array(total)
  buf.set(bytes)
  buf[len] = 0x80
  const dv = new DataView(buf.buffer)
  dv.setUint32(total - 8, Math.floor((len * 8) / 2 ** 32))
  dv.setUint32(total - 4, (len * 8) >>> 0)
  const rotr = (x, n) => (x >>> n) | (x << (32 - n))
  const w = new Uint32Array(64)
  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4)
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0
    }
    let [a, b, c, d, e, f, g, h] = H
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const t2 = (S0 + maj) >>> 0
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0
    }
    ;[a, b, c, d, e, f, g, h].forEach((v, i) => { H[i] = (H[i] + v) >>> 0 })
  }
  return H.map((v) => v.toString(16).padStart(8, '0')).join('')
}

export async function sha256Hex(text) {
  try {
    if (globalThis.crypto && globalThis.crypto.subtle) {
      const d = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
      return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('')
    }
  } catch { /* 下の代わりの計算を使う */ }
  return sha256Fallback(text)
}

// いまの解放のレベル: 0(なし) / 1 / 2(最高権限)
export function unlockLevel(storage = globalThis.localStorage) {
  try {
    const v = storage.getItem(KEY)
    return v === HASH2 ? 2 : v === HASH ? 1 : 0
  } catch { return 0 }
}
export const isUnlocked = (storage) => unlockLevel(storage) > 0

// パスワードが合っていれば、この端末に解放を保存して、そのレベル(1か2)を返す。ちがえば 0。
// すでに上のレベルのときに、下のパスワードを打っても、レベルは下がらない
export async function tryUnlock(password, storage = globalThis.localStorage) {
  const h = await sha256Hex(SALT + String(password ?? '').trim())
  const level = h === HASH2 ? 2 : h === HASH ? 1 : 0
  if (level === 0) return 0
  if (level > unlockLevel(storage)) {
    try { storage.setItem(KEY, level === 2 ? HASH2 : HASH) } catch { /* 保存できなくても、この画面を開いている間は使える */ }
  }
  return level
}

export function relock(storage = globalThis.localStorage) {
  try { storage.removeItem(KEY) } catch { /* 何もしない */ }
}
