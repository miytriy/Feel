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
    for _ in range(72):
        a0 = rng.uniform(-math.pi, math.pi); w = rng.uniform(0.002, 0.011); amp = rng.uniform(0.35, 1.0); ln = rng.uniform(0.55, 1.0)
        d = np.abs(((ang - a0 + math.pi) % (2 * math.pi)) - math.pi)
        I += amp * np.exp(-(d / w) ** 2) * np.clip(1 - r / ln, 0, 1) ** 0.8 * np.clip(r / 0.06, 0, 1)
    I = np.clip(I + np.exp(-(r / 0.16) ** 2) * 0.9, 0, 1)
    save(np.dstack([np.ones_like(I), 0.96 - 0.06 * r, 0.84 - 0.2 * r]), I, 'rays.webp')

def rainbow():
    # 動画の輪: 内側の縁が白金に明るく、外へ向かって 黄緑 → 水色 → 薄紫 とパステルに薄れる、厚い1本の輪
    r0 = 0.47
    rise = np.clip((r - (r0 - 0.07)) / 0.07, 0, 1) ** 1.5
    fall = np.exp(-np.clip(r - r0, 0, None) / 0.15)
    A = np.clip(rise * np.where(r <= r0, 1.0, fall) * 1.3, 0, 1)
    A *= np.clip((1 - r) / 0.1, 0, 1)
    A *= 0.82 + 0.18 * np.sin(ang * 2 + 1.3)
    u = np.clip((r - r0) / 0.3, 0, 1)
    c0 = np.array([1.0, 0.97, 0.78]); c1 = np.array([0.72, 1.0, 0.82]); c2 = np.array([0.68, 0.86, 1.0]); c3 = np.array([0.86, 0.78, 1.0])
    def lerp(a_, b_, t): return a_[None, None, :] * (1 - t[..., None]) + b_[None, None, :] * t[..., None]
    col = np.where((u < 0.34)[..., None], lerp(c0, c1, np.clip(u / 0.34, 0, 1)), np.where((u < 0.67)[..., None], lerp(c1, c2, np.clip((u - 0.34) / 0.33, 0, 1)), lerp(c2, c3, np.clip((u - 0.67) / 0.33, 0, 1))))
    col = np.where((r < r0)[..., None], c0[None, None, :], col)
    col = col * (0.9 + 0.1 * np.sin(ang * 3)[..., None])
    save(col.astype(np.float32), A, 'rainbow.webp')

def chain_path(tilt, n, phase=0.0, rx=420, ry=125):
    pts = []
    for k in range(n):
        t = 2 * math.pi * (k + phase) / n
        x, y = rx * math.cos(t), ry * math.sin(t)
        X = x * math.cos(tilt) - y * math.sin(tilt); Y = x * math.sin(tilt) + y * math.cos(tilt)
        tx, ty = -rx * math.sin(t), ry * math.cos(t)
        T = math.atan2(tx * math.sin(tilt) + ty * math.cos(tilt), tx * math.cos(tilt) - ty * math.sin(tilt))
        pts.append((N / 2 + X, N / 2 + Y, T))
    return pts

def chain():
    # 動画の鎖: 水色に光る輪っか(中が薄い水色)と、トゲの飾りを、細い線でつないだもの。輪は2本、逆に傾けて交差させる
    S = 2
    W = Image.new('L', (N * S, N * S), 0); dW = ImageDraw.Draw(W)   # 白い線
    Cy = Image.new('L', (N * S, N * S), 0); dC = ImageDraw.Draw(Cy)  # 水色の塗り
    def rot(px, py, ang_, x, y): return (px + (x * math.cos(ang_) - y * math.sin(ang_)) * S, py + (x * math.sin(ang_) + y * math.cos(ang_)) * S)
    for tilt, phase in ((math.radians(32), 0.0), (math.radians(-32), 0.5)):
        pts = chain_path(tilt, 34, phase)
        for i, (x, y, T) in enumerate(pts):
            px, py = x * S, y * S
            nx, ny, _ = pts[(i + 1) % len(pts)]
            dW.line([(px, py), (nx * S, ny * S)], fill=200, width=int(2.2 * S))  # 細い線
            if i % 2 == 0:  # 輪っか
                R = 19 * S
                dC.ellipse([px - R * 0.8, py - R * 0.8, px + R * 0.8, py + R * 0.8], fill=150)
                dW.ellipse([px - R, py - R, px + R, py + R], outline=255, width=int(5 * S))
                dW.ellipse([px - R * 0.45, py - R * 0.45, px + R * 0.45, py + R * 0.45], outline=230, width=int(2 * S))
            else:           # トゲの飾り: 細長いひし形 + 左右3対のトゲ
                L, Wd = 34, 10
                body = [rot(px, py, T, *p) for p in ((-L, 0), (-L * 0.45, -Wd), (L * 0.45, -Wd), (L, 0), (L * 0.45, Wd), (-L * 0.45, Wd))]
                dW.polygon(body, outline=255, fill=120); dW.line(body + [body[0]], fill=255, width=int(3.4 * S))
                for k in (-0.6, 0, 0.6):
                    for sgn in (-1, 1):
                        a_ = [rot(px, py, T, L * k - 5, sgn * Wd), rot(px, py, T, L * k + 4, sgn * (Wd + 17)), rot(px, py, T, L * k + 8, sgn * Wd)]
                        dW.polygon(a_, fill=240)
    W = W.resize((N, N), Image.LANCZOS); Cy = Cy.resize((N, N), Image.LANCZOS)
    w = np.asarray(W, np.float32) / 255; cy = np.asarray(Cy, np.float32) / 255
    glow = np.asarray(W.filter(ImageFilter.GaussianBlur(6)), np.float32) / 255
    A = np.clip(np.maximum(w, cy * 0.75) + glow * 0.75, 0, 1) * np.clip((1 - r) / 0.08, 0, 1)
    wt = np.clip(w * 1.1, 0, 1)
    rgb = np.dstack([wt + (1 - wt) * 0.62 * (1 - cy * 0.3), wt + (1 - wt) * 0.9, wt + (1 - wt) * 1.0])
    save(np.clip(rgb, 0, 1), A, 'chain.webp')

def shards():
    # 鎖が砕けた破片: 鎖の通り道に沿って散らばる、角ばった細かい水色・白の破片
    S = 2
    im = Image.new('RGB', (N * S, N * S), (0, 0, 0)); d = ImageDraw.Draw(im)
    A = Image.new('L', (N * S, N * S), 0); dA = ImageDraw.Draw(A)
    cols = [(255, 255, 255), (206, 246, 255), (190, 236, 255), (226, 214, 255), (170, 230, 250)]
    for tilt, phase in ((math.radians(32), 0.0), (math.radians(-32), 0.5)):
        for (x, y, T) in chain_path(tilt, 150, phase):
            for _ in range(2):
                off = rng.normal(0, 22); sp = rng.uniform(0, 1)
                cx_, cy_ = x + math.cos(T + math.pi / 2) * off + rng.normal(0, 9), y + math.sin(T + math.pi / 2) * off + rng.normal(0, 9)
                sz = rng.uniform(4, 17); a0 = rng.uniform(0, 2 * math.pi); col = cols[int(rng.integers(0, len(cols)))]
                n_ = int(rng.integers(3, 5)); poly = []
                for k in range(n_):
                    aa = a0 + 2 * math.pi * k / n_ + rng.uniform(-0.5, 0.5); rr_ = sz * (rng.uniform(0.35, 1.0) if k % 2 else 1.0)
                    poly.append(((cx_ + math.cos(aa) * rr_ * 1.6) * S, (cy_ + math.sin(aa) * rr_ * 0.7) * S))
                d.polygon(poly, fill=col); dA.polygon(poly, fill=int(rng.uniform(170, 255)))
    im = im.resize((N, N), Image.LANCZOS); A = A.resize((N, N), Image.LANCZOS)
    a = np.asarray(A, np.float32) / 255; glow = np.asarray(A.filter(ImageFilter.GaussianBlur(5)), np.float32) / 255
    rgb = 0.7 + 0.3 * np.asarray(im, np.float32) / 255  # 縁が黒くならないよう、明るい水色寄りに底上げ
    save(rgb, np.clip(a * 1.15 + glow * 0.6, 0, 1) * np.clip((1 - r) / 0.08, 0, 1), 'shards.webp')

rays(); rainbow(); chain(); shards()
print('ok', os.listdir(OUT))
