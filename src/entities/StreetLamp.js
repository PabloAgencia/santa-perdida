const RADIO = 5;

// Farola con cuerpo: base en la acera, brazo sobre la calzada y foco al final.
// Se puede tirar con el coche, y si cae se apaga.
export class StreetLamp {
  constructor(scene, x, y, angleHaciaCalle, escalaLuz = 1) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.angle = angleHaciaCalle;
    this.radius = RADIO;
    this.alive = true;

    const cos = Math.cos(angleHaciaCalle);
    const sin = Math.sin(angleHaciaCalle);
    const brazo = 17;
    this.headX = x + cos * brazo;
    this.headY = y + sin * brazo;

    this.light = scene.add.image(this.headX, this.headY, 'lamp')
      .setDisplaySize(128 * escalaLuz, 128 * escalaLuz)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.3 + escalaLuz * 0.06)
      .setDepth(-900);

    this.sombra = scene.add.image(x + 3, y + 4, 'px')
      .setDisplaySize(brazo + 9, 5)
      .setTint(0x05060a).setAlpha(0.4)
      .setRotation(angleHaciaCalle)
      .setOrigin(0.2, 0.5)
      .setDepth(-880);

    this.arm = scene.add.image(x, y, 'px')
      .setDisplaySize(brazo, 3)
      .setTint(0x2a2e35)
      .setRotation(angleHaciaCalle)
      .setOrigin(0, 0.5)
      .setDepth(-870);

    this.base = scene.add.image(x, y, 'px')
      .setDisplaySize(7, 7)
      .setTint(0x1b1f25)
      .setDepth(-869);

    this.head = scene.add.image(this.headX, this.headY, 'px')
      .setDisplaySize(8, 5)
      .setTint(0xf2dfa8)
      .setRotation(angleHaciaCalle)
      .setDepth(-868);
  }

  romper(desdeX, desdeY) {
    if (!this.alive) return false;
    this.alive = false;

    // el brazo cae hacia el lado contrario al golpe
    const caida = Math.atan2(this.y - desdeY, this.x - desdeX);
    this.scene.tweens.add({
      targets: [this.arm, this.sombra],
      rotation: caida,
      duration: 380,
      ease: 'Bounce.out',
    });
    this.scene.tweens.add({
      targets: this.head,
      x: this.x + Math.cos(caida) * 17,
      y: this.y + Math.sin(caida) * 17,
      duration: 380,
      ease: 'Bounce.out',
    });
    this.head.setTint(0x4a4a44);
    this.scene.tweens.add({ targets: this.light, alpha: 0, duration: 260 });
    this.base.setTint(0x14171c);
    return true;
  }
}
