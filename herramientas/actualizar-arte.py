# -*- coding: utf-8 -*-
"""
Apunta en arte/lista.json todo lo que haya en la carpeta arte/.

POR QUE HACE FALTA
    El juego no mira la carpeta: se baja `arte/lista.json` y pide solo lo que
    ponga ahi. Se hace asi para no pedir ficheros que no existen y llenar la
    consola de errores 404, igual que con los sprites y el audio.
    O sea: dejar la imagen en la carpeta NO basta, hay que apuntarla. Esto lo
    hace solo.

USO
    python herramientas/actualizar-arte.py

QUE NOMBRES ESPERA EL JUEGO
    portada.jpg            la pantalla de inicio
    interior-escondite.png tu escondite
    interior-armeria.png   las armerias
    interior-piso.png      los pisos que compras
    Los nombres son literales: si el fichero se llama distinto, el juego no
    lo busca y se queda con el dibujo por codigo. No pasa nada, pero no se ve.
"""

import json
import os
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTE = os.path.join(RAIZ, 'arte')
LISTA = os.path.join(ARTE, 'lista.json')
EXTENSIONES = ('.png', '.jpg', '.jpeg', '.webp')

# lo que el juego sabe usar, para avisar de lo que sobra o falta
ESPERADOS = {
    'portada': 'la pantalla de inicio',
    'interior-escondite': 'el escondite',
    'interior-armeria': 'las armerias',
    'interior-piso-altillo': 'el altillo         1.200 $',
    'interior-piso-residencial': 'Residencial        3.500 $',
    'interior-piso-estudio': 'el estudio         5.000 $',
    'interior-piso-nave': 'la nave            7.500 $',
    'interior-piso-almacen': 'el almacen        11.000 $',
    'interior-piso-centro': 'el del Centro     16.000 $',
    'interior-piso': 'generica de piso (opcional, de reserva)',
}


def main():
    if not os.path.isdir(ARTE):
        sys.exit('No encuentro la carpeta %s' % ARTE)

    nombres = sorted(
        n for n in os.listdir(ARTE) if n.lower().endswith(EXTENSIONES)
    )
    with open(LISTA, 'w', encoding='utf-8') as f:
        json.dump(nombres, f)

    print('arte/lista.json apuntado con %d imagen(es):' % len(nombres))
    claves = set()
    for n in nombres:
        clave = os.path.splitext(n)[0]
        claves.add(clave)
        que = ESPERADOS.get(clave)
        kb = os.path.getsize(os.path.join(ARTE, n)) / 1024
        if que:
            print('  %-26s %6.0f KB   -> %s' % (n, kb, que))
        else:
            print('  %-26s %6.0f KB   -> AVISO: el juego no usa este nombre'
                  % (n, kb))

    faltan = [k for k in ESPERADOS if k not in claves]
    if faltan:
        print('\nTodavia sin imagen (el juego tira del dibujo por codigo):')
        for k in faltan:
            print('  %-26s -> %s' % (k, ESPERADOS[k]))


if __name__ == '__main__':
    main()
