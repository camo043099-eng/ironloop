#!/usr/bin/env python3
# Ironloop: icono propio (dos anillos entrelazados coral/turquesa sobre fondo oscuro).
# Uso: python3 tools/generar_iconos.py <carpeta-res-del-proyecto-android>
import os, sys
from PIL import Image, ImageDraw

RES = sys.argv[1] if len(sys.argv) > 1 else 'android/app/src/main/res'
DENS = {'mdpi': (48, 108), 'hdpi': (72, 162), 'xhdpi': (96, 216), 'xxhdpi': (144, 324), 'xxxhdpi': (192, 432)}
CORAL = (255, 107, 61, 255); TEAL = (53, 213, 195, 255); FONDO = (10, 12, 17, 255)

def anillos(draw, size, escala=1.0):
    w = size * 0.34 * escala
    cx, cy = size / 2, size / 2
    sep = size * 0.145 * escala
    r = w / 2
    sw = max(2, int(size * 0.085 * escala))
    draw.ellipse([cx - sep - r, cy - r, cx - sep + r, cy + r], outline=CORAL, width=sw)
    draw.ellipse([cx + sep - r, cy - r, cx + sep + r, cy + r], outline=TEAL, width=sw)

for nombre, (leg, fg) in DENS.items():
    carpeta = os.path.join(RES, 'mipmap-' + nombre)
    os.makedirs(carpeta, exist_ok=True)
    im = Image.new('RGBA', (leg, leg), FONDO); anillos(ImageDraw.Draw(im), leg)
    im.save(os.path.join(carpeta, 'ic_launcher.png'))
    im.save(os.path.join(carpeta, 'ic_launcher_round.png'))
    im2 = Image.new('RGBA', (fg, fg), (0, 0, 0, 0)); anillos(ImageDraw.Draw(im2), fg, 0.92)
    im2.save(os.path.join(carpeta, 'ic_launcher_foreground.png'))
print('iconos generados en', RES)
