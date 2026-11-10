#!/usr/bin/env python3
# Ironloop CI: reconstruye www/media desde el repo público del dataset.
# Uso: python3 tools/preparar_media.py <ruta-del-dataset>
# Lee www/data/ejercicios.json + www/data/mapa-media.json (id -> stem),
# copia las fotos y convierte los GIF a MP4 (H.264, yuv420p, crf 26, sin audio).
import json, os, shutil, subprocess, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# El JSON de ejercicios viaja comprimido y partido (limite de tamano de la API):
# tools/datos_partes/ejercicios.json.gz.1, .2, ... -> www/data/ejercicios.json
import glob, gzip
_partes = sorted(glob.glob(os.path.join(RAIZ, 'tools', 'datos_partes', 'ejercicios.json.gz.*')),
                 key=lambda p: int(p.rsplit('.', 1)[1]))
if _partes:
    _datos = b''.join(open(p, 'rb').read() for p in _partes)
    with open(os.path.join(RAIZ, 'www', 'data', 'ejercicios.json'), 'wb') as _f:
        _f.write(gzip.decompress(_datos))
    print(f'ejercicios.json reensamblado desde {len(_partes)} partes')

dataset = sys.argv[1] if len(sys.argv) > 1 else 'dataset'
mapa = json.load(open(os.path.join(RAIZ, 'www', 'data', 'mapa-media.json')))
dir_img = os.path.join(RAIZ, 'www', 'media', 'img')
dir_vid = os.path.join(RAIZ, 'www', 'media', 'vid')
os.makedirs(dir_img, exist_ok=True)
os.makedirs(dir_vid, exist_ok=True)

fallos = []
for id_, stem in mapa.items():
    src_img = os.path.join(dataset, 'images', stem + '.jpg')
    src_gif = os.path.join(dataset, 'videos', stem + '.gif')
    dst_img = os.path.join(dir_img, id_ + '.jpg')
    dst_vid = os.path.join(dir_vid, id_ + '.mp4')
    try:
        shutil.copyfile(src_img, dst_img)
    except OSError:
        fallos.append('img ' + id_)
    if not os.path.exists(dst_vid):
        r = subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src_gif,
                            '-movflags', 'faststart', '-pix_fmt', 'yuv420p',
                            '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
                            '-c:v', 'libx264', '-crf', '26', '-an', dst_vid])
        if r.returncode != 0:
            fallos.append('vid ' + id_)
n_img = len(os.listdir(dir_img)); n_vid = len(os.listdir(dir_vid))
print(f'media lista: {n_img} fotos, {n_vid} videos; fallos: {len(fallos)}')
if fallos or n_img != len(mapa) or n_vid != len(mapa):
    print('FALLOS:', fallos[:10]); sys.exit(1)
