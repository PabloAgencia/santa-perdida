import { GameState } from './GameState.js';
import { SAVE } from '../config/balance.js';

// Cuenta y partida en la nube (Supabase), por HTTP directo y sin SDK: el
// juego no depende de ningun CDN y sigue funcionando igual sin internet.
//
// La clave de aqui abajo es la PUBLICA (anon) y esta puesta a proposito: es
// la que va en el navegador. Lo que protege los datos no es esconderla, es
// que la base de datos solo deja que cada uno lea y escriba SU fila.
// La otra clave, la de servicio, no entra aqui ni en el repo jamas.

const URL_BASE = 'https://ivwlobdksywgsxhblppk.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2d2xvYmRrc3l3Z3N4aGJscHBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5OTM5MTYsImV4cCI6MjEwNTU2OTkxNn0.8osr0fxDTxGwJMfuf9ReMN9UFKM2gyJFID3lTMlGwwM';
const TABLA = 'santa_state';
const CLAVE_SESION = 'santa-perdida-sesion';

// no se machaca la nube en cada autoguardado
const ESPERA_ENTRE_SUBIDAS = 20000;

class CloudSave {
  constructor() {
    this.sesion = this.leerSesion();
    this.ultimaSubida = 0;
    this.subiendo = false;
  }

  get conectado() {
    return !!(this.sesion && this.sesion.access_token);
  }

  get correo() {
    return this.sesion ? this.sesion.email : null;
  }

  // ---------- sesion guardada en el navegador ----------

  leerSesion() {
    try {
      const raw = localStorage.getItem(CLAVE_SESION);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  guardarSesion(s) {
    this.sesion = s;
    try {
      if (s) localStorage.setItem(CLAVE_SESION, JSON.stringify(s));
      else localStorage.removeItem(CLAVE_SESION);
    } catch {
      /* si el navegador no deja guardar, la sesion dura lo que la pestaña */
    }
  }

  // ---------- llamadas ----------

  async pedir(ruta, opciones = {}, conSesion = false) {
    const cabeceras = {
      apikey: ANON,
      'Content-Type': 'application/json',
      ...(opciones.headers || {}),
    };
    if (conSesion && this.sesion) {
      cabeceras.Authorization = `Bearer ${this.sesion.access_token}`;
    }

    const r = await fetch(`${URL_BASE}${ruta}`, { ...opciones, headers: cabeceras });
    const texto = await r.text();
    let datos = null;
    try {
      datos = texto ? JSON.parse(texto) : null;
    } catch {
      datos = null;
    }
    if (!r.ok) {
      const msg = (datos && (datos.msg || datos.message || datos.error_description)) || `Error ${r.status}`;
      throw new Error(this.traducir(msg));
    }
    return datos;
  }

  // los mensajes de Supabase vienen en ingles
  traducir(msg) {
    const m = String(msg).toLowerCase();
    if (m.includes('invalid login')) return 'El correo o la contraseña no son correctos';
    if (m.includes('already registered') || m.includes('already been registered')) {
      return 'Ese correo ya tiene cuenta. Prueba a entrar.';
    }
    if (m.includes('password should be at least')) return 'La contraseña necesita 6 caracteres como minimo';
    if (m.includes('unable to validate email') || m.includes('invalid email')) {
      return 'Ese correo no parece valido';
    }
    if (m.includes('failed to fetch') || m.includes('networkerror')) return 'Sin conexion';
    return msg;
  }

  guardarDeLaRespuesta(datos) {
    if (!datos || !datos.access_token) return false;
    this.guardarSesion({
      access_token: datos.access_token,
      refresh_token: datos.refresh_token,
      email: (datos.user && datos.user.email) || (this.sesion && this.sesion.email) || '',
      user_id: datos.user && datos.user.id,
      caduca: Date.now() + (datos.expires_in || 3600) * 1000,
    });
    return true;
  }

  // ---------- cuenta ----------

  async registrar(email, password) {
    const datos = await this.pedir('/auth/v1/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    // el proyecto no pide confirmar el correo: se entra de una vez
    if (!this.guardarDeLaRespuesta(datos)) return this.entrar(email, password);
    return true;
  }

  async entrar(email, password) {
    const datos = await this.pedir('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return this.guardarDeLaRespuesta(datos);
  }

  salir() {
    this.guardarSesion(null);
  }

  // ---------- contraseña olvidada ----------

  // Manda el correo con el enlace. La direccion de vuelta es esta misma
  // pagina, y tiene que estar en la lista de permitidas del proyecto.
  async pedirRecuperacion(email) {
    const destino = `${location.origin}${location.pathname}`;
    await this.pedir(
      `/auth/v1/recover?redirect_to=${encodeURIComponent(destino)}`,
      { method: 'POST', body: JSON.stringify({ email }) }
    );
    return true;
  }

  // Al volver del correo, la direccion trae el permiso en el trozo de
  // detras de la almohadilla. Se recoge, se limpia la barra de direcciones
  // (para que no quede un token a la vista) y queda una sesion corta con la
  // que se puede cambiar la contraseña.
  recogerVueltaDelCorreo() {
    const trozo = (location.hash || '').replace(/^#/, '');
    if (!trozo) return null;
    const p = new URLSearchParams(trozo);
    const limpiar = () => history.replaceState(null, '', location.pathname + location.search);

    if (p.get('error') || p.get('error_description')) {
      limpiar();
      const desc = (p.get('error_description') || '').toLowerCase();
      return {
        ok: false,
        mensaje: desc.includes('expired')
          ? 'Ese enlace ya ha caducado. Pide otro correo.'
          : 'Ese enlace no vale. Pide otro correo.',
      };
    }

    if (p.get('type') !== 'recovery' || !p.get('access_token')) return null;

    this.guardarSesion({
      access_token: p.get('access_token'),
      refresh_token: p.get('refresh_token'),
      email: '',
      user_id: null,
      caduca: Date.now() + 3600000,
    });
    limpiar();
    return { ok: true };
  }

  async cambiarClave(nueva) {
    const datos = await this.pedir(
      '/auth/v1/user',
      { method: 'PUT', body: JSON.stringify({ password: nueva }) },
      true
    );
    if (datos && datos.id) {
      this.guardarSesion({ ...this.sesion, email: datos.email || '', user_id: datos.id });
    }
    return true;
  }

  // el token dura una hora; se renueva solo cuando toca
  async renovarSiHaceFalta() {
    if (!this.conectado) return false;
    if (this.sesion.caduca && Date.now() < this.sesion.caduca - 60000) return true;
    try {
      const datos = await this.pedir('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: this.sesion.refresh_token }),
      });
      return this.guardarDeLaRespuesta(datos);
    } catch {
      this.salir();
      return false;
    }
  }

  async borrarCuenta() {
    await this.renovarSiHaceFalta();
    await this.pedir('/rest/v1/rpc/borrar_mi_cuenta', { method: 'POST', body: '{}' }, true);
    this.salir();
    return true;
  }

  // ---------- partida ----------

  // Cada ranura viaja por su cuenta: subir la 2 no toca la 1 ni la 3.
  async subir(ranura = 1, forzar = false) {
    if (!this.conectado || this.subiendo) return false;
    if (!forzar && Date.now() - this.ultimaSubida < ESPERA_ENTRE_SUBIDAS) return false;
    if (!(await this.renovarSiHaceFalta())) return false;
    return this.subirEstado(ranura, GameState.serialize());
  }

  async subirEstado(ranura, estado) {
    if (!this.conectado) return false;
    if (!(await this.renovarSiHaceFalta())) return false;

    this.subiendo = true;
    try {
      const cuerpo = {
        user_id: this.sesion.user_id,
        slot: ranura,
        state: { version: SAVE.version, ...estado },
      };
      await this.pedir(
        `/rest/v1/${TABLA}?on_conflict=user_id,slot`,
        {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(cuerpo),
        },
        true
      );
      this.ultimaSubida = Date.now();
      return true;
    } finally {
      this.subiendo = false;
    }
  }

  async bajar(ranura = 1) {
    const todas = await this.bajarTodas();
    return todas ? todas[ranura] || null : null;
  }

  // las tres ranuras de una vez, que es lo que pide la pantalla de partidas
  async bajarTodas() {
    if (!this.conectado) return null;
    if (!(await this.renovarSiHaceFalta())) return null;
    const filas = await this.pedir(
      `/rest/v1/${TABLA}?select=slot,state,updated_at&user_id=eq.${this.sesion.user_id}`,
      { method: 'GET' },
      true
    );
    const porRanura = {};
    for (const f of filas || []) {
      porRanura[f.slot] = { estado: f.state, fecha: f.updated_at };
    }
    return porRanura;
  }

  async borrarRanura(ranura) {
    if (!this.conectado) return false;
    if (!(await this.renovarSiHaceFalta())) return false;
    await this.pedir(
      `/rest/v1/${TABLA}?user_id=eq.${this.sesion.user_id}&slot=eq.${ranura}`,
      { method: 'DELETE', headers: { Prefer: 'return=minimal' } },
      true
    );
    return true;
  }
}

export const Cloud = new CloudSave();
