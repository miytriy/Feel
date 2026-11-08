// 消滅エフェクトの重い部分(ゆらぐ円・電気の輪6枚・けむり・光)を、画像に焼き込む。実行: node tools/bake-vanish.cjs(playwright が必要)→ 出力の png を webp(品質92)に変換する。EFFECTS.md の「焼き込み」の手順
const { chromium } = require('playwright'); const fs = require('fs')
const OUT = require('path').join(__dirname, '../public/fx/vanish')
fs.mkdirSync(OUT, { recursive: true })
const webSeeds = [2, 6, 10, 14, 18, 2], boltSeeds = [1, 5, 9, 13, 17, 21]
let defs = `<filter id="fuzzy" x="-25%" y="-25%" width="150%" height="150%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="16"/></filter>
<filter id="rag" x="-25%" y="-25%" width="150%" height="150%"><feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="3" seed="8" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="12"/></filter>`
for (let i = 0; i < 6; i++) defs += `
<filter id="bolt${i}" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="turbulence" baseFrequency="0.09" numOctaves="2" seed="${boltSeeds[i]}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="9" result="d"/><feGaussianBlur in="d" stdDeviation="0.7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="d"/></feMerge></filter>
<filter id="web${i}" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="0.17" numOctaves="3" seed="${webSeeds[i]}" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 14 -6.4" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in" result="web"/><feGaussianBlur in="web" stdDeviation="0.45"/></filter>`
const R = 265 // 基準: 召喚物カード(高さ106px)の250%
const items = [
  ['disc', 1.5 * R, `<span style="position:absolute;left:${0.25 * R}px;top:${0.25 * R}px;width:${R}px;height:${R}px;border-radius:50%;background:radial-gradient(circle, rgba(70,140,255,1) 0%, rgba(24,52,200,1) 20%, rgba(10,22,105,1) 48%, rgba(8,16,82,1) 70%, rgba(95,55,190,0.9) 90%, rgba(120,80,215,0) 100%);filter:url(#fuzzy)"></span>`],
  ['smoke', 300, `<span style="position:absolute;left:${(300 - 0.7 * R) / 2}px;top:${(300 - 0.7 * R) / 2}px;width:${0.7 * R}px;height:${0.7 * R}px;border-radius:50%;background:radial-gradient(circle, rgba(40,40,52,0) 28%, rgba(55,55,68,0.75) 60%, rgba(60,60,74,0) 100%);filter:url(#rag)"></span>`],
  ['glow', 200, `<span style="position:absolute;left:${(200 - 0.46 * R) / 2}px;top:${(200 - 0.46 * R) / 2}px;width:${0.46 * R}px;height:${0.46 * R}px;border-radius:50%;background:radial-gradient(circle, rgba(170,230,255,0.75) 0%, rgba(110,190,255,0.45) 50%, rgba(110,190,255,0) 100%);filter:url(#rag)"></span>`],
]
for (let i = 0; i < 6; i++) items.push([`ring${i}`, 1.2 * R, `<svg viewBox="-10 -10 120 120" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible;filter:drop-shadow(0 0 3px #4fb4ff) drop-shadow(0 0 8px #2f6bff)"><circle cx="50" cy="50" r="40" fill="none" stroke="#7ee6ff" stroke-width="13" filter="url(#web${i})"/><circle cx="50" cy="50" r="44" fill="none" stroke="#45c8ff" stroke-width="2.4" filter="url(#bolt${i})"/><circle cx="50" cy="50" r="44" fill="none" stroke="#ffffff" stroke-width="1" filter="url(#bolt${i})" opacity="0.9"/><circle cx="50" cy="50" r="49" fill="none" stroke="#c9bdff" stroke-width="0.8" filter="url(#bolt${i})" opacity="0.5"/></svg>`])
;(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ deviceScaleFactor: 3, viewport: { width: 900, height: 900 } }); const p = await ctx.newPage()
  const html = `<body style="margin:0;background:transparent"><svg width="0" height="0" style="position:absolute"><defs>${defs}</defs></svg>` + items.map(([n, s, h]) => `<div id="${n}" style="position:relative;width:${s}px;height:${s}px;margin:10px">${h}</div>`).join('') + '</body>'
  await p.setContent(html)
  for (const [n] of items) { await p.locator('#' + n).screenshot({ path: `${OUT}/${n}.png`, omitBackground: true }); }
  await b.close()
})()
