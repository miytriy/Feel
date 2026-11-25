# 勝敗画面の質感を WebP(透過)に焼き込む(実行中は transform / opacity だけで動かす)。
# 実行: python3 web/tools/bake-result.py → web/public/fx/result/{glow,gold,silver}.webp
import numpy as np, math, os
from PIL import Image, ImageFilter
N = 1024
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'fx', 'result')
os.makedirs(OUT, exist_ok=True)
yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
c = (N - 1) / 2
dx, dy = xx - c, yy - c
r = np.sqrt(dx * dx + dy * dy) / (N / 2)
ang = np.arctan2(dy, dx)
rng = np.random.default_rng(7)
def save(rgb, a, name):
    img = np.dstack([np.clip(rgb, 0, 1), np.clip(a, 0, 1)])
    Image.fromarray((img * 255).astype(np.uint8), 'RGBA').save(os.path.join(OUT, name), 'WEBP', quality=90, method=6)
def blur(a, px):
    return np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(px)), np.float32) / 255

def glow(name, core, mid, shaft_amt):
    # 中心の光 + やわらかな光の柱(細く長いものを、ばらばらの太さ・長さで)
    base = np.exp(-(r / 0.22) ** 1.6) * 0.95 + np.exp(-(r / 0.55) ** 2) * 0.45
    sh = np.zeros_like(r)
    for i in range(22):
        a0 = rng.uniform(-math.pi, math.pi); w = rng.uniform(0.012, 0.05); ln = rng.uniform(0.45, 0.95); amp = rng.uniform(0.3, 1)
        d = np.abs(((ang - a0 + math.pi) % (2 * math.pi)) - math.pi)
        sh += amp * np.exp(-(d / w) ** 2) * np.clip(1 - r / ln, 0, 1) ** 1.5 * np.clip(r / 0.08, 0, 1)
    a = np.clip(base + shaft_amt * np.clip(sh, 0, 1), 0, 1) * np.clip((1 - r) / 0.25, 0, 1)
    t = np.clip(r / 0.6, 0, 1)[..., None]
    rgb = np.array(core)[None, None] * (1 - t) + np.array(mid)[None, None] * t
    save(rgb, a, name)
glow('glow.webp', (1.0, 0.97, 0.82), (1.0, 0.72, 0.22), 0.55)       # 勝利: 金
glow('silver.webp', (0.92, 0.95, 1.0), (0.55, 0.65, 0.85), 0.3)       # 引き分け: 銀青

def gold():
    # 金の粒・星(大小)。バラバラに散らす
    I = np.zeros_like(r)
    def star(x, y, s):
        nonlocal I
        ddx, ddy = xx - x, yy - y
        arm = np.exp(-(ddy / (s * 0.06)) ** 2) * np.exp(-np.abs(ddx) / s) + np.exp(-(ddx / (s * 0.06)) ** 2) * np.exp(-np.abs(ddy) / s)
        core = np.exp(-((ddx ** 2 + ddy ** 2) / (s * 0.16) ** 2))
        I = np.maximum(I, np.clip(arm * 0.85 + core, 0, 1))
    for _ in range(46):
        star(rng.uniform(30, N - 30), rng.uniform(30, N - 30), rng.choice([6, 9, 14, 22]))
    I = np.clip(I + 0.35 * blur(I, 2.5), 0, 1)
    rgb = np.dstack([np.ones_like(I), 0.9 + 0.1 * I, 0.55 + 0.35 * I])
    save(rgb, I, 'gold.webp')
gold()
print(os.listdir(OUT))
