#!/usr/bin/env python3
# Paso 1 de la construcción de Ironloop: del dataset/v1.2 a la estructura www/ de la v2.
# Salida: www/data/ejercicios.json (texto) + www/media/img/{id}.jpg + www/media/vid/{id}.mp4
import json, base64, os, shutil, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))       # ironloop/
GYM = os.path.dirname(RAIZ)                                              # gym-app/
WWW = os.path.join(RAIZ, 'www')
os.makedirs(os.path.join(WWW, 'data'), exist_ok=True)
os.makedirs(os.path.join(WWW, 'media', 'img'), exist_ok=True)
os.makedirs(os.path.join(WWW, 'media', 'vid'), exist_ok=True)

datos = json.load(open(os.path.join(GYM, 'datos.json')))
nombres = json.load(open(os.path.join(GYM, 'nombres_es.json')))

salida, sin_vid, sin_img = [], 0, 0
for x in datos:
    id_ = x['id']
    # video: por el stem del gif original
    stem = os.path.basename(x['gif'])[:-4]
    src_vid = os.path.join(GYM, 'mp4s', stem + '.mp4')
    if os.path.exists(src_vid):
        shutil.copyfile(src_vid, os.path.join(WWW, 'media', 'vid', id_ + '.mp4'))
    else:
        sin_vid += 1
    # foto: decodificar el base64 incrustado (fuente mas fiable que el nombre de archivo)
    img = x.get('img', '')
    if img.startswith('data:image'):
        with open(os.path.join(WWW, 'media', 'img', id_ + '.jpg'), 'wb') as f:
            f.write(base64.b64decode(img.split(',', 1)[1]))
    else:
        sin_img += 1
    salida.append({
        'id': id_, 'ne': nombres[id_], 'n': x['n'],
        'p': x['p'], 'e': x['e'], 'o': x['o'], 'm': x.get('m', ''),
        's': x['s'], 'pasos': x['pasos'],
    })

with open(os.path.join(WWW, 'data', 'ejercicios.json'), 'w') as f:
    json.dump(salida, f, ensure_ascii=False, separators=(',', ':'))

n_img = len(os.listdir(os.path.join(WWW, 'media', 'img')))
n_vid = len(os.listdir(os.path.join(WWW, 'media', 'vid')))
tam = lambda p: sum(os.path.getsize(os.path.join(p, f)) for f in os.listdir(p))
print(f'ejercicios.json: {len(salida)} ejercicios, {os.path.getsize(os.path.join(WWW,"data","ejercicios.json"))/1e6:.2f} MB')
print(f'img: {n_img} archivos, {tam(os.path.join(WWW,"media","img"))/1e6:.2f} MB | vid: {n_vid} archivos, {tam(os.path.join(WWW,"media","vid"))/1e6:.2f} MB')
print(f'sin video: {sin_vid} | sin foto: {sin_img}')
assert len(salida) == n_img == n_vid == 1324 and sin_vid == sin_img == 0, 'COBERTURA INCOMPLETA'
print('COBERTURA COMPLETA 1.324/1.324 ✓')
