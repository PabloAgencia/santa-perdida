# -*- coding: utf-8 -*-
"""
Deja los motores grabados en condiciones de ir EN BUCLE.

EL PROBLEMA
    El juego reproduce el motor en bucle y le cambia la velocidad segun las
    vueltas. Para eso la grabacion tiene que ser un ralenti PLANO. Las que
    hay no lo son, y se nota muchisimo:

      motor-moto  el nivel sube de 0,20 a 1,00 y baja otra vez: lleva un
                  aceleron grabado dentro. En bucle hace "ruum-RUUM-ruum"
                  cada tres segundos.
      motor-1     empieza casi en silencio y acaba fuerte (desajuste x36):
                  pega un corte seco en cada vuelta del bucle.

QUE HACE
    1. Busca en cada grabacion la VENTANA MAS PLANA que encuentre, que es el
       trozo que de verdad parece un ralenti.
    2. La corta y le hace un fundido cruzado consigo misma en la costura, de
       modo que el final enlaza con el principio sin salto.
    3. Normaliza para que todos suenen al mismo volumen.

    Los originales NO se tocan: se guardan en audio/originales/ la primera
    vez, y a partir de ahi el script siempre parte de ellos. Asi se puede
    volver a ejecutar sin ir degradando el sonido en cada pasada.

USO
    python herramientas/preparar-motores.py
"""

import os
import shutil
import subprocess
import sys

import numpy as np

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO = os.path.join(RAIZ, 'audio')
ORIGINALES = os.path.join(AUDIO, 'originales')
SR = 44100

MOTORES = ['motor-1', 'motor-2', 'motor-3', 'motor-4', 'motor-moto']

VENTANA = 2.0       # s de bucle que se busca
CRUCE = 0.25        # s de fundido en la costura
PICO = 0.92         # a cuanto se normaliza


def decodificar(ruta):
    crudo = subprocess.run(
        ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', ruta,
         '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'],
        stdout=subprocess.PIPE, check=True).stdout
    return np.frombuffer(crudo, dtype=np.float32).astype(np.float64)


def codificar(datos, ruta):
    datos = np.clip(datos, -1.0, 1.0).astype(np.float32)
    subprocess.run(
        ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
         '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-',
         '-codec:a', 'libmp3lame', '-b:a', '128k', ruta],
        input=datos.tobytes(), check=True)


def ventana_mas_plana(d):
    """El trozo cuyo nivel varia menos: eso es el ralenti."""
    largo = int(SR * VENTANA)
    if len(d) <= largo + SR // 2:
        return 0, len(d)

    paso = SR // 20                       # se mide cada 50 ms
    niveles = np.sqrt(np.convolve(d ** 2, np.ones(paso) / paso, mode='same'))

    mejor_i, mejor_coste = 0, float('inf')
    for i in range(0, len(d) - largo, paso):
        trozo = niveles[i:i + largo]
        media = trozo.mean()
        if media < 1e-4:
            continue
        # lo plano que es, mas un castigo por estar muy bajo de nivel
        coste = trozo.std() / media + (0.25 / media) * 0.02
        if coste < mejor_coste:
            mejor_coste, mejor_i = coste, i
    return mejor_i, mejor_i + largo


def coser(trozo):
    """Fundido cruzado para que el final enlace con el principio."""
    cruce = int(SR * CRUCE)
    if len(trozo) <= cruce * 2:
        return trozo
    cuerpo = trozo[:-cruce].copy()
    rampa = np.linspace(0.0, 1.0, cruce)
    # la cola se desvanece encima de la cabeza, que entra a la vez
    cuerpo[:cruce] = cuerpo[:cruce] * rampa + trozo[-cruce:] * (1.0 - rampa)
    return cuerpo


def desajuste(d):
    borde = int(SR * 0.05)
    a = float(np.sqrt((d[:borde] ** 2).mean()))
    b = float(np.sqrt((d[-borde:] ** 2).mean()))
    return max(a, b) / (min(a, b) + 1e-9)


def variacion(d):
    paso = SR // 10
    n = [float(np.sqrt((d[i:i + paso] ** 2).mean()))
         for i in range(0, len(d) - paso, paso)]
    if not n:
        return 1.0
    return max(n) / (min(n) + 1e-9)


def main():
    if not os.path.isdir(AUDIO):
        sys.exit('No encuentro %s' % AUDIO)
    os.makedirs(ORIGINALES, exist_ok=True)

    for nombre in MOTORES:
        actual = os.path.join(AUDIO, nombre + '.mp3')
        guardado = os.path.join(ORIGINALES, nombre + '.mp3')
        if not os.path.exists(actual) and not os.path.exists(guardado):
            print('%-12s no esta, me lo salto' % nombre)
            continue
        # la primera vez se guarda el original; despues se parte SIEMPRE de el
        if not os.path.exists(guardado):
            shutil.copy2(actual, guardado)

        d = decodificar(guardado)
        antes = (len(d) / SR, desajuste(d), variacion(d))

        a, b = ventana_mas_plana(d)
        trozo = coser(d[a:b])
        pico = float(np.abs(trozo).max()) or 1.0
        trozo *= PICO / pico

        codificar(trozo, actual)
        despues = (len(trozo) / SR, desajuste(trozo), variacion(trozo))

        print('%-12s  %.1fs costura x%-6.1f variacion x%-8.1f ->  '
              '%.1fs costura x%-5.2f variacion x%.1f'
              % (nombre, antes[0], antes[1], antes[2],
                 despues[0], despues[1], despues[2]))


if __name__ == '__main__':
    main()
