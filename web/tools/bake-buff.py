# 強化エフェクトの「渦の帯」(先の尖った白い三日月状の帯)を WebP(透過)に焼き込む。実行中は transform / opacity だけで動かす。
# 実行: python3 web/tools/bake-buff.py → web/public/fx/buff/{ribbon,streaks}.webp
import numpy as np, os
from PIL import Image, ImageFilter
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'fx', 'buff')
os.makedirs(OUT, exist_ok=True)
def blur(a, px):
    return np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(px)), np.float32) / 255
def save(a, name, rgb=(1, 1, 1)):
    img = np.dstack([np.full_like(a, rgb[0]), np.full_like(a, rgb[1]), np.full_like(a, rgb[2]), np.clip(a, 0, 1)])
    Image.fromarray((img * 255).astype(np.uint8), 'RGBA').save(os.path.join(OUT, name), 'WEBP', quality=92, method=6)

# 帯: 幅1024 x 高さ192。両端が尖り、中ほどが太い三日月。上の縁に細い明るい線、中はガラスのように半透明。
W, H = 1024, 192
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
x = (xx / (W - 1)) * 2 - 1                       # -1..1
cx = H * 0.42 + 38 * (x * x)                     # 帯の中心線(両端が下がる=笑った形)
th = 34 * np.clip(1 - np.abs(x) ** 1.7, 0, 1) ** 0.9   # 半分の太さ(両端で0)
d = (yy - cx)
inside = np.clip(1 - np.abs(d) / np.maximum(th, 0.5), 0, 1)
body = inside ** 0.55 * 0.5                     # 中はうっすら白
rim_top = np.exp(-((d + th * 0.86) / 2.2) ** 2) * (th > 1.5)            # 上の縁の明るい線
rim_bot = np.exp(-((d - th * 0.9) / 3.0) ** 2) * (th > 1.5) * 0.45       # 下の縁(弱め)
fade = np.clip(1 - np.abs(x) ** 3, 0, 1)
a = (body + rim_top * 0.95 + rim_bot) * fade
a = np.maximum(a, blur(a, 6) * 0.6)             # やわらかいにじみ
save(blur(a, 0.8), 'ribbon.webp')

# 縦線のカーテン: 幅320 x 高さ512。髪の毛ほど細い線を、隙間なく(ばらばらの太さ・濃さ・長さで)並べる。
rng = np.random.default_rng(11)
N = 320
HH = 512
s = np.zeros((HH, N), np.float32)
yy2 = (np.mgrid[0:HH, 0:N][0]).astype(np.float32) / (HH - 1)
for i in range(N):
    if rng.random() < 0.18: continue
    amp = rng.uniform(0.25, 1.0) ** 1.3
    top = rng.uniform(0.0, 0.18); ln = rng.uniform(0.55, 1.0)
    prof = np.clip((yy2[:, i] - top) / 0.12, 0, 1) * np.clip(1 - (yy2[:, i] - top) / ln, 0, 1) ** 0.8
    s[:, i] = np.maximum(s[:, i], prof * amp)
    if i + 1 < N and rng.random() < 0.35: s[:, i + 1] = np.maximum(s[:, i + 1], prof * amp * 0.5)
s = blur(s, 0.35)
save(s * 0.95, 'streaks.webp')
print('ok')
