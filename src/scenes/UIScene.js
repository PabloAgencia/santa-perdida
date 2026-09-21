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

    this.add.image(0, 0, 'px')
      .setOrigin(0, 0)
      .setDisplaySize(250, 74)
      .setTint(0x000000)
      .setAlpha(0.45);

    this.moneyText = this.add.text(16, 14, '', {
      fontFamily: TITULO, stroke: '#05060a', strokeThickness: 4, fontSize: '36px', color: COLORS.money,
    });

    this.deliveriesText = this.add.text(18, 50, '', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '14px', color: COLORS.dim,
    });

    this.objectiveText = this.add.text(w / 2, 20, '', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '19px', color: COLORS.objective,
    }).setOrigin(0.5, 0);

    this.distanceText = this.add.text(w / 2, 46, '', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '15px', color: COLORS.dim,
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

    this.helpText = this.add.text(16, h - 22, '', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '14px', color: COLORS.dim,
    }).setOrigin(0, 1);
    this.helpText.setText(
      'WASD mover · SHIFT correr · E coche · F pegar · Q cambiar objetivo · TAB arma · J encargo · ESPACIO freno · K guardar'
    );
    this.tweens.add({
      targets: this.helpText, alpha: 0.35, delay: 14000, duration: 2500,
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

  buildMinimap(w) {
    const city = this.scene.get('CityScene');
    this.world = { w: city.map.pixelWidth, h: city.map.pixelHeight };

    const scale = 1.6;
    this.mapW = city.map.w * scale;
    this.mapH = city.map.h * scale;
    this.mapX = w - 16 - this.mapW;
    this.mapY = 62;

    this.add.image(this.mapX - 3, this.mapY - 3, 'px')
      .setOrigin(0, 0)
      .setDisplaySize(this.mapW + 6, this.mapH + 6)
      .setTint(0x000000)
      .setAlpha(0.55);

    this.add.image(this.mapX, this.mapY, 'minimap')
      .setOrigin(0, 0)
      .setDisplaySize(this.mapW, this.mapH)
      .setAlpha(0.9);

    this.mapTarget = this.add.image(0, 0, 'px')
      .setDisplaySize(6, 6).setTint(0xe8b54a).setVisible(false);
    this.mapPolice = [];
    // donde te esperan los contactos que dan encargos
    this.mapContactos = [];
    this.mapPlayer = this.add.image(0, 0, 'px')
      .setDisplaySize(6, 6).setTint(0xf2efe6);
  }

  buildWanted(w) {
    this.wantedPips = [];
    for (let i = 0; i < 3; i++) {
      this.wantedPips.push(
        this.add.image(w - 16 - i * 20, 34, 'px')
          .setOrigin(1, 0)
          .setDisplaySize(15, 15)
          .setTint(0x3a3f45)
      );
    }
    this.wantedLabel = this.add.text(w - 16 - 66, 36, 'BUSCA', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '12px', color: COLORS.dim,
    }).setOrigin(1, 0);
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
    this.territoryText = this.add.text(this.mapX, this.mapY + this.mapH + 6, '', {
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

  buildHealth(h) {
    this.add.image(16, h - 46, 'px')
      .setOrigin(0, 1).setDisplaySize(210, 8).setTint(0x3a3f45);
    this.healthBar = this.add.image(16, h - 46, 'px')
      .setOrigin(0, 1).setDisplaySize(210, 8).setTint(0x8fd694);
    this.healthLabel = this.add.text(16, h - 62, 'SALUD', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '12px', color: COLORS.dim,
    }).setOrigin(0, 1);

    // el aliento: solo sale cuando no esta lleno, para no ensuciar la pantalla
    this.stamBg = this.add.image(16, h - 36, 'px')
      .setOrigin(0, 1).setDisplaySize(210, 4).setTint(0x3a3f45).setVisible(false);
    this.stamBar = this.add.image(16, h - 36, 'px')
      .setOrigin(0, 1).setDisplaySize(210, 4).setTint(0x6f9ad9).setVisible(false);

    // Lo que llevas en la mano, abajo a la derecha. Ocupa el mismo sitio que
    // el panel del coche, pero nunca salen a la vez: o vas a pie, o conduces.
    this.armaTexto = this.add.text(this.scale.width - 16, h - 24, '', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 3,
      fontSize: '19px', color: COLORS.ink,
    }).setOrigin(1, 1);

    // aviso de "E para..." pegado al marcador
    this.accionTexto = this.add.text(16, h - 78, '', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 3, fontSize: '15px',
      color: COLORS.objective,
    }).setOrigin(0, 1);
  }

  toMinimap(x, y) {
    return {
      x: this.mapX + (x / this.world.w) * this.mapW,
      y: this.mapY + (y / this.world.h) * this.mapH,
    };
  }

  updateMinimap(d) {
    const p = this.toMinimap(d.player.x, d.player.y);
    this.mapPlayer.setPosition(p.x, p.y);

    if (d.target) {
      const t = this.toMinimap(d.target.x, d.target.y);
      this.mapTarget.setPosition(t.x, t.y).setVisible(true);
    } else {
      this.mapTarget.setVisible(false);
    }

    const contactos = d.contactos || [];
    while (this.mapContactos.length < contactos.length) {
      this.mapContactos.push(
        this.add.image(0, 0, 'px').setDisplaySize(7, 7).setTint(0xffffff)
      );
    }
    this.mapContactos.forEach((punto, i) => {
      if (i < contactos.length) {
        const c = this.toMinimap(contactos[i].x, contactos[i].y);
        punto.setPosition(c.x, c.y).setTint(contactos[i].color).setVisible(true);
      } else {
        punto.setVisible(false);
      }
    });

    const police = d.police || [];
    while (this.mapPolice.length < police.length) {
      this.mapPolice.push(
        this.add.image(0, 0, 'px').setDisplaySize(5, 5).setTint(0xe8524a)
      );
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
      pip.setTint(i < level ? 0xe8524a : 0x3a3f45);
      pip.setAlpha(i < level ? 1 : 0.55);
    });
  }

  // la vida maxima sube con el musculo, asi que la barra se mide contra ella
  updateHealth(health, maximo = 100) {
    const ratio = Phaser.Math.Clamp(health / (maximo || 100), 0, 1);
    this.healthBar.setDisplaySize(Math.max(0, 210 * ratio), 8);
    this.healthBar.setTint(ratio > 0.5 ? 0x8fd694 : ratio > 0.22 ? 0xe8b54a : 0xd9584a);
  }

  updateAliento(ratio) {
    const lleno = ratio >= 0.999;
    this.stamBg.setVisible(!lleno);
    this.stamBar.setVisible(!lleno);
    if (lleno) return;
    this.stamBar.setDisplaySize(Math.max(0, 210 * Phaser.Math.Clamp(ratio, 0, 1)), 4);
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
    this.updateAliento(d.aliento ?? 1);
    this.accionTexto.setText(d.maquinaCerca ? 'E para comprar algo de comer' : '');
    if (d.arma) {
      const balas = d.arma.balas === null ? '' : `  ${d.arma.balas}`;
      this.armaTexto.setText(`${d.arma.nombre.toUpperCase()}${balas}`);
      this.armaTexto.setColor(d.arma.balas === 0 ? COLORS.danger : COLORS.ink);
    } else {
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
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '17px', color,
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
  layoutNotices() {
    const baseY = this.scale.height - 118;
    this.notices.forEach((label, i) => {
      label.setPosition(16, baseY - i * 24);
    });
  }
}
