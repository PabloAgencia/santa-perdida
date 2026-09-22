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

import numpy as np
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGEN = os.path.join(RAIZ, 'sprites', 'originales')
DESTINO = os.path.join(RAIZ, 'sprites', 'listos')

# margen que se recorta en los tejados, donde la marca cae dentro del dibujo
MARGEN = 0.04

# Como llamo Pablo a cada imagen -> como se llama en el juego. Si generas mas,
# basta con añadir la linea aqui.
# Las que Gemini saco mirando al otro lado. El juego las quiere con el morro
# a la derecha, asi que estas se voltean.
VOLTEAR = {'avispa'}

# Los que llevan librea no se tiñen: un coche de policia pintado de verde deja
# de ser un coche de policia.
SIN_TENIR = {'patrulla', 'furgon'}

ALIAS = {
    'coche 1970s': 'bastion',
    'coche 1980s': 'chinchorro',
    'coche policia': 'patrulla',
    'deportivo': 'velagt',
    'furgon swat': 'furgon',
    'furgoneta': 'carguero',
    'moto': 'avispa',
    'barrio conflictivo': 'conflictivo',
}


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


def quitar_magenta(img):
    """Si el fondo es el magenta plano que pido en los prompts, fuera.

    Es lo mas comodo: ese color no sale en ningun sitio del juego, asi que se
    quita de un tiron y sin tocar el dibujo. Devuelve None si no era magenta,
    para que se siga con el metodo del damero.
    """
    img = img.convert('RGBA')
    rgb = np.array(img)[:, :, :3].astype(float)
    magenta = np.array([255.0, 0.0, 255.0])
    cerca = np.sqrt(((rgb - magenta) ** 2).sum(axis=2)) < 120
    if cerca.mean() < 0.12:
        return None

    a = np.array(img)
    a[:, :, 3][cerca] = 0
    return Image.fromarray(a, 'RGBA')


def quitar_fondo(img, convexo=True):
    """Se queda con el vehiculo y tira el fondo.

    El fondo que pinta Gemini es un damero con degradados y ruido, asi que
    perseguir sus colores uno a uno no lleva a ningun sitio: a la primera de
    cambio se come las ventanas del coche, que son del mismo negro.

    Lo que si es seguro: UN COCHE VISTO DESDE ARRIBA ES CONVEXO. Asi que se
    marcan los pixeles que NO pueden ser fondo (los que se apartan de los dos
    tonos del damero), y despues, fila a fila, se rellena todo lo que queda
    entre el primero y el ultimo. Las ventanas y el capo negro quedan dentro
    del relleno, y el damero, fuera.
    """
    # si ya viene recortada (Pablo se lo quita a mano a veces), no se toca
    img = img.convert('RGBA')
    if (np.array(img)[:, :, 3] < 40).mean() > 0.08:
        return img

    limpia = quitar_magenta(img)
    if limpia is not None:
        return limpia

    img = img.convert('RGBA')
    a = np.array(img).astype(np.int16)
    al, an = a.shape[:2]
    rgb = a[:, :, :3].astype(float)

    # los dos tonos del fondo, medidos en el marco
    grueso = max(10, min(al, an) // 10)
    marco = np.concatenate([
        rgb[:grueso].reshape(-1, 3), rgb[-grueso:].reshape(-1, 3),
        rgb[:, :grueso].reshape(-1, 3), rgb[:, -grueso:].reshape(-1, 3),
    ])
    luz = marco.mean(axis=1)
    corte = (luz.min() + luz.max()) / 2
    tonos = [marco[luz <= corte], marco[luz > corte]]
    tonos = [np.median(t, axis=0) for t in tonos if len(t) > 50]

    lejos = np.ones((al, an), dtype=bool)
    for t in tonos:
        lejos &= np.sqrt(((rgb - t) ** 2).sum(axis=2)) > 62

    # fuera el ruido suelto: un pixel solo no es un coche
    vecinos = np.zeros((al, an), dtype=np.int16)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dx == 0 and dy == 0:
                continue
            vecinos += np.roll(np.roll(lejos, dy, axis=0), dx, axis=1).astype(np.int16)
    seguro = lejos & (vecinos >= 4)

    if not convexo:
        # una persona tiene huecos de verdad (entre el brazo y el cuerpo), asi
        # que aqui manda el color y no la silueta
        a[:, :, 3][~seguro] = 0
        return Image.fromarray(a.astype(np.uint8), 'RGBA')

    # relleno por filas y por columnas: la interseccion deja la silueta limpia
    relleno = np.zeros((al, an), dtype=bool)
    for y in range(al):
        xs = np.flatnonzero(seguro[y])
        if len(xs) >= 6:
            relleno[y, xs[0]:xs[-1] + 1] = True
    porColumnas = np.zeros((al, an), dtype=bool)
    for x in range(an):
        ys = np.flatnonzero(seguro[:, x])
        if len(ys) >= 4:
            porColumnas[ys[0]:ys[-1] + 1, x] = True

    dentro = relleno & porColumnas
    a[:, :, 3][~dentro] = 0
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def mancha_principal(img):
    """Se queda con lo que esta pegado al centro, que es el vehiculo.

    Lo que quede suelto por las esquinas se va, y ahi es justo donde cae la
    marquita que pega el Playground de Gemini.
    """
    a = np.array(img)
    opaco = a[:, :, 3] >= 40
    al, an = opaco.shape

    semilla = np.zeros_like(opaco)
    semilla[al // 2 - al // 8: al // 2 + al // 8,
            an // 2 - an // 8: an // 2 + an // 8] = True
    bueno = semilla & opaco
    if not bueno.any():
        return img

    while True:
        crecido = bueno.copy()
        crecido[1:, :] |= bueno[:-1, :]
        crecido[:-1, :] |= bueno[1:, :]
        crecido[:, 1:] |= bueno[:, :-1]
        crecido[:, :-1] |= bueno[:, 1:]
        crecido &= opaco
        if crecido.sum() == bueno.sum():
            break
        bueno = crecido

    a[:, :, 3][~bueno] = 0
    return Image.fromarray(a, 'RGBA')


def recortar(img):
    caja = img.getbbox()
    return img.crop(caja) if caja else img


def enderezar(img):
    """El juego dibuja los coches mirando a la derecha."""
    an, al = img.size
    return img.rotate(-90, expand=True) if al > an else img


def encajar(img, largo, ancho):
    """Ajusta al tamaño del vehiculo SIN deformarlo, y lo centra."""
    escala = min(largo / img.width, ancho / img.height)
    nuevo = img.resize((max(1, round(img.width * escala)),
                        max(1, round(img.height * escala))), Image.LANCZOS)
    lienzo = Image.new('RGBA', (largo, ancho), (0, 0, 0, 0))
    lienzo.paste(nuevo, ((largo - nuevo.width) // 2, (ancho - nuevo.height) // 2))
    return lienzo


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
        clave = ALIAS.get(clave, clave)
        if clave not in vehiculos:
            print(f'  ! "{fichero}" no cuadra con ningun coche '
                  f'({", ".join(sorted(vehiculos))})')
            continue

        v = vehiculos[clave]
        img = Image.open(os.path.join(carpeta, fichero))
        img = mancha_principal(quitar_fondo(img))
        img = enderezar(recortar(img))
        if clave in VOLTEAR:
            img = img.transpose(Image.FLIP_LEFT_RIGHT)
        img = encajar(img, v['largo'], v['ancho'])

        for i, color in enumerate(v['paleta']):
            nombre = f'veh-{clave}-{i}.png'
            salida = img if clave in SIN_TENIR else tenir(img, color)
            salida.save(os.path.join(DESTINO, nombre))
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
        clave = ALIAS.get(clave, clave)
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


# Como se llama cada personaje en el juego. El jugador tiene tres cuerpos
# porque engorda comiendo y se pone fuerte peleando, y eso se ve.
PERSONAJES = {
    'jugador-normal': 'player-foto',
    'jugador-gordo': 'player-gordo',
    'jugador-fuerte': 'player-fuerte',
    'policia': 'officer',
    'swat': 'swat',
    'banda-roja': 'gang-rompiente',
    'banda-verde': 'gang-verdial',
    'banda-morada': 'gang-amarres',
    'peaton-1': 'ped-0',
    'peaton-2': 'ped-1',
    'peaton-3': 'ped-2',
    'peaton-4': 'ped-3',
    'peaton-5': 'ped-4',
    'peaton-6': 'ped-5',
    'peaton-7': 'ped-6',
    'peaton-8': 'ped-7',
    'peaton-9': 'ped-8',
    'peaton-10': 'ped-9',
    'peaton-11': 'ped-10',
    'peaton-12': 'ped-11',
}

# El lienzo es de 32 px, pero la persona ocupa 23: es lo que mide la que
# dibuja el juego (22x24), y si la foto llena los 32 el personaje sale un 45%
# mas grande que su propia sombra y que su circulo de colision.
LADO_PERSONAJE = 32
LADO_CUERPO = 23


def preparar_personajes(hechos):
    """Cada persona sale en cuatro fotogramas: el juego los va pasando al

    andar. Como la imagen es una sola, los pasos se hacen moviendola un pixel
    arriba y abajo; desde arriba no se ven las piernas, asi que con ese
    balanceo basta para que parezca que camina.
    """
    carpeta = os.path.join(ORIGEN, 'personajes')
    if not os.path.isdir(carpeta):
        return
    for fichero in sorted(os.listdir(carpeta)):
        if not fichero.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            continue
        clave = os.path.splitext(fichero)[0].lower().strip()
        if clave not in PERSONAJES:
            print(f'  ! "{fichero}" no cuadra con ningun personaje '
                  f'({", ".join(sorted(PERSONAJES))})')
            continue

        img = Image.open(os.path.join(carpeta, fichero))
        img = mancha_principal(quitar_fondo(img, convexo=False))
        img = recortar(img)
        # todas salen de espaldas mirando hacia arriba, y el juego las dibuja
        # mirando a la derecha: un cuarto de vuelta en el sentido del reloj
        img = img.rotate(-90, expand=True)
        img = encajar(img, LADO_CUERPO, LADO_CUERPO)

        base = PERSONAJES[clave]
        for fase, subir in enumerate((0, -1, 0, 1)):
            lienzo = Image.new('RGBA', (LADO_PERSONAJE, LADO_PERSONAJE), (0, 0, 0, 0))
            hueco = (LADO_PERSONAJE - LADO_CUERPO) // 2
            lienzo.paste(img, (hueco, hueco + subir))
            nombre = f'{base}-{fase}.png'
            lienzo.save(os.path.join(DESTINO, nombre))
            hechos.append(nombre)
        print(f'  {fichero}: {base}, 4 fotogramas de {LADO_PERSONAJE}x{LADO_PERSONAJE} px')


def preparar_iconos(hechos):
    """Los iconos van tal cual, solo recortados y a 40x40 (los del mapa, 20)."""
    carpeta = os.path.join(ORIGEN, 'iconos')
    if not os.path.isdir(carpeta):
        return
    for fichero in sorted(os.listdir(carpeta)):
        if not fichero.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            continue
        clave = os.path.splitext(fichero)[0].lower().strip()
        img = mancha_principal(quitar_fondo(Image.open(os.path.join(carpeta, fichero))))
        img = recortar(img)
        lado = 20 if clave.startswith('marca-') else 40
        img = encajar(img, lado, lado)
        nombre = f'{clave}.png'
        img.save(os.path.join(DESTINO, nombre))
        hechos.append(nombre)
        print(f'  {fichero}: {clave} a {lado}x{lado} px')


def main():
    os.makedirs(DESTINO, exist_ok=True)
    vehiculos = leer_vehiculos()
    hechos = []

    print('Coches:')
    preparar_coches(vehiculos, hechos)
    print('Edificios:')
    preparar_edificios(hechos)
    print('Personajes:')
    preparar_personajes(hechos)
    print('Iconos:')
    preparar_iconos(hechos)

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
