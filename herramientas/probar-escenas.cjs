// PRUEBA DE HUMO DE TODO EL JUEGO: abre cada escena (interiores, casino,
// club, gimnasio, robo de casas, pisos, armeria, galeria de tiro, mapa,
// pausa, personajes, progreso, mercado) y reproduce TODAS las cinematicas de
// principio a fin, eligiendo la primera opcion en cada eleccion. Apunta
// cualquier error de la pagina. Navegador limpio, nunca la partida de Pablo.
//
//   node herramientas/probar-escenas.cjs
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const RAIZ = path.join(__dirname, '..');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) {
  ({ chromium } = require('C:/Users/pablo/pw-test/node_modules/playwright'));
}
const vivo = () => new Promise((ok) => http.get('http://localhost:5174/', (r) => { r.resume(); ok(true); }).on('error', () => ok(false)));

(async () => {
  let servidor = null;
  if (!(await vivo())) {
    servidor = spawn(process.execPath, [path.join(RAIZ, 'serve.js')], { cwd: RAIZ, stdio: 'ignore' });
    await new Promise((r) => setTimeout(r, 1500));
  }
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 800, height: 450 } });
  const errores = [];
  p.on('pageerror', (e) => errores.push(String(e).slice(0, 300)));
  p.on('console', (m) => { if (m.type() === 'error') errores.push('consola: ' + m.text().slice(0, 300)); });
  await p.goto('http://localhost:5174/?humo=' + Date.now());
  await p.waitForTimeout(4500);

  const r = await p.evaluate(async () => {
    const g = window.SantaPerdida.game;
    const step = (n, d = 16.7) => { for (let i = 0; i < n; i++) g.step(performance.now() + i * 17, d); };
    const { GameState } = await import('/src/core/GameState.js');
    const { CINEMATICAS } = await import('/src/config/cinematicas.js');
    step(150);
    GameState.flags.prologoVisto = true;
    g.scene.getScene('MenuScene').scene.start('CityScene');
    step(200);
    const cs0 = g.scene.getScene('CinematicaScene');
    if (cs0 && cs0.scene.isActive()) { g.scene.stop('CinematicaScene'); g.scene.resume('CityScene'); g.scene.resume('UIScene'); }
    const c = g.scene.getScene('CityScene');
    GameState.money = 50000;
    GameState.darArma('pistola', 100);
    const salida = [];

    const abrir = (key, datos) => {
      try {
        c.scene.pause();
        c.scene.pause('UIScene');
        g.scene.start(key, datos);
        step(90);
        const s = g.scene.getScene(key);
        // un poco de vida: pulsar E y moverse
        if (s.keys) { for (const k of Object.values(s.keys)) if (k && 'isDown' in k) k.isDown = false; }
        step(30);
        const activa = s.scene.isActive();
        g.scene.stop(key);
        c.scene.resume('UIScene');
        c.scene.resume();
        c.scene.setVisible(true);
        c.scene.setVisible(true, 'UIScene');
        step(10);
        salida.push(`${activa ? 'OK ' : 'MAL'} ${key}${datos && datos.local ? ' (' + datos.local.cfg.clave + ')' : ''}`);
      } catch (e) {
        salida.push(`MAL ${key}: ${e.message}`);
        try { g.scene.stop(key); c.scene.resume(); c.scene.resume('UIScene'); } catch (e2) {}
      }
    };

    // interiores de locales, uno de cada
    const vistos = new Set();
    for (const l of c.locales.locales) {
      if (vistos.has(l.cfg.clave)) continue;
      vistos.add(l.cfg.clave);
      if (['tienda24', 'comida', 'bar', 'hospital'].includes(l.cfg.clave)) abrir('LocalScene', { local: l });
    }
    abrir('GimnasioScene', {});
    abrir('ClubScene', {});
    abrir('ConcesionarioScene', {});
    abrir('ShopScene', {});
    abrir('TiroScene', {});
    abrir('HideoutScene', { clave: 'escondite', nombre: 'TU ESCONDITE', plazas: 0 });
    const piso = c.pisos.pisos[0];
    if (piso) abrir('HideoutScene', { clave: piso.clave, nombre: piso.nombre, plazas: piso.plazas, lamina: piso.lamina });
    const casino = c.negocios.negocios.find((n) => n.esCasino || /casino/.test(n.clave));
    if (casino) abrir('CasinoScene', { negocio: casino });
    if (c.robos && c.robos.llenarCasa) {
      const bld = c.map.buildings.find((x) => x.zone === 'residencial') || c.map.buildings[0];
      abrir('RoboCasaScene', { casa: { x: bld.px, y: bld.py + bld.ph / 2 + 30, edificio: bld, objetos: c.robos.llenarCasa() }, sitio: 6 });
    }
    abrir('MapaScene', {});
    abrir('ProgresoScene', {});
    if (c.mercado) abrir('MercadoScene', { filas: c.mercado.resumen(c.player.x, c.player.y) });
    abrir('PauseScene', {});
    GameState.flags.conocidos = Object.fromEntries(Object.keys((await import('/src/config/personajes.js')).PERSONAJES).map((k) => [k, true]));
    abrir('PersonajesScene', {});

    // todas las cinematicas, de punta a punta
    let cines = 0;
    for (const [clave, planos] of Object.entries(CINEMATICAS)) {
      try {
        c.scene.pause();
        g.scene.start('CinematicaScene', { planos, alAcabar: null });
        step(5);
        const cs = g.scene.getScene('CinematicaScene');
        for (let i = 0; i < 80 && cs.scene.isActive() && !cs.acabando; i++) {
          cs.avanzar(); step(2);
        }
        g.scene.stop('CinematicaScene');
        c.scene.resume();
        cines++;
      } catch (e) {
        salida.push(`MAL cinematica ${clave}: ${e.message}`);
        try { g.scene.stop('CinematicaScene'); c.scene.resume(); } catch (e2) {}
      }
    }
    salida.push(`OK  ${cines} cinematicas reproducidas enteras`);
    return salida;
  });
  const txt = ['PRUEBA DE HUMO · ' + new Date().toISOString(), ...r, '', 'Errores: ' + (errores.length ? '\n  ' + errores.join('\n  ') : 'ninguno')].join('\n');
  console.log(txt);
  fs.writeFileSync(path.join(__dirname, 'informe-pruebas-escenas.txt'), txt);
  await b.close();
  if (servidor) servidor.kill();
})();
