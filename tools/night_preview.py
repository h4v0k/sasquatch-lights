# Builds the night-look preview layers: python3 tools/night_preview.py assets/car/layers-src assets/car/layers
import sys, os
from PIL import Image, ImageFilter, ImageChops, ImageEnhance
SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
VIEWS = {'side': ['under','head','tail','grille'], 'front': ['under','head','grille','engine'], 'rear': ['under','tail']}

def feather(a, frac=0.06):
    """Fades the alpha out toward any image edge the cutout touches, so a photo that crops the car
    (hood, wing, quarter panels) dissolves into the black stage instead of ending on a hard line."""
    w, h = a.size
    bb = a.getbbox() or (0, 0, w, h)
    n = max(4, int(min(w, h) * frac))
    ramp = Image.new('L', (w, h), 255)
    px = ramp.load()
    for y in range(h):
        for x in range(w):
            d = n
            if bb[0] == 0: d = min(d, x)
            if bb[1] == 0: d = min(d, y)
            if bb[2] == w: d = min(d, w - 1 - x)
            if bb[3] == h: d = min(d, h - 1 - y)
            if d < n: px[x, y] = int(255 * (d / n) ** 1.5)
    return ImageChops.multiply(a, ramp)

def night(car):
    rgb, a = car.convert('RGB'), feather(car.split()[3])
    rgb = ImageEnhance.Contrast(rgb).enhance(1.12)
    r, g, b = rgb.split()
    r = r.point(lambda v: int(v * 0.36)); g = g.point(lambda v: int(v * 0.40)); b = b.point(lambda v: int(min(255, v * 0.48 + 4)))
    out = Image.merge('RGB', (r, g, b)); out.putalpha(a); return out

def scale(a, k): return a.point(lambda v: min(255, int(v * k)))

def glow(mask, w, zone):
    a = mask.split()[3]
    if zone == 'engine':  # already a soft bloom; just soften the edges further
        alpha = scale(a.filter(ImageFilter.GaussianBlur(w * 0.03)), 0.75)
    elif zone == 'under':
        alpha = ImageChops.lighter(scale(a.filter(ImageFilter.GaussianBlur(w * 0.012)), 1.25), scale(a.filter(ImageFilter.GaussianBlur(w * 0.06)), 1.1))
    else:  # lamp/grille: keep the sharp texture (honeycomb, lens shapes) + a soft halo
        halo = scale(a.filter(ImageFilter.GaussianBlur(w * 0.022)), 0.7)
        alpha = ImageChops.lighter(a, halo)
    out = Image.new('RGBA', mask.size, (255, 255, 255, 0)); out.putalpha(alpha); return out

def hot(mask, w):
    """White-hot LED center, drawn untinted at low opacity over the colored lamp."""
    a = mask.split()[3].filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(max(1, w * 0.003)))
    a = scale(a, 0.55)
    out = Image.new('RGBA', mask.size, (255, 255, 255, 0)); out.putalpha(a); return out

def underspill(under, car, w):
    """Light from the underglow catching the lower body: wide blur of the floor glow, kept only on the car."""
    a = scale(under.split()[3].filter(ImageFilter.GaussianBlur(w * 0.06)), 2.2)
    h = car.size[1]
    grad = Image.linear_gradient('L').resize(car.size)  # 0 at top -> 255 at bottom
    grad = grad.point(lambda v: 0 if v < 150 else int((v - 150) / 105 * 255))
    a = ImageChops.multiply(ImageChops.multiply(a, car.split()[3]), grad)
    a = scale(a, 0.4)
    out = Image.new('RGBA', car.size, (255, 255, 255, 0)); out.putalpha(a); return out

for v, zones in VIEWS.items():
    car = Image.open(f'{SRC}/{v}-car.webp').convert('RGBA'); w = car.size[0]
    night(car).save(f'{OUT}/{v}-car.webp', quality=88)
    for z in zones:
        m = Image.open(f'{SRC}/{v}-{z}.png').convert('RGBA')
        glow(m, w, z).save(f'{OUT}/{v}-{z}.png', optimize=True)
        if z in ('head', 'tail'): hot(m, w).save(f'{OUT}/{v}-{z}-hot.png', optimize=True)
    underspill(Image.open(f'{SRC}/{v}-under.png').convert('RGBA'), car, w).save(f'{OUT}/{v}-underspill.png', optimize=True)
print('ok')
