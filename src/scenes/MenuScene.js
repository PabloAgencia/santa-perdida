import { SaveSystem } from '../core/SaveSystem.js';
import { Cloud } from '../core/Cloud.js';
import { AccountUI } from '../core/AccountUI.js';
import { Audio } from '../core/Audio.js';
import { COLORS } from '../config/balance.js';
import { VERSION } from '../config/version.js';

// Pablo lo quiere todo en Pricedown, sin excepciones
const FONT = 'Pricedown, Anton, Impact, sans-serif';
const TITULO = 'Pricedown, Anton, Impact, sans-serif';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene', active: false });
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    // la instancia se reutiliza: el panel de la vez anterior ya no existe
    this.panel = null;

    this.add.image(0, 0, 'px').setOrigin(0, 0)
      .setDisplaySize(w, h).setTint(0x07080a);

    // si hay ilustracion de portada manda ella; si no, el perfil de ciudad
    // dibujado por codigo. Igual que con los sprites: la imagen es opcional.
    const conPortada = this.textures.exists('portada');
    if (conPortada) this.portada(w, h);
    else this.skyline(w, h);

    // CON PORTADA el titulo y el subtitulo YA VIENEN PINTADOS en la
    // ilustracion, y estan mucho mejor hechos que los que sabe escribir
    // Phaser. Aqui no se escriben, que si no se ven dos veces.
    if (!conPortada) {
      // el titulo tiene que leerse limpio por encima del perfil de ciudad
      this.add.image(0, h * 0.5, 'px').setOrigin(0, 0)
        .setDisplaySize(w, h * 0.5).setTint(0x000000).setAlpha(0.62);
      for (let i = 0; i < 9; i++) {
        this.add.image(w / 2, h * 0.31, 'px')
          .setDisplaySize(w, 190 - i * 18)
          .setTint(0x05060a)
          .setAlpha(0.14);
      }

      const titulo = this.add.text(w / 2, h * 0.3, 'S A N T A   P E R D I D A', {
        fontFamily: TITULO, stroke: '#05060a', strokeThickness: 10, fontSize: '76px', color: '#e8b54a',
      }).setOrigin(0.5);

      this.add.text(w / 2, h * 0.3 + 52, 'aqui nadie pregunta de donde vienes', {
        fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '16px', color: COLORS.dim,
      }).setOrigin(0.5);

      // entra rapido: con 1,1 s de fundido el menu parecia vacio al abrirlo
      titulo.setAlpha(0.35);
      this.tweens.add({ targets: titulo, alpha: 1, duration: 420, ease: 'Sine.out' });
      this.tweens.add({
        targets: titulo, y: h * 0.3 - 6,
        duration: 3400, yoyo: true, repeat: -1, ease: 'Sine.inOut',
      });
    }

    // COMO EN LOS GTA DE TODA LA VIDA: continuar (si hay algo que
    // continuar), nueva partida, cargar partida (si hay algo que cargar).
    // Antes era un unico "SEGUIR LA PARTIDA / EMPEZAR A JUGAR" mas "TUS
    // PARTIDAS" a secas, que hacia lo mismo pero no se leia como un menu de
    // toda la vida. La lista sale distinta segun haya o no partidas
    // guardadas, asi que nunca se ofrece "cargar" si no hay nada que cargar.
    this.opciones = this.construirOpciones();

    // Con portada las opciones van ENCIMA del panel esmerilado que la
    // ilustracion trae cocido (ahi estaban las opciones pintadas, que
    // herramientas/preparar-portada.py borro). El panel se midio con CUATRO
    // opciones, de 398 a 540.5 (398 + 3 x 47.5). La lista ahora puede traer
    // tres o cinco segun haya o no partidas guardadas: para no salirse
    // nunca del panel, SIEMPRE se reparten entre esos mismos 398 y 540.5,
    // solo que mas juntas si son cinco o mas separadas si son tres.
    this.indice = 0;
    const primera = conPortada ? 398 : h * 0.56;
    const ultima = 540.5;
    const n = this.opciones.length;
    const salto = conPortada ? (n > 1 ? (ultima - primera) / (n - 1) : 0) : 44;
    this.items = this.opciones.map((op, i) =>
      this.add.text(w / 2, primera + i * salto, op.label, {
        fontFamily: TITULO, stroke: '#05060a',
        // sobre la ilustracion el borde tiene que ser mas gordo: el fondo
        // tiene color y detalle, y con 4 las letras se despegaban poco.
        // Con cinco opciones van mas apretadas (ver `salto` de arriba), asi
        // que la letra baja un poco para que no se toquen.
        strokeThickness: conPortada ? 6 : 4,
        fontSize: conPortada ? (n > 4 ? '26px' : '32px') : '30px',
        color: COLORS.ink,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
        // con el raton suena igual que con las flechas, pero solo al CAMBIAR
        // de opcion: si no, cada temblor del raton encima de la elegida
        // soltaba un pitido y era un traqueteo
        .on('pointerover', () => {
          if (this.indice === i) return;
          this.indice = i;
          this.pintar();
          Audio.menuMove();
        })
        .on('pointerdown', () => this.elegir())
    );

    // Triangulo dibujado, no el caracter '>'. Pricedown no trae el triangulo
    // relleno (el navegador lo sacaria de otra fuente y desentona), y un '>'
    // al lado de letras tan gordas se queda en nada.
    this.cursor = this.add.triangle(0, 0, 0, 0, 0, 20, 17, 10, 0xe8b54a)
      .setStrokeStyle(3, 0x05060a);

    this.ayuda = this.add.text(w / 2, h - 34, 'Flechas o raton para elegir  ·  ENTER para entrar', {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '14px', color: COLORS.dim,
    }).setOrigin(0.5);

    // La version, abajo a la derecha y pequeña. Es para poder saber de un
    // vistazo si lo que estas viendo es la ultima version o una web vieja.
    //
    // Y SI FALTA LA PORTADA, LO DICE. Antes se caia al skyline en silencio y
    // no habia forma de distinguir "esta web es vieja" de "la imagen no ha
    // cargado". Que el juego lo confiese ahorra la tarde entera que costo la
    // primera vez.
    this.add.text(w - 10, h - 8, conPortada ? VERSION : `${VERSION}  ·  SIN PORTADA`, {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '12px',
      color: conPortada ? '#6f6a5e' : '#d9584a',
    }).setOrigin(1, 1);

    this.pintar();

    this.teclas = this.input.keyboard.addKeys({
      arriba: 'UP', abajo: 'DOWN', w: 'W', s: 'S', entrar: 'ENTER', espacio: 'SPACE',
    });
    this.input.keyboard.addCapture('UP,DOWN,W,S,ENTER,SPACE');

    const despertar = () => { Audio.start(); Audio.resume(); };
    this.input.keyboard.once('keydown', despertar);
    this.input.once('pointerdown', despertar);

    this.mirarSiVieneDelCorreo();
  }

  // si el jugador llega desde el enlace de "se me ha olvidado la contraseña",
  // lo primero que ve es la pantalla para poner una nueva
  mirarSiVieneDelCorreo() {
    const vuelta = Cloud.recogerVueltaDelCorreo();
    if (!vuelta) return;

    this.input.keyboard.enabled = false;
    if (vuelta.ok) {
      AccountUI.pintarNuevaClave();
      AccountUI.alCerrar = () => {
        this.input.keyboard.enabled = true;
        this.refrescarCuenta();
      };
    } else {
      AccountUI.abrir(() => {
        this.input.keyboard.enabled = true;
      });
      AccountUI.aviso(vuelta.mensaje, 'mal');
    }
  }

  construirOpciones() {
    const opciones = [];
    if (SaveSystem.hasSave()) {
      opciones.push({
        id: 'continuar', label: `CONTINUAR · PARTIDA ${SaveSystem.ranura}`,
        accion: () => this.seguirDirecto(),
      });
    }
    opciones.push({ id: 'nueva', label: 'NUEVA PARTIDA', accion: () => this.irASlots('nueva') });
    if (SaveSystem.hayAlguna()) {
      opciones.push({ id: 'cargar', label: 'CARGAR PARTIDA', accion: () => this.irASlots('cargar') });
    }
    opciones.push({ id: 'cuenta', label: this.etiquetaCuenta(), accion: () => this.verCuenta() });
    opciones.push({ id: 'controles', label: 'CONTROLES', accion: () => this.verControles() });
    return opciones;
  }

  etiquetaCuenta() {
    return Cloud.conectado ? 'MI CUENTA' : 'ENTRAR CON TU CORREO';
  }

  // La ilustracion de portada. Se encaja RECORTANDO, nunca estirando: se
  // escala por el lado que mas falta le hace y lo que sobra se sale por
  // fuera. Estirandola, en una ventana estrecha los personajes salian
  // achaparrados.
  // Encima lleva un barrido lento de 24 s. Quieta del todo la pantalla de
  // inicio parece una captura congelada; moviendose despacio respira.
  portada(w, h) {
    const img = this.add.image(w / 2, h / 2, 'portada').setOrigin(0.5);
    const tex = this.textures.get('portada').getSourceImage();
    const escala = Math.max(w / tex.width, h / tex.height);
    img.setScale(escala);
    // El barrido es del 3,5% y no mas: la ilustracion lleva COCIDO el panel
    // esmerilado donde van las opciones, y las opciones son texto fijo. Si la
    // imagen se mueve mucho, el panel se le escapa al texto por debajo.
    this.tweens.add({
      targets: img, scale: escala * 1.035,
      duration: 26000, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });

    // velo fino: baja el cielo lo justo para que el texto blanco no se pierda
    this.add.image(0, 0, 'px').setOrigin(0, 0)
      .setDisplaySize(w, h).setTint(0x05060a).setAlpha(0.2);

    // y un degradado abajo del todo, para la linea de ayuda: ahi la
    // ilustracion tiene el coche y la carretera iluminados
    for (let i = 0; i < 10; i++) {
      this.add.image(0, h - 78 + i * 8, 'px').setOrigin(0, 0)
        .setDisplaySize(w, 10).setTint(0x05060a).setAlpha(0.06 + i * 0.045);
    }
  }

  // perfil de ciudad dibujado con rectangulos, para que el menu no sea un vacio
  skyline(w, h) {
    let x = -20;
    let seed = 7;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    while (x < w + 40) {
      const ancho = 30 + rnd() * 70;
      const alto = 90 + rnd() * 240;
      const tono = 0x14171d + Math.floor(rnd() * 3) * 0x040406;
      this.add.image(x, h * 0.62, 'px').setOrigin(0, 1)
        .setDisplaySize(ancho, alto).setTint(tono);

      const filas = Math.floor(alto / 26);
      const cols = Math.floor(ancho / 18);
      for (let f = 0; f < filas; f++) {
        for (let c = 0; c < cols; c++) {
          if (rnd() > 0.33) continue;
          this.add.image(x + 9 + c * 18, h * 0.62 - 16 - f * 26, 'px')
            .setDisplaySize(6, 8).setTint(0xe8c479).setAlpha(0.25 + rnd() * 0.5);
        }
      }
      x += ancho + 4;
    }
  }

  pintar() {
    this.items.forEach((item, i) => {
      const elegido = i === this.indice;
      item.setColor(elegido ? '#e8b54a' : COLORS.ink);
      item.setScale(elegido ? 1.06 : 1);
    });
    const sel = this.items[this.indice];
    this.cursor.setPosition(sel.x - sel.width / 2 - 26, sel.y);
  }

  mover(paso) {
    this.indice = (this.indice + paso + this.opciones.length) % this.opciones.length;
    this.pintar();
    Audio.menuMove();
  }

  elegir() {
    Audio.menuSelect();
    this.opciones[this.indice].accion();
  }

  // ---------- opciones ----------

  seguirDirecto() {
    if (!SaveSystem.hasSave()) {
      this.irARanuras();
      return;
    }
    SaveSystem.load();
    this.cameras.main.fadeOut(420, 0, 0, 0);
    this.time.delayedCall(450, () => this.scene.start('CityScene'));
  }

  irASlots(modo) {
    this.cameras.main.fadeOut(280, 0, 0, 0);
    this.time.delayedCall(300, () => this.scene.start('SlotsScene', { modo }));
  }

  // Solo se retoca la etiqueta de la cuenta: iniciar sesion no cambia si hay
  // partidas guardadas, asi que el resto de la lista (continuar/nueva/
  // cargar) no hace falta tocarlo.
  refrescarCuenta() {
    const op = this.opciones.find((o) => o.id === 'cuenta');
    const i = this.opciones.indexOf(op);
    op.label = this.etiquetaCuenta();
    this.items[i].setText(op.label);
    this.pintar();
  }

  // la pantalla de cuenta es HTML por encima del juego, asi que mientras
  // este abierta se desconecta el teclado del menu
  verCuenta() {
    this.input.keyboard.enabled = false;
    AccountUI.abrir(() => {
      this.input.keyboard.enabled = true;
      this.refrescarCuenta();
    });
  }

  verControles() {
    if (this.panel) {
      this.panel.destroy();
      this.panel = null;
      return;
    }
    const w = this.scale.width;
    const h = this.scale.height;
    const texto = [
      'WASD / flechas    moverte y conducir',
      'SHIFT             correr',
      'E                 subir o bajar del coche',
      'E en un marcador  hablar o entrar',
      'F / raton         pegar o disparar',
      'Q                 cambiar de objetivo',
      'TAB               cambiar de arma',
      'ESPACIO           freno de mano',
      'J                 pedir otro encargo',
      'K                 guardar',
      'M                 sonido',
      'ESC               pausa',
    ].join('\n');

    this.panel = this.add.container(w / 2, h / 2);
    const fondo = this.add.image(0, 0, 'px')
      .setDisplaySize(560, 300).setTint(0x0d1014).setAlpha(0.95);
    const cuerpo = this.add.text(0, 0, texto, {
      fontFamily: FONT, stroke: '#05060a', strokeThickness: 2, fontSize: '16px', color: COLORS.ink, align: 'left', lineSpacing: 8,
    }).setOrigin(0.5);
    this.panel.add([fondo, cuerpo]);
  }

  update() {
    const k = this.teclas;
    if (Phaser.Input.Keyboard.JustDown(k.arriba) || Phaser.Input.Keyboard.JustDown(k.w)) {
      this.mover(-1);
    }
    if (Phaser.Input.Keyboard.JustDown(k.abajo) || Phaser.Input.Keyboard.JustDown(k.s)) {
      this.mover(1);
    }
    if (Phaser.Input.Keyboard.JustDown(k.entrar) || Phaser.Input.Keyboard.JustDown(k.espacio)) {
      this.elegir();
    }
  }
}
