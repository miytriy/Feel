// 編成ガイド用のデータ作り: CPU同士で大量に対戦させ、勝率の高い編成を対戦ルールごと・クラスごとに集めて
// web/src/battle/guide/recommended.json に書き出す。使い方: node server/scripts/formation_guide.mjs [チーム数/クラス] [1チームあたりの試合数] [上位の測り直しの試合数]
// (環境が変わったとき(新カードの追加・ローテーション替え・調整のあと)に、もう一度実行して、できたファイルをコミットする)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadRegistry } from '../pvp/registry.js'

const PER_CLASS = Number(process.argv[2]) || 24 // クラスごとに作る候補の編成の数
const GAMES = Number(process.argv[3]) || 8 // 候補の編成1つあたりの試合数(相手は、すべての候補から無作為)
const REFINE = Number(process.argv[4]) || 24 // 上位の測り直しの試合数
const LEVEL = 3 // CPUの強さ
const MAX_STEPS = 700
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/src/battle/guide/recommended.json')

const reg = await loadRegistry()
const { engine: E, ai, formation: F, rotations: R } = reg
const rnd = (n) => Math.floor(Math.random() * n)
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = rnd(i + 1); [b[i], b[j]] = [b[j], b[i]] } return b }

const usable = (c) => !c.token && !c.id.startsWith('test_')
const CLASSES = [...new Set(reg.chars.filter(usable).map((c) => c.class).filter((k) => k !== F.NEUTRAL))]

function candidates(format) {
  const allowed = (x) => x.rotation == null || R.rotationAllowed(format, x.rotation, x.id)
  const chars = reg.chars.filter((c) => usable(c) && allowed(c))
  const spells = reg.spells.filter((s) => !s.token && allowed(s))
  const out = []
  for (const cls of CLASSES) {
    const mains = chars.filter((c) => !c.amulet && (c.class === cls || c.class === F.NEUTRAL))
    const amus = chars.filter((c) => c.amulet && c.class === cls)
    if (mains.length < 1) continue
    for (let i = 0; i < PER_CLASS; i++) {
      const team = shuffle(mains).slice(0, F.MAX_SLOTS)
      if (amus.length && Math.random() < 0.6) team.push(...shuffle(amus).slice(0, 1 + rnd(F.MAX_AMULET_SLOTS)))
      if (!F.validateFormation(team).ok) continue
      const ss = shuffle(spells).filter((s) => F.validateSpellSet([s], team).ok).slice(0, F.MAX_SPELL_SLOTS)
      out.push({ cls, chars: team, spells: ss, wins: 0, games: 0 })
    }
  }
  return { out, pool: chars }
}

function play(a, b, pool) {
  const swap = Math.random() < 0.5 // 先攻・後攻の差を、なくす
  const [x, y] = swap ? [b, a] : [a, b]
  let st = E.createBattle(x.chars, y.chars, { catalog: reg.chars, pool: { A: pool, B: pool }, spells: { A: x.spells, B: y.spells } })
  for (let i = 0; i < MAX_STEPS && !st.winner; i++) st = E.applyAction(st, ai.chooseAction(st, LEVEL, Math.random))
  if (!st.winner) return 0
  const aWon = (st.winner === 'A') !== swap
  return aWon ? 1 : -1
}

const result = { generatedAt: new Date().toISOString(), level: LEVEL, perClass: PER_CLASS, games: GAMES, formats: {} }
for (const [format, f] of Object.entries(R.FORMATS)) {
  if (f.open === false) continue
  const { out: cands, pool } = candidates(format)
  const t0 = Date.now()
  for (const a of cands) {
    for (let g = 0; g < GAMES; g++) {
      let b; do { b = cands[rnd(cands.length)] } while (b === a)
      try { const r = play(a, b, pool); a.games++; b.games++; if (r === 1) a.wins++; if (r === -1) b.wins++ } catch (e) { console.error('ERR', e.message.slice(0, 100)) }
    }
  }
  // 1次の勝率は、たまたま勝ち続けたものが上に来る(上ぶれ)ので、クラスごとの上位だけ、新しい試合で、もう一度測り直す
  for (const cls of CLASSES) {
    const top = cands.filter((c) => c.cls === cls && c.games >= 4).sort((p, q) => q.wins / q.games - p.wins / p.games).slice(0, 5)
    for (const a of top) {
      a.wins = 0; a.games = 0
      for (let g = 0; g < REFINE; g++) {
        let b; do { b = cands[rnd(cands.length)] } while (b === a)
        try { const r = play(a, b, pool); if (r !== 0) { a.games++; if (r === 1) a.wins++ } } catch (e) { console.error('ERR', e.message.slice(0, 100)) }
      }
    }
    for (const c of cands) if (c.cls === cls && !top.includes(c)) { c.wins = 0; c.games = 0 } // 測り直していないものは、候補から外す
  }
  const byClass = {}
  for (const cls of CLASSES) {
    const list = cands.filter((c) => c.cls === cls && c.games >= 4).map((c) => ({ rate: c.wins / c.games, games: c.games, ids: c.chars.map((x) => x.id), spells: c.spells.map((s) => s.id) })).sort((p, q) => q.rate - p.rate || q.games - p.games)
    byClass[cls] = list.slice(0, 3).map((x) => ({ ...x, rate: Math.round(x.rate * 1000) / 1000 }))
  }
  result.formats[format] = { name: f.name, classes: byClass }
  console.log(format, cands.length, '編成', Math.round((Date.now() - t0) / 1000), '秒')
}
fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(result, null, 1) + '\n')
console.log('書き出し:', OUT)
