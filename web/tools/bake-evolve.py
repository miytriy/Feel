# 進化エフェクトの質感を、WebP(透過)に焼き込む(ゲーム実行中は、動かすのは transform / opacity だけ)。
# 実行: python3 web/tools/bake-evolve.py  → web/public/fx/evolve/{rays,rainbow,chain}.webp
import numpy as np, math, os
from PIL import Image, ImageDraw, ImageFilter
N = 1024
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'fx', 'evolve')
os.makedirs(OUT, exist_ok=True)
yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
cx = cy = (N - 1) / 2
dx, dy = xx - cx, yy - cy
r = np.sqrt(dx * dx + dy * dy) / (N / 2)
ang = np.arctan2(dy, dx)
rng = np.random.default_rng(7)

def save(rgb, a, name):
    a = np.clip(a, 0, 1)
    img = np.dstack([np.clip(rgb, 0, 1), a])
    Image.fromarray((img * 255).astype(np.uint8), 'RGBA').save(os.path.join(OUT, name), 'WEBP', quality=92, method=6)

def rays():
    I = np.zeros((N, N), np.float32)
    for _ in range(54):
        a0 = rng.uniform(-math.pi, math.pi); w = rng.uniform(0.0035, 0.016); amp = rng.uniform(0.35, 1.0); ln = rng.uniform(0.55, 1.0)
        d = np.abs(((ang - a0 + math.pi) % (2 * math.pi)) - math.pi)
        I += amp * np.exp(-(d / w) ** 2) * np.clip(1 - r / ln, 0, 1) ** 0.8 * np.clip(r / 0.06, 0, 1)
    I = np.clip(I + np.exp(-(r / 0.16) ** 2) * 0.9, 0, 1)
    save(np.dstack([np.ones_like(I), 0.96 - 0.06 * r, 0.84 - 0.2 * r]), I, 'rays.webp')

def rainbow():
    h = (ang / (2 * math.pi) + 0.5)
    def ch(n):
        k = (n + h * 6) % 6
        return 1 - np.clip(np.minimum(np.minimum(k, 4 - k), 1), 0, 1) * 0.55
    A = np.zeros((N, N), np.float32)
    for r0, w, amp in ((0.50, 0.06, 0.55), (0.62, 0.035, 0.4), (0.38, 0.045, 0.35)):
        A += amp * np.exp(-((r - r0) / w) ** 2)
    A += 0.18 * np.exp(-((r - 0.5) / 0.28) ** 2)
    A *= 0.75 + 0.25 * np.sin(ang * 3 + r * 9)
    A *= np.clip((1 - r) / 0.12, 0, 1)
    save(np.dstack([ch(5), ch(3), ch(1)]) * 0.85 + 0.15, A, 'rainbow.webp')

def chain():
    S = 2
    im = Image.new('L', (N * S, N * S), 0); d = ImageDraw.Draw(im)
    def loop(rx, ry, tilt, n, rr, phase=0.0):
        for k in range(n):
            t = 2 * math.pi * (k + phase) / n
            x, y = rx * math.cos(t), ry * math.sin(t)
            X = x * math.cos(tilt) - y * math.sin(tilt); Y = x * math.sin(tilt) + y * math.cos(tilt)
            px, py = (N / 2 + X) * S, (N / 2 + Y) * S
            a = t + math.pi / 2 + (k % 2) * math.pi / 2
            ex, ey = rr * 1.5 * S, rr * 0.8 * S
            pts = [(px + ex * math.cos(u) * math.cos(a) - ey * math.sin(u) * math.sin(a), py + ex * math.cos(u) * math.sin(a) + ey * math.sin(u) * math.cos(a)) for u in np.linspace(0, 2 * math.pi, 40)]
            d.line(pts + [pts[0]], fill=255, width=int(4.2 * S))
    loop(420, 125, math.radians(32), 46, 21)
    loop(420, 125, math.radians(-32), 46, 21, 0.5)
    im = im.resize((N, N), Image.LANCZOS)
    core = np.asarray(im, np.float32) / 255
    glow = np.asarray(im.filter(ImageFilter.GaussianBlur(7)), np.float32) / 255
    A = np.clip(core + glow * 0.9, 0, 1) * np.clip((1 - r) / 0.08, 0, 1)
    one = np.ones_like(A)
    save(np.dstack([one, 0.97 * one, 0.88 * one]), A, 'chain.webp')

rays(); rainbow(); chain()
print('ok', os.listdir(OUT))
