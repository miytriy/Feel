# 緑旗の「能力が働いた」光の球を WebP(透過)に焼き込む(実行中は transform / opacity だけで動かす)。
# 動画のとおり: 黄緑の半透明のシャボン玉。ふちが明るく、左上にシアンの反射、下側のふちが黄色く光る。
# 実行: python3 web/tools/bake-flag.py → web/public/fx/flag/bubble.webp
import numpy as np, os
from PIL import Image, ImageFilter
N = 384
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'fx', 'flag')
os.makedirs(OUT, exist_ok=True)
yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
c = (N - 1) / 2
x, y = (xx - c) / (N / 2), (yy - c) / (N / 2)
r = np.sqrt(x * x + y * y)
ang = np.arctan2(y, x)
def sm(a, b, v): t = np.clip((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
inside = 1 - sm(0.94, 1.0, r)                        # やわらかい外縁
fres = sm(0.45, 0.98, r)                              # ふちほど濃い
a = inside * (0.42 + 0.38 * fres)
rgb = np.zeros((N, N, 3), np.float32)
core = np.array([0.55, 0.96, 0.22]); edge = np.array([0.80, 1.0, 0.35])
rgb[:] = core * (1 - fres[..., None]) + edge * fres[..., None]
# 下側のふちが、黄色く光る
low = sm(0.2, 1.0, y) * sm(0.62, 0.95, r) * inside
rgb = rgb * (1 - low[..., None] * 0.8) + np.array([1.0, 0.98, 0.35]) * low[..., None] * 0.8
a = np.maximum(a, low * 0.85)
# 左上〜上の、シアンの反射(ふちに沿った弧)
d = np.abs(((ang - np.deg2rad(-135)) + np.pi) % (2 * np.pi) - np.pi)
arc = np.exp(-(d / 0.55) ** 2) * np.exp(-((r - 0.80) / 0.08) ** 2)
rgb = rgb * (1 - arc[..., None] * 0.8) + np.array([0.62, 1.0, 1.0]) * arc[..., None] * 0.8
a = np.maximum(a, arc * 0.8 * inside)
# 右下にも、うすい反射
d2 = np.abs(((ang - np.deg2rad(40)) + np.pi) % (2 * np.pi) - np.pi)
arc2 = np.exp(-(d2 / 0.35) ** 2) * np.exp(-((r - 0.78) / 0.06) ** 2) * 0.5
rgb = rgb * (1 - arc2[..., None]) + np.array([0.8, 1.0, 0.9]) * arc2[..., None]
a = np.maximum(a, arc2 * 0.6 * inside)
# 中を斜めに走る、うっすらした光の筋
st = np.exp(-(((x - y) * 0.7 + 0.1) / 0.09) ** 2) * sm(0.0, 0.5, 0.95 - r) * 0.18
rgb = rgb * (1 - st[..., None]) + np.array([0.7, 1.0, 1.0]) * st[..., None]
a = np.clip(a + st * 0.3, 0, 1)
# 左上の白いハイライト
hl = np.exp(-(((x + 0.38) ** 2 + (y + 0.5) ** 2) / 0.012))
rgb = rgb * (1 - hl[..., None]) + hl[..., None]
a = np.maximum(a, hl * 0.95)
a = np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8)), np.float32) / 255
img = np.dstack([np.clip(rgb, 0, 1), np.clip(a, 0, 1)])
Image.fromarray((img * 255).astype(np.uint8), 'RGBA').save(os.path.join(OUT, 'bubble.webp'), 'WEBP', quality=92, method=6)
print(os.listdir(OUT))
