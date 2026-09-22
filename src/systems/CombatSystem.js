import { ARMAS, COMBATE, ORDEN_ARMAS } from '../config/weapons.js';
import { ENTRENAR } from '../config/balance.js';
import { GameState } from '../core/GameState.js';
import { EventBus, EVT } from '../core/EventBus.js';
import { Audio } from '../core/Audio.js';

// Pelear y disparar en vista cenital.
//
// Aqui NO se apunta con el raton. Se FIJA al enemigo mas cercano que tengas
// por delante y le disparas a el; con una tecla cambias de objetivo. Es como
// lo resolvio Chinatown Wars, que es el unico GTA con esta misma camara, y es
// lo unico que funciona: apuntar a mano desde arriba es un sufrimiento.

export class CombatSystem {
  constructor(scene) {
    this.scene = scene;
    this.objetivo = null;
    this.espera = 0;          // tiempo hasta poder volver a atacar
    this.ultimoDisparo = 0;

    // el aro que marca a quien tienes fijado
    this.marca = scene.add.image(0, 0, 'ring')
      .setDisplaySize(34, 34).setTint(0xd9584a).setAlpha(0.9)
      .setVisible(false).setDepth(9000);
    this.barraFondo = scene.add.image(0, 0, 'px')
      .setDisplaySize(30, 4).setTint(0x1b1f25).setVisible(false).setDepth(9001);
    this.barraVida = scene.add.image(0, 0, 'px')
      .setDisplaySize(30, 4).setTint(0xd9584a).setVisible(false).setDepth(9002);

    this.destellos = [];
  }

  get arma() {
    return ARMAS[GameState.armaActual] || ARMAS.puno;
  }

  // ---------- a quien le doy ----------

  // Todo lo que puede recibir un golpe: gente de la calle y agentes a pie.
  candidatos() {
    const lista = [];
    for (const p of this.scene.npcs.people) {
      if (!p.down && !p.enCoche) lista.push({ ente: p, tipo: 'persona' });
    }
    for (const u of this.scene.police.units) {
      for (const o of u.officers) {
        if (!o.down) lista.push({ ente: o, tipo: 'policia' });
      }
    }
    return lista;
  }

  // El mas cercano DENTRO DEL CONO que tienes delante. Si no hay nadie
  // delante, vale cualquiera pero solo si lo tienes pegado: asi no disparas
  // a alguien que esta a tu espalda sin querer.
  buscarObjetivo(player) {
    const arma = this.arma;
    let mejor = null;
    let mejorDist = Infinity;

    for (const { ente } of this.candidatos()) {
      const dx = ente.x - player.x;
      const dy = ente.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > arma.alcance) continue;

      const diff = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - player.angle));
      const delante = diff <= COMBATE.conoFijado;
      if (!delante && dist > COMBATE.alcanceCortoAlrededor) continue;

      // se prefiere a quien tienes justo delante
      const peso = dist * (delante ? 1 : 2.2);
      if (peso < mejorDist) {
        mejorDist = peso;
        mejor = ente;
      }
    }
    return mejor;
  }

  // pasar al siguiente, para cuando te rodean
  siguienteObjetivo(player) {
    const lista = this.candidatos()
      .map(({ ente }) => ente)
      .filter((e) => Phaser.Math.Distance.Between(e.x, e.y, player.x, player.y) <= this.arma.alcance)
      .sort((a, b) => Phaser.Math.Distance.Between(a.x, a.y, player.x, player.y)
        - Phaser.Math.Distance.Between(b.x, b.y, player.x, player.y));
    if (lista.length === 0) return null;
    const i = lista.indexOf(this.objetivo);
    this.objetivo = lista[(i + 1) % lista.length];
    return this.objetivo;
  }

  // ---------- atacar ----------

  atacar(player, enMovimiento) {
    if (this.espera > 0) return false;
    const arma = this.arma;

    if (!GameState.puedeDisparar()) {
      EventBus.emit(EVT.NOTIFY, { text: 'Sin munición', tone: 'danger' });
      this.espera = 0.4;
      return false;
    }

    this.espera = arma.cadencia;
    const objetivo = this.objetivo && !this.objetivo.down ? this.objetivo : this.buscarObjetivo(player);

    if (arma.cuerpo) return this.golpear(player, objetivo, arma);
    return this.disparar(player, objetivo, arma, enMovimiento);
  }

  golpear(player, objetivo, arma) {
    // el brazo sale, pegues o falles: fallar tambien se ve
    if (player.golpe) player.golpe();

    // el musculo se nota en los puños y en el bate
    const extra = (GameState.atributo('musculo') / 100) * arma.dano * COMBATE.danoExtraPorMusculo;
    const dano = arma.dano + extra;

    if (!objetivo || Phaser.Math.Distance.Between(objetivo.x, objetivo.y, player.x, player.y) > arma.alcance) {
      Audio.notes([180], 0.05, 'triangle', 0.05);   // golpe al aire
      return false;
    }
    this.aplicar(objetivo, dano, player, true);
    GameState.subirAtributo('musculo', ENTRENAR.musculoPorGolpe);
    if (!Audio.soltar('golpe', 0.7)) Audio.crash(0.18);
    return true;
  }

  disparar(player, objetivo, arma, enMovimiento) {
    GameState.gastarBala(arma.clave, 1);

    // la punteria del personaje y estarse quieto cierran el tiro
    const punteria = GameState.atributo('punteria') / 100;
    let dispersion = arma.dispersion * (1 - punteria * COMBATE.mejoraPorPunteria);
    if (enMovimiento) dispersion *= COMBATE.penalizacionEnMovimiento;

    const balas = arma.balasPorDisparo || 1;
    let algunoDentro = false;

    for (let i = 0; i < balas; i++) {
      const desvio = Phaser.Math.DegToRad((Math.random() - 0.5) * 2 * dispersion);
      const angulo = objetivo
        ? Math.atan2(objetivo.y - player.y, objetivo.x - player.x) + desvio
        : player.angle + desvio;

      const impacto = this.trazarBala(player, angulo, arma);
      if (impacto.ente) {
        this.aplicar(impacto.ente, arma.dano, player, false);
        algunoDentro = true;
      }
      this.pintarDisparo(player, impacto.x, impacto.y);
    }

    if (algunoDentro) GameState.subirAtributo('punteria', ENTRENAR.punteriaPorAcierto);
    // cada arma con su disparo grabado; si no hay fichero, el ruido de antes
    if (!Audio.soltar(arma.sonido, arma.clave === 'sniper' ? 0.9 : 0.75)) {
      Audio.crash(arma.clave === 'escopeta' ? 0.5 : 0.3);
    }

    // Un tiro se oye y la gente sale corriendo. Pero la policia solo se
    // entera si queda alguien para contarlo: pegar un tiro en un callejon
    // vacio no deberia traerte una patrulla de la nada.
    this.scene.npcs.scare(player.x, player.y, arma.ruido || 500);
    if (this.hayTestigos(player, 300)) {
      this.scene.police.reportarCrimen(player.x, player.y, 1);
    }
    return true;
  }

  // La bala va en linea recta: se para en la primera pared o en el primero
  // al que le da. Nada de proyectiles con fisica, que aqui no hacen falta.
  trazarBala(player, angulo, arma) {
    const pasos = Math.ceil(arma.alcance / 8);
    const cos = Math.cos(angulo);
    const sin = Math.sin(angulo);
    const gente = this.candidatos();

    for (let i = 1; i <= pasos; i++) {
      const d = (i / pasos) * arma.alcance;
      const x = player.x + cos * d;
      const y = player.y + sin * d;

      if (this.scene.map.isSolidPoint(x, y)) return { x, y, ente: null };
      for (const { ente } of gente) {
        if (Math.hypot(ente.x - x, ente.y - y) < 11) return { x, y, ente };
      }
    }
    return { x: player.x + cos * arma.alcance, y: player.y + sin * arma.alcance, ente: null };
  }

  aplicar(ente, dano, player, deCerca) {
    const esPersona = typeof ente.recibirDano === 'function';
    if (!esPersona) return;

    const resultado = ente.recibirDano(
      dano, player.x, player.y, deCerca
    );
    if (resultado === 'muerto') {
      GameState.bumpStat('bajas', 1);
      this.soltarLoQueLlevaba(ente);
      // cargarse a alguien delante de testigos tiene su precio
      this.scene.police.reportarCrimen(ente.x, ente.y, ente.esPolicia ? 3 : 2);

      // CARGARSE AGENTES ESCALA. `reportarCrimen` PONE un nivel minimo, no
      // suma: sin esto te quedabas clavado en 3 por muchos que te llevaras
      // por delante, y las estrellas 4, 5 y 6 no se alcanzaban jugando.
      // Cada agente a partir de ahi suma uno.
      if (ente.esPolicia && GameState.wanted >= 3) GameState.raiseWanted(1);
      if (ente.faction && this.scene.factions) this.scene.factions.onMemberHurt(ente.faction);
    }
    if (this.objetivo === ente && ente.down) this.objetivo = null;
  }

  // Los de banda y los agentes van armados: al caer, el hierro se queda en
  // el suelo. Asi se consigue la primera pistola sin pasar por una tienda.
  soltarLoQueLlevaba(ente) {
    if (!this.scene.pickups) return;
    if (ente.esPolicia) {
      this.scene.pickups.soltarArma(ente.x, ente.y, 'pistola', 14);
    } else if (ente.armado) {
      // solo suelta hierro el que lo llevaba: si te ha estado disparando, ahi queda
      const clave = Math.random() < 0.25 ? 'escopeta' : 'pistola';
      this.scene.pickups.soltarArma(ente.x, ente.y, clave, clave === 'escopeta' ? 6 : 10);
    } else if (!ente.faction && Math.random() < 0.08) {
      this.scene.pickups.soltarArma(ente.x, ente.y, 'bate', 0);
    }
  }

  // ¿queda alguien de pie por aqui que pueda avisar?
  hayTestigos(player, radio) {
    for (const p of this.scene.npcs.people) {
      if (p.down || p.enCoche) continue;
      if (Phaser.Math.Distance.Between(p.x, p.y, player.x, player.y) < radio) return true;
    }
    return this.scene.police.units.some(
      (u) => Phaser.Math.Distance.Between(u.vehicle.x, u.vehicle.y, player.x, player.y) < radio * 2
    );
  }

  // ---------- cuando disparan ELLOS ----------

  // Un agente o un pandillero le pega un tiro al jugador. Usa el mismo
  // trazado que el del jugador, asi que las paredes paran las balas igual
  // para todos: nada de que a ti te frenen y a ellos no.
  disparoDeNPC(origen, objetivo, dano, alcance, dispersionGrados, sonido = 'pistola') {
    const base = Math.atan2(objetivo.y - origen.y, objetivo.x - origen.x);
    const desvio = Phaser.Math.DegToRad((Math.random() - 0.5) * 2 * dispersionGrados);
    const angulo = base + desvio;

    const cos = Math.cos(angulo);
    const sin = Math.sin(angulo);
    const pasos = Math.ceil(alcance / 8);
    let fin = { x: origen.x + cos * alcance, y: origen.y + sin * alcance };
    let acierto = false;

    for (let i = 1; i <= pasos; i++) {
      const d = (i / pasos) * alcance;
      const x = origen.x + cos * d;
      const y = origen.y + sin * d;
      if (this.scene.map.isSolidPoint(x, y)) { fin = { x, y }; break; }
      if (Math.hypot(objetivo.x - x, objetivo.y - y) < 11) {
        fin = { x, y };
        acierto = true;
        break;
      }
    }

    this.pintarDisparo(origen, fin.x, fin.y);
    if (!Audio.soltar(sonido, 0.45)) Audio.crash(0.22);
    if (acierto) {
      GameState.damage(dano, 'disparo');
      this.scene.cameras.main.shake(90, 0.003);
    }
    return acierto;
  }

  // ¿hay pared de por medio? sirve para que no disparen a ciegas
  veA(origen, objetivo, alcance) {
    const dist = Phaser.Math.Distance.Between(origen.x, origen.y, objetivo.x, objetivo.y);
    if (dist > alcance) return false;
    const pasos = Math.ceil(dist / 16);
    for (let i = 1; i < pasos; i++) {
      const t = i / pasos;
      const x = origen.x + (objetivo.x - origen.x) * t;
      const y = origen.y + (objetivo.y - origen.y) * t;
      if (this.scene.map.isSolidPoint(x, y)) return false;
    }
    return true;
  }

  // ---------- pintura ----------

  pintarDisparo(player, x, y) {
    const linea = this.scene.add.image(
      (player.x + x) / 2, (player.y + y) / 2, 'px'
    )
      .setDisplaySize(Math.hypot(x - player.x, y - player.y), 2)
      .setRotation(Math.atan2(y - player.y, x - player.x))
      .setTint(0xffe6a8)
      .setAlpha(0.85)
      .setDepth(8000);
    const chispa = this.scene.add.image(x, y, 'px')
      .setDisplaySize(5, 5).setTint(0xfff3d0).setDepth(8001);

    this.scene.tweens.add({
      targets: [linea, chispa], alpha: 0, duration: 110,
      onComplete: () => { linea.destroy(); chispa.destroy(); },
    });
  }

  // ---------- bucle ----------

  update(dt, player, aPie) {
    if (this.espera > 0) this.espera -= dt;

    if (!aPie) {
      this.objetivo = null;
      this.ocultarMarca();
      return;
    }

    // el objetivo se pierde si cae, se aleja o desaparece
    if (this.objetivo) {
      const fuera = this.objetivo.down ||
        Phaser.Math.Distance.Between(this.objetivo.x, this.objetivo.y, player.x, player.y) > this.arma.alcance * 1.15;
      if (fuera) this.objetivo = null;
    }
    if (!this.objetivo) this.objetivo = this.buscarObjetivo(player);

    if (!this.objetivo) {
      this.ocultarMarca();
      return;
    }

    const o = this.objetivo;
    const maxVida = o.vidaMax || 60;
    const ratio = Phaser.Math.Clamp((o.vida ?? maxVida) / maxVida, 0, 1);

    this.marca.setPosition(o.x, o.y).setVisible(true);
    this.barraFondo.setPosition(o.x, o.y - 20).setVisible(true);
    this.barraVida
      .setPosition(o.x - 15 + (30 * ratio) / 2, o.y - 20)
      .setDisplaySize(Math.max(1, 30 * ratio), 4)
      .setVisible(true);
  }

  ocultarMarca() {
    this.marca.setVisible(false);
    this.barraFondo.setVisible(false);
    this.barraVida.setVisible(false);
  }

  cambiarArma(paso) {
    const antes = GameState.armaActual;
    const ahora = GameState.cambiarArma(ORDEN_ARMAS, paso);
    if (ahora !== antes) {
      this.objetivo = null;
      EventBus.emit(EVT.NOTIFY, { text: ARMAS[ahora].nombre, tone: 'dim' });
    }
    return ahora;
  }
}
