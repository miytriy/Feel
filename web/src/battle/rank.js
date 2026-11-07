// ランクマッチの段位・ポイント(BP)の計算。画面もサーバーも同じものを使う(依存なしの純粋な関数)。
// 段位: 5つの宝石(エメラルド → トパーズ → ルビー → サファイア → ダイヤモンド) × 3段階(3 → 2 → 1 の順に上がる)。1段階 = 400 BP。ダイヤモンド1は上限なし。
export const TIERS = [
  { key: 'emerald', name: 'エメラルド', color: '#2fd27a' },
  { key: 'topaz', name: 'トパーズ', color: '#ffa63a' },
  { key: 'ruby', name: 'ルビー', color: '#ff4a5e' },
  { key: 'sapphire', name: 'サファイア', color: '#4d92ff' },
  { key: 'diamond', name: 'ダイヤモンド', color: '#d9a8ff' },
]
export const DIV_BP = 400 // 1段階に必要な BP
export const DIVS = 3

export const emptyRank = () => ({ bp: 0, wins: 0, losses: 0, streak: 0 })

// BP から、段位の情報を出す。{ tier, tierIdx, div, label, floor(今の段位の下限), next(次の段階に必要な BP。最上位は null), progress(0〜1), tierFloor(今の「段位」の最初の BP) }
export function rankOf(bp) {
  const m = Math.max(0, Math.floor(Number(bp) || 0))
  const steps = Math.floor(m / DIV_BP) // 何段階上がったか
  const maxStep = TIERS.length * DIVS - 1
  const step = Math.min(steps, maxStep)
  const tierIdx = Math.floor(step / DIVS)
  const div = DIVS - (step % DIVS) // 3,2,1
  const tier = TIERS[tierIdx]
  const floor = step * DIV_BP
  const top = step === maxStep
  return {
    tier, tierIdx, div, step,
    label: `${tier.name}${div}`,
    floor,
    tierFloor: tierIdx * DIVS * DIV_BP,
    next: top ? null : floor + DIV_BP,
    progress: top ? 1 : (m - floor) / DIV_BP,
  }
}

// 対戦の結果で、BP がどれだけ動くか。相手との差で、増減が変わる(強い相手に勝つと多く、弱い相手に負けると多く減る)。
// 連勝ボーナス(3連勝目から +5、最大 +15)。負けても、「段位」(エメラルド・トパーズ…)は下がらない(その段位の最初の BP が下限)。
export function rankDelta(myBp, oppBp, won, streak = 0) {
  const expected = 1 / (1 + 10 ** ((oppBp - myBp) / 800))
  if (won) {
    const bonus = Math.min(15, Math.max(0, streak - 1) * 5) // streak は、勝つ前の連勝数
    return Math.round(20 + 40 * (1 - expected)) + bonus
  }
  return -Math.round(10 + 30 * expected)
}
export function applyResult(rank, oppBp, won) {
  const r = { ...emptyRank(), ...rank }
  const delta = rankDelta(r.bp, oppBp, won, r.streak)
  const floor = rankOf(r.bp).tierFloor
  const bp = Math.max(floor, r.bp + delta)
  return { rank: { bp, wins: r.wins + (won ? 1 : 0), losses: r.losses + (won ? 0 : 1), streak: won ? r.streak + 1 : 0 }, delta: bp - r.bp, before: r.bp }
}
// 待ち時間(秒)に応じて、探す BP の幅を広げる
export const matchWindow = (waitSec) => 400 + Math.floor(waitSec / 5) * 150
