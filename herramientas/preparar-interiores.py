# -*- coding: utf-8 -*-
"""
Deja los interiores listos para publicar: al tamaño que se ven y comprimidos.

POR QUE
    Las laminas salen de la IA a 1296x816 y pesan medio mega cada una. En el
    juego la habitacion se ve a 600x380 y la armeria a 660x500: se estaban
    bajando mas del doble de pixeles de los que se llegan a pintar, y ocho
    laminas son casi 5 MB que el jugador se traga antes de entrar en ningun
    sitio.

    Se guardan al DOBLE del tamaño de pantalla (no al mismo) para que en
    pantallas de mucha resolucion no se vean blandas.

LOS ORIGINALES NO SE TOCAN
    Se copian a sprites/originales/edificios/ la primera vez y el script
    siempre parte de ellos, asi que se puede repetir sin ir degradando la
    imagen en cada pasada.

USO
    python herramientas/preparar-interiores.py
"""

import os
import shutil
import sys

from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGENES = os.path.join(RAIZ, 'sprites', 'originales', 'edificios')
ARTE = os.path.join(RAIZ, 'arte')

CALIDAD = 86

# a cuantos pixeles de ancho se dibuja cada sala en el juego
EN_PANTALLA = {
    'interior-armeria': 660,        # ShopScene.sala
}
POR_DEFECTO = 600                   # HideoutScene.sala
FACTOR = 2                          # el doble, para pantallas finas


def main():
    if not os.path.isdir(ORIGENES):
        sys.exit('No encuentro %s' % ORIGENES)
    os.makedirs(ARTE, exist_ok=True)

    hechos = 0
    antes = 0
    despues = 0
    for nombre in sorted(os.listdir(ORIGENES)):
        base, ext = os.path.splitext(nombre)
        if not base.startswith('interior-'):
            continue
        if ext.lower() not in ('.png', '.jpg', '.jpeg', '.webp'):
            continue

        origen = os.path.join(ORIGENES, nombre)
        destino = os.path.join(ARTE, base + '.jpg')

        im = Image.open(origen).convert('RGB')
        ancho = EN_PANTALLA.get(base, POR_DEFECTO) * FACTOR
        if im.width > ancho:
            alto = round(im.height * ancho / im.width)
            im = im.resize((ancho, alto), Image.LANCZOS)

        im.save(destino, quality=CALIDAD, optimize=True, progressive=True)

        a = os.path.getsize(origen) / 1024
        d = os.path.getsize(destino) / 1024
        antes += a
        despues += d
        hechos += 1
        print('%-30s %4.0f KB -> %4.0f KB   %dx%d'
              % (base, a, d, im.width, im.height))

    if not hechos:
        print('No he encontrado ninguna lamina interior-* en %s' % ORIGENES)
        return
    print('\n%d laminas: %.1f MB -> %.1f MB' % (hechos, antes / 1024, despues / 1024))
    print('Ahora:  python herramientas/actualizar-arte.py')


if __name__ == '__main__':
    main()
