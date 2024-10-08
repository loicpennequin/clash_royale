import {
  type Point,
  pointRectCollision,
  type Serializable,
  type StrictOmit,
  Vec2
} from '@game/shared';
import { GameSession } from '../game-session';
import { Tower, type SerializedTower } from '../tower/tower.entity';
import { Team } from '../team/team.entity';
import { Entity } from '../entity';
import { config } from '../config';
import { ManaSystem, type ManaSystemBlueprint } from '../mana/mana-system.entity';
import { type SerializedUnit, Unit, type UnitBlueprint } from '../unit/unit.entity';
import {
  Deck,
  type DeckBlueprint,
  DeckSystem,
  type SerializedDeckSystem
} from '../cards/cards';
import * as console from 'node:console';

export type PlayerId = string;

/**
 * The shape of the input used to create a player
 */
export type PlayerBlueprint = {
  id: PlayerId;
  innerTower: Point;
  outerTowers: Point[];
  manaSystem: ManaSystemBlueprint;
  deck: DeckBlueprint;
};

/**
 * The JSON serializable representation of a player that is sent to the game session subscrbers
 */
export type SerializedPlayer = {
  id: string;
  currentMana: number;
  maxMana: number;
  towers: SerializedTower[];
  units: SerializedUnit[];
  deckSystem: SerializedDeckSystem;
};

export class Player extends Entity implements Serializable<SerializedPlayer> {
  private session: GameSession;

  private team: Team;

  readonly towers: Set<Tower> = new Set();

  readonly units: Set<Unit> = new Set();

  private nextUnitId = 0;

  readonly manaSystem: ManaSystem;

  readonly deckSystem: DeckSystem;

  constructor(session: GameSession, blueprint: PlayerBlueprint, team: Team) {
    super(blueprint.id);
    this.team = team;
    this.session = session;
    this.addInnerTower(blueprint.innerTower.x, blueprint.innerTower.y);
    blueprint.outerTowers.forEach(({ x, y }) => {
      this.addOuterTower(x, y);
    });
    this.manaSystem = new ManaSystem(blueprint.manaSystem);
    this.deckSystem = new DeckSystem({
      id: `${this.id}_deck`,
      deck: new Deck(blueprint.deck)
    });

    // :(
    // this.deckSystem.subscribeBeforePlay((p, c, t) => console.log(`BEFORE: ${p.id} is playing ${c.id} at ${t}`))
    // this.deckSystem.subscribeOnPlay((p, c, t) => console.log(`ON: ${p.id} is playing ${c.id} at ${t}`))
    // this.deckSystem.subscribeAfterPlay((p, c, t) => console.log(`AFTER: ${p.id} is playing ${c.id} at ${t}`))
  }

  update(delta: number) {
    this.manaSystem.update(delta);
    this.deckSystem.update(delta);
    this.towers.forEach(tower => {
      tower.update(delta);
    });
    this.units.forEach(unit => {
      unit.update(delta);
    });
  }

  equals(player: Player) {
    return this.id === player.id;
  }

  opponents() {
    return [...this.session.teams.find(team => !team.equals(this.team))!.players];
  }

  addInnerTower(x: number, y: number) {
    const tower = new Tower({
      position: Vec2.from({ x, y }),
      blueprint: {
        id: this.id + '_ti',
        attack: config.INNER_TOWER_ATTACK,
        attackSpeed: config.INNER_TOWER_ATTACK_SPEED,
        health: config.INNER_TOWER_HEALTH,
        attackRange: config.INNER_TOWER_RANGE,
        width: config.TOWER_WIDTH,
        height: config.TOWER_HEIGHT
      },
      player: this
    });
    this.towers.add(tower);

    tower.subscribeDestroyed(() => {
      this.towers.delete(tower);
    });

    return tower;
  }

  addOuterTower(x: number, y: number) {
    const tower = new Tower({
      position: Vec2.from({ x, y }),
      blueprint: {
        id: this.id + `_to_${this.towers.size + 1}`,
        attack: config.OUTER_TOWER_ATTACK,
        health: config.OUTER_TOWER_HEALTH,
        attackRange: config.OUTER_TOWER_RANGE,
        attackSpeed: config.OUTER_TOWER_ATTACK_SPEED,
        width: config.TOWER_WIDTH,
        height: config.TOWER_HEIGHT
      },
      player: this
    });
    this.towers.add(tower);

    tower.subscribeDestroyed(() => {
      this.towers.delete(tower);
    });

    return tower;
  }

  deployUnit(blueprint: StrictOmit<UnitBlueprint, 'id'>, position: Point) {
    const isWithinDeployZone = pointRectCollision(position, this.team.deployZone);
    if (!isWithinDeployZone) return;

    const unit = new Unit({
      position: Vec2.from(position),
      blueprint: {
        ...blueprint,
        id: `${this.id}_u_${++this.nextUnitId}`
      },
      player: this
    });

    this.units.add(unit);

    unit.subscribeDestroyed(() => {
      this.units.delete(unit);
    });

    return unit;
  }

  serialize() {
    return {
      id: this.id,
      currentMana: this.manaSystem.current(),
      maxMana: this.manaSystem.capacity(),
      towers: [...this.towers].map(tower => tower.serialize()),
      units: [...this.units].map(unit => unit.serialize()),
      deckSystem: this.deckSystem.serialize()
    };
  }
}
