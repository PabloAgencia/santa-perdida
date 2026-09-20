import { EventBus, EVT } from '../core/EventBus.js';
import { GameState } from '../core/GameState.js';
import { COLORS, TILE } from '../config/balance.js';

const FONT = 'Consolas, "Courier New", monospace';

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
      fontFamily: FONT, fontSize: '30px', color: COLORS.money,
    });

    this.deliveriesText = this.add.text(18, 50, '', {
      fontFamily: FONT, fontSize: '14px', color: COLORS.dim,
    });

    this.objectiveText = this.add.text(w / 2, 20, '', {
      fontFamily: FONT, fontSize: '19px', color: COLORS.objective,
    }).setOrigin(0.5, 0);

    this.distanceText = this.add.text(w / 2, 46, '', {
      fontFamily: FONT, fontSize: '15px', color: COLORS.dim,
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
      fontFamily: FONT, fontSize: '26px', color: COLORS.ink,
    }).setOrigin(1, 0);
    this.vehicleName = this.add.text(-16, -28, '', {
      fontFamily: FONT, fontSize: '13px', color: COLORS.dim,
    }).setOrigin(1, 0);
    this.hpBarBg = this.add.image(-16, -14, 'px')
      .setOrigin(1, 1).setDisplaySize(198, 6).setTint(0x3a3f45);
    this.hpBar = this.add.image(-16, -14, 'px')
      .setOrigin(1, 1).setDisplaySize(198, 6).setTint(0x8fd694);
    this.vehiclePanel.add([panelBg, this.speedText, this.vehicleName, this.hpBarBg, this.hpBar]);

    this.helpText = this.add.text(16, h - 22, '', {
      fontFamily: FONT, fontSize: '14px', color: COLORS.dim,
    }).setOrigin(0, 1);
    this.helpText.setText(
      'WASD mover  ·  SHIFT correr  ·  E coche  ·  ESPACIO freno de mano  ·  K guardar  ·  M sonido'
    );
    this.tweens.add({
      targets: this.helpText, alpha: 0.35, delay: 14000, duration: 2500,
    });

    this.setMoney(GameState.money);
    this.deliveriesText.setText(`Entregas: ${GameState.stats.deliveries}`);

    this.onHud = (d) => this.updateHud(d);
    this.onMoney = (d) => this.setMoney(d.money);
    this.onNotify = (n) => this.notify(n);
    EventBus.on(EVT.HUD_TICK, this.onHud);
    EventBus.on(EVT.MONEY_CHANGED, this.onMoney);
    EventBus.on(EVT.NOTIFY, this.onNotify);

    this.events.once('shutdown', () => {
      EventBus.off(EVT.HUD_TICK, this.onHud);
      EventBus.off(EVT.MONEY_CHANGED, this.onMoney);
      EventBus.off(EVT.NOTIFY, this.onNotify);
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
      fontFamily: FONT, fontSize: '12px', color: COLORS.dim,
    }).setOrigin(1, 0);
  }

  buildTerritory() {
    this.territoryText = this.add.text(this.mapX, this.mapY + this.mapH + 6, '', {
      fontFamily: FONT, fontSize: '13px', color: COLORS.dim,
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
      fontFamily: FONT, fontSize: '12px', color: COLORS.dim,
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

  updateHealth(health) {
    const ratio = Phaser.Math.Clamp(health / 100, 0, 1);
    this.healthBar.setDisplaySize(Math.max(0, 210 * ratio), 8);
    this.healthBar.setTint(ratio > 0.5 ? 0x8fd694 : ratio > 0.22 ? 0xe8b54a : 0xd9584a);
  }

  setMoney(money) {
    this.moneyText.setText(`${money.toLocaleString('es-ES')} €`);
  }

  updateHud(d) {
    this.objectiveText.setText(d.objective);
    this.deliveriesText.setText(`Entregas: ${d.deliveries}`);

    if (d.target) {
      const tiles = Math.round(
        Phaser.Math.Distance.Between(d.player.x, d.player.y, d.target.x, d.target.y) / TILE
      );
      const time = d.remaining !== null ? `  ·  ${Math.ceil(d.remaining)} s para la prima` : '';
      this.distanceText.setText(`${tiles} m${time}`);
    } else {
      this.distanceText.setText('');
    }

    this.updateArrow(d.target);
    this.updateMinimap(d);
    this.updateWanted(d.wanted || 0);
    this.updateHealth(d.health ?? 100);
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
      fontFamily: FONT, fontSize: '17px', color,
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

  layoutNotices() {
    const baseY = this.scale.height - 56;
    this.notices.forEach((label, i) => {
      label.setPosition(16, baseY - i * 24);
    });
  }
}
