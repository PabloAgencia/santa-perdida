import { EventBus, EVT } from '../core/EventBus.js';
import { GameState } from '../core/GameState.js';
import { FACTIONS, FACTION_KEYS, ZONE_OWNER, REP } from '../config/factions.js';

export class FactionSystem {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;
    this.current = null;
  }

  ownerAt(x, y) {
    const zone = this.map.zoneAt(x, y);
    return zone ? ZONE_OWNER[zone] || null : null;
  }

  update(dt, x, y) {
    const owner = this.ownerAt(x, y);
    if (owner === this.current) return;

    this.current = owner;
    EventBus.emit(EVT.TERRITORY_ENTERED, { faction: owner });

    if (!owner) return;
    const f = FACTIONS[owner];
    const rep = GameState.factionRep(owner);
    const tono = rep <= REP.hostileBelow ? 'danger' : rep >= REP.friendlyAbove ? 'money' : 'dim';
    EventBus.emit(EVT.NOTIFY, { text: `Territorio de ${f.name}`, tone: tono });
  }

  // tocar a uno de los suyos te cierra puertas ahi y te las abre con los rivales
  onMemberHurt(faction) {
    if (!faction) return;
    GameState.changeFaction(faction, REP.hitMemberPenalty);
    for (const k of FACTION_KEYS) {
      if (k !== faction) GameState.changeFaction(k, REP.rivalBonus);
    }
    const f = FACTIONS[faction];
    EventBus.emit(EVT.NOTIFY, {
      text: `${f.short} te tiene fichado (${GameState.factionRep(faction)})`,
      tone: 'danger',
    });
  }

  currentInfo() {
    if (!this.current) return null;
    return {
      key: this.current,
      name: FACTIONS[this.current].name,
      short: FACTIONS[this.current].short,
      rep: GameState.factionRep(this.current),
      hostile: GameState.isHostile(this.current),
    };
  }
}
