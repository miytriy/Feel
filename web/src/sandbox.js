// Feel - 体験用のガチャ・メールボックス(最高権限)
// ログインなしで、ガチャとメールボックスを試せる。ジェムもキャラも、このページを開いている間だけ(この端末の中だけ)の、仮のもの。
// サーバーにもアカウントにも、いっさい書かない。ページを読み込み直すと、最初からになる。
// api.js の fetchMe / fetchGifts / drawGacha ... と同じ形で答えるので、画面は、本物とおなじように動く。

// 排出率(サーバーの gacha.js と同じ。0.001%を1とする整数)
const NORMAL_RATES = { legend: 1500, gold: 6000, silver: 25000, bronze: 67500 }
const GUARANTEED_RATES = { legend: 1500, gold: 6000, silver: 92500 }
const PITY_COUNT = 40
const rnd = (n) => Math.floor(Math.random() * n)

export const SANDBOX_GEMS = 90000

export function createSandbox({ characters, cost = 500, grant = SANDBOX_GEMS }) {
  const poolOf = (rotName) => {
    const by = {}
    for (const c of characters) {
      if (!(c.rarity in NORMAL_RATES) || String(c.id).startsWith('test_') || (rotName && c.rotation !== rotName)) continue
      ;(by[c.rarity] ||= []).push({ id: c.id, name: c.name, class: c.class, rarity: c.rarity })
    }
    return by
  }
  const POOLS = { normal: poolOf('ベーシック'), pickup: poolOf('伝説の幕開け') }
  for (const k of Object.keys(POOLS)) if (!Object.keys(POOLS[k]).length) POOLS[k] = poolOf(null) // ローテーション情報がないときは、全キャラから
  let byRarity = POOLS.normal
  const endsAt = () => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) - 9 * 3600 * 1000).toISOString() }
  const banners = () => ({ normal: { id: 'normal', name: '通常ガチャ', rotation: 'basic', rotationName: 'ベーシック', available: true }, pickup: { id: 'pickup', name: 'ピックアップガチャ', rotation: '1', rotationName: '伝説の幕開け', available: true, endsAt: endsAt() } })
  const pickRarity = (rates) => {
    const usable = Object.entries(rates).filter(([r]) => byRarity[r] && byRarity[r].length)
    let r = rnd(usable.reduce((a, [, w]) => a + w, 0))
    for (const [rarity, w] of usable) { if (r < w) return rarity; r -= w }
    return usable[0][0]
  }
  const pick = (rarity) => byRarity[rarity][rnd(byRarity[rarity].length)]

  let gems = 0
  let pityCount = 0
  let pickupPity = 0
  const owned = {}
  const sig = {}
  const enh = {}
  let mail = [{
    id: 'sandbox-gift', title: '最高権限のプレゼント',
    message: 'この端末の中だけで使える、仮のジェムです。ページを読み込み直すと消えます。アカウントには入りません。',
    expiresAt: null, read: false, star: false, gems: grant, claimed: false,
  }]
  const done = (v = {}) => Promise.resolve(v)
  const fail = (msg) => Promise.reject(new Error(msg))
  const find = (id) => mail.find((g) => g.id === id)

  return {
    sandbox: true,
    fetchMe: () => done({ gems, pityCount, pickupPity, banners: banners(), owned: { ...owned }, sig: { ...sig }, enh: { ...enh }, loginBonus: { canClaim: false, streak: 0 } }),
    fetchGifts: () => done({ gifts: mail.map((g) => ({ ...g })) }),
    drawGacha: (times, banner = 'normal') => {
      byRarity = banner === 'pickup' ? POOLS.pickup : POOLS.normal
      if (times !== 1 && times !== 10) return fail('回数が正しくありません')
      const total = cost * times
      if (gems < total) return fail('通貨が足りません')
      let count = banner === 'pickup' ? pickupPity : pityCount
      let pityUsed = false
      const pulls = []
      for (let i = 0; i < times; i++) {
        let isPity = false
        if (!pityUsed) { count += 1; if (count >= PITY_COUNT) { isPity = true; pityUsed = true } }
        const chars = []
        for (let k = 0; k < 7; k++) chars.push(pick(pickRarity(isPity ? GUARANTEED_RATES : NORMAL_RATES)))
        chars.push(pick(pickRarity(GUARANTEED_RATES)))
        if (isPity) chars.push(pick(byRarity.legend ? 'legend' : pickRarity(GUARANTEED_RATES)))
        pulls.push({ pity: isPity, characters: chars })
      }
      gems -= total
      if (banner === 'pickup') pickupPity = pityUsed ? 0 : count
      else pityCount = pityUsed ? 0 : count
      for (const p of pulls) for (const c of p.characters) { if (owned[c.id]) sig[c.id] = (sig[c.id] || 0) + 1; else owned[c.id] = 1 }
      return done({ pulls, gems, pityCount })
    },
    enhanceChar: (id) => {
      if (!owned[id] || (sig[id] || 0) < 100) return fail('強化できません')
      sig[id] -= 100
      enh[id] = (enh[id] || 0) + 1
      return done({ sig: { ...sig }, enh: { ...enh } })
    },
    claimGift: (id) => {
      const g = find(id)
      if (!g) return fail('このプレゼントは受け取れません')
      if (g.claimed) return fail('このプレゼントは受け取り済みです')
      g.claimed = true
      g.read = true
      gems += g.gems
      return done({ amount: g.gems, gems })
    },
    markMailRead: (id) => { const g = find(id); if (g) g.read = true; return done({ ok: true }) },
    setMailStar: (id, star) => { const g = find(id); if (g) g.star = !!star; return done({ ok: true }) },
    deleteMail: (id) => { mail = mail.filter((g) => g.id !== id); return done({ ok: true }) },
    purgeReadMail: () => { mail = mail.filter((g) => !(g.read && g.claimed && !g.star)); return done({ ok: true }) },
  }
}
