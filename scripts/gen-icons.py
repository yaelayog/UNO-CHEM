"""Ikon berpadding dari logo utama public/pwa-512x512.png.

Jalankan: python3 scripts/gen-icons.py  (butuh Pillow: pip install pillow)

- maskable-512-v2.png: logo 64% di latar putih. Launcher Android memotong ikon
  jadi lingkaran/squircle dan hanya ~66% tengah yang terlihat; logo UNO-Chem
  menjangkau 56% lebar dari pusat, jadi 64% pas masuk lingkaran aman.
- apple-touch-icon.png: logo 82% di latar putih (iOS mengisi transparan jadi
  hitam dan memotong sudut).
- android-twa/.../ic_maskable.png: sama dengan maskable, untuk ikon APK.

Ganti nama file maskable (v3, dst.) bila isinya berubah, supaya Chrome/WebAPK
tidak memakai ikon lama dari cache — sesuaikan juga vite.config.ts.
"""
from PIL import Image

S = 1024
logo = Image.open('public/pwa-512x512.png').convert('RGBA').resize((S, S), Image.LANCZOS)


def berpadding(skala):
    n = round(S * skala)
    bg = Image.new('RGBA', (S, S), (255, 255, 255, 255))
    bg.alpha_composite(logo.resize((n, n), Image.LANCZOS), ((S - n) // 2, (S - n) // 2))
    return bg.convert('RGB')


def simpan(img, path, ukuran):
    img.resize((ukuran, ukuran), Image.LANCZOS).save(path, optimize=True)
    print('wrote', path)


maskable = berpadding(0.64)
simpan(maskable, 'public/maskable-512-v2.png', 512)
simpan(berpadding(0.82), 'public/apple-touch-icon.png', 180)
res = 'android-twa/app/src/main/res/mipmap-%s/ic_maskable.png'
for dpi, px in {'mdpi': 82, 'hdpi': 123, 'xhdpi': 164, 'xxhdpi': 246, 'xxxhdpi': 328}.items():
    simpan(maskable, res % dpi, px)
