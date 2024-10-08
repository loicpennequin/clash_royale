import { Actor, Circle, Color, Vector } from 'excalibur';
import { DEBUG, SHOW_SPRITES } from '@/constants';
import { GameCoords, toScreen } from '@/utils/game-coords';
import { SerializedUnit, UNIT_ORIENTATION, UNIT_STATES, UnitState } from '@game/logic';
import { resources } from '@/resources';
import { UnitHealthBar } from './unit-health-bar';

const unitColors: Record<UnitState, Color> = {
  [UNIT_STATES.SPAWNING]: Color.Magenta,
  [UNIT_STATES.MOVING]: Color.Blue,
  [UNIT_STATES.ATTACKING]: Color.Red
};

const unitAnimation: Record<UnitState, string> = {
  [UNIT_STATES.SPAWNING]: 'idle',
  [UNIT_STATES.MOVING]: 'walk',
  [UNIT_STATES.ATTACKING]: 'attack01'
};

export class UnitActor extends Actor {
  private attackRange: number;

  private aggroRange: number;

  private spritesheet = resources.knightSheet;

  private state: UnitState;

  private readonly healthBar: UnitHealthBar;

  constructor(blueprint: SerializedUnit) {
    const { x, y } = new GameCoords(blueprint.body.x, blueprint.body.y).toScreenCoords();

    super({
      x,
      y,
      width: toScreen(blueprint.body.width),
      height: toScreen(blueprint.body.height),
      color: Color.Magenta
    });

    this.state = blueprint.state;
    this.attackRange = toScreen(blueprint.attackRange);
    this.aggroRange = toScreen(blueprint.aggroRange);
    this.healthBar = new UnitHealthBar();

    this.updateSprite();
    this.addChild(this.healthBar);

    if (DEBUG) {
      this.debug();
    }
  }

  onPreUpdate(): void {
    this.z = Math.round(this.pos.y);
  }

  onStateUpdate(newUnit: SerializedUnit) {
    this.healthBar.onStateUpdate(newUnit);

    this.attackRange = toScreen(newUnit.attackRange);
    this.aggroRange = toScreen(newUnit.aggroRange);
    this.color = unitColors[newUnit.state];
    this.graphics.flipHorizontal = newUnit.orientation === UNIT_ORIENTATION.LEFT;

    if (this.state !== newUnit.state) {
      if (SHOW_SPRITES) {
        const graphics = this.spritesheet.getAnimation(unitAnimation[newUnit.state])!;
        this.graphics.use(graphics);
        this.state = newUnit.state;
        this.updateSprite();
      } else {
        this.color = unitColors[newUnit.state];
      }
    }

    // There is a bug with Excalibur's Vector.normalize() that returns {0,1} when normalizing a vector with a mmagnitude of 0
    // it swill be fixed in the next Excalibur Vue.version
    // see https://github.com/excaliburjs/Excalibur/commit/46ba314ebb751214dffb63ed1465adededfd8ec7#diff-06572a96a58dc510037d5efa622f9bec8519bc1beab13c9f251e97e657a9d4ed
    const vel = new Vector(newUnit.velocity.x, newUnit.velocity.y);
    if (vel.distance() === 0) {
      this.vel = Vector.Zero;
    } else {
      this.vel = vel.normalize().scale(toScreen(newUnit.speed));
    }
  }

  updateSprite() {
    const graphics = this.spritesheet.getAnimation(unitAnimation[this.state])!;

    if (SHOW_SPRITES && DEBUG) {
      const tint = unitColors[this.state].clone().lighten(0.65);
      graphics.tint = tint;
    }
    this.graphics.use(graphics);
  }

  debugAttackRange() {
    const color = Color.Red;
    color.a = 0.25;

    const circle = new Circle({
      color,
      radius: this.attackRange
    });

    const actor = new Actor({
      x: 0,
      y: 0
    });
    actor.graphics.use(circle);
    this.addChild(actor);
  }

  debugAggroRange() {
    const color = Color.Azure;
    color.a = 0.25;

    const circle = new Circle({
      color,
      radius: this.aggroRange
    });

    const actor = new Actor({
      x: 0,
      y: 0
    });
    actor.graphics.use(circle);
    this.addChild(actor);
  }

  debug() {
    this.debugAggroRange();
    this.debugAttackRange();
  }
}
