// El sonido se sintetiza en el navegador, pero si hay ficheros en /audio se
// usan ESOS en su lugar: un motor grabado de verdad no hay sintetizador que
// lo iguale. Ver SONIDOS-QUE-BAJAR.txt para la lista y los nombres exactos.
// Si el fichero no esta, el juego suena igual que antes y no falla nada.
// El navegador no deja arrancar el sonido sin que el jugador toque algo,
// asi que start() se llama con la primera tecla o el primer clic.

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

class GameAudio {
  constructor() {
    this.ctx = null;
    this.started = false;
    this.muted = false;
    this.volume = 0.13;
  }

  start() {
    if (this.started) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;

    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.master.connect(this.ctx.destination);

    this.noise = this._makeNoise();
    this.muestras = {};
    this.cargarMuestras();
    this._buildEngine();
    this._buildSkid();
    this._buildSiren();
    this.started = true;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.started) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
    return this.muted;
  }

  _makeNoise() {
    const len = Math.floor(this.ctx.sampleRate * 1.5);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  // EL MOTOR. Antes era un zumbido de dos osciladores que subia de tono en
  // linea recta con la velocidad: sonaba a mosca, no a coche. Un motor de
  // verdad tiene VARIOS armonicos de la frecuencia de encendido, aire
  // (ruido filtrado) y, sobre todo, MARCHAS: las vueltas suben, cambia y
  // caen de golpe. Eso es lo que se oye como "de menos a mas".
  // Carga lo que haya en /audio. La lista viene de audio/lista.json para no
  // pedir ficheros que no existen y llenar la consola de errores: esa lista
  // la rehace `node herramientas/actualizar-audio.js` al meter sonidos.
  async cargarMuestras() {
    let nombres = [];
    try {
      const res = await fetch('audio/lista.json');
      if (!res.ok) return;
      nombres = await res.json();
    } catch (e) {
      return;
    }

    const CLAVES = {
      'motor-1.mp3': 'motor-1',
      'motor-2.mp3': 'motor-2',
      'motor-3.mp3': 'motor-3',
      'motor-4.mp3': 'motor-4',
      'motor-moto.mp3': 'motor-moto',
      'frenada.mp3': 'frenada',
      'choque.mp3': 'choque',
      'disparo-pistola.mp3': 'pistola',
      'disparo-escopeta.mp3': 'escopeta',
      'disparo-rifle.mp3': 'rifle',
      'disparo-sniper.mp3': 'sniper',
      'punetazo.mp3': 'golpe',
    };
    for (const nombre of nombres) {
      const clave = CLAVES[nombre];
      if (!clave) continue;
      try {
        const res = await fetch(`audio/${nombre}`);
        if (!res.ok) continue;
        this.muestras[clave] = await this.ctx.decodeAudioData(await res.arrayBuffer());
      } catch (e) { /* si falla uno, el resto sigue */ }
    }
  }
  // El motor grabado se reproduce EN BUCLE y se le cambia la velocidad de
  // reproduccion segun las vueltas: asi suenan los motores en los juegos de
  // coches desde siempre, y con la caja de cambios de aqui da el subir y
  // bajar de verdad. Cada vehiculo tiene su grabacion y su tono, asi que una
  // furgoneta y un deportivo no se parecen en nada.
  _ponerMotor(clave) {
    if (this.motorClave === clave) return;
    if (this.motorFuente) {
      try { this.motorFuente.stop(); } catch (e) { /* ya parado */ }
      this.motorFuente.disconnect();
      this.motorFuente = null;
    }
    this.motorClave = clave;
    const buf = this.muestras[clave];
    if (!buf) return;

    if (!this.motorGain) {
      this.motorGain = this.ctx.createGain();
      this.motorGain.gain.value = 0;
      this.motorGain.connect(this.master);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(this.motorGain);
    src.start();
    this.motorFuente = src;
  }
  // suena una muestra suelta, con un poco de variacion de tono
  soltar(clave, volumen = 1, tono = 1) {
    const buf = this.muestras[clave];
    if (!buf) return false;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = tono * (0.94 + Math.random() * 0.12);
    const g = this.ctx.createGain();
    g.gain.value = volumen;
    src.connect(g);
    g.connect(this.master);
    src.start();
    return true;
  }

  _buildEngine() {
    const ctx = this.ctx;
    this.engGain = ctx.createGain();
    this.engGain.gain.value = 0;

    this.engFilter = ctx.createBiquadFilter();
    this.engFilter.type = 'lowpass';
    this.engFilter.frequency.value = 420;
    this.engFilter.Q.value = 1.4;

    // tres armonicos: el cuerpo, el timbre y el zumbido de arriba
    this.osc1 = ctx.createOscillator();
    this.osc1.type = 'sawtooth';
    this.osc1.frequency.value = 50;

    this.osc2 = ctx.createOscillator();
    this.osc2.type = 'square';
    this.osc2.frequency.value = 25;

    this.osc3 = ctx.createOscillator();
    this.osc3.type = 'sawtooth';
    this.osc3.frequency.value = 150;

    this.subGain = ctx.createGain();
    this.subGain.gain.value = 0.5;
    this.osc2.connect(this.subGain);

    this.armGain = ctx.createGain();
    this.armGain.gain.value = 0.12;
    this.osc3.connect(this.armGain);
    this.engWave = 'sawtooth';

    // el aire del escape: ruido pasado por un paso banda que se abre con las
    // vueltas. Es lo que quita la sensacion de sintetizador barato.
    const aire = ctx.createBufferSource();
    aire.buffer = this.noise;
    aire.loop = true;
    this.aireFiltro = ctx.createBiquadFilter();
    this.aireFiltro.type = 'bandpass';
    this.aireFiltro.frequency.value = 500;
    this.aireFiltro.Q.value = 0.9;
    this.aireGain = ctx.createGain();
    this.aireGain.gain.value = 0;
    aire.connect(this.aireFiltro);
    this.aireFiltro.connect(this.aireGain);
    this.aireGain.connect(this.engGain);
    aire.start();

    this.osc1.connect(this.engFilter);
    this.subGain.connect(this.engFilter);
    this.armGain.connect(this.engFilter);
    this.engFilter.connect(this.engGain);
    this.engGain.connect(this.master);

    this.osc1.start();
    this.osc2.start();
    this.osc3.start();

    this.marcha = 0;
    this.vueltas = 0;
  }
  _buildSkid() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;

    this.skidFilter = ctx.createBiquadFilter();
    this.skidFilter.type = 'bandpass';
    this.skidFilter.frequency.value = 1900;
    this.skidFilter.Q.value = 1.4;

    this.skidGain = ctx.createGain();
    this.skidGain.gain.value = 0;

    src.connect(this.skidFilter);
    this.skidFilter.connect(this.skidGain);
    this.skidGain.connect(this.master);
    src.start();
  }

  // Sirena: dos tonos que se alternan, como una de verdad. Suena mas fuerte
  // cuanto mas cerca tienes a la patrulla, asi que te avisa de por donde
  // vienen aunque no los veas en pantalla.
  _buildSiren() {
    const ctx = this.ctx;
    this.sirGain = ctx.createGain();
    this.sirGain.gain.value = 0;

    const filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = 2100;

    this.sirOsc = ctx.createOscillator();
    this.sirOsc.type = 'square';
    this.sirOsc.frequency.value = 620;

    this.sirOsc.connect(filtro);
    filtro.connect(this.sirGain);
    this.sirGain.connect(this.master);
    this.sirOsc.start();
  }

  siren(level) {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    const l = clamp(level, 0, 1);
    this.sirGain.gain.setTargetAtTime(l * 0.055, t, 0.12);
    if (l <= 0) return;
    const alto = Math.floor(t * 2.4) % 2 === 0;
    this.sirOsc.frequency.setTargetAtTime(alto ? 760 : 570, t, 0.015);
  }

  // perfil = uno de ENGINES. Al ralenti suena muy bajito y va creciendo con
  // la velocidad, en volumen y en tono a la vez.
  // Cinco marchas. Dentro de cada una las vueltas van de 0,25 a 1 y al saltar
  // a la siguiente caen de golpe: ese diente de sierra es el sonido de un
  // coche acelerando, y sin el todo suena igual a 20 que a 120.
  _vueltasDe(r) {
    const MARCHAS = 5;
    const tramo = 1 / MARCHAS;
    const marcha = Math.min(MARCHAS - 1, Math.floor(r / tramo));
    const dentro = (r - marcha * tramo) / tramo;
    // las marchas largas de arriba estiran menos que las cortas de abajo
    const alto = 0.34 + 0.66 * Math.pow(dentro, 0.8);
    return { marcha, vueltas: marcha === 0 ? 0.2 + dentro * 0.8 : alto };
  }

  engine(on, ratio, throttle, perfil = null) {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    const r = clamp(ratio, 0, 1);
    const p = perfil || { base: 46, range: 155, wave: 'sawtooth', body: 0.5, bright: 2300, vol: 1 };

    // con el motor grabado, el sintetizado se calla y manda la muestra
    const perfilMuestra = perfil && perfil.muestra;
    if (perfilMuestra && this.muestras[perfilMuestra]) {
      this._ponerMotor(perfilMuestra);
      const t2 = this.ctx.currentTime;
      const r2 = clamp(ratio, 0, 1);
      const caja2 = this._vueltasDe(r2);
      const tono = (perfil.tono || 1) * (0.62 + caja2.vueltas * 1.25);
      this.motorFuente.playbackRate.setTargetAtTime(tono, t2, 0.06);
      this.motorGain.gain.setTargetAtTime(
        on ? (0.3 + caja2.vueltas * 0.45) * (perfil.vol || 1) : 0, t2, 0.08
      );
      if (this.engGain) this.engGain.gain.setTargetAtTime(0, t2, 0.1);
      if (this.aireGain) this.aireGain.gain.setTargetAtTime(0, t2, 0.1);
      return;
    }
    if (this.motorGain) this.motorGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    if (this.engWave !== p.wave) {
      this.engWave = p.wave;
      this.osc1.type = p.wave;
    }

    const caja = this._vueltasDe(r);
    const cambio = caja.marcha !== this.marcha;
    this.marcha = caja.marcha;
    const rpm = caja.vueltas;

    // al cambiar de marcha se levanta el pie un instante: el motor se apaga
    // un poco y vuelve. Es un detalle pequeño que se nota mucho.
    const corte = cambio ? 0.55 : 1;
    const level = on ? (0.011 + rpm * 0.031 + (throttle ? 0.008 : 0)) * p.vol * corte : 0;
    this.engGain.gain.setTargetAtTime(level, t, cambio ? 0.02 : 0.07);
    this.subGain.gain.setTargetAtTime(p.body, t, 0.12);
    this.armGain.gain.setTargetAtTime(0.05 + rpm * 0.16, t, 0.09);

    const freq = p.base + rpm * p.range;
    const suavizado = cambio ? 0.02 : 0.05;
    this.osc1.frequency.setTargetAtTime(freq, t, suavizado);
    this.osc2.frequency.setTargetAtTime(freq * 0.5, t, suavizado);
    this.osc3.frequency.setTargetAtTime(freq * 3, t, suavizado);

    this.engFilter.frequency.setTargetAtTime(
      300 + rpm * p.bright + (throttle ? 340 : 0), t, 0.08
    );
    // el aire solo se oye de verdad cuando el coche va lanzado
    this.aireGain.gain.setTargetAtTime(on ? 0.05 + r * 0.5 : 0, t, 0.12);
    this.aireFiltro.frequency.setTargetAtTime(340 + r * 1900, t, 0.1);
  }
  skid(amount) {
    if (!this.started) return;
    const a = clamp(amount, 0, 1);

    // con grabacion, la frenada se dispara al empezar a derrapar y no se
    // repite hasta que el coche deja de hacerlo: en bucle sonaba a sierra
    if (this.muestras.frenada) {
      if (a > 0.45 && !this.derrapando) {
        this.derrapando = true;
        this.soltar('frenada', 0.5);
      } else if (a < 0.2) {
        this.derrapando = false;
      }
      this.skidGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      return;
    }
    this.skidGain.gain.setTargetAtTime(a * 0.07, this.ctx.currentTime, 0.05);
    this.skidFilter.frequency.setTargetAtTime(1500 + a * 900, this.ctx.currentTime, 0.08);
  }

  crash(intensity) {
    if (!this.started) return;
    if (this.soltar('choque', clamp(intensity, 0.15, 1) * 0.9)) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const a = clamp(intensity, 0.15, 1);

    const thump = ctx.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(60 + 120 * a, t);
    thump.frequency.exponentialRampToValueAtTime(38, t + 0.28);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.45 * a, t);
    tg.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    thump.connect(tg);
    tg.connect(this.master);
    thump.start(t);
    thump.stop(t + 0.32);

    const metal = ctx.createBufferSource();
    metal.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1100 + 900 * a;
    bp.Q.value = 0.9;
    const mg = ctx.createGain();
    mg.gain.setValueAtTime(0.3 * a, t);
    mg.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    metal.connect(bp);
    bp.connect(mg);
    mg.connect(this.master);
    metal.start(t);
    metal.stop(t + 0.26);
  }

  notes(freqs, step = 0.09, type = 'triangle', gain = 0.16) {
    if (!this.started) return;
    const ctx = this.ctx;
    freqs.forEach((f, i) => {
      const t = ctx.currentTime + i * step;
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + step + 0.16);
      osc.connect(g);
      g.connect(this.master);
      osc.start(t);
      osc.stop(t + step + 0.2);
    });
  }

  pickup() { this.notes([523.25, 659.25], 0.07); }
  delivered() { this.notes([523.25, 659.25, 783.99], 0.085); }
  newJob() { this.notes([392, 523.25], 0.1); }
}

export const Audio = new GameAudio();
