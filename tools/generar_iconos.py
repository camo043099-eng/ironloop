#!/usr/bin/env python3
# Ironloop: icono nuevo (diseño de Claude, 2026-11-10): anillo grueso en tres
# arcos —trabajo, descanso, logro, el mismo orden del splash— con una «I»
# blanca en forma de mancuerna vista de canto en el centro. 100 % vectorial
# en origen (los SVG viven en el paquete de diseño); aquí se rasteriza con PIL.
# Uso: python3 tools/generar_iconos.py <carpeta-res-del-proyecto-android>
import os, sys
from PIL import Image, ImageDraw

RES = sys.argv[1] if len(sys.argv) > 1 else 'android/app/src/main/res'
DENS = {'mdpi': (48, 108), 'hdpi': (72, 162), 'xhdpi': (96, 216), 'xxhdpi': (144, 324), 'xxxhdpi': (192, 432)}
CORAL = (255, 107, 61, 255); TEAL = (53, 213, 195, 255); LIMA = (182, 242, 74, 255)
FONDO = (10, 12, 17, 255); BLANCO = (238, 241, 246, 255)

def motivo(draw, size, escala=1.0):
    cx = cy = size / 2
    r = size * 0.335 * escala
    sw = max(2, int(size * 0.088 * escala))
    caja = [cx - r, cy - r, cx + r, cy + r]
    # Tres arcos de 90° con huecos de 30°; PIL mide desde las 3 en punto,
    # en sentido horario. Coral arriba-derecha, turquesa abajo, lima izquierda.
    draw.arc(caja, start=262, end=352, fill=CORAL, width=sw)
    draw.arc(caja, start=22, end=112, fill=TEAL, width=sw)
    draw.arc(caja, start=142, end=232, fill=LIMA, width=sw)
    # «I» mancuerna: vástago central + platos horizontales arriba y abajo.
    v = size * escala
    def rect(x0, y0, x1, y1, rad):
        draw.rounded_rectangle([cx + x0 * v, cy + y0 * v, cx + x1 * v, cy + y1 * v], radius=rad * v, fill=BLANCO)
    rect(-0.028, -0.155, 0.028, 0.155, 0.02)      # vástago
    rect(-0.105, -0.185, 0.105, -0.118, 0.022)    # plato superior
    rect(-0.105, 0.118, 0.105, 0.185, 0.022)      # plato inferior
    rect(-0.072, -0.118, 0.072, -0.088, 0.016)    # disco superior
    rect(-0.072, 0.088, 0.072, 0.118, 0.016)      # disco inferior

SS = 4  # sobremuestreo: suaviza los arcos y evita un fallo de PIL con cajas pequeñas
for nombre, (leg, fg) in DENS.items():
    carpeta = os.path.join(RES, 'mipmap-' + nombre)
    os.makedirs(carpeta, exist_ok=True)
    im = Image.new('RGBA', (leg * SS, leg * SS), FONDO); motivo(ImageDraw.Draw(im), leg * SS)
    im = im.resize((leg, leg), Image.LANCZOS)
    im.save(os.path.join(carpeta, 'ic_launcher.png'))
    im.save(os.path.join(carpeta, 'ic_launcher_round.png'))
    im2 = Image.new('RGBA', (fg * SS, fg * SS), (0, 0, 0, 0)); motivo(ImageDraw.Draw(im2), fg * SS, 0.92)
    im2 = im2.resize((fg, fg), Image.LANCZOS)
    im2.save(os.path.join(carpeta, 'ic_launcher_foreground.png'))
print('iconos generados en', RES)
