import { EventBus, EVT } from '../core/EventBus.js';
import { GameState } from '../core/GameState.js';
import { COLORS, TILE } from '../config/balance.js';

// Pablo lo quiere todo en Pricedown, sin excepciones
const FONT = 'Pricedown, Anton, Impact, sans-serif';
const TITULO = 'Pricedown, Anton, Impact, sans-serif';

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene', active: false });
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.cityCam = this.scene.get('CityScene').cameras.main;
    this.notices = [];

    // TODO EL MARCADOR VA ARRIBA A LA DERECHA, como en San Andreas: primero
    // lo que llevas en la mano, debajo el dinero, debajo la busca y abajo
    // del todo las barras. El mapa se baja a la esquina de abajo, que es
    // donde esta en ese juego y donde menos estorba.
    this.moneyText = this.add.text(w - 16, 56, '', {
      fontFamily: TITULO, stroke: '#05060a', strokeThickness: 5, fontSize: '34px', color: COLORS.money,
    }).setOrigin(1, 0);

    this.deliveriesText = this.add.text(16, 14, '', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 4,
      fontSize: '18px', color: '#c9c3b4',
    });

    this.objectiveText = this.add.text(w / 2, 20, '', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 5, fontSize: '23px', color: COLORS.objective,
    }).setOrigin(0.5, 0);

    this.distanceText = this.add.text(w / 2, 46, '', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 4, fontSize: '17px', color: '#c9c3b4',
    }).setOrigin(0.5, 0);

    this.arrow = this.add.image(0, 0, 'arrow').setVisible(false).setAlpha(0.9);

    this.buildMinimap(w);
    this.buildTerritory();
    this.buildWanted(w);
    this.buildHealth(h);

    this.vehiclePanel = this.add.container(w - 20, h - 22).setVisible(false);
    const panelBg = this.add.image(0, 0, 'px')
      .setOrigin(1, 1)
      .setDisplaySize(230, 76)
      .setTint(0x000000)
      .setAlpha(0.45);
    this.speedText = this.add.text(-16, -58, '', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 3, fontSize: '26px', color: COLORS.ink,
    }).setOrigin(1, 0);
    this.vehicleName = this.add.text(-16, -28, '', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '13px', color: COLORS.dim,
    }).setOrigin(1, 0);
    this.hpBarBg = this.add.image(-16, -14, 'px')
      .setOrigin(1, 1).setDisplaySize(198, 6).setTint(0x3a3f45);
    this.hpBar = this.add.image(-16, -14, 'px')
      .setOrigin(1, 1).setDisplaySize(198, 6).setTint(0x8fd694);
    this.vehiclePanel.add([panelBg, this.speedText, this.vehicleName, this.hpBarBg, this.hpBar]);

    // La chuleta de teclas: antes era gris oscuro a 14 px sobre el asfalto y
    // no habia quien la leyera. Ahora va en dos lineas, mas grande, en claro
    // y con una banda oscura detras.
    this.helpBg = this.add.image(w - 10, h - 10, 'px')
      .setOrigin(1, 1).setDisplaySize(470, 52).setTint(0x05060a).setAlpha(0.55);
    this.helpText = this.add.text(w - 20, h - 18, '', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 4,
      fontSize: '17px', color: '#ddd8ca', align: 'right', lineSpacing: 3,
    }).setOrigin(1, 1);
    this.helpText.setText([
      'WASD mover · SHIFT correr · E entrar · F pegar · Q objetivo',
      'TAB arma · M mapa · J encargo · ESPACIO freno · K guardar',
    ]);
    this.tweens.add({
      targets: [this.helpText, this.helpBg], alpha: 0.4, delay: 16000, duration: 2500,
    });

    this.setMoney(GameState.money);
    this.deliveriesText.setText(`Entregas: ${GameState.stats.deliveries}`);

    this.buildBigMessage(w, h);

    this.onHud = (d) => this.updateHud(d);
    this.onMoney = (d) => this.setMoney(d.money);
    this.onNotify = (n) => this.notify(n);
    this.onBig = (m) => this.showBigMessage(m);
    EventBus.on(EVT.HUD_TICK, this.onHud);
    EventBus.on(EVT.MONEY_CHANGED, this.onMoney);
    EventBus.on(EVT.NOTIFY, this.onNotify);
    EventBus.on(EVT.BIG_MESSAGE, this.onBig);

    this.events.once('shutdown', () => {
      EventBus.off(EVT.HUD_TICK, this.onHud);
      EventBus.off(EVT.MONEY_CHANGED, this.onMoney);
      EventBus.off(EVT.NOTIFY, this.onNotify);
      EventBus.off(EVT.BIG_MESSAGE, this.onBig);
    });
  }

  // EL MINIMAPA. Antes era la ciudad entera encogida en una esquina: con el
  // mapa al doble no se distinguia una calle de otra. Ahora es un recuadro
  // con zoom que te sigue, como el de los GTA, y el mapa entero se abre con M.
  buildMinimap(w) {
    const city = this.scene.get('CityScene');
    this.world = { w: city.map.pixelWidth, h: city.map.pixelHeight };
    this.mapaTam = 176;
    this.mapaZoom = 4.4;                       // pixeles de mapa por casilla
    this.mapaAncho = city.map.w * this.mapaZoom;
    this.mapaAlto = city.map.h * this.mapaZoom;

    const h = this.scale.height;
    this.mapX = 16;
    this.mapY = h - 16 - this.mapaTam;

    this.add.image(this.mapX - 3, this.mapY - 3, 'px')
      .setOrigin(0, 0).setDisplaySize(this.mapaTam + 6, this.mapaTam + 6)
      .setTint(0x05060a).setAlpha(0.8);

    // el contenido va en un contenedor que se desplaza, recortado por la
    // mascara del recuadro
    this.mapaMundo = this.add.container(this.mapX, this.mapY);
    this.mapaImg = this.add.image(0, 0, 'minimap')
      .setOrigin(0, 0).setDisplaySize(this.mapaAncho, this.mapaAlto).setAlpha(0.95);
    this.mapaMundo.add(this.mapaImg);

    const recorte = this.make.graphics({ add: false });
    recorte.fillStyle(0xffffff);
    recorte.fillRect(this.mapX, this.mapY, this.mapaTam, this.mapaTam);
    this.mapaMundo.setMask(recorte.createGeometryMask());

    this.mapTarget = this.add.image(0, 0, 'px')
      .setDisplaySize(9, 9).setTint(0xe8b54a).setRotation(Math.PI / 4).setVisible(false);
    this.mapPolice = [];
    this.mapContactos = [];
    this.mapPlayer = this.add.image(0, 0, 'arrow')
      .setDisplaySize(13, 13).setTint(0xf2efe6);
    this.mapaMundo.add([this.mapTarget, this.mapPlayer]);

    // las armerias son sitios fijos: se marcan una vez y ahi se quedan
    for (const t of city.shops ? city.shops.tiendas : []) {
      const q = this.toMinimap(t.x, t.y);
      this.mapaMundo.add(
        this.add.image(q.x, q.y, 'px').setDisplaySize(7, 7).setTint(0x7fd08a)
      );
    }
    if (city.hideoutDoor) {
      const q = this.toMinimap(city.hideoutDoor.x, city.hideoutDoor.y);
      this.mapaMundo.add(
        this.add.image(q.x, q.y, 'px').setDisplaySize(8, 8).setTint(0xe8b54a).setAlpha(0.9)
      );
    }

    this.add.text(this.mapX + this.mapaTam - 2, this.mapY - 17, 'M mapa', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 3,
      fontSize: '13px', color: COLORS.dim,
    }).setOrigin(1, 0);
  }
  buildWanted(w) {
    this.wantedPips = [];
    for (let i = 0; i < 3; i++) {
      this.wantedPips.push(
        this.add.image(w - 16 - i * 22, 98, 'estrella')
          .setOrigin(1, 0)
          .setDisplaySize(19, 19)
          .setTint(0x3a3f45)
      );
    }
    this.wantedLabel = null;
  }

  buildBigMessage(w, h) {
    this.bigBox = this.add.container(w / 2, h / 2).setAlpha(0).setDepth(500);
    const velo = this.add.image(0, 0, 'px')
      .setDisplaySize(w, 190).setTint(0x000000).setAlpha(0.72);
    this.bigTitle = this.add.text(0, -26, '', {
      fontFamily: TITULO, stroke: '#05060a', strokeThickness: 8, fontSize: '62px', color: '#d9584a',
    }).setOrigin(0.5);
    this.bigSub = this.add.text(0, 30, '', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '19px', color: COLORS.ink,
    }).setOrigin(0.5);
    this.bigBox.add([velo, this.bigTitle, this.bigSub]);
  }

  showBigMessage({ title, subtitle, color = '#d9584a' }) {
    this.bigTitle.setText(title.split('').join(' ')).setColor(color);
    this.bigSub.setText(subtitle || '');
    this.tweens.killTweensOf(this.bigBox);
    this.bigBox.setAlpha(0).setScale(1.12);
    this.tweens.add({ targets: this.bigBox, alpha: 1, scale: 1, duration: 320, ease: 'Back.out' });
    this.tweens.add({ targets: this.bigBox, alpha: 0, delay: 2600, duration: 700 });
  }

  buildTerritory() {
    this.territoryText = this.add.text(this.mapX, this.mapY - 17, '', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '13px', color: COLORS.dim,
    }).setOrigin(0, 0);
  }

  updateTerritory(info) {
    if (!info) {
      this.territoryText.setText('');
      return;
    }
    const signo = info.rep > 0 ? '+' : '';
    this.territoryText.setText(`${info.short}  ${signo}${info.rep}`);
    this.territoryText.setColor(
      info.hostile ? COLORS.danger : info.rep >= 30 ? COLORS.money : COLORS.dim
    );
  }

  // Las barras y el arma, arriba a la derecha y con el mismo orden que en
  // San Andreas: arma arriba del todo, dinero, busca, chaleco y salud.
  buildHealth(h) {
    const w = this.scale.width;
    const der = w - 16;
    const ANCHO = 150;
    const yChaleco = 126;
    const ySalud = 146;

    // el arma que llevas, con su munición al lado
    this.armaIcono = this.add.image(der - 4, 8, 'icono-puno')
      .setOrigin(1, 0).setDisplaySize(40, 40).setVisible(false);
    this.armaTexto = this.add.text(der - 50, 16, '', {
      fontFamily: TITULO, stroke: '#05060a', strokeThickness: 4,
      fontSize: '25px', color: COLORS.ink,
    }).setOrigin(1, 0);

    // El icono va FUERA de la barra, a su izquierda, y el relleno se vacia
    // hacia la derecha: es como se lee en San Andreas.
    const izq = der - ANCHO;
    this.healthAncho = ANCHO - 4;

    this.armorIcono = this.add.image(izq - 14, yChaleco + 8, 'hud-escudo')
      .setOrigin(0.5, 0.5).setDisplaySize(20, 20).setVisible(false);
    this.armorBg = this.add.image(der, yChaleco, 'px')
      .setOrigin(1, 0).setDisplaySize(ANCHO, 16).setTint(0x05060a).setAlpha(0.62).setVisible(false);
    this.armorBar = this.add.image(izq + 2, yChaleco + 2, 'px')
      .setOrigin(0, 0).setDisplaySize(ANCHO - 4, 12).setTint(0xdfe4ea).setVisible(false);

    this.healthIcono = this.add.image(izq - 14, ySalud + 8, 'hud-corazon')
      .setOrigin(0.5, 0.5).setDisplaySize(21, 21);
    this.add.image(der, ySalud, 'px')
      .setOrigin(1, 0).setDisplaySize(ANCHO, 16).setTint(0x05060a).setAlpha(0.62);
    this.healthBar = this.add.image(izq + 2, ySalud + 2, 'px')
      .setOrigin(0, 0).setDisplaySize(ANCHO - 4, 12).setTint(0xd9384a);
    this.healthLabel = null;

    // el aliento: solo sale cuando no esta lleno, para no ensuciar la pantalla
    this.stamBg = this.add.image(der, ySalud + 20, 'px')
      .setOrigin(1, 0).setDisplaySize(ANCHO, 7).setTint(0x05060a).setAlpha(0.62).setVisible(false);
    this.stamBar = this.add.image(izq + 2, ySalud + 21, 'px')
      .setOrigin(0, 0).setDisplaySize(ANCHO - 4, 5).setTint(0x6f9ad9).setVisible(false);

    // aviso de "E para...", encima del mapa de la esquina
    this.accionTexto = this.add.text(16, h - 26, '', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 3, fontSize: '15px',
      color: COLORS.objective,
    }).setOrigin(0, 1);
  }
  // coordenadas dentro del contenedor del mapa, no de la pantalla
  toMinimap(x, y) {
    return {
      x: (x / this.world.w) * this.mapaAncho,
      y: (y / this.world.h) * this.mapaAlto,
    };
  }

  updateMinimap(d) {
    const p = this.toMinimap(d.player.x, d.player.y);

    // el mapa se desplaza para llevarte en el centro, y se frena en los
    // bordes para no enseñar el vacio de fuera de la ciudad
    const medio = this.mapaTam / 2;
    const ox = Phaser.Math.Clamp(medio - p.x, this.mapaTam - this.mapaAncho, 0);
    const oy = Phaser.Math.Clamp(medio - p.y, this.mapaTam - this.mapaAlto, 0);
    this.mapaMundo.setPosition(this.mapX + ox, this.mapY + oy);

    this.mapPlayer.setPosition(p.x, p.y).setRotation((d.player.angle || 0) + Math.PI / 2);

    if (d.target) {
      const t = this.toMinimap(d.target.x, d.target.y);
      this.mapTarget.setPosition(t.x, t.y).setVisible(true);
    } else {
      this.mapTarget.setVisible(false);
    }

    const contactos = d.contactos || [];
    while (this.mapContactos.length < contactos.length) {
      const punto = this.add.image(0, 0, 'px').setDisplaySize(8, 8).setTint(0xffffff);
      this.mapContactos.push(punto);
      this.mapaMundo.add(punto);
    }
    this.mapContactos.forEach((punto, i) => {
      if (i < contactos.length) {
        const q = this.toMinimap(contactos[i].x, contactos[i].y);
        punto.setPosition(q.x, q.y).setTint(contactos[i].color).setVisible(true);
      } else {
        punto.setVisible(false);
      }
    });

    const police = d.police || [];
    while (this.mapPolice.length < police.length) {
      const dot = this.add.image(0, 0, 'px').setDisplaySize(7, 7).setTint(0x5aa8e8);
      this.mapPolice.push(dot);
      this.mapaMundo.add(dot);
    }
    this.mapPolice.forEach((dot, i) => {
      if (i < police.length) {
        const q = this.toMinimap(police[i].x, police[i].y);
        dot.setPosition(q.x, q.y).setVisible(true);
      } else {
        dot.setVisible(false);
      }
    });
  }
  updateWanted(level) {
    this.wantedPips.forEach((pip, i) => {
      const puesta = i < level;
      pip.setTint(puesta ? 0xf2d06b : 0x2a2f36);
      pip.setAlpha(puesta ? 1 : 0.45);
    });
  }

  // la vida maxima sube con el musculo, asi que la barra se mide contra ella
  updateHealth(health, maximo = 100) {
    const ratio = Phaser.Math.Clamp(health / (maximo || 100), 0, 1);
    this.healthBar.setDisplaySize(Math.max(0, this.healthAncho * ratio), 12);
    // en San Andreas la salud siempre es del mismo color; solo parpadea
    // cuando estas a punto de caer, que es cuando hay que enterarse
    this.healthBar.setTint(ratio > 0.22 ? 0xd9384a : 0xff6b5a);
    this.healthIcono.setAlpha(ratio > 0.22 ? 1 : 0.35 + Math.abs(Math.sin(this.time.now / 160)) * 0.65);
  }

  updateBlindaje(valor) {
    const puesto = valor > 0;
    this.armorBg.setVisible(puesto);
    this.armorBar.setVisible(puesto);
    this.armorIcono.setVisible(puesto);
    if (!puesto) return;
    this.armorBar.setDisplaySize(
      Math.max(0, this.healthAncho * Phaser.Math.Clamp(valor / 100, 0, 1)), 12
    );
  }

  updateAliento(ratio) {
    const lleno = ratio >= 0.999;
    this.stamBg.setVisible(!lleno);
    this.stamBar.setVisible(!lleno);
    if (lleno) return;
    this.stamBar.setDisplaySize(Math.max(0, this.healthAncho * Phaser.Math.Clamp(ratio, 0, 1)), 4);
    this.stamBar.setTint(ratio > 0.25 ? 0x6f9ad9 : 0xd9584a);
  }

  setMoney(money) {
    this.moneyText.setText(`${money.toLocaleString('es-ES')} €`);
  }

  updateHud(d) {
    this.deliveriesText.setText(`Entregas: ${d.deliveries}`);

    // una mision manda sobre el encargo de reparto
    const m = d.mission;
    const destino = m ? m.objetivo : d.target;

    if (m) {
      this.objectiveText.setColor('#e8b54a');
      this.objectiveText.setText(`${m.nombre}   ${m.pasoActual}/${m.pasos}`);
      const partes = [m.texto];
      if (destino) {
        partes.push(`${Math.round(
          Phaser.Math.Distance.Between(d.player.x, d.player.y, destino.x, destino.y) / TILE
        )} m`);
      }
      if (m.restante !== null) partes.push(`${Math.ceil(m.restante)} s`);
      this.distanceText.setText(partes.join('  ·  '));
    } else {
      this.objectiveText.setColor(COLORS.objective);
      this.objectiveText.setText(d.objective);
      if (destino) {
        const tiles = Math.round(
          Phaser.Math.Distance.Between(d.player.x, d.player.y, destino.x, destino.y) / TILE
        );
        const time = d.remaining !== null ? `  ·  ${Math.ceil(d.remaining)} s para la prima` : '';
        this.distanceText.setText(`${tiles} m${time}`);
      } else {
        this.distanceText.setText('');
      }
    }

    d = Object.assign({}, d, { target: destino });
    this.updateArrow(destino);
    this.updateMinimap(d);
    this.updateWanted(d.wanted || 0);
    this.updateHealth(d.health ?? 100, d.healthMax ?? 100);
    this.updateBlindaje(d.blindaje ?? 0);
    this.updateAliento(d.aliento ?? 1);
    this.accionTexto.setText(
      d.tiendaCerca ? 'E para entrar en la armeria'
        : d.maquinaCerca ? 'E para comprar algo de comer' : ''
    );
    if (d.arma) {
      this.armaIcono.setTexture(`icono-${d.arma.clave}`).setVisible(true);
      // los puños y el bate no gastan nada, asi que no se pone numero
      this.armaTexto.setText(d.arma.balas === null ? '' : `${d.arma.balas}`);
      this.armaTexto.setColor(d.arma.balas === 0 ? COLORS.danger : COLORS.ink);
    } else {
      this.armaIcono.setVisible(false);
      this.armaTexto.setText('');
    }
    this.updateTerritory(d.territory);

    this.vehiclePanel.setVisible(d.driving);
    if (d.driving) {
      this.speedText.setText(`${d.speed} km/h`);
      this.vehicleName.setText(d.vehicleName.toUpperCase());
      this.hpBar.setDisplaySize(Math.max(0, 198 * d.hp), 6);
      this.hpBar.setTint(d.hp > 0.5 ? 0x8fd694 : d.hp > 0.2 ? 0xe8b54a : 0xd9584a);
    }
  }

  updateArrow(target) {
    if (!target) {
      this.arrow.setVisible(false);
      return;
    }
    const view = this.cityCam.worldView;
    if (view.contains(target.x, target.y)) {
      this.arrow.setVisible(false);
      return;
    }
    const ang = Math.atan2(target.y - view.centerY, target.x - view.centerX);
    const w = this.scale.width;
    const h = this.scale.height;
    const px = w / 2 + Math.cos(ang) * (w / 2 - 80);
    const py = h / 2 + Math.sin(ang) * (h / 2 - 80);
    this.arrow.setPosition(px, py).setRotation(ang + Math.PI / 2).setVisible(true);
  }

  notify({ text, tone = 'ink' }) {
    const color = COLORS[tone] || COLORS.ink;
    const label = this.add.text(16, 0, text, {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 4, fontSize: '18px', color,
    }).setAlpha(0);

    this.notices.unshift(label);
    if (this.notices.length > 4) this.notices.pop().destroy();
    this.layoutNotices();

    this.tweens.add({ targets: label, alpha: 1, duration: 180 });
    this.tweens.add({
      targets: label,
      alpha: 0,
      delay: 3600,
      duration: 700,
      onComplete: () => {
        const i = this.notices.indexOf(label);
        if (i >= 0) this.notices.splice(i, 1);
        label.destroy();
        this.layoutNotices();
      },
    });
  }

  // Los avisos van MUY por encima del marcador de salud y de la linea de
  // ayuda: antes se pintaban a 56 px del borde y se pisaban unos a otros.
  // Los avisos van arriba a la izquierda, que es lo unico que queda libre:
  // el mapa ocupa la esquina de abajo y el marcador toda la derecha.
  layoutNotices() {
    this.notices.forEach((label, i) => {
      label.setPosition(16, 44 + i * 24);
    });
  }
}
