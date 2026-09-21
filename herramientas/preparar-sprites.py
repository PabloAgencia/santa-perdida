"""Deja las imagenes de Gemini listas para el juego.

    python herramientas/preparar-sprites.py

Lee lo que haya en sprites/originales/ y escribe en sprites/listos/ los PNG
con el nombre y el tamaño exactos que espera el juego, mas una version de
cada color de la paleta para que no se vean dos coches iguales.

Lo que hace con cada imagen:
  1. Quita el fondo (transparente o color plano de las esquinas).
  2. Se queda SOLO con la mancha grande del medio, que es el coche. Asi se
     van los restos sueltos de las esquinas, incluida la marquita que el
     Playground pega abajo a la derecha. La marca invisible que Google mete
     en el propio color (SynthID) no se toca: sigue ahi y esta bien que siga.
  3. Endereza: si la imagen viene de morro hacia arriba, la gira, porque el
     juego dibuja los coches mirando a la derecha.
  4. Ajusta al tamaño del vehiculo (sale de src/config/vehicles.js).
  5. Saca una copia por color de la paleta, cambiando SOLO el tono de la
     chapa: los cristales, las ruedas y los faros se quedan como estan.
"""

import json
import os
import re
import sys
import colorsys

from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGEN = os.path.join(RAIZ, 'sprites', 'originales')
DESTINO = os.path.join(RAIZ, 'sprites', 'listos')

# margen que se recorta antes de nada, por si la marca toca el borde
MARGEN = 0.04


def leer_vehiculos():
    """Saca tamaño y paleta de cada coche del propio config del juego."""
    ruta = os.path.join(RAIZ, 'src', 'config', 'vehicles.js')
    texto = open(ruta, encoding='utf-8').read()
    bloques = re.findall(
        r'(\w+):\s*\{\s*\n\s*name:.*?length:\s*(\d+),\s*width:\s*(\d+).*?palette:\s*\[(.*?)\]',
        texto, re.S)
    vehiculos = {}
    for clave, largo, ancho, paleta in bloques:
        colores = [int(c.strip(), 16) for c in paleta.split(',') if c.strip()]
        vehiculos[clave] = {
            'largo': int(largo), 'ancho': int(ancho), 'paleta': colores,
        }
    return vehiculos


def quitar_fondo(img):
    """Fondo transparente: si venia de color plano, se mira en las esquinas."""
    img = img.convert('RGBA')
    pix = img.load()
    an, al = img.size

    esquinas = [pix[0, 0], pix[an - 1, 0], pix[0, al - 1], pix[an - 1, al - 1]]
    opacas = [c for c in esquinas if c[3] > 200]
    if not opacas:
        return img

    # color de fondo = el que mas se repite en las esquinas
    fondo = max(set(opacas), key=opacas.count)
    umbral = 42
    for y in range(al):
        for x in range(an):
            r, g, b, a = pix[x, y]
            if a < 30:
                continue
            if abs(r - fondo[0]) + abs(g - fondo[1]) + abs(b - fondo[2]) < umbral:
                pix[x, y] = (r, g, b, 0)
    return img


def mancha_principal(img):
    """Se queda con el grupo de pixeles mas grande y borra el resto."""
    an, al = img.size
    pix = img.load()
    visto = [[False] * an for _ in range(al)]
    mejor = []

    for y0 in range(al):
        for x0 in range(an):
            if visto[y0][x0] or pix[x0, y0][3] < 40:
                continue
            grupo = []
            pila = [(x0, y0)]
            visto[y0][x0] = True
            while pila:
                x, y = pila.pop()
                grupo.append((x, y))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < an and 0 <= ny < al and not visto[ny][nx] \
                            and pix[nx, ny][3] >= 40:
                        visto[ny][nx] = True
                        pila.append((nx, ny))
            if len(grupo) > len(mejor):
                mejor = grupo

    if not mejor:
        return img
    dentro = set(mejor)
    for y in range(al):
        for x in range(an):
            if pix[x, y][3] >= 40 and (x, y) not in dentro:
                pix[x, y] = (0, 0, 0, 0)
    return img


def recortar(img):
    caja = img.getbbox()
    return img.crop(caja) if caja else img


def enderezar(img):
    """El juego dibuja los coches mirando a la derecha."""
    an, al = img.size
    return img.rotate(-90, expand=True) if al > an else img


def tenir(img, color_destino):
    """Cambia el tono de la chapa dejando cristales, ruedas y faros."""
    rd = ((color_destino >> 16) & 255) / 255
    gd = ((color_destino >> 8) & 255) / 255
    bd = (color_destino & 255) / 255
    h_destino, s_destino, _ = colorsys.rgb_to_hsv(rd, gd, bd)

    salida = img.copy()
    pix = salida.load()
    an, al = salida.size
    for y in range(al):
        for x in range(an):
            r, g, b, a = pix[x, y]
            if a < 40:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            # gris, casi negro o casi blanco: es cristal, rueda o faro
            if s < 0.16 or v < 0.14 or v > 0.94:
                continue
            nr, ng, nb = colorsys.hsv_to_rgb(h_destino, min(1, s * 0.55 + s_destino * 0.6), v)
            pix[x, y] = (int(nr * 255), int(ng * 255), int(nb * 255), a)
    return salida


def preparar_coches(vehiculos, hechos):
    carpeta = os.path.join(ORIGEN, 'coches')
    if not os.path.isdir(carpeta):
        return
    for fichero in sorted(os.listdir(carpeta)):
        if not fichero.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            continue
        clave = os.path.splitext(fichero)[0].lower().strip()
        if clave not in vehiculos:
            print(f'  ! "{fichero}" no cuadra con ningun coche '
                  f'({", ".join(sorted(vehiculos))})')
            continue

        v = vehiculos[clave]
        img = Image.open(os.path.join(carpeta, fichero))
        an, al = img.size
        img = img.crop((int(an * MARGEN), int(al * MARGEN),
                        int(an * (1 - MARGEN)), int(al * (1 - MARGEN))))
        img = mancha_principal(quitar_fondo(img))
        img = enderezar(recortar(img))
        img = img.resize((v['largo'], v['ancho']), Image.NEAREST)

        for i, color in enumerate(v['paleta']):
            nombre = f'veh-{clave}-{i}.png'
            tenir(img, color).save(os.path.join(DESTINO, nombre))
            hechos.append(nombre)
        print(f'  {fichero}: {len(v["paleta"])} colores de {v["largo"]}x{v["ancho"]} px')


def preparar_edificios(hechos):
    carpeta = os.path.join(ORIGEN, 'edificios')
    if not os.path.isdir(carpeta):
        return
    BARRIOS = ['centro', 'residencial', 'comercial',
               'industrial', 'conflictivo', 'puerto']
    for fichero in sorted(os.listdir(carpeta)):
        if not fichero.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            continue
        clave = os.path.splitext(fichero)[0].lower().strip()
        if clave not in BARRIOS:
            print(f'  ! "{fichero}" no cuadra con ningun barrio '
                  f'({", ".join(BARRIOS)})')
            continue

        img = Image.open(os.path.join(carpeta, fichero)).convert('RGBA')
        an, al = img.size
        # el tejado se estira sobre la manzana, asi que se recorta cuadrado y
        # se le quita el borde de fuera (donde cae la marca)
        lado = int(min(an, al) * (1 - MARGEN * 2))
        img = img.crop(((an - lado) // 2, (al - lado) // 2,
                        (an + lado) // 2, (al + lado) // 2))
        img = img.resize((128, 128), Image.LANCZOS)
        nombre = f'techo-{clave}.png'
        img.save(os.path.join(DESTINO, nombre))
        hechos.append(nombre)
        print(f'  {fichero}: tejado de {clave} a 128x128 px')


def main():
    os.makedirs(DESTINO, exist_ok=True)
    vehiculos = leer_vehiculos()
    hechos = []

    print('Coches:')
    preparar_coches(vehiculos, hechos)
    print('Edificios:')
    preparar_edificios(hechos)

    with open(os.path.join(DESTINO, 'lista.json'), 'w', encoding='utf-8') as f:
        json.dump(sorted(hechos), f)

    if hechos:
        print(f'\nListo: {len(hechos)} imagenes en sprites/listos/.')
        print('Recarga el juego; lo que no este preparado se sigue dibujando '
              'por codigo.')
    else:
        print('\nNo habia nada que preparar en sprites/originales/.')


if __name__ == '__main__':
    sys.exit(main())
