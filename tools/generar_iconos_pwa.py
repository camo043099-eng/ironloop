#!/usr/bin/env python3
# Ironloop PWA: iconos web desde «La órbita» (tools/icono-orbita.png, fondo ya
# en el color de marca #0A0C11). Genera en www/icons-pwa/:
#   icon-192.png / icon-512.png  → iconos «any» del manifest (arte a sangre completa)
#   icon-512-maskable.png        → arte al 80 % centrado sobre fondo #0A0C11
#                                  (zona segura para máscaras adaptativas)
#   apple-touch-icon.png         → 180×180 opaco (iOS no admite transparencia)
# Uso: python3 tools/generar_iconos_pwa.py
import os
from PIL import Image

BASE = os.path.dirname(os.path.abspath(__file__))
FONDO = (10, 12, 17)  # #0A0C11
SALIDA = os.path.join(BASE, '..', 'www', 'icons-pwa')
FUENTE = Image.open(os.path.join(BASE, 'icono-orbita.png')).convert('RGB')

os.makedirs(SALIDA, exist_ok=True)

FUENTE.resize((192, 192), Image.LANCZOS).save(os.path.join(SALIDA, 'icon-192.png'))
FUENTE.resize((512, 512), Image.LANCZOS).save(os.path.join(SALIDA, 'icon-512.png'))

lienzo = Image.new('RGB', (512, 512), FONDO)
t = int(512 * 0.80)
lienzo.paste(FUENTE.resize((t, t), Image.LANCZOS), ((512 - t) // 2, (512 - t) // 2))
lienzo.save(os.path.join(SALIDA, 'icon-512-maskable.png'))

FUENTE.resize((180, 180), Image.LANCZOS).save(os.path.join(SALIDA, 'apple-touch-icon.png'))
print('iconos PWA generados en', SALIDA)
