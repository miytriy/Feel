// 消滅エフェクトを、60fps の連番画像(スプライトシート)に焼き込む。実行: node tools/bake-vanish.cjs(playwright と python3(PIL)が必要)
// 出力: public/fx/vanish/sheet.webp(8列×7行、1コマ400px、56コマ = 0.9秒)。実行時は、ずらして1コマずつ見せるだけ(transform だけ)
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const { execSync } = require('child_process')
const OUT = path.join(__dirname, '../public/fx/vanish'); const TMP = path.join(require('os').tmpdir(), 'vanish-frames')
fs.mkdirSync(OUT, { recursive: true }); fs.rmSync(TMP, { recursive: true, force: true }); fs.mkdirSync(TMP, { recursive: true })
const kf = fs.readFileSync(path.join(__dirname, 'vanish-keyframes.css'), 'utf8')
const DUR = 0.9, FRAMES = 56, CELL = 400, BOX = 265, FRAME = 292 // BOX = 召喚物カード(高さ106px)の250%。FRAME = その外のにじみまで入れた1コマの大きさ
const webSeeds = [2, 6, 10, 14, 18, 2], boltSeeds = [1, 5, 9, 13, 17, 21]
const SPARKS = Array.from({ length: 26 }, (_, n) => { const a = n * 2.4 + 0.7; const d = 34 + ((n * 5) % 7) * 12; return { dx: `${Math.round(Math.cos(a) * d)}px`, dy: `${Math.round(Math.sin(a) * d - 6)}px`, dark: n % 3 === 1 } })
const html = `<style>${kf}
html,body{margin:0;background:transparent}
#f{position:relative;width:${FRAME}px;height:${FRAME}px;overflow:hidden}
#b{position:absolute;left:${(FRAME - BOX) / 2}px;top:${(FRAME - BOX) / 2}px;width:${BOX}px;height:${BOX}px}
#b>*{position:absolute}
</style>
<svg width="0" height="0" style="position:absolute"><defs>
<filter id="fuzzy" x="-25%" y="-25%" width="150%" height="150%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="16"/></filter>
<filter id="rag" x="-25%" y="-25%" width="150%" height="150%"><feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="3" seed="8" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="12"/></filter>
<filter id="bolt" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence id="bt" type="turbulence" baseFrequency="0.09" numOctaves="2" seed="1" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="9" result="d"/><feGaussianBlur in="d" stdDeviation="0.7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="d"/></feMerge></filter>
<filter id="web" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence id="wt" type="fractalNoise" baseFrequency="0.17" numOctaves="3" seed="2" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 14 -6.4" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in" result="web"/><feGaussianBlur in="web" stdDeviation="0.45"/></filter>
</defs></svg>
<div id="f"><div id="b">
<span style="inset:0;border-radius:50%;background:radial-gradient(circle, rgba(70,140,255,1) 0%, rgba(24,52,200,1) 20%, rgba(10,22,105,1) 48%, rgba(8,16,82,1) 70%, rgba(95,55,190,0.9) 90%, rgba(120,80,215,0) 100%);filter:url(#fuzzy);animation:feel-v-disc ${DUR}s ease-out both"></span>
<svg viewBox="0 0 100 100" style="inset:0;width:100%;height:100%;overflow:visible;animation:feel-v-ring ${DUR}s ease-in-out both;filter:drop-shadow(0 0 3px #4fb4ff) drop-shadow(0 0 8px #2f6bff)"><circle cx="50" cy="50" r="40" fill="none" stroke="#7ee6ff" stroke-width="13" filter="url(#web)"/><circle cx="50" cy="50" r="44" fill="none" stroke="#45c8ff" stroke-width="2.4" filter="url(#bolt)"/><circle cx="50" cy="50" r="44" fill="none" stroke="#ffffff" stroke-width="1" filter="url(#bolt)" opacity="0.9"/><circle cx="50" cy="50" r="49" fill="none" stroke="#c9bdff" stroke-width="0.8" filter="url(#bolt)" opacity="0.5"/></svg>
<span style="left:50%;top:50%;width:70%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle, rgba(40,40,52,0) 28%, rgba(55,55,68,0.75) 60%, rgba(60,60,74,0) 100%);filter:url(#rag);animation:feel-v-smoke ${DUR}s ease-out both"></span>
<span style="left:50%;top:50%;width:40%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle, #fff 0%, #fff 25%, rgba(190,235,255,0.9) 50%, rgba(110,190,255,0) 100%);box-shadow:0 0 14px 4px rgba(150,220,255,0.8);animation:feel-v-core ${DUR}s ease-in-out both"></span>
<span style="left:50%;top:50%;width:46%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle, rgba(170,230,255,0.75) 0%, rgba(110,190,255,0.45) 50%, rgba(110,190,255,0) 100%);filter:url(#rag);animation:feel-v-glow ${DUR}s ease-out both"></span>
${SPARKS.map((sp) => `<span style="left:50%;top:50%;width:${sp.dark ? 4 : 5}px;height:${sp.dark ? 4 : 5}px;margin-left:-2px;margin-top:-2px;border-radius:${sp.dark ? '1px' : '50%'};background:${sp.dark ? '#14141c' : '#d8f4ff'};box-shadow:${sp.dark ? 'none' : '0 0 6px 2px #6ac4ff'};--dx:${sp.dx};--dy:${sp.dy};animation:feel-v-spark ${DUR}s ease-out both"></span>`).join('')}
</div></div>`
;(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ deviceScaleFactor: CELL / FRAME, viewport: { width: 400, height: 400 } }); const p = await ctx.newPage()
  await p.setContent(html)
  for (let i = 0; i < FRAMES; i++) {
    const t = (i / FRAMES) * DUR; const v = Math.floor(t / 0.06) % 6
    await p.evaluate(([t, ws, bs]) => { document.getElementById('wt').setAttribute('seed', ws); document.getElementById('bt').setAttribute('seed', bs); document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t * 1000 }) }, [t, webSeeds[v], boltSeeds[v]])
    await p.waitForTimeout(30)
    await p.locator('#f').screenshot({ path: path.join(TMP, `f${String(i).padStart(2, '0')}.png`), omitBackground: true })
  }
  await b.close()
  execSync(`python3 -c "
from PIL import Image
import glob
fs=sorted(glob.glob('${TMP}/f*.png'))
cols=8; rows=7; c=${CELL}
sh=Image.new('RGBA',(cols*c,rows*c),(0,0,0,0))
for i,f in enumerate(fs):
    im=Image.open(f).convert('RGBA').resize((c,c),Image.LANCZOS)
    sh.paste(im,((i%cols)*c,(i//cols)*c))
sh.save('${OUT}/sheet.webp','WEBP',quality=88,method=6)
print(len(fs),'frames',sh.size)"`, { stdio: 'inherit' })
})()
