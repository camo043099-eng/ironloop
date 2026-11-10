#!/usr/bin/env python3
# Ironloop: icono «La órbita» (elegido por Carlos, 2026-11-10): esfera oscura
# con anillo orbital en degradado coral→turquesa, generado como arte y
# guardado en tools/icono-orbita.png. Aquí solo se escala a cada densidad.
# Uso: python3 tools/generar_iconos.py <carpeta-res-del-proyecto-android>
import os, sys
from PIL import Image

RES = sys.argv[1] if len(sys.argv) > 1 else 'android/app/src/main/res'
DENS = {'mdpi': (48, 108), 'hdpi': (72, 162), 'xhdpi': (96, 216), 'xxhdpi': (144, 324), 'xxxhdpi': (192, 432)}
FUENTE = Image.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'icono-orbita.png')).convert('RGBA')

for nombre, (leg, fg) in DENS.items():
    carpeta = os.path.join(RES, 'mipmap-' + nombre)
    os.makedirs(carpeta, exist_ok=True)
    FUENTE.resize((leg, leg), Image.LANCZOS).save(os.path.join(carpeta, 'ic_launcher.png'))
    FUENTE.resize((leg, leg), Image.LANCZOS).save(os.path.join(carpeta, 'ic_launcher_round.png'))
    # Primer plano adaptativo: la obra al 92 % centrada sobre transparente.
    lienzo = Image.new('RGBA', (fg, fg), (0, 0, 0, 0))
    t = int(fg * 0.92)
    lienzo.paste(FUENTE.resize((t, t), Image.LANCZOS), ((fg - t) // 2, (fg - t) // 2))
    lienzo.save(os.path.join(carpeta, 'ic_launcher_foreground.png'))
print('iconos generados en', RES)
