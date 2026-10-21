import { randomInt } from 'node:crypto'
import { readFileSync } from 'node:fs'

const characters = JSON.parse(
  readFileSync(new URL('./characters.json', import.meta.url), 'utf-8')
)

// 排出率(0.001%を1とする整数。合計は必ず100000)
const NORMAL_RATES = { legend: 1500, gold: 6000, silver: 25000, bronze: 67500 }
const GUARANTEED_RATES = { legend: 1500, gold: 6000, silver: 92500 }

export const PITY_COUNT = 40

const sum = (rates) => Object.values(rates).reduce((a, b) => a + b, 0)

if (sum(NORMAL_RATES) !== 100000 || sum(GUARANTEED_RATES) !== 100000) {
  throw new Error('排出率の合計が100%ではありません')
}

const byRarity = {}
for (const c of characters) {
  if (!byRarity[c.rarity]) byRarity[c.rarity] = []
  byRarity[c.rarity].push(c)
}
for (const rarity of Object.keys(NORMAL_RATES)) {
  if (!byRarity[rarity] || byRarity[rarity].length === 0) {
    throw new Error(`${rarity} のキャラがいません`)
  }
}

function pickRarity(rates) {
  let r = randomInt(sum(rates))
  for (const [rarity, weight] of Object.entries(rates)) {
    if (r < weight) return rarity
    r -= weight
  }
  throw new Error('抽選に失敗しました')
}

function pickCharacter(rarity) {
  const list = byRarity[rarity]
  return list[randomInt(list.length)]
}

// 1回ガチャ(通常は8体、天井の回は9体)
function drawOnePull(isPity) {
  const chars = []
  const normalRates = isPity ? GUARANTEED_RATES : NORMAL_RATES
  for (let i = 0; i < 7; i++) {
    chars.push(pickCharacter(pickRarity(normalRates)))
  }
  chars.push(pickCharacter(pickRarity(GUARANTEED_RATES)))
  if (isPity) {
    chars.push(pickCharacter('legend'))
  }
  return { pity: isPity, characters: chars }
}

// times回ガチャを引く(1回 または 10連)
export function drawGacha(times, startCount) {
  let count = startCount
  let pityUsed = false
  const pulls = []
  for (let i = 0; i < times; i++) {
    let isPity = false
    if (!pityUsed) {
      count += 1
      if (count >= PITY_COUNT) {
        isPity = true
        pityUsed = true
      }
    }
    pulls.push(drawOnePull(isPity))
  }
  return { pulls, newCount: pityUsed ? 0 : count }
}
