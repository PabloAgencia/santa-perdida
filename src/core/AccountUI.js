import { Cloud } from './Cloud.js';
import { SaveSystem } from './SaveSystem.js';
import { SAVE } from '../config/balance.js';

// Pantalla de cuenta. Va en HTML de verdad, por encima del lienzo, y no
// dibujada dentro del juego: asi el correo y la contraseña son campos
// normales y el gestor de contraseñas del navegador funciona.

const CSS = `
#cuenta-capa {
  position: fixed; inset: 0; z-index: 30;
  display: none; place-items: center;
  background: rgba(5,6,10,.82);
  font-family: Consolas, "Courier New", monospace;
}
#cuenta-capa.abierta { display: grid; }
#cuenta-caja {
  width: min(92vw, 430px);
  background: #0d1014;
  border: 1px solid #2a2f38;
  padding: 26px 24px 20px;
  color: #e6e1d4;
}
#cuenta-caja h2 {
  font-family: Pricedown, Anton, Impact, sans-serif;
  font-size: 32px; font-weight: 400; letter-spacing: .04em;
  color: #e8b54a; margin-bottom: 4px;
}
#cuenta-caja .pie { color: #8a8578; font-size: 12px; margin-bottom: 18px; line-height: 1.5; }
#cuenta-caja label { display: block; font-size: 12px; color: #8a8578; margin: 12px 0 5px; }
#cuenta-caja input {
  width: 100%; padding: 10px 11px;
  background: #171b21; border: 1px solid #2a2f38; color: #e6e1d4;
  font-family: inherit; font-size: 15px;
}
#cuenta-caja input:focus { outline: none; border-color: #e8b54a; }
#cuenta-caja .fila { display: flex; gap: 9px; margin-top: 18px; flex-wrap: wrap; }
#cuenta-caja button {
  flex: 1; min-width: 120px; padding: 11px 10px;
  background: #1d232b; border: 1px solid #2f3742; color: #e6e1d4;
  font-family: Pricedown, Anton, Impact, sans-serif; font-size: 17px;
  letter-spacing: .03em; cursor: pointer;
}
#cuenta-caja button:hover { border-color: #e8b54a; color: #e8b54a; }
#cuenta-caja button.principal { background: #e8b54a; border-color: #e8b54a; color: #16191d; }
#cuenta-caja button.principal:hover { background: #f0c469; color: #16191d; }
#cuenta-caja button.peligro:hover { border-color: #d9584a; color: #d9584a; }
#cuenta-caja button:disabled { opacity: .45; cursor: default; }
#cuenta-aviso { margin-top: 15px; font-size: 13px; min-height: 19px; line-height: 1.5; }
#cuenta-aviso.mal { color: #d9584a; }
#cuenta-aviso.bien { color: #8fd694; }
#cuenta-caja .comparar { display: flex; gap: 10px; margin-top: 14px; }
#cuenta-caja .comparar div {
  flex: 1; background: #171b21; border: 1px solid #2a2f38; padding: 10px; font-size: 12px; line-height: 1.7;
}
#cuenta-caja .comparar b { color: #e8b54a; font-family: Pricedown, Anton, sans-serif; font-size: 15px; }
`;

class Cuenta {
  constructor() {
    this.capa = null;
    this.alCerrar = null;
  }

  montar() {
    if (this.capa) return;
    const estilo = document.createElement('style');
    estilo.textContent = CSS;
    document.head.appendChild(estilo);

    this.capa = document.createElement('div');
    this.capa.id = 'cuenta-capa';
    this.capa.innerHTML = '<div id="cuenta-caja"></div>';
    document.body.appendChild(this.capa);
    this.caja = this.capa.querySelector('#cuenta-caja');

    // pinchar fuera cierra
    this.capa.addEventListener('mousedown', (e) => {
      if (e.target === this.capa) this.cerrar();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.abierta) {
        e.stopPropagation();
        this.cerrar();
      }
    }, true);
  }

  get abierta() {
    return !!this.capa && this.capa.classList.contains('abierta');
  }

  abrir(alCerrar = null) {
    this.montar();
    this.alCerrar = alCerrar;
    this.capa.classList.add('abierta');
    this.pintar();
  }

  cerrar() {
    if (!this.capa) return;
    this.capa.classList.remove('abierta');
    if (this.alCerrar) {
      const f = this.alCerrar;
      this.alCerrar = null;
      f();
    }
  }

  aviso(texto, tipo = '') {
    const a = this.caja.querySelector('#cuenta-aviso');
    if (a) {
      a.textContent = texto;
      a.className = tipo;
    }
  }

  // ---------- pantallas ----------

  pintar() {
    if (Cloud.conectado) this.pintarDentro();
    else this.pintarFuera();
  }

  pintarFuera() {
    this.caja.innerHTML = `
      <h2>TU CUENTA</h2>
      <p class="pie">Con una cuenta, tu partida se guarda tambien fuera de este
      navegador y puedes seguirla en otro sitio. Sin cuenta el juego funciona
      igual, guardando aqui.</p>
      <form id="cuenta-form" autocomplete="on">
        <label for="cuenta-email">Correo</label>
        <input id="cuenta-email" name="email" type="email" autocomplete="username" required>
        <label for="cuenta-pass">Contraseña</label>
        <input id="cuenta-pass" name="password" type="password" autocomplete="current-password"
               minlength="6" required>
        <div class="fila">
          <button type="submit" class="principal" id="cuenta-entrar">ENTRAR</button>
          <button type="button" id="cuenta-crear">CREAR CUENTA</button>
        </div>
      </form>
      <div id="cuenta-aviso"></div>
      <div class="fila">
        <button type="button" id="cuenta-olvidada">SE ME HA OLVIDADO</button>
        <button type="button" id="cuenta-volver">VOLVER</button>
      </div>
    `;

    const form = this.caja.querySelector('#cuenta-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.intentar('entrar');
    });
    this.caja.querySelector('#cuenta-crear').onclick = () => this.intentar('registrar');
    this.caja.querySelector('#cuenta-olvidada').onclick = () => this.pintarOlvidada();
    this.caja.querySelector('#cuenta-volver').onclick = () => this.cerrar();
    setTimeout(() => this.caja.querySelector('#cuenta-email').focus(), 30);
  }

  // ---------- contraseña olvidada ----------

  pintarOlvidada() {
    this.caja.innerHTML = `
      <h2>CONTRASEÑA OLVIDADA</h2>
      <p class="pie">Escribe tu correo y te llega un enlace para poner una
      nueva. El enlace vale una hora.</p>
      <form id="cuenta-form-olv" autocomplete="on">
        <label for="cuenta-email-olv">Correo</label>
        <input id="cuenta-email-olv" name="email" type="email" autocomplete="username" required>
        <div class="fila">
          <button type="submit" class="principal" id="cuenta-enviar">MANDAME EL ENLACE</button>
        </div>
      </form>
      <div id="cuenta-aviso"></div>
      <div class="fila"><button type="button" id="cuenta-atras">ATRAS</button></div>
    `;
    this.caja.querySelector('#cuenta-form-olv').addEventListener('submit', (e) => {
      e.preventDefault();
      this.enviarCorreoDeRecuperacion();
    });
    this.caja.querySelector('#cuenta-atras').onclick = () => this.pintar();
    setTimeout(() => this.caja.querySelector('#cuenta-email-olv').focus(), 30);
  }

  async enviarCorreoDeRecuperacion() {
    const email = this.caja.querySelector('#cuenta-email-olv').value.trim();
    if (!email) {
      this.aviso('Escribe tu correo', 'mal');
      return;
    }
    this.bloquear(true);
    this.aviso('Mandando el correo...');
    try {
      await Cloud.pedirRecuperacion(email);
      // A proposito no se dice si ese correo tiene cuenta o no: asi nadie
      // puede usar esta pantalla para averiguar quien esta registrado.
      this.bloquear(false);
      this.aviso('Si ese correo tiene cuenta, ya va en camino. Mira tambien el spam.', 'bien');
    } catch (err) {
      this.bloquear(false);
      this.aviso(err.message, 'mal');
    }
  }

  // se abre sola al volver del enlace del correo
  pintarNuevaClave() {
    this.montar();
    this.capa.classList.add('abierta');
    this.caja.innerHTML = `
      <h2>NUEVA CONTRASEÑA</h2>
      <p class="pie">Escribe la contraseña nueva. Con eso vuelves a entrar.</p>
      <form id="cuenta-form-nueva" autocomplete="on">
        <label for="cuenta-pass-nueva">Contraseña nueva</label>
        <input id="cuenta-pass-nueva" name="new-password" type="password"
               autocomplete="new-password" minlength="6" required>
        <label for="cuenta-pass-rep">Otra vez, para asegurar</label>
        <input id="cuenta-pass-rep" name="new-password-2" type="password"
               autocomplete="new-password" minlength="6" required>
        <div class="fila">
          <button type="submit" class="principal" id="cuenta-cambiar">GUARDAR</button>
        </div>
      </form>
      <div id="cuenta-aviso"></div>
    `;
    this.caja.querySelector('#cuenta-form-nueva').addEventListener('submit', (e) => {
      e.preventDefault();
      this.guardarClaveNueva();
    });
    setTimeout(() => this.caja.querySelector('#cuenta-pass-nueva').focus(), 30);
  }

  async guardarClaveNueva() {
    const a = this.caja.querySelector('#cuenta-pass-nueva').value;
    const b = this.caja.querySelector('#cuenta-pass-rep').value;
    if (a.length < 6) {
      this.aviso('La contraseña necesita 6 caracteres como minimo', 'mal');
      return;
    }
    if (a !== b) {
      this.aviso('Las dos contraseñas no son iguales', 'mal');
      return;
    }
    this.bloquear(true);
    this.aviso('Guardando...');
    try {
      await Cloud.cambiarClave(a);
      this.bloquear(false);
      this.pintar();
      this.aviso('Contraseña cambiada. Ya estas dentro.', 'bien');
      await this.sincronizar();
    } catch (err) {
      this.bloquear(false);
      this.aviso(err.message, 'mal');
    }
  }

  pintarDentro() {
    this.caja.innerHTML = `
      <h2>TU CUENTA</h2>
      <p class="pie">Has entrado como <b>${Cloud.correo}</b>.<br>
      Tus tres partidas se suben solas cada vez que guardas.</p>
      <div id="cuenta-ranuras" class="comparar"></div>
      <div class="fila">
        <button type="button" class="principal" id="cuenta-subir">SUBIR LAS DE AQUI</button>
        <button type="button" id="cuenta-bajar">VER LAS DE LA NUBE</button>
      </div>
      <div class="fila">
        <button type="button" id="cuenta-salir">CERRAR SESION</button>
        <button type="button" class="peligro" id="cuenta-borrar">BORRAR CUENTA</button>
      </div>
      <div id="cuenta-aviso"></div>
      <div class="fila"><button type="button" id="cuenta-volver">VOLVER</button></div>
    `;

    this.pintarRanuras();
    this.caja.querySelector('#cuenta-subir').onclick = () => this.subir();
    this.caja.querySelector('#cuenta-bajar').onclick = () => this.bajar();
    this.caja.querySelector('#cuenta-salir').onclick = () => {
      Cloud.salir();
      this.pintar();
    };
    this.caja.querySelector('#cuenta-borrar').onclick = () => this.borrar();
    this.caja.querySelector('#cuenta-volver').onclick = () => this.cerrar();
  }

  // ---------- acciones ----------

  async intentar(que) {
    const email = this.caja.querySelector('#cuenta-email').value.trim();
    const pass = this.caja.querySelector('#cuenta-pass').value;
    if (!email || !pass) {
      this.aviso('Hace falta el correo y la contraseña', 'mal');
      return;
    }
    if (pass.length < 6) {
      this.aviso('La contraseña necesita 6 caracteres como minimo', 'mal');
      return;
    }

    this.bloquear(true);
    this.aviso(que === 'entrar' ? 'Entrando...' : 'Creando la cuenta...');
    try {
      if (que === 'entrar') await Cloud.entrar(email, pass);
      else await Cloud.registrar(email, pass);
      this.pintar();
      await this.sincronizar();
    } catch (err) {
      this.bloquear(false);
      this.aviso(err.message, 'mal');
    }
  }

  // Sube lo que solo esta aqui y baja lo que solo esta en la nube. Lo que
  // esta en los dos sitios NO se toca: eso lo decide el jugador en la
  // pantalla de partidas, viendo las dos.
  async sincronizar() {
    this.aviso('Poniendo al dia tus partidas...');
    try {
      const nube = (await Cloud.bajarTodas()) || {};
      const subidas = [];
      const bajadas = [];
      const enDisputa = [];

      for (let n = 1; n <= SAVE.ranuras; n++) {
        const aqui = SaveSystem.hasSave(n);
        const alla = !!nube[n];
        if (aqui && !alla) {
          const datos = SaveSystem.resumen(n);
          await Cloud.subirEstado(n, JSON.parse(localStorage.getItem(`${SAVE.key}-${n}`)));
          subidas.push(n);
          void datos;
        } else if (!aqui && alla) {
          SaveSystem.guardarCrudo(n, nube[n].estado);
          bajadas.push(n);
        } else if (aqui && alla) {
          enDisputa.push(n);
        }
      }

      this.pintarRanuras(nube);
      const partes = [];
      if (subidas.length) partes.push(`subida${subidas.length > 1 ? 's' : ''} la ${subidas.join(' y la ')}`);
      if (bajadas.length) partes.push(`traida${bajadas.length > 1 ? 's' : ''} la ${bajadas.join(' y la ')}`);
      if (!partes.length && !enDisputa.length) partes.push('no habia nada que mover');

      let texto = `Listo: ${partes.join(', ')}.`;
      if (enDisputa.length) {
        texto += ` La ${enDisputa.join(' y la ')} esta en los dos sitios: elige cual vale en TUS PARTIDAS, con la tecla T.`;
      }
      this.aviso(texto, 'bien');
    } catch (err) {
      this.aviso(err.message, 'mal');
    }
  }

  pintarRanuras(nube = null) {
    const caja = this.caja.querySelector('#cuenta-ranuras');
    if (!caja) return;
    const filas = [];
    for (let n = 1; n <= SAVE.ranuras; n++) {
      const r = SaveSystem.resumen(n);
      const enNube = nube ? !!nube[n] : null;
      filas.push(`<div><b>${n}</b><br>${r ? `${r.dinero} €<br>${r.misiones} misiones` : 'vacia'}` +
        `${enNube === null ? '' : `<br><span style="color:#6f9ad9">${enNube ? 'en tu cuenta' : '—'}</span>`}</div>`);
    }
    caja.innerHTML = filas.join('');
  }

  bloquear(si) {
    this.caja.querySelectorAll('button, input').forEach((b) => { b.disabled = si; });
  }

  // sube las tres ranuras de este navegador, pisando lo que haya en la nube
  async subir() {
    this.aviso('Subiendo tus partidas...');
    try {
      const subidas = [];
      for (let n = 1; n <= SAVE.ranuras; n++) {
        if (!SaveSystem.hasSave(n)) continue;
        await Cloud.subirEstado(n, JSON.parse(localStorage.getItem(`${SAVE.key}-${n}`)));
        subidas.push(n);
      }
      const nube = await Cloud.bajarTodas();
      this.pintarRanuras(nube);
      this.aviso(
        subidas.length ? `Subidas las partidas ${subidas.join(', ')}` : 'No tienes ninguna partida aqui',
        subidas.length ? 'bien' : 'mal'
      );
    } catch (err) {
      this.aviso(err.message, 'mal');
    }
  }

  async bajar() {
    this.aviso('Mirando tu cuenta...');
    try {
      const nube = await Cloud.bajarTodas();
      this.pintarRanuras(nube);
      const cuantas = Object.keys(nube || {}).length;
      this.aviso(
        cuantas
          ? `Tienes ${cuantas} partida${cuantas > 1 ? 's' : ''} en tu cuenta. Para traerte una, ve a TUS PARTIDAS y pulsa T encima de ella.`
          : 'Todavia no tienes ninguna partida guardada en tu cuenta',
        cuantas ? 'bien' : 'mal'
      );
    } catch (err) {
      this.aviso(err.message, 'mal');
    }
  }

  async borrar() {
    const boton = this.caja.querySelector('#cuenta-borrar');
    if (boton.dataset.seguro !== '1') {
      boton.dataset.seguro = '1';
      boton.textContent = '¿SEGURO?';
      this.aviso('Se borra tu cuenta y la partida de la nube. Lo de este navegador se queda.', 'mal');
      return;
    }
    try {
      await Cloud.borrarCuenta();
      this.pintar();
      this.aviso('Cuenta borrada', 'bien');
    } catch (err) {
      this.aviso(err.message, 'mal');
    }
  }
}

export const AccountUI = new Cuenta();
