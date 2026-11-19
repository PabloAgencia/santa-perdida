// PRUEBA AUTOMATICA DE LAS MISIONES: el bot (bot-misiones.js) juega cada una
// y se apunta si se puede pasar, cuantas veces muere y cuanta vida le queda.
//
//   node herramientas/probar-misiones.cjs                 todas
//   node herramientas/probar-misiones.cjs golpe-de-mano,papeles
//
// Usa Playwright con un navegador limpio (NUNCA la partida de Pablo) y el
// servidor de siempre en el 5174 (lo arranca si no esta). Deja el informe en
// herramientas/informe-pruebas-misiones.txt.
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

const RAIZ = path.join(__dirname, '..');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) {
  ({ chromium } = require('C:/Users/pablo/pw-test/node_modules/playwright'));
}

const INTENTOS = 3;

function vivo() {
  return new Promise((ok) => {
    http.get('http://localhost:5174/', (r) => { r.resume(); ok(true); }).on('error', () => ok(false));
  });
}

(async () => {
  let servidor = null;
  if (!(await vivo())) {
    servidor = spawn(process.execPath, [path.join(RAIZ, 'serve.js')], { cwd: RAIZ, stdio: 'ignore' });
    await new Promise((r) => setTimeout(r, 1500));
  }
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 800, height: 450 } });
  const errores = [];
  p.on('pageerror', (e) => errores.push(String(e)));
  await p.goto('http://localhost:5174/?bot=' + Date.now());
  await p.waitForTimeout(4500);
  await p.addScriptTag({ content: fs.readFileSync(path.join(__dirname, 'bot-misiones.js'), 'utf8') });
  await p.evaluate(async () => { window.__ev = await import('/src/core/EventBus.js'); });
  const todas = await p.evaluate(() => window.__bot.preparar());
  const { MISSIONS } = await import('file:///' + path.join(RAIZ, 'src/config/missions.js').replace(/\\/g, '/'));

  const pedidas = process.argv[2] && process.argv[2] !== 'todas' ? process.argv[2].split(',') : todas;
  const filas = [];
  for (const id of pedidas) {
    const def = MISSIONS.find((m) => m.id === id);
    if (!def) { console.log('no existe', id); continue; }
    const limite = def.pasos.reduce((s, x) => s + (x.limite || 60), 0) + 150;
    let fila = null;
    for (let intento = 1; intento <= INTENTOS; intento++) {
      await p.evaluate(([i, n]) => window.__bot.empezar(i, n), [id, intento]);
      let r;
      do {
        r = await p.evaluate(() => window.__bot.correr(450));
      } while (r.ok === null && r.t < limite);
      if (r.ok === null) { r.motivo = 'el bot no lo acaba (atascado o sin tiempo)'; r.ok = false; }
      fila = { id, intento, ok: r.ok, motivo: r.motivo, t: Math.round(r.t), vidaMin: Math.round(r.vidaMin), vida: r.vida, paso: r.paso + 1, pasos: def.pasos.length };
      console.log(`${r.ok ? 'OK ' : 'MAL'} ${id} intento ${intento} · ${fila.t}s · vida min ${fila.vidaMin} · ${r.motivo || ''} (paso ${fila.paso}/${fila.pasos})`);
      if (r.ok) break;
    }
    filas.push(fila);
  }

  const txt = [
    'PRUEBA AUTOMATICA DE MISIONES · ' + new Date().toISOString(),
    'El bot juega cada mision (hasta ' + INTENTOS + ' intentos, el 2o y 3o con R desde el punto de control).',
    '',
    ...filas.map((f) => `${f.ok ? 'OK ' : 'MAL'}  ${f.id.padEnd(32)} intento ${f.intento}  ${String(f.t).padStart(4)} s  vida min ${String(f.vidaMin).padStart(3)}  ${f.ok ? '' : f.motivo + ' (paso ' + f.paso + '/' + f.pasos + ')'}`),
    '',
    'Errores de la pagina: ' + (errores.length ? errores.slice(0, 10).join(' | ') : 'ninguno'),
  ].join('\n');
  fs.writeFileSync(path.join(__dirname, 'informe-pruebas-misiones.txt'), txt);
  console.log('\n' + txt);
  await b.close();
  if (servidor) servidor.kill();
})();
