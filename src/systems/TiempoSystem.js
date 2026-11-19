import { EventBus } from '../core/EventBus.js';

// EL TIEMPO QUE HACE (19-nov-2026), como en los GTA: casi siempre despejado,
// a veces llueve y alguna vez hay tormenta. No va por la hora: cambia cada
// 4-8 minutos reales, con su rampa (la lluvia empieza floja y va cogiendo).
//
//   intensidad 0..1   lo que llueve. La lee UIScene (las gotas y el gris del
//                     cielo) y CityScene se la pasa al coche: con lluvia agarra
//                     menos y frena peor (Vehicle.update, input.lluvia)
//   tormenta          ademas, relampagos de vez en cuando (evento 'tiempo:rayo')
//
// Al cambiar avisa con 'tiempo:cambio' (lo cuenta Marejada FM).

const ESTADOS = [
  { clave: 'despejado', peso: 0.62, objetivo: 0 },
  { clave: 'nublado', peso: 0.14, objetivo: 0.08 },
  { clave: 'lluvia', peso: 0.16, objetivo: 0.6 },
  { clave: 'tormenta', peso: 0.08, objetivo: 1 },
];

export class TiempoSystem {
  constructor() {
    this.estado = ESTADOS[0];
    this.intensidad = 0;
    this.t = 150 + Math.random() * 120;   // el primer cambio, a los 2,5-4,5 min
    this.tRayo = 8;
  }

  get lloviendo() { return this.intensidad > 0.15; }

  update(dt) {
    this.t -= dt;
    if (this.t <= 0) {
      this.t = 240 + Math.random() * 240;
      const antes = this.estado.clave;
      let r = Math.random();
      for (const e of ESTADOS) { r -= e.peso; if (r <= 0) { this.estado = e; break; } }
      if (this.estado.clave !== antes) EventBus.emit('tiempo:cambio', { antes, ahora: this.estado.clave });
    }
    // la rampa: unos 25 s para llegar a lo que toca
    const obj = this.estado.objetivo;
    const paso = dt / 25;
    this.intensidad += Math.max(-paso, Math.min(paso, obj - this.intensidad));

    if (this.estado.clave === 'tormenta' && this.intensidad > 0.6) {
      this.tRayo -= dt;
      if (this.tRayo <= 0) {
        this.tRayo = 7 + Math.random() * 14;
        EventBus.emit('tiempo:rayo');
      }
    }
  }
}
