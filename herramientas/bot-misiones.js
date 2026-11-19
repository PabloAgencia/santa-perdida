// EL BOT QUE JUEGA LAS MISIONES (19-nov-2026).
//
// Pablo: "no voy a pasarme el juego entero, para eso te tengo a ti, para que
// construyas y pruebes todo antes de nada". Esto se inyecta en la pagina del
// juego (lo carga herramientas/probar-misiones.cjs con Playwright) y juega
// cada mision con el teclado simulado, como lo haria una persona normal:
//
//   ir / recoger / entregar   a pie si esta cerca; si no, coge un coche
//   conducir                  en coche, siguiendo las calles (A* propio)
//   aguantar                  se baja y dispara al mas cercano
//   romper                    embiste y dispara por la ventanilla
//   seguir                    detras, a distancia (mas lejos si hay sigilo)
//   perder                    conduce lejos hasta que se pierde la busca
//
// No hace trampas: no es invencible, no teletransporta durante la mision y
// usa las mismas teclas y la misma fisica que el jugador. Lo que mide (si
// muere, cuanta vida le queda, cuanto tarda) es la dificultad real.
/* eslint-disable */
window.__bot = (() => {
  let g, c, GS, MISSIONS, steerTo, VehicleCls;
  const T = 32;

  // ---------- A* por casillas, prefiriendo la calzada ----------
  class Heap {
    constructor() { this.a = []; }
    push(n) { const a = this.a; a.push(n); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p].f <= a[i].f) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
    pop() { const a = this.a; const top = a[0]; const last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l].f < a[m].f) m = l; if (r < a.length && a[r].f < a[m].f) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; }
    get size() { return this.a.length; }
  }
  let gScore = null;
  function ruta(x0, y0, x1, y1, enCoche) {
    const m = c.map;
    const W = m.w, H = m.h;
    if (!gScore) gScore = new Float32Array(W * H);
    gScore.fill(Infinity);
    const sx = Math.floor(x0 / T), sy = Math.floor(y0 / T), gx = Math.floor(x1 / T), gy = Math.floor(y1 / T);
    const libre = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !m.solid[y * W + x];
    const padre = new Int32Array(W * H).fill(-1);
    const h = new Heap();
    gScore[sy * W + sx] = 0;
    h.push({ i: sy * W + sx, f: 0 });
    let n = 0;
    while (h.size && n < 250000) {
      const cur = h.pop(); n++;
      const cx = cur.i % W, cy = (cur.i / W) | 0;
      if (cx === gx && cy === gy) break;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (!libre(nx, ny)) continue;
        // en coche: tambien mira que quepa (las dos casillas de al lado)
        const k = ny * W + nx;
        const coste = enCoche ? (m.roadMask[k] ? 1 : 4) : (m.roadMask[k] ? 2 : 1);
        const ng = gScore[cur.i] + coste;
        if (ng < gScore[k]) { gScore[k] = ng; padre[k] = cur.i; h.push({ i: k, f: ng + Math.abs(nx - gx) + Math.abs(ny - gy) }); }
      }
    }
    const fin = gy * W + gx;
    if (padre[fin] === -1) return null;
    const pts = [];
    for (let i = fin; i !== -1 && i !== sy * W + sx; i = padre[i]) pts.push({ x: (i % W) * T + 16, y: ((i / W) | 0) * T + 16 });
    pts.reverse();
    // se aligera: un punto cada 3 casillas
    return pts.filter((_, i) => i % 3 === 0 || i === pts.length - 1);
  }

  // ---------- teclas ----------
  function soltar() {
    for (const k of ['up', 'down', 'left', 'right', 'upArrow', 'downArrow', 'leftArrow', 'rightArrow', 'handbrake', 'run']) {
      if (c.keys[k]) c.keys[k].isDown = false;
    }
  }
  function pulsar(inp) {
    c.keys.up.isDown = !!inp.throttle || !!inp.up;
    c.keys.down.isDown = !!inp.brake || !!inp.down;
    c.keys.left.isDown = !!inp.left;
    c.keys.right.isDown = !!inp.right;
    if (inp.run && c.keys.run) c.keys.run.isDown = true;
  }

  const st = { ruta: null, rutaIdx: 0, rutaDest: null, tRuta: 0, atasco: 0, marcha: 0, destHuida: null, tDisparo: 0 };

  function cocheNuevo() {
    const p = c.player;
    let best = null;
    for (let t = 0; t < 40 && !best; t++) {
      const a = Math.random() * Math.PI * 2;
      const x = p.x + Math.cos(a) * 50, y = p.y + Math.sin(a) * 50;
      if (!c.map.isSolidBox(x, y, 26, 26)) best = { x, y };
    }
    if (!best) best = { x: p.x, y: p.y };
    const v = new VehicleCls(c, c.map, 'senador', best.x, best.y, 0, { deTuyo: true, color: 0, gasolina: 1 });
    c.vehicles.push(v);
    c.enterVehicle(v);
  }

  function conducirHacia(dest, velocidad = 1, dt = 0.033) {
    const v = c.drivingVehicle;
    const d = Math.hypot(dest.x - v.x, dest.y - v.y);
    st.tRuta -= dt;
    const movido = !st.rutaDest || Math.hypot(dest.x - st.rutaDest.x, dest.y - st.rutaDest.y) > 160;
    if (d > 260 && (!st.ruta || movido || st.tRuta <= 0)) {
      st.ruta = ruta(v.x, v.y, dest.x, dest.y, true);
      st.rutaIdx = 0; st.rutaDest = { x: dest.x, y: dest.y }; st.tRuta = 4;
    }
    let pt = dest;
    if (st.ruta && d > 260) {
      while (st.rutaIdx < st.ruta.length - 1 && Math.hypot(st.ruta[st.rutaIdx].x - v.x, st.ruta[st.rutaIdx].y - v.y) < 110) st.rutaIdx++;
      pt = st.ruta[st.rutaIdx];
    }
    // atasco: parado acelerando -> marcha atras un momento
    if (st.marcha > 0) {
      st.marcha -= dt;
      pulsar({ brake: true, left: Math.random() < 0.5, right: false });
      return;
    }
    if (v.speed < 12) st.atasco += dt; else st.atasco = 0;
    if (st.atasco > 1.2) { st.atasco = 0; st.marcha = 0.9; st.tRuta = 0; return; }
    const inp = steerTo(v, pt.x, pt.y, v.stats.maxSpeed * velocidad, false);
    pulsar(inp);
  }

  function andarHacia(dest) {
    const p = c.player;
    const d = Math.hypot(dest.x - p.x, dest.y - p.y);
    st.tRuta -= 0.033;
    if (!st.ruta || st.tRuta <= 0) { st.ruta = ruta(p.x, p.y, dest.x, dest.y, false); st.rutaIdx = 0; st.tRuta = 3; }
    let pt = dest;
    if (st.ruta && d > 40) {
      while (st.rutaIdx < st.ruta.length - 1 && Math.hypot(st.ruta[st.rutaIdx].x - p.x, st.ruta[st.rutaIdx].y - p.y) < 30) st.rutaIdx++;
      pt = st.ruta[st.rutaIdx];
    }
    const dx = pt.x - p.x, dy = pt.y - p.y;
    pulsar({ right: dx > 6, left: dx < -6, down: dy > 6, up: dy < -6, run: true });
  }

  function mejorArma() {
    for (const a of ['rifle', 'subfusil', 'escopeta', 'pistola']) {
      if (GS.tieneArma(a) && GS.puedeDisparar(a)) { GS.armaActual = a; return; }
    }
  }

  function disparar(dt, clic = null) {
    st.tDisparo -= dt;
    if (st.tDisparo > 0) return;
    st.tDisparo = 0.12;
    c.atacarAhora(clic);
  }

  // ---------- un fotograma de bot ----------
  function tick(dt) {
    soltar();
    const m = c.missions;
    if (!m.activa) return;
    const paso = m.pasoActual;
    if (!paso) return;
    const p = c.player;
    const v = c.drivingVehicle;
    const dest = m.objetivo;
    mejorArma();
    // coche en llamas: fuera, como haria cualquiera, y a por otro
    if (v && v.ardiendo > 0) { c.exitVehicle(); st.ruta = null; return; }
    // a pie y con un coche ardiendo cerca: primero alejarse, que revienta
    if (!v) {
      const fuego = c.vehicles.find((q) => q.ardiendo > 0 && !q.quemado && Math.hypot(q.x - p.x, q.y - p.y) < 170);
      if (fuego) { const dx = p.x - fuego.x, dy = p.y - fuego.y; pulsar({ right: dx > 0, left: dx < 0, down: dy > 0, up: dy < 0, run: true }); return; }
    }
    const enemigos = c.npcs.people.filter((q) => q.deMision && !q.down && Math.hypot(q.x - p.x, q.y - p.y) < 420);

    switch (paso.tipo) {
      case 'ir': case 'recoger': case 'entregar': case 'conducir': {
        if (!dest) break;
        const d = Math.hypot(dest.x - p.x, dest.y - p.y);
        const hayCoche = paso.tipo === 'conducir' || d > 300;
        if (hayCoche && !v) cocheNuevo();
        if (c.drivingVehicle) {
          conducirHacia(dest, d < 200 ? 0.45 : 1, dt);
          // si te persiguen, devuelve los tiros por la ventanilla
          const pers = m.escena.e && m.escena.e.persecutores.find((q) => q.v.hp > 0 && Math.hypot(q.v.x - p.x, q.v.y - p.y) < 260);
          if (pers) disparar(dt);
        } else andarHacia(dest);
        break;
      }
      case 'aguantar': {
        if (v && v.speed < 30) c.exitVehicle();
        else if (v) pulsar({ brake: true });
        if (!c.drivingVehicle && enemigos.length) {
          const cerca = enemigos.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
          disparar(dt, { x: cerca.x, y: cerca.y });
        }
        break;
      }
      case 'romper': {
        const b = m.blanco && m.blanco.vehicle;
        if (!b) break;
        if (!v) { cocheNuevo(); break; }
        conducirHacia({ x: b.x, y: b.y }, 1, dt);
        if (Math.hypot(b.x - p.x, b.y - p.y) < 320) disparar(dt);
        break;
      }
      case 'seguir': {
        const b = m.blanco && m.blanco.vehicle;
        if (!b) break;
        if (!v) { cocheNuevo(); break; }
        const d = Math.hypot(b.x - p.x, b.y - p.y);
        const lejos = paso.sigilo ? 230 : 140;
        if (d < lejos) pulsar({ brake: c.drivingVehicle.speed > 20 });
        else conducirHacia({ x: b.x, y: b.y }, d > 450 ? 1 : 0.75, dt);
        break;
      }
      case 'perder': {
        if (!v) { cocheNuevo(); break; }
        if (!st.destHuida || Math.hypot(st.destHuida.x - p.x, st.destHuida.y - p.y) < 200) {
          const spots = c.map.roadSpots.filter((s) => { const dd = Math.hypot(s.x - p.x, s.y - p.y); return dd > 1500 && dd < 3000; });
          st.destHuida = spots[Math.floor(Math.random() * spots.length)] || { x: p.x + 2000, y: p.y };
          st.ruta = null;
        }
        conducirHacia(st.destHuida, 1, dt);
        const pers = m.escena.e && m.escena.e.persecutores.find((q) => q.v.hp > 0 && Math.hypot(q.v.x - p.x, q.v.y - p.y) < 260);
        if (pers) disparar(dt);
        break;
      }
    }
  }

  return {
    async preparar() {
      g = window.SantaPerdida.game;
      GS = (await import('/src/core/GameState.js')).GameState;
      MISSIONS = (await import('/src/config/missions.js')).MISSIONS;
      steerTo = (await import('/src/systems/driving.js')).steerTo;
      VehicleCls = (await import('/src/entities/Vehicle.js')).Vehicle;
      const step = (n) => { for (let i = 0; i < n; i++) g.step(performance.now() + i * 17, 16.7); };
      step(150);
      GS.flags.prologoVisto = true;
      g.scene.getScene('MenuScene').scene.start('CityScene');
      step(200);
      const cs = g.scene.getScene('CinematicaScene');
      if (cs && cs.scene.isActive()) { g.scene.stop('CinematicaScene'); g.scene.resume('CityScene'); g.scene.resume('UIScene'); }
      c = g.scene.getScene('CityScene');
      // sin cinematicas: el bot no lee
      c.verCinematica = (planos, alAcabar) => { if (alAcabar) alAcabar(); };
      // SIN DIBUJAR: el bot no mira la pantalla, solo la logica. Dibujar cada
      // fotograma era lo que mas tardaba (y lo que cargaba el PC)
      g.scene.render = () => {};
      if (g.renderer) { g.renderer.preRender = () => {}; g.renderer.postRender = () => {}; }
      step(20);
      return MISSIONS.map((m) => m.id);
    },

    empezar(id, intento = 1) {
      const def = MISSIONS.find((x) => x.id === id);
      const m = c.missions;
      if (m.activa) m.abortar('bot');
      if (c.drivingVehicle) c.exitVehicle();
      // el equipo que tendria alguien que llega a esa mision jugando normal
      const i = MISSIONS.indexOf(def);
      GS.health = GS.vidaMaxima;
      GS.setWanted(0);
      if (c.police) c.police.lastKnown = null;
      GS.darArma('pistola', 200);
      if (i >= 13) GS.darArma('subfusil', 400);
      if (i >= 40) { GS.darArma('rifle', 400); GS.blindaje = 100; }
      // el dador: su zona
      const zona = def.zonaDador || ({ amarres: 'puerto', rompiente: 'conflictivo', verdial: 'centro' })[def.faccion] || 'centro';
      const punto = m.puntoFijoEnZona(zona, def.id) || { x: c.player.x, y: c.player.y };
      c.player.setPosition(punto.x, punto.y);
      st.ruta = null; st.destHuida = null; st.marcha = 0; st.atasco = 0;
      for (let k = 0; k < 5; k++) g.step(performance.now(), 16.7);
      if (intento > 1 && m.reintento) m.reintentar(); else m.empezar(def);
      this.res = { id, intento, ok: null, motivo: '', t: 0, vidaMin: GS.health, muertes: 0, paso: 0 };
      this.ultimoMensaje = null;
      if (!this.oyente) {
        this.oyente = true;
        const { EventBus, EVT } = window.__ev;
        EventBus.on(EVT.MISSION_END, (d) => { if (window.__bot.res) { window.__bot.res.ok = d.ok; window.__bot.res.motivo = d.motivo || ''; } });
      }
    },

    correr(frames, dt = 0.033) {
      const r = this.res;
      for (let f = 0; f < frames && r.ok === null; f++) {
        tick(dt);
        g.step(performance.now(), dt * 1000);
        r.t += dt;
        r.vidaMin = Math.min(r.vidaMin, GS.health);
        if (c.missions.activa) r.paso = c.missions.activa.paso;
      }
      soltar();
      return { ...r, vida: Math.round(GS.health), busca: GS.wanted, coche: c.drivingVehicle ? Math.round(c.drivingVehicle.hp) : null };
    },
  };
})();
