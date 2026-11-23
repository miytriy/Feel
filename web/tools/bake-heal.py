# 回復エフェクトの質感を、WebP(透過)に焼き込む(ゲーム実行中は、動かすのは transform / opacity だけ)。
# 実行: python3 web/tools/bake-heal.py  → web/public/fx/heal/{core,bubble,rings,sparkle}.webp
import numpy as np, math, os
from PIL import Image, ImageFilter
N = 768
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'fx', 'heal')
os.makedirs(OUT, exist_ok=True)
yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
c = (N - 1) / 2
dx, dy = xx - c, yy - c
r = np.sqrt(dx * dx + dy * dy) / (N / 2)
ang = np.arctan2(dy, dx)
rng = np.random.default_rng(11)

def save(rgb, a, name):
    a = np.clip(a, 0, 1)
    img = np.dstack([np.clip(rgb, 0, 1), a])
    Image.fromarray((img * 255).astype(np.uint8), 'RGBA').save(os.path.join(OUT, name), 'WEBP', quality=92, method=6)

def blur(a, px):
    return np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(px)), np.float32) / 255

def ang_noise(k=48, seed=1):  # 角度ごとにばらつく値(毛羽立った縁を作る)
    g = np.random.default_rng(seed)
    out = np.zeros_like(ang)
    for i in range(k):
        f = g.integers(3, 60); ph = g.uniform(0, 6.28); amp = g.uniform(0.2, 1) / math.sqrt(f)
        out += amp * np.sin(f * ang + ph)
    return out / (np.abs(out).max() + 1e-6)

# 1) 白い光の球: 中は真っ白、縁は黄緑がかり、細かい放射状のけばだちで光がにじむ
def core():
    n = ang_noise(60, 3)
    edge = 0.62 + 0.03 * n
    base = np.exp(-(np.clip(r - 0.15, 0, None) / edge) ** 3.2)  # 中心は1、縁へなだらかに落ちる(段差なし)
    fur = np.zeros_like(r)
    for i in range(170):  # 細い放射状の筋(縁の外へ伸びる)
        a0 = rng.uniform(-math.pi, math.pi); w = rng.uniform(0.004, 0.012); ln = rng.uniform(0.08, 0.3)
        d = np.abs(((ang - a0 + math.pi) % (2 * math.pi)) - math.pi)
        fur += rng.uniform(0.3, 1) * np.exp(-(d / w) ** 2) * np.clip(1 - np.clip(r - edge * 0.8, 0, None) / ln, 0, 1) * np.clip((r - 0.3) / 0.2, 0, 1)
    a = np.clip(base + 0.45 * np.clip(fur, 0, 1) * np.clip(1 - base, 0, 1) * 1.6, 0, 1)
    a *= np.clip((1 - r) / 0.12, 0, 1)
    t = np.clip((r - 0.35) / 0.5, 0, 1)  # 外へいくほど黄緑
    rgb = np.dstack([1 - 0.14 * t, 1 - 0.0 * t, 1 - 0.6 * t])
    save(rgb, a, 'core.webp')

# 2) 緑の泡: 中はうすい黄緑、縁は太めの明るい緑(内側にもやわらかい光)、外側に水色のにじみ
def bubble():
    n = ang_noise(40, 5)
    R = 0.86 + 0.004 * n
    body = np.clip(1 - r / R, 0, 1) ** 0.6 * (r < R)
    rim = np.exp(-(((r - R) / 0.055) ** 2))
    rim_in = np.exp(-(((r - (R - 0.11)) / 0.09) ** 2)) * (r < R)
    out = np.exp(-(((r - (R + 0.045)) / 0.03) ** 2))
    a = 0.16 * (1 - body * 0) * (r < R) + 0.28 * rim_in + 0.78 * rim + 0.4 * out
    a *= np.clip((1 - r) / 0.05, 0, 1)
    green = np.array([0.46, 0.93, 0.36]); lime = np.array([0.80, 1.0, 0.52]); teal = np.array([0.62, 1.0, 0.86])
    k1 = np.clip(rim, 0, 1)[..., None]; k2 = np.clip(out, 0, 1)[..., None]
    rgb = lime[None, None] * (1 - k1) + green[None, None] * k1
    rgb = rgb * (1 - k2) + teal[None, None] * k2
    save(rgb, a, 'bubble.webp')

# 3) 細い輪: 切れ切れの細い輪(緑〜水色)を数本、にじませて重ねる
def rings():
    I = np.zeros_like(r); T = np.zeros_like(r)
    for R, w, amp in [(0.97, 0.004, 0.9), (0.91, 0.003, 0.6), (0.83, 0.003, 0.5), (0.7, 0.0025, 0.35)]:
        gate = np.clip(np.sin(3 * ang + rng.uniform(0, 6)) * 1.6 + 0.5 + 0.5 * np.sin(7 * ang + rng.uniform(0, 6)), 0, 1)
        ring = np.exp(-(((r - R) / w) ** 2)) * (0.35 + 0.65 * gate) * amp
        I += ring; T += ring * rng.uniform(0.2, 1)
    I = np.clip(I + 0.5 * blur(I, 2.5), 0, 1)
    rgb = np.dstack([0.78 + 0.0 * I, 1.0 + 0 * I, 0.85 + 0.1 * T])
    save(rgb, I, 'rings.webp')

# 4) きらめき: 白い十字の星(大小)と、緑の小さな粒をまいた1枚
def sparkle():
    I = np.zeros_like(r); G = np.zeros_like(r)
    def star(x, y, s):
        nonlocal I
        ddx, ddy = xx - x, yy - y
        arm = np.exp(-(ddy / (s * 0.07)) ** 2) * np.exp(-np.abs(ddx) / s) + np.exp(-(ddx / (s * 0.07)) ** 2) * np.exp(-np.abs(ddy) / s)
        core = np.exp(-((ddx ** 2 + ddy ** 2) / (s * 0.18) ** 2))
        I = np.maximum(I, np.clip(arm * 0.9 + core, 0, 1))
    for _ in range(26):
        a0 = rng.uniform(0, 6.28); rr = math.sqrt(rng.uniform(0.04, 0.9)) * N / 2 * 0.95
        star(c + math.cos(a0) * rr, c + math.sin(a0) * rr, rng.choice([8, 12, 18, 28]))
    for _ in range(70):
        a0 = rng.uniform(0, 6.28); rr = math.sqrt(rng.uniform(0, 1)) * N / 2 * 0.95
        x, y = c + math.cos(a0) * rr, c + math.sin(a0) * rr
        G = np.maximum(G, np.exp(-(((xx - x) ** 2 + (yy - y) ** 2) / (rng.uniform(1.5, 3.2)) ** 2)) * rng.uniform(0.5, 1))
    a = np.clip(I + 0.7 * G, 0, 1)
    gk = np.clip(G / (I + G + 1e-6), 0, 1)
    rgb = np.dstack([1 - 0.5 * gk, 1 - 0.0 * gk, 1 - 0.6 * gk])
    save(rgb, a, 'sparkle.webp')

core(); bubble(); rings(); sparkle()
print('done', os.listdir(OUT))
