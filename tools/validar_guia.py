#!/usr/bin/env python3
# Ironloop: valida www/data/guia.json antes de empaquetar (diseño de Claude).
# Falla si: líneas largas o demasiadas, iconos fuera del registro, términos
# prohibidos (la app NUNCA recomienda medicamentos), emojis en el contenido,
# o alguna sesión de prescripcion.json sin enfoque.
# Uso: python3 tools/validar_guia.py
import json, re, sys, unicodedata

BASE = 'www/data/'
ICONOS = {'plato', 'agua', 'fruta', 'proteina', 'sueno', 'caminar', 'estirar', 'reloj'}
PROHIBIDOS = ['medicamento', 'medicina', 'fármaco', 'farmaco', 'pastilla', 'tableta',
              'cápsula', 'capsula', 'dosis', 'suplemento', 'proteína en polvo',
              'proteina en polvo', 'creatina', 'cafeína en cápsulas', 'ibuprofeno',
              'paracetamol', 'analgésico', 'analgesico', 'antiinflamatorio', 'dolor',
              'lesión', 'lesion', 'tratar', 'curar', 'enfermedad', 'diagnóstico',
              'diagnostico', 'receta médica', 'ayuno', 'kcal', 'calorías', 'calorias',
              'déficit', 'deficit']
MAX_LINEAS, MAX_CHARS = 4, 30

def es_emoji(s):
    return any(unicodedata.category(c) == 'So' or ord(c) >= 0x1F000 for c in s)

errores = []
guia = json.load(open(BASE + 'guia.json', encoding='utf-8'))
pres = json.load(open(BASE + 'prescripcion.json', encoding='utf-8'))

def revisar_linea(ln, donde):
    if ln['i'] not in ICONOS:
        errores.append(f'{donde}: icono fuera del registro: {ln["i"]}')
    t = ln['t']
    if len(t) > MAX_CHARS:
        errores.append(f'{donde}: línea de {len(t)} caracteres (máx {MAX_CHARS}): {t}')
    if t.endswith('.'):
        errores.append(f'{donde}: línea con punto final: {t}')
    baja = t.lower()
    for p in PROHIBIDOS:
        if p in baja:
            errores.append(f'{donde}: término prohibido «{p}» en: {t}')
    if es_emoji(t):
        errores.append(f'{donde}: emoji en el contenido: {t}')

for clave, enf in guia['enfoques'].items():
    for cara in ('antes', 'despues'):
        lineas = enf[cara]
        if not (1 <= len(lineas) <= MAX_LINEAS):
            errores.append(f'{clave}.{cara}: {len(lineas)} líneas (debe ser 1-{MAX_LINEAS})')
        for ln in lineas:
            revisar_linea(ln, f'{clave}.{cara}')
for obj, caras in guia.get('objetivos', {}).items():
    for cara in ('antes', 'despues'):
        revisar_linea(caras[cara], f'objetivo {obj}.{cara}')
    if obj not in pres['objetivos']:
        errores.append(f'objetivo desconocido en prescripcion: {obj}')

sesiones_pres = set()
for div in pres['divisiones'].values():
    for s in div['sesiones']:
        sesiones_pres.add(s['id'])
for sid in sorted(sesiones_pres):
    enf = guia['sesiones'].get(sid)
    if not enf:
        errores.append(f'sesión {sid} sin enfoque en guia.json')
    elif enf not in guia['enfoques']:
        errores.append(f'sesión {sid} apunta a enfoque inexistente: {enf}')
if 'general' not in guia['enfoques']:
    errores.append('falta el enfoque de respaldo «general»')

if errores:
    print('GUIA INVÁLIDA:')
    for e in errores:
        print(' -', e)
    sys.exit(1)
print(f'guia.json OK: {len(guia["enfoques"])} enfoques, {len(sesiones_pres)} sesiones cubiertas, sin términos prohibidos.')
