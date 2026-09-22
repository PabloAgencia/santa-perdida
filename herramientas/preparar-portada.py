# -*- coding: utf-8 -*-
"""
Prepara la ilustracion de portada para que el menu pueda usarla.

EL PROBLEMA QUE RESUELVE
    La portada que genero Pablo trae las cuatro opciones del menu PINTADAS
    dentro. El titulo y el subtitulo pintados estan bien (el juego deja de
    escribir los suyos y usa esos, que quedan mucho mejor), pero las opciones
    NO pueden ser un dibujo: cambian de texto ("SEGUIR LA PARTIDA 1" cuando
    hay partida guardada), se iluminan al pasar por encima y llevan cursor.

LO QUE HACE
    Esmerila la franja donde estan esas opciones: desenfoque fuerte mas un
    oscurecido con los bordes difuminados. Las letras pintadas desaparecen y
    queda un panel que parece puesto a proposito, del estilo de los menus de
    los juegos de la epoca. Encima, el juego escribe las opciones de verdad.

    Se hace AQUI y no en el juego porque desenfocar en Phaser cada fotograma
    cuesta caro y esto no cambia nunca: se cuece una vez y listo.

USO
    python herramientas/preparar-portada.py
    (lee "portada santa perdida.png" de la raiz y escribe arte/portada.png)
"""

import json
import os
import sys

from PIL import Image, ImageDraw, ImageFilter

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGEN = os.path.join(RAIZ, 'portada santa perdida.png')
# Sale en JPEG y no en PNG a proposito: es una ilustracion con degradados, no
# un sprite con transparencia. En PNG pesaba 1.960 KB y en JPEG de calidad 92
# pesa 371, sin que se note la diferencia. Eso son cinco veces menos que
# bajarse el jugador antes de ver el menu.
DESTINO = os.path.join(RAIZ, 'arte', 'portada.jpg')
CALIDAD = 92
LISTA = os.path.join(RAIZ, 'arte', 'lista.json')

# El panel que tapa las opciones pintadas, en tanto por uno del lienzo (asi
# sigue valiendo si algun dia la portada viene a otro tamaño).
#
# Va CEÑIDO al texto a proposito. La primera version esmerilaba una franja de
# lado a lado y se comia medio cuadro: el sol, el cerro y las palmeras. Un
# panel centrado tapa lo que hay que tapar y deja el resto nitido, y ademas
# parece un elemento del menu puesto aposta, no un borron.
#
# OJO: estos cuatro numeros son la ZONA DEL TEXTO pintado, no el panel. El
# panel se calcula sumandole la pluma por los cuatro lados, porque difuminar
# una mascara la encoge: en la primera prueba el panel se dibujo justo del
# tamaño del texto y, al difuminarlo, la primera y la ultima linea se quedaron
# en el borde suave y seguian leyendose.
ZONA_IZQ = 0.352
ZONA_DER = 0.662
ZONA_ARRIBA = 0.523
ZONA_ABAJO = 0.782
DIFUMINADO = 0.05    # cuanto se suavizan los bordes del panel

DESENFOQUE = 26      # radio del desenfoque; por debajo de 20 se leen las letras
OSCURECIDO = 0.5     # cuanto se apaga el panel en su centro


def esmerilar(im):
    ancho, alto = im.size
    pluma = max(1, int(alto * DIFUMINADO))
    x0 = int(ancho * ZONA_IZQ) - pluma
    x1 = int(ancho * ZONA_DER) + pluma
    y0 = int(alto * ZONA_ARRIBA) - pluma
    y1 = int(alto * ZONA_ABAJO) + pluma

    # 1. el desenfoque se calcula sobre la imagen ENTERA y luego se pega solo
    #    donde toca. Desenfocando el recorte suelto, los bordes se contaminan
    #    con el gris de fuera y queda un marco claro alrededor del panel.
    borroso = im.filter(ImageFilter.GaussianBlur(DESENFOQUE))

    # 2. mascara: un rectangulo redondeado difuminado. El difuminado se hace
    #    con un desenfoque de la propia mascara, que sale mucho mas limpio que
    #    pintar el degradado linea a linea.
    mascara = Image.new('L', (ancho, alto), 0)
    lapiz = ImageDraw.Draw(mascara)
    lapiz.rounded_rectangle([x0, y0, x1, y1], radius=pluma, fill=255)
    mascara = mascara.filter(ImageFilter.GaussianBlur(pluma * 0.6))

    salida = Image.composite(borroso, im, mascara)

    # 3. oscurecer con la misma mascara, para que el texto blanco del juego
    #    tenga contraste de sobra encima
    negro = Image.new('RGB', (ancho, alto), (5, 6, 10))
    velo = mascara.point(lambda v: int(v * OSCURECIDO))
    return Image.composite(negro, salida, velo)


# Cuenta pixeles de "letra pintada" dentro de la zona: casi blancos y con
# mucho contraste. Sirve para no fiarse del ojo — si quedan letras, el numero
# de despues sigue siendo alto y el script avisa en vez de dar el visto bueno.
def letras_que_quedan(im):
    import numpy as np
    a = np.asarray(im).astype(int)
    alto, ancho, _ = a.shape
    zona = a[int(alto * ZONA_ARRIBA):int(alto * ZONA_ABAJO),
             int(ancho * ZONA_IZQ):int(ancho * ZONA_DER)]
    return int(((zona.min(axis=2) > 165) & (zona.max(axis=2) > 200)).sum())


# arte/lista.json se REHACE mirando la carpeta, no se escribe a mano.
#
# La primera version ponia ["portada.jpg"] y punto, y eso habria borrado de la
# lista los interiores en cuanto se volviera a preparar la portada: el juego
# habria dejado de pedirlos sin que nadie tocara nada. Listando la carpeta,
# meter arte nuevo es dejar el fichero y ejecutar esto.
EXTENSIONES = ('.png', '.jpg', '.jpeg', '.webp')


def escribir_lista():
    carpeta = os.path.dirname(LISTA)
    nombres = sorted(
        n for n in os.listdir(carpeta)
        if n.lower().endswith(EXTENSIONES)
    )
    with open(LISTA, 'w', encoding='utf-8') as f:
        json.dump(nombres, f)
    print('arte/lista.json: %s' % ', '.join(nombres))


def main():
    if not os.path.exists(ORIGEN):
        sys.exit('No encuentro %s' % ORIGEN)

    im = Image.open(ORIGEN).convert('RGB')
    antes = letras_que_quedan(im)
    salida = esmerilar(im)
    despues = letras_que_quedan(salida)

    print('pixeles de letra en la zona: %d -> %d' % (antes, despues))
    if despues > antes * 0.02:
        sys.exit('AVISO: todavia se leen letras pintadas. Sube DESENFOQUE o '
                 'agranda la zona, y vuelve a mirarlo con los ojos.')

    os.makedirs(os.path.dirname(DESTINO), exist_ok=True)
    salida.save(DESTINO, quality=CALIDAD, optimize=True, progressive=True)

    # por si quedo una portada vieja en el otro formato: si no, el juego se
    # bajaria las dos y usaria la que cargue la ultima
    viejo = os.path.join(RAIZ, 'arte', 'portada.png')
    if os.path.exists(viejo):
        os.remove(viejo)

    escribir_lista()

    kb = os.path.getsize(DESTINO) / 1024
    print('portada lista: %s  (%dx%d, %.0f KB)' % (DESTINO, salida.width, salida.height, kb))


if __name__ == '__main__':
    main()
