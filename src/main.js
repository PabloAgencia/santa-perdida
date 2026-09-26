import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { CityScene } from './scenes/CityScene.js';
import { UIScene } from './scenes/UIScene.js';
import { HideoutScene } from './scenes/HideoutScene.js';
import { PauseScene } from './scenes/PauseScene.js';
import { ShopScene } from './scenes/ShopScene.js';
import { MapaScene } from './scenes/MapaScene.js';
import { SlotsScene } from './scenes/SlotsScene.js';
import { ProgresoScene } from './scenes/ProgresoScene.js';
import { MercadoScene } from './scenes/MercadoScene.js';

// Phaser dibuja el texto sobre el lienzo una sola vez: si la fuente no esta
// cargada antes de arrancar, los titulos salen con la de repuesto y ya no se
// corrigen solos.
try {
  await document.fonts.load('64px Pricedown');
  await document.fonts.load('64px Anton');
  await document.fonts.ready;
} catch {
  /* sin la fuente se usa la de repuesto y el juego sigue */
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  backgroundColor: '#0b0d10',
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    powerPreference: 'high-performance',
  },
  scene: [BootScene, MenuScene, SlotsScene, CityScene, UIScene, HideoutScene, PauseScene, ShopScene, MapaScene, ProgresoScene, MercadoScene],
});

window.SantaPerdida = { game };
