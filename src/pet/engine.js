import { drawCharacter, headOffset, petSize } from './characters.js';
import { line } from './personas.js';

// World units are CSS pixels. The ground is `bounds.bottom` (the top of the
// taskbar on Windows), and open app windows act as extra platforms pets can
// stand and walk on.

const GRAVITY = 2300;
const TAU = Math.PI * 2;
const rand = (min, max) => min + Math.random() * (max - min);
const pick = (items) => items[Math.floor(Math.random() * items.length)];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function weighted(table) {
  const entries = Object.entries(table).filter(([, weight]) => weight > 0);
  let roll = Math.random() * entries.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [key, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return key;
  }
  return entries[0]?.[0] || 'idle';
}

const SURFACE_ANGLE = { ground: 0, platform: 0, left: Math.PI / 2, right: -Math.PI / 2, ceiling: Math.PI };

let nextId = 1;

export class Pet {
  constructor(world, config) {
    this.world = world;
    this.id = config.id || `pet-${nextId++}`;
    this.kind = config.kind;
    this.mode = config.mode || 'chibi';
    this.scale = config.scale || 1;
    this.image = config.image || null;
    this.x = config.x ?? rand(world.bounds.left + 120, world.bounds.right - 120);
    this.y = config.y ?? world.bounds.top - 40;
    this.vx = config.vx ?? rand(-120, 120);
    this.vy = config.vy ?? 0;
    this.surface = null;
    this.platformId = null;
    this.facing = Math.random() < .5 ? -1 : 1;
    this.action = 'fall';
    this.timer = 0;
    this.data = {};
    this.legPhase = 0;
    this.tilt = 0;
    this.tiltV = 0;
    this.squash = 0;
    this.look = { x: 0, y: 0 };
    this.energy = config.energy ?? 80;
    this.affection = config.affection ?? 0;
    this.thinking = false;
    this.talkUntil = 0;
    this.hidden = false;
    this.lastInteract = performance.now();
    this.nextChatAt = performance.now() + rand(90, 200) * 1000;
    this.greetCooldown = 0;
    this.petAccum = 0;
    this.fxTimer = 0;
  }

  get size() { return petSize(this.kind, this.mode, this.scale); }

  setLook(mode, scale) {
    if (mode) this.mode = mode;
    if (scale) this.scale = scale;
  }

  // ── geometry ──

  angle() { return SURFACE_ANGLE[this.surface] ?? 0; }

  toWorld(lx, ly) {
    const a = this.angle();
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    return { x: this.x + lx * cos - ly * sin, y: this.y + lx * sin + ly * cos };
  }

  toLocal(wx, wy) {
    const a = -this.angle();
    const dx = wx - this.x;
    const dy = wy - this.y;
    return { x: dx * Math.cos(a) - dy * Math.sin(a), y: dx * Math.sin(a) + dy * Math.cos(a) };
  }

  hit(wx, wy, pad = 6) {
    if (this.hidden) return false;
    const { w, h } = this.size;
    const local = this.toLocal(wx, wy);
    return Math.abs(local.x) < w / 2 + pad && local.y < pad && local.y > -h - pad;
  }

  hitHead(wx, wy) {
    const { h } = this.size;
    const local = this.toLocal(wx, wy);
    return this.hit(wx, wy) && local.y < -h * .55;
  }

  headPoint() {
    const head = headOffset(this.kind, this.mode, this.scale);
    if (this.action === 'drag') return { x: this.x, y: this.y + head.top };
    return this.toWorld(0, head.top);
  }

  // ── interactions ──

  touch() {
    this.lastInteract = performance.now();
    if (this.action === 'sleep') {
      this.say(line(this.kind, 'wake'));
      this.start('idle', rand(1, 2));
    }
  }

  say(text, ms) {
    this.world.emit('say', { pet: this, text, ms });
  }

  setTalking(ms) { this.talkUntil = performance.now() + ms; }

  react(kind) {
    this.touch();
    if (this.surface === null || this.action === 'drag') return;
    if (kind === 'click') {
      const choice = pick(['wave', 'jump', 'wave', 'surprise']);
      if (choice === 'jump' && this.onFloor()) this.hop(-560);
      else this.start(choice === 'surprise' ? 'surprise' : 'wave', 1.4);
      this.say(line(this.kind, 'click'));
      this.world.emit('sound', 'pop');
    } else if (kind === 'pet') {
      this.start('pet', 2.2);
      this.affection = Math.min(100, this.affection + 2);
      this.say(line(this.kind, 'pet'));
      this.burst('heart', 4);
      this.world.emit('affection', this);
    } else if (kind === 'dance') {
      if (this.onFloor()) this.start('dance', 5);
    } else if (kind === 'sleep') {
      if (this.onFloor()) { this.start('sleep', rand(30, 60)); this.say(line(this.kind, 'sleep')); }
    } else if (kind === 'sit') {
      if (this.onFloor()) this.start('sit', rand(8, 14));
    } else if (kind === 'climb') {
      if (this.onFloor() && this.surface === 'ground') this.goClimb();
    } else if (kind === 'jump') {
      if (this.onFloor()) this.hop(-820);
    }
  }

  grab(px, py) {
    this.touch();
    this.action = 'drag';
    this.surface = null;
    this.platformId = null;
    this.vx = 0;
    this.vy = 0;
    this.data = { history: [] };
    const head = headOffset(this.kind, this.mode, this.scale);
    this.grabDy = -head.y * .85;
    this.x = px;
    this.y = py + this.grabDy;
    this.world.emit('sound', 'grab');
  }

  dragTo(px, py, now) {
    const tx = px;
    const ty = py + this.grabDy;
    const history = this.data.history || (this.data.history = []);
    history.push({ x: px, y: py, t: now });
    while (history.length > 6) history.shift();
    const swing = (tx - this.x) * -.012;
    this.tiltV += (clamp(swing, -1, 1) - this.tilt) * .3;
    this.x = tx;
    this.y = ty;
  }

  release() {
    const history = this.data.history || [];
    let vx = 0;
    let vy = 0;
    if (history.length >= 2) {
      const a = history[0];
      const b = history[history.length - 1];
      const dt = Math.max(.016, (b.t - a.t) / 1000);
      vx = (b.x - a.x) / dt;
      vy = (b.y - a.y) / dt;
    }
    this.vx = clamp(vx, -2800, 2800);
    this.vy = clamp(vy, -2800, 2400);
    this.action = 'fall';
    this.surface = null;
    if (Math.hypot(this.vx, this.vy) > 1100) {
      this.say(line(this.kind, 'drop'), 1400);
      this.data.thrown = true;
    }
  }

  // ── actions ──

  start(action, duration = 1, data = {}) {
    this.action = action;
    this.timer = duration;
    this.data = data;
  }

  onFloor() { return this.surface === 'ground' || this.surface === 'platform'; }

  hop(vy = -620, vx = 0) {
    this.surface = null;
    this.platformId = null;
    this.vy = vy;
    this.vx = vx;
    this.action = 'jump';
    this.squash = .25;
    this.world.emit('sound', 'hop');
  }

  jumpTo(tx, ty) {
    const lift = Math.max(60, this.y - ty + 70);
    const vy = -Math.sqrt(2 * GRAVITY * lift);
    const fall = ty - this.y;
    const time = (-vy + Math.sqrt(Math.max(0, vy * vy + 2 * GRAVITY * fall))) / GRAVITY;
    const vx = (tx - this.x) / Math.max(.2, time);
    this.facing = vx >= 0 ? 1 : -1;
    this.hop(vy, clamp(vx, -1400, 1400));
  }

  goClimb() {
    const { left, right } = this.world.bounds;
    const toLeft = this.x - left < right - this.x;
    this.start('walk', 20, { target: toLeft ? left - 100 : right + 100, speed: 95, thenClimb: true });
  }

  burst(type, count = 3) {
    const head = this.headPoint();
    for (let i = 0; i < count; i += 1) {
      this.world.fx.push({ type, x: head.x + rand(-20, 20), y: head.y + rand(-6, 10), vx: rand(-30, 30), vy: rand(-80, -40), life: 0, max: rand(1, 1.6), size: rand(14, 20), spin: rand(-2, 2) });
    }
  }

  dust(count = 6) {
    for (let i = 0; i < count; i += 1) {
      this.world.fx.push({ type: 'dust', x: this.x + rand(-20, 20), y: this.y - 4, vx: rand(-90, 90), vy: rand(-60, -10), life: 0, max: rand(.35, .6), size: rand(5, 10) });
    }
  }

  // ── brain ──

  choose() {
    const world = this.world;
    const now = performance.now();
    const idleSec = (now - this.lastInteract) / 1000;
    const hour = new Date().getHours();
    const night = hour >= 23 || hour < 6;
    const quiet = world.options.quiet;
    const floor = this.onFloor();

    if (!floor) {
      if (this.surface) this.letGo();
      return undefined;
    }
    if (this.thinking) return this.start('idle', .6, { lookUp: true });

    // Food and toys first.
    const food = world.nearestFood(this);
    if (food) return this.goTo(food.x, food.platformId, 'food', food);
    const ball = world.balls[0];
    if (ball && !quiet && this.energy > 15 && Math.random() < .75) return this.goTo(ball.x, null, 'ball', ball);

    if (world.options.follow && world.pointer.inside) {
      const dx = world.pointer.x - this.x;
      if (Math.abs(dx) > 70) return this.start('walk', 4, { target: world.pointer.x - Math.sign(dx) * 50, speed: Math.abs(dx) > 400 ? 230 : 110 });
      return this.start('idle', .8);
    }

    if (now > this.nextChatAt && world.options.chatter && !quiet && idleSec > 30) {
      this.nextChatAt = now + rand(150, 360) * 1000;
      this.say(line(this.kind, 'bored'));
    }

    const peer = world.pets.find((other) => other !== this && !other.hidden && other.onFloor() && other.surface === this.surface && other.platformId === this.platformId && Math.abs(other.x - this.x) < 420);
    const platforms = world.platforms.filter((plat) => plat.y < this.y - 80 && plat.x2 - plat.x1 > 140);
    const table = {
      idle: 3,
      walk: 4,
      run: .6,
      sit: quiet ? 5 : 2,
      sleep: (night ? 3 : .2) + (idleSec > 150 ? 4 : 0) + (this.energy < 20 ? 4 : 0) + (quiet ? 2 : 0),
      hop: quiet ? 0 : .6,
      dance: quiet ? 0 : .3 + this.affection / 120,
      climb: this.surface === 'ground' && !quiet ? (this.kind === 'clawd' ? 1.4 : .45) : 0,
      jumpUp: this.surface === 'ground' && platforms.length && !quiet ? 1.1 : 0,
      hopDown: this.surface === 'platform' ? 1.1 : 0,
      greet: peer && this.greetCooldown <= 0 ? 2 : 0
    };
    const choice = weighted(table);
    const { left, right } = this.surfaceRange();
    switch (choice) {
      case 'walk': return this.start('walk', 8, { target: rand(left, right), speed: rand(55, 85) });
      case 'run': return this.start('walk', 5, { target: rand(left, right), speed: rand(190, 240) });
      case 'sit': return this.start('sit', rand(5, 12));
      case 'sleep': this.say(line(this.kind, 'sleep'), 1600); return this.start('sleep', rand(20, 50));
      case 'hop': this.hop(-rand(480, 700), this.facing * rand(40, 140)); return undefined;
      case 'dance': return this.start('dance', rand(3.5, 6));
      case 'climb': this.say(line(this.kind, 'climb'), 1600); return this.goClimb();
      case 'jumpUp': {
        const plat = pick(platforms);
        const target = rand(plat.x1 + 40, plat.x2 - 40);
        return this.start('walk', 6, { target: target - Math.sign(target - this.x) * 120, speed: 120, thenJump: { x: target, y: plat.y } });
      }
      case 'hopDown': {
        const plat = this.platform();
        const goLeft = Math.random() < .5;
        return this.start('walk', 8, { target: plat ? (goLeft ? plat.x1 - 60 : plat.x2 + 60) : this.x, speed: 90, offEdge: true });
      }
      case 'greet': {
        this.greetCooldown = 40;
        peer.greetCooldown = 40;
        this.facing = peer.x > this.x ? 1 : -1;
        peer.facing = -this.facing;
        this.start('wave', 1.6);
        peer.start('wave', 1.6);
        this.say(line(this.kind, 'greetPeer'), 1600);
        window.setTimeout(() => peer.say(line(peer.kind, 'greetPeer'), 1600), 700);
        return undefined;
      }
      default: return this.start('idle', rand(1.5, 4));
    }
  }

  surfaceRange() {
    const { w } = this.size;
    const plat = this.platform();
    if (this.surface === 'platform' && plat) return { left: plat.x1 + w * .4, right: plat.x2 - w * .4 };
    return { left: this.world.bounds.left + w * .6, right: this.world.bounds.right - w * .6 };
  }

  platform() { return this.world.platforms.find((plat) => plat.id === this.platformId); }

  goTo(x, platformId, purpose, target) {
    const samePlace = (platformId || null) === (this.surface === 'platform' ? this.platformId : null);
    if (samePlace) return this.start('walk', 10, { target: x, speed: purpose === 'ball' ? 230 : 170, purpose, ref: target });
    if (platformId && this.surface === 'ground') {
      const plat = this.world.platforms.find((item) => item.id === platformId);
      if (plat) return this.start('walk', 6, { target: x - Math.sign(x - this.x) * 120, speed: 170, thenJump: { x, y: plat.y }, purpose, ref: target });
    }
    const plat = this.platform();
    if (plat) {
      const edge = x < (plat.x1 + plat.x2) / 2 ? plat.x1 - 60 : plat.x2 + 60;
      return this.start('walk', 8, { target: edge, speed: 170, offEdge: true });
    }
    return this.start('idle', 1);
  }

  // ── simulation ──

  update(dt, t) {
    const world = this.world;
    const { w, h } = this.size;
    const now = performance.now();
    this.greetCooldown -= dt;
    this.squash *= Math.pow(.0005, dt);
    this.tiltV *= Math.pow(.02, dt);
    this.tilt += this.tiltV * dt * 8;
    if (this.action !== 'drag') this.tilt *= Math.pow(.004, dt);
    this.energy = clamp(this.energy + (this.action === 'sleep' ? 2.5 : this.action === 'walk' ? -.25 : -.05) * dt, 0, 100);

    // Gaze: follow the pointer when it is near, otherwise drift.
    const pointer = world.pointer;
    const head = this.headPoint();
    const near = pointer.inside && Math.hypot(pointer.x - head.x, pointer.y - head.y) < 500;
    const tx = near ? clamp((pointer.x - head.x) / 220, -1, 1) * this.facingSign() : Math.sin(t * .4 + this.x) * .3;
    const ty = near ? clamp((pointer.y - head.y) / 220, -1, 1) : 0;
    this.look.x += (tx - this.look.x) * Math.min(1, dt * 6);
    this.look.y += ((this.data.lookUp ? -.8 : ty) - this.look.y) * Math.min(1, dt * 6);
    this.petAccum = Math.max(0, this.petAccum - dt * 200);

    if (this.action === 'drag') {
      this.tiltV -= this.tilt * 9 * dt;
      return undefined;
    }
    if (this.hidden) return undefined;

    if (this.surface === null) {
      this.vy += GRAVITY * dt;
      const prevY = this.y;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.facing = this.vx > 30 ? 1 : this.vx < -30 ? -1 : this.facing;
      this.tilt = clamp(this.vx / 2400, -.35, .35);
      const { left, right, top, bottom } = world.bounds;
      if (this.x - w / 2 < left) {
        this.x = left + w / 2;
        if (Math.abs(this.vx) > 700 && this.vy < 600) return this.stickWall('left');
        this.vx = Math.abs(this.vx) * .45;
        this.world.emit('sound', 'bump');
      } else if (this.x + w / 2 > right) {
        this.x = right - w / 2;
        if (Math.abs(this.vx) > 700 && this.vy < 600) return this.stickWall('right');
        this.vx = -Math.abs(this.vx) * .45;
        this.world.emit('sound', 'bump');
      }
      if (this.y - h < top && this.vy < 0) {
        this.y = top + h;
        if (this.kind === 'clawd') {
          this.surface = 'ceiling';
          this.y = top;
          this.vx = 0;
          this.vy = 0;
          return this.start('crawl', rand(4, 8), { dir: Math.random() < .5 ? -1 : 1 });
        }
        this.vy = Math.abs(this.vy) * .3;
      }
      if (this.vy > 0) {
        const plat = world.platforms.find((item) => prevY <= item.y + 1 && this.y >= item.y && this.x > item.x1 + 4 && this.x < item.x2 - 4);
        if (plat) return this.land('platform', plat);
        if (this.y >= bottom) return this.land('ground');
      }
      return undefined;
    }

    // Riding a moving window.
    if (this.surface === 'platform') {
      const plat = this.platform();
      if (!plat) return this.fallOff();
      this.x += plat.dx || 0;
      this.y = plat.y;
      if (this.x < plat.x1 - 4 || this.x > plat.x2 + 4) return this.fallOff();
    } else if (this.surface === 'ground') {
      this.y = world.bounds.bottom;
      this.x = clamp(this.x, world.bounds.left + w / 2, world.bounds.right - w / 2);
    }

    this.timer -= dt;
    switch (this.action) {
      case 'walk': this.stepWalk(dt); break;
      case 'climb': this.stepClimb(dt); break;
      case 'crawl': this.stepCrawl(dt); break;
      case 'cling': if (this.timer <= 0) this.letGo(); break;
      case 'sleep':
        this.fxTimer -= dt;
        if (this.fxTimer <= 0) { this.fxTimer = 1.3; world.fx.push({ type: 'z', x: head.x + 14 * this.facing, y: head.y, vx: 18 * this.facing, vy: -26, life: 0, max: 2.4, size: rand(13, 18) }); }
        if (this.timer <= 0) { this.say(line(this.kind, 'wake'), 1600); this.start('idle', 1.5); }
        break;
      case 'dance':
        this.fxTimer -= dt;
        this.facing = Math.sin(t * 3) > 0 ? 1 : -1;
        if (this.fxTimer <= 0) { this.fxTimer = .5; world.fx.push({ type: 'note', x: head.x + rand(-30, 30), y: head.y, vx: rand(-20, 20), vy: -50, life: 0, max: 1.4, size: 18 }); }
        break;
      case 'dizzy':
        this.fxTimer -= dt;
        if (this.fxTimer <= 0) { this.fxTimer = .12; world.fx.push({ type: 'orbit', x: head.x, y: head.y, life: 0, max: .14, phase: t }); }
        break;
      case 'eat': {
        this.fxTimer -= dt;
        if (this.fxTimer <= 0) { this.fxTimer = .25; world.fx.push({ type: 'crumb', x: this.x + rand(-10, 10), y: head.y + h * .3, vx: rand(-60, 60), vy: rand(-80, -20), life: 0, max: .7, size: 4 }); }
        if (this.timer <= 0) { this.burst('heart', 3); this.say(line(this.kind, 'eat'), 1600); this.energy = Math.min(100, this.energy + 25); this.affection = Math.min(100, this.affection + 1); this.world.emit('affection', this); this.start('idle', 1); }
        break;
      }
      default: break;
    }
    if (this.timer <= 0 && !['walk', 'climb', 'crawl', 'cling'].includes(this.action)) this.choose();
    return undefined;
  }

  facingSign() { return this.surface === 'ceiling' ? -this.facing : this.facing; }

  stepWalk(dt) {
    const { target, speed, thenClimb, thenJump, offEdge, purpose, ref } = this.data;
    const { left, right } = this.world.bounds;
    const { w } = this.size;
    const dx = target - this.x;
    this.facing = dx >= 0 ? 1 : -1;
    const step = Math.min(Math.abs(dx), speed * this.scale * dt);
    this.x += step * this.facing;
    this.legPhase += step * .09 / this.scale;
    if (purpose === 'food' && ref && !this.world.foods.includes(ref)) return this.start('idle', .5);
    if (purpose === 'ball' && ref) {
      this.data.target = ref.x;
      if (Math.abs(ref.x - this.x) < w * .55 + ref.r && ref.y > this.y - 70) return this.kick(ref);
      if (this.timer <= 0) return this.start('idle', 1);
      return undefined;
    }
    if (thenClimb && (this.x - w / 2 <= left + 1 || this.x + w / 2 >= right - 1)) return this.stickWall(this.x - w / 2 <= left + 1 ? 'left' : 'right', true);
    if (Math.abs(dx) < 1 || this.timer <= 0) {
      if (purpose === 'food' && ref) return this.eat(ref);
      if (thenJump) return this.jumpTo(thenJump.x, thenJump.y);
      if (offEdge) return this.fallOff();
      return this.choose();
    }
    return undefined;
  }

  kick(ball) {
    ball.vx = this.facing * rand(420, 780);
    ball.vy = -rand(480, 820);
    ball.spinV = ball.vx / ball.r;
    this.energy = Math.max(0, this.energy - 4);
    this.start('wave', .5);
    if (Math.random() < .3) this.say(line(this.kind, 'ball'), 1200);
    this.world.emit('sound', 'kick');
  }

  eat(food) {
    this.world.foods = this.world.foods.filter((item) => item !== food);
    this.start('eat', 2.2, { item: food.emoji });
    this.world.emit('sound', 'munch');
  }

  stickWall(side, walking = false) {
    this.surface = side;
    this.platformId = null;
    this.x = side === 'left' ? this.world.bounds.left : this.world.bounds.right;
    this.vx = 0;
    this.vy = 0;
    // Along a wall the body's width becomes its vertical extent.
    const half = this.size.w / 2 + 2;
    this.y = walking ? this.world.bounds.bottom - half : Math.min(this.y - this.size.h / 2, this.world.bounds.bottom - half);
    const top = this.world.bounds.top + this.size.w;
    this.start('climb', 30, { targetY: rand(top, this.world.bounds.bottom - 160) });
  }

  stepClimb(dt) {
    const speed = (this.kind === 'clawd' ? 90 : 60) * this.scale;
    // Facing in local space points "up the wall": see SURFACE_ANGLE.
    this.facing = this.surface === 'left' ? -1 : 1;
    this.y -= speed * dt;
    this.legPhase += speed * dt * .09;
    const top = this.world.bounds.top + this.size.w * .6;
    if (this.y <= top && this.kind === 'clawd') {
      const fromLeft = this.surface === 'left';
      this.surface = 'ceiling';
      this.y = this.world.bounds.top;
      this.x += fromLeft ? this.size.h : -this.size.h;
      return this.start('crawl', rand(5, 9), { dir: this.x < (this.world.bounds.left + this.world.bounds.right) / 2 ? 1 : -1 });
    }
    if (this.y <= this.data.targetY || this.y <= top) return this.start('cling', rand(1.5, 3.5));
    return undefined;
  }

  stepCrawl(dt) {
    const { left, right, top } = this.world.bounds;
    const speed = 70 * this.scale;
    this.y = top;
    this.x += this.data.dir * speed * dt;
    // On the ceiling the local forward axis points to world -x.
    this.facing = -this.data.dir;
    this.legPhase += speed * dt * .09;
    if (this.x < left + this.size.w || this.x > right - this.size.w) this.data.dir *= -1;
    if (this.timer <= 0) this.letGo();
  }

  letGo() {
    const side = this.surface;
    const { h } = this.size;
    const pos = this.toWorld(0, -h / 2);
    this.surface = null;
    this.x = pos.x;
    this.y = pos.y + h / 2;
    this.vx = side === 'left' ? 160 : side === 'right' ? -160 : 0;
    this.vy = side === 'ceiling' ? 50 : -180;
    this.action = 'fall';
  }

  fallOff() {
    this.surface = null;
    this.platformId = null;
    this.vy = 0;
    this.vx = this.facing * 90;
    this.action = 'fall';
  }

  land(surface, plat) {
    const impact = this.vy;
    this.surface = surface;
    this.platformId = plat?.id || null;
    this.y = plat ? plat.y : this.world.bounds.bottom;
    this.vy = 0;
    this.vx = 0;
    this.tilt = 0;
    this.squash = clamp(impact / 2600, .1, .5);
    if (impact > 1500 && this.data.thrown) {
      this.dust(10);
      this.start('dizzy', 2.6);
      this.say(line(this.kind, 'dizzy'), 1800);
      this.world.emit('sound', 'thud');
    } else {
      if (impact > 700) this.dust(5);
      this.start('land', .3);
      this.world.emit('sound', 'land');
      if (surface === 'platform' && Math.random() < .25) this.say(line(this.kind, 'window'), 1600);
    }
  }

  // Pose consumed by characters.js.
  pose(t) {
    const action = this.action;
    const talk = performance.now() < this.talkUntil ? (Math.sin(t * 16) + 1) / 2 : 0;
    const pose = { legs: 'stand', arms: 'down', eyes: 'open', mouth: 'smile', talk, look: this.look, legPhase: this.legPhase, blush: this.affection / 140, calm: 1 };
    if (action === 'walk' || action === 'climb' || action === 'crawl') { pose.legs = 'walk'; if (action === 'climb') pose.arms = 'climb'; }
    if (action === 'cling') { pose.arms = 'climb'; pose.legs = 'dangle'; }
    if (action === 'sit') { pose.legs = 'sit'; pose.calm = .6; }
    if (action === 'sleep') { pose.legs = 'sit'; pose.eyes = 'closed'; pose.mouth = 'o'; pose.calm = .4; }
    if (action === 'fall' || action === 'jump') { pose.legs = 'dangle'; pose.arms = this.vy > 200 ? 'up' : 'cheer'; pose.eyes = this.vy > 900 ? 'wide' : 'happy'; pose.mouth = this.vy > 900 ? 'o' : 'smile'; }
    if (action === 'drag') { pose.legs = 'dangle'; pose.arms = 'up'; pose.eyes = Math.abs(this.tilt) > .45 ? 'wide' : 'happy'; pose.mouth = Math.abs(this.tilt) > .45 ? 'o' : 'cat'; }
    if (action === 'dance') { pose.arms = 'cheer'; pose.eyes = 'happy'; pose.legs = 'walk'; pose.legPhase = t * 9; pose.mouth = 'open'; }
    if (action === 'wave') { pose.arms = 'wave'; pose.eyes = 'happy'; }
    if (action === 'surprise') { pose.arms = 'up'; pose.eyes = 'wide'; pose.mouth = 'o'; }
    if (action === 'pet') { pose.eyes = 'happy'; pose.mouth = 'cat'; pose.blush = 1; pose.arms = 'hug'; }
    if (action === 'eat') { pose.arms = 'hold'; pose.item = this.data.item; pose.mouth = 'chomp'; pose.eyes = 'happy'; }
    if (action === 'dizzy') { pose.eyes = 'dizzy'; pose.mouth = 'wobble'; pose.legs = 'sit'; }
    if (action === 'land') { pose.legs = 'tuck'; }
    if (this.thinking) { pose.eyes = 'open'; pose.look = { x: .3, y: -.9 }; pose.mouth = 'flat'; }
    return pose;
  }

  draw(ctx, t) {
    if (this.hidden) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle());
    if (this.action === 'drag') {
      // Hang from the grab point near the head and swing like a pendulum.
      ctx.translate(0, -this.grabDy);
      ctx.rotate(this.tilt);
      ctx.translate(0, this.grabDy);
    } else {
      ctx.rotate(this.tilt);
    }
    const squash = this.squash;
    ctx.scale((1 + squash * .6) * this.facing, 1 - squash * .5);
    // Soft contact shadow on floors.
    if (this.onFloor()) {
      ctx.save();
      ctx.globalAlpha = .18;
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(0, 0, this.size.w * .42, 5, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
    drawCharacter(ctx, this.kind, this.mode, this.scale, this.pose(t), t, { image: this.image });
    ctx.restore();
    if (this.thinking) {
      const head = this.headPoint();
      ctx.save();
      ctx.translate(head.x + 26, head.y - 10);
      ctx.rotate(t * 3);
      ctx.strokeStyle = '#d97757';
      ctx.lineWidth = 3.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) { const a = (i / 6) * TAU; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 9); }
      ctx.stroke();
      ctx.restore();
    }
  }
}

export class World {
  constructor() {
    this.pets = [];
    this.foods = [];
    this.balls = [];
    this.fx = [];
    this.platforms = [];
    this.bounds = { left: 0, top: 0, right: 800, bottom: 600 };
    this.pointer = { x: 0, y: 0, inside: false };
    this.options = { quiet: false, chatter: true, follow: false };
    this.listeners = {};
    this.held = null;
  }

  on(event, handler) { (this.listeners[event] ||= []).push(handler); }
  emit(event, data) { (this.listeners[event] || []).forEach((handler) => handler(data)); }

  setBounds(bounds) {
    this.bounds = { ...bounds };
    for (const pet of this.pets) {
      if (pet.surface === 'ground') pet.y = bounds.bottom;
      if (pet.surface === 'right') pet.x = bounds.right;
      pet.x = clamp(pet.x, bounds.left, bounds.right);
    }
  }

  setPlatforms(list) {
    const previous = new Map(this.platforms.map((plat) => [plat.id, plat]));
    this.platforms = list.map((plat) => {
      const before = previous.get(plat.id);
      return { ...plat, dx: before ? plat.x1 - before.x1 : 0 };
    });
  }

  addPet(config) {
    const pet = new Pet(this, config);
    this.pets.push(pet);
    return pet;
  }

  removePet(id) { this.pets = this.pets.filter((pet) => pet.id !== id); }

  dropFood(x, emoji) {
    this.foods.push({ x: clamp(x, this.bounds.left + 30, this.bounds.right - 30), y: this.bounds.top - 20, vy: 0, emoji, platformId: null, landed: false, rot: rand(-.4, .4) });
  }

  nearestFood(pet) {
    let best = null;
    let bestDist = Infinity;
    for (const food of this.foods) {
      if (!food.landed) continue;
      const claimed = this.pets.some((other) => other !== pet && other.data?.ref === food);
      const dist = Math.abs(food.x - pet.x) + (claimed ? 400 : 0);
      if (dist < bestDist) { best = food; bestDist = dist; }
    }
    return best;
  }

  toggleBall() {
    if (this.balls.length) { this.balls = []; return false; }
    this.balls.push({ x: (this.bounds.left + this.bounds.right) / 2, y: this.bounds.top + 40, vx: rand(-300, 300), vy: 0, r: 16, rot: 0, spinV: 0 });
    window.setTimeout(() => this.distract(), 600);
    return true;
  }

  // Something interesting appeared: idle pets reconsider what to do.
  distract() {
    for (const pet of this.pets) {
      if (pet.onFloor() && !pet.thinking && ['idle', 'sit', 'dance', 'wave'].includes(pet.action)) pet.choose();
      else if (pet.onFloor() && pet.action === 'walk' && !pet.data.purpose) pet.choose();
    }
  }

  hitTest(x, y) {
    const ball = this.balls.find((item) => Math.hypot(item.x - x, item.y - y) < item.r + 8);
    if (ball) return { type: 'ball', ref: ball };
    for (let i = this.pets.length - 1; i >= 0; i -= 1) {
      if (this.pets[i].hit(x, y)) return { type: 'pet', ref: this.pets[i] };
    }
    return null;
  }

  pointerMove(x, y, down) {
    const dx = Math.abs(x - this.pointer.x);
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.inside = true;
    if (down) return;
    for (const pet of this.pets) {
      if (!pet.onFloor() || pet.action === 'pet' || !pet.hitHead(x, y)) continue;
      pet.petAccum += dx;
      if (pet.petAccum > 320) { pet.petAccum = 0; pet.react('pet'); }
    }
  }

  update(dt, t) {
    dt = Math.max(0, Math.min(dt, .05));
    for (const pet of this.pets) pet.update(dt, t);
    const { left, right, top, bottom } = this.bounds;
    for (const food of this.foods) {
      if (food.landed) {
        if (food.platformId && !this.platforms.some((plat) => plat.id === food.platformId)) { food.landed = false; food.platformId = null; }
        else { const plat = this.platforms.find((item) => item.id === food.platformId); if (plat) { food.x += plat.dx || 0; food.y = plat.y; } }
        continue;
      }
      const prevY = food.y;
      food.vy += GRAVITY * .6 * dt;
      food.y += food.vy * dt;
      const plat = this.platforms.find((item) => prevY <= item.y && food.y >= item.y && food.x > item.x1 && food.x < item.x2);
      if (plat) { food.y = plat.y; food.landed = true; food.platformId = plat.id; }
      else if (food.y >= bottom) { food.y = bottom; food.landed = true; }
      if (food.landed) this.distract();
    }
    for (const ball of this.balls) {
      if (ball === this.held) continue;
      const prevY = ball.y;
      ball.vy += GRAVITY * .8 * dt;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      ball.rot += (ball.vx / ball.r) * dt;
      if (ball.x - ball.r < left) { ball.x = left + ball.r; ball.vx = Math.abs(ball.vx) * .75; }
      if (ball.x + ball.r > right) { ball.x = right - ball.r; ball.vx = -Math.abs(ball.vx) * .75; }
      if (ball.y - ball.r < top) { ball.y = top + ball.r; ball.vy = Math.abs(ball.vy) * .6; }
      const plat = ball.vy > 0 && this.platforms.find((item) => prevY + ball.r <= item.y + 2 && ball.y + ball.r >= item.y && ball.x > item.x1 && ball.x < item.x2);
      const floor = plat ? plat.y : bottom;
      if (ball.y + ball.r >= floor && ball.vy >= 0 && (plat || ball.y + ball.r >= bottom)) {
        ball.y = floor - ball.r;
        ball.vy = Math.abs(ball.vy) > 120 ? -Math.abs(ball.vy) * .62 : 0;
        ball.vx *= Math.pow(.25, dt);
        if (plat) ball.x += plat.dx || 0;
      }
    }
    for (const fx of this.fx) {
      fx.life += dt;
      fx.x += (fx.vx || 0) * dt;
      fx.y += (fx.vy || 0) * dt;
    }
    this.fx = this.fx.filter((fx) => fx.life < fx.max);
  }

  draw(ctx, t) {
    for (const food of this.foods) {
      ctx.save();
      ctx.translate(food.x, food.y);
      ctx.rotate(food.landed ? 0 : food.rot + t * 3);
      ctx.font = '30px "Apple Color Emoji","Segoe UI Emoji",sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(food.emoji, 0, 4);
      ctx.restore();
    }
    for (const ball of this.balls) {
      ctx.save();
      ctx.translate(ball.x, ball.y);
      ctx.rotate(ball.rot);
      const grad = ctx.createRadialGradient(-ball.r * .35, -ball.r * .35, 2, 0, 0, ball.r);
      grad.addColorStop(0, '#fff7ae');
      grad.addColorStop(1, '#ff7a59');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(0, 0, ball.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(0, 0, ball.r * .62, -.6, 1.6); ctx.stroke();
      ctx.restore();
    }
    const sorted = [...this.pets].sort((a, b) => (a.action === 'drag') - (b.action === 'drag'));
    for (const pet of sorted) pet.draw(ctx, t);
    for (const fx of this.fx) drawFx(ctx, fx, t);
  }
}

function drawFx(ctx, fx, t) {
  const k = fx.life / fx.max;
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - k * k);
  if (fx.type === 'dust') {
    ctx.fillStyle = 'rgba(240,235,255,.75)';
    ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.size * (1 + k), 0, TAU); ctx.fill();
  } else if (fx.type === 'orbit') {
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffd25e';
    for (let i = 0; i < 3; i += 1) {
      const a = fx.phase * 5 + (i / 3) * TAU;
      drawStar(ctx, fx.x + Math.cos(a) * 26, fx.y - 4 + Math.sin(a) * 8, 5);
    }
  } else if (fx.type === 'crumb') {
    ctx.fillStyle = '#f2d39b';
    ctx.fillRect(fx.x, fx.y, fx.size, fx.size);
  } else {
    if (fx.type === 'note') fx.glyph ||= Math.random() < .5 ? '♪' : '♫';
    const glyph = fx.glyph || { heart: '♥', z: 'z', spark: '✦' }[fx.type] || '✦';
    ctx.fillStyle = { heart: '#ff6f91', z: '#a8b4ff', note: '#ffd25e', spark: '#fff2a8' }[fx.type] || '#fff';
    ctx.font = `bold ${fx.size * (fx.type === 'heart' ? 1 + Math.sin(k * Math.PI) * .3 : 1)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.translate(fx.x + Math.sin(t * 3 + fx.x) * 4, fx.y);
    ctx.fillText(glyph, 0, 0);
  }
  ctx.restore();
}

function drawStar(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * TAU - Math.PI / 2;
    const rad = i % 2 ? r * .45 : r;
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
}
