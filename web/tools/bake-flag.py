# 緑旗の「能力が働いた」光の球を WebP(透過)に焼き込む(実行中は transform / opacity だけで動かす)。
# 動画(11/27)のとおり: すこし透けたガラスの球。上半分は黄色っぽい白いもや、下半分は緑の水が入ったように濃く、
# 下のふちに黄色い細い光の輪、境目にゆるく曲がった水平線。うっすらむらがあり、むこうのカードが透けて見える。
# 実行: python3 web/tools/bake-flag.py → web/public/fx/flag/orb-warm.webp, orb-cool.webp
import numpy as np, os
from PIL import Image
N = 512
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'fx', 'flag')
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)
yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
c = (N - 1) / 2
x, y = (xx - c) / (N / 2), (yy - c) / (N / 2)
r = np.sqrt(x * x + y * y)
def sm(a, b, v): t = np.clip((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
def fbm():
    out = np.zeros((N, N), np.float32); amp = 1.0; tot = 0
    for o, g in enumerate([6, 12, 24, 48]):
        n = rng.random((g + 1, g + 1)).astype(np.float32)
        im = Image.fromarray((n * 255).astype(np.uint8)).resize((N, N), Image.BICUBIC)
        out += np.asarray(im, np.float32) / 255 * amp; tot += amp; amp *= 0.5
    return out / tot
noise = fbm()
inside = 1 - sm(0.965, 1.0, r)
hz = y + 0.10 * x * x - 0.02                       # 水平線(ゆるく曲がる)
lowm = sm(-0.04, 0.16, hz)                          # 0=上(もや) 1=下(緑)
def make(up_rgb, lo_rgb, up_a, lo_a, rim_rgb, rim_a):
    rgb = np.zeros((N, N, 3), np.float32)
    up = np.array(up_rgb, np.float32) / 255; lo = np.array(lo_rgb, np.float32) / 255
    rgb[:] = up * (1 - lowm[..., None]) + lo * lowm[..., None]
    # 上のもや: 中ほどが濃く、上のふちへ向けてうすくなる。むらをつける
    a_up = up_a * (0.55 + 0.45 * sm(-1.0, -0.15, y)) * (0.85 + 0.3 * (noise - 0.5))
    # 下: 下へいくほどほんの少し濃い。むらをつける
    a_lo = lo_a * (0.9 + 0.2 * y) * (0.9 + 0.25 * (noise - 0.5))
    a = a_up * (1 - lowm) + a_lo * lowm
    # 水平線に、白く細い光
    line = np.exp(-((hz - 0.05) / 0.03) ** 2)
    rgb = rgb * (1 - line[..., None] * 0.3) + np.array([1.0, 1.0, 0.85]) * line[..., None] * 0.3
    a = np.maximum(a, line * 0.28)
    # 下のふちの黄色い輪(下ほど強く、上のふちは弱く細く)
    ring = np.exp(-((r - 0.955) / 0.022) ** 2)
    rs = 0.35 + 0.65 * sm(-0.2, 0.9, y)
    rgb = rgb * (1 - ring[..., None] * rs[..., None]) + np.array(rim_rgb, np.float32) / 255 * (ring * rs)[..., None]
    a = np.maximum(a, ring * rs * rim_a)
    a = a * inside
    out = np.dstack([np.clip(rgb, 0, 1), np.clip(a, 0, 1)])
    return Image.fromarray((out * 255).astype(np.uint8), 'RGBA')
# あたたかい(最初): 上は黄色いもや、下は黄緑
make((240, 248, 150), (150, 226, 66), 0.86, 0.55, (236, 238, 70), 0.95).save(os.path.join(OUT, 'orb-warm.webp'), lossless=True, method=6)
# つめたい(あと): 全体が緑〜青みがかった緑にかわって、より透ける
make((176, 240, 170), (96, 214, 120), 0.40, 0.40, (170, 245, 190), 0.6).save(os.path.join(OUT, 'orb-cool.webp'), lossless=True, method=6)
print('ok')
