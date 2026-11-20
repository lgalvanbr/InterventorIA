"""Comprime las fotos asignadas por whatsapp_fotos.mjs igual que el portal (máx. 1600 px, JPEG 80).

Uso: python scripts/whatsapp_comprimir.py <fotos.json> <carpeta_salida>
Escribe <carpeta_salida>/map.json con {archivo_original: archivo_comprimido}.
"""
import hashlib
import json
import os
import sys

from PIL import Image, ImageOps

fotos_json, out_dir = sys.argv[1], sys.argv[2]
os.makedirs(out_dir, exist_ok=True)
data = json.load(open(fotos_json, encoding='utf-8'))
files = sorted({f['file'] for f in data['asignadas']})
mapping = {}
antes = despues = 0
for f in files:
    h = hashlib.md5(os.path.basename(f).encode('utf-8') + str(os.path.getsize(f)).encode()).hexdigest()[:10]
    dst = os.path.join(out_dir, h + '.jpeg')
    if os.path.exists(dst):
        os.remove(dst)
    im = Image.open(f)
    orientacion = im.getexif().get(0x0112)
    if max(im.size) <= 1600 and im.format == 'JPEG' and orientacion in (None, 1):
        # WhatsApp ya comprime: si cumple el límite, se usa el original tal cual
        with open(f, 'rb') as src, open(dst, 'wb') as out:
            out.write(src.read())
    else:
        im = ImageOps.exif_transpose(im).convert('RGB')
        im.thumbnail((1600, 1600))
        im.save(dst, 'JPEG', quality=80, optimize=True)
        if os.path.getsize(dst) > os.path.getsize(f) and max(Image.open(f).size) <= 1600:
            with open(f, 'rb') as src, open(dst, 'wb') as out:
                out.write(src.read())
    antes += os.path.getsize(f)
    despues += os.path.getsize(dst)
    mapping[f] = dst
json.dump(mapping, open(os.path.join(out_dir, 'map.json'), 'w', encoding='utf-8'), indent=1)
print(f'fotos {len(mapping)} | {antes / 1e6:.1f} MB -> {despues / 1e6:.1f} MB')
