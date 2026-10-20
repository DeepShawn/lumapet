const TAU = Math.PI * 2;

function lerp(from, to, amount) {
  return from + (to - from) * Math.min(1, amount);
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

// Character palettes. Each anime-style character is drawn from the same rig;
// the palette plus a few accessories carry the identity from the reference sheets.
const PALETTES = {
  gpt: {
    hair: '#f3f0ff', hairShade: '#c9bdf2', hairLine: '#8f80c8',
    skin: '#fff0e8', eye: '#8a72d8', eyeDeep: '#4b3a8f',
    dress: '#ffffff', dressShade: '#e4dcff', trim: '#a78bfa', line: '#7a6bb3'
  },
  deepseek: {
    hair: '#3d63b8', hairShade: '#284a93', hairLine: '#1d3470',
    skin: '#ffeee6', eye: '#3fa2ff', eyeDeep: '#1c4f9c',
    dress: '#f4f8ff', dressShade: '#c9dcf7', trim: '#2b4c9b', line: '#1d3470'
  },
  claude: {
    hair: '#ec7a3c', hairShade: '#c95a26', hairLine: '#8f3b16',
    skin: '#fff0e6', eye: '#c7742e', eyeDeep: '#6e3510',
    dress: '#fbf4e8', dressShade: '#ead9c0', trim: '#d9612b', line: '#6b3a1e',
    bodice: '#2b2321'
  }
};

// Clawd, the Claude Code mascot, as a 16 × 8 pixel sprite.
// B = body, E = eye, A = arm, L = leg.
const CLAWD_SPRITE = [
  '..BBBBBBBBBBBB..',
  '..BBEBBBBBBEBB..',
  '..BBEBBBBBBEBB..',
  'AABBBBBBBBBBBBAA',
  '..BBBBBBBBBBBB..',
  '..BBBBBBBBBBBB..',
  '...L.L....L.L...',
  '...L.L....L.L...'
];
const CLAWD = { body: '#d97757', shade: '#b85c3e', eye: '#1b1714' };

export class LiveCanvasPet {
  constructor(canvas, options = {}) {
    this.kind = 'gpt';
    this.mode = 'chibi';
    this.accent = '#a78bfa';
    this.motion = true;
    this.state = 'idle';
    this.mood = '平静';
    this.pointer = { x: 0, y: 0, active: false };
    this.look = { x: 0, y: 0 };
    this.talk = 0;
    this.bounce = 0;
    this.frame = 0;
    this.started = false;
    this.setOptions(options);
    this.attach(canvas);
  }

  // The app re-renders its DOM often. Re-attaching keeps the animation state
  // (gaze, bounce, mouth) continuous instead of restarting the pet each time.
  attach(canvas) {
    if (canvas === this.canvas) return;
    this.detach();
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.onPointerMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      this.pointer = { x: (event.clientX - rect.left) / rect.width * 2 - 1, y: (event.clientY - rect.top) / rect.height * 2 - 1, active: true };
    };
    this.onPointerLeave = () => { this.pointer.active = false; };
    this.onPointerDown = () => { this.bounce = 1; };
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerleave', this.onPointerLeave);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    this.resize();
    // Paint right away so a re-render never shows an empty frame.
    this.draw();
  }

  detach() {
    if (!this.canvas) return;
    this.resizeObserver?.disconnect();
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas = null;
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(1, Math.round(rect.width * ratio));
    this.canvas.height = Math.max(1, Math.round(rect.height * ratio));
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.width = rect.width;
    this.height = rect.height;
  }

  setOptions(options = {}) {
    if (options.kind) this.kind = options.kind;
    if (options.mode) this.mode = options.mode;
    if (options.accent) this.accent = options.accent;
    if (typeof options.motion === 'boolean') this.motion = options.motion;
    if (options.state) this.state = options.state;
    if (options.mood) this.mood = options.mood;
  }

  start() {
    if (this.started) return;
    this.started = true;
    const tick = (time) => {
      if (!this.started) return;
      this.frame = time / 1000;
      this.draw();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  destroy() {
    this.started = false;
    cancelAnimationFrame(this.raf);
    this.detach();
  }

  draw() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    if (!ctx || !w || !h) return;
    ctx.clearRect(0, 0, w, h);
    const t = this.frame;
    this.look.x = lerp(this.look.x, this.pointer.active ? this.pointer.x : 0, .08);
    this.look.y = lerp(this.look.y, this.pointer.active ? this.pointer.y : 0, .08);
    const talking = this.state === 'thinking' || this.state === 'speaking';
    this.talk = lerp(this.talk, talking ? (Math.sin(t * 16) + 1) / 2 : 0, .2);
    this.bounce = Math.max(0, this.bounce - .035);
    const scale = Math.min(w / 260, h / 340);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(scale, scale);
    if (this.kind === 'clawd') this.drawClawd(ctx, t);
    else this.drawGirl(ctx, t);
    this.drawStateMarks(ctx, t);
    ctx.restore();
  }

  // ───────────────────────── anime rig ─────────────────────────

  rig() {
    const adult = this.mode === 'adult';
    return adult
      ? { headY: -92, rx: 46, ry: 50, neck: -40, shoulderY: -32, shoulder: 34, waistY: 28, waist: 22, hemY: 150, hem: 74, hairEnd: 70, armLen: 78 }
      : { headY: -46, rx: 72, ry: 66, neck: 14, shoulderY: 20, shoulder: 38, waistY: 58, waist: 30, hemY: 140, hem: 70, hairEnd: 70, armLen: 54 };
  }

  drawGirl(ctx, t) {
    const p = PALETTES[this.kind] || PALETTES.gpt;
    const r = this.rig();
    const breathe = this.motion ? Math.sin(t * 2.1) * 1.8 : 0;
    const squash = Math.sin(this.bounce * Math.PI) * .07;
    ctx.save();
    ctx.translate(0, -this.bounce * 10 * Math.sin(this.bounce * Math.PI));
    ctx.scale(1 + squash, 1 - squash);
    this.drawShadow(ctx, r.hemY + 12, r.hem * .9);
    if (this.kind === 'gpt') this.drawWings(ctx, r, t, p);
    if (this.kind === 'deepseek') this.drawFishTail(ctx, r, t, p);
    this.drawBackHair(ctx, r, t, p);
    if (this.kind === 'gpt') this.drawDragonTail(ctx, r, t, p);
    this.drawDress(ctx, r, p, breathe);
    this.drawArms(ctx, r, p, t, breathe);
    this.drawHead(ctx, r, p, breathe);
    this.drawFace(ctx, r, p, t, breathe);
    this.drawBangs(ctx, r, p, t, breathe);
    this.drawHeadAccessories(ctx, r, p, t, breathe);
    ctx.restore();
    this.drawParticles(ctx, t, p.trim);
  }

  drawShadow(ctx, y, width) {
    ctx.save();
    ctx.globalAlpha = .22;
    ctx.fillStyle = '#100e1f';
    ctx.beginPath();
    ctx.ellipse(0, y, width, 11, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  outline(ctx, color, width = 2.2) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  drawBackHair(ctx, r, t, p) {
    const sway = this.motion ? Math.sin(t * 1.3) * 5 : 0;
    const top = r.headY - r.ry * 1.05;
    const sideX = r.rx * 1.12;
    const end = r.hairEnd + (this.mode === 'adult' ? 20 : 0);
    const grad = ctx.createLinearGradient(0, top, 0, end);
    grad.addColorStop(0, p.hair);
    grad.addColorStop(1, p.hairShade);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-sideX, r.headY);
    ctx.bezierCurveTo(-sideX, top, sideX, top, sideX, r.headY);
    ctx.bezierCurveTo(sideX + 10, r.headY + 70, sideX + 14 + sway, end - 40, sideX * .9 + sway, end);
    // Wavy ends across the bottom.
    const waves = 6;
    for (let i = 1; i <= waves; i += 1) {
      const x = sideX * .9 + sway - (sideX * 1.8 + 0) * (i / waves);
      const y = end + (i % 2 ? -14 : 0);
      ctx.quadraticCurveTo(x + sideX * .15, y + 16, x, y);
    }
    ctx.bezierCurveTo(-sideX - 14 + sway, end - 40, -sideX - 10, r.headY + 70, -sideX, r.headY);
    ctx.closePath();
    ctx.fill();
    this.outline(ctx, p.hairLine);
  }

  drawWings(ctx, r, t, p) {
    const flap = this.motion ? Math.sin(t * 2.4) * .08 : 0;
    ctx.save();
    ctx.globalAlpha = .9;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * 18, r.shoulderY + 14);
      ctx.rotate(side * flap);
      ctx.scale(side, 1);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(60, -70, 118, -58);
      ctx.quadraticCurveTo(104, -30, 112, -6);
      ctx.quadraticCurveTo(92, -12, 88, 14);
      ctx.quadraticCurveTo(70, 2, 62, 30);
      ctx.quadraticCurveTo(40, 14, 22, 40);
      ctx.closePath();
      ctx.fillStyle = '#e7defd';
      ctx.fill();
      this.outline(ctx, p.line, 2);
      ctx.strokeStyle = '#b8a8ec';
      ctx.lineWidth = 1.6;
      for (const [x, y] of [[112, -6], [88, 14], [62, 30]]) {
        ctx.beginPath(); ctx.moveTo(4, 2); ctx.lineTo(x * .92, y * .92); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  drawDragonTail(ctx, r, t, p) {
    const wag = this.motion ? Math.sin(t * 1.7) * 8 : 0;
    ctx.beginPath();
    ctx.moveTo(14, r.waistY + 30);
    ctx.bezierCurveTo(80, r.waistY + 40, 96 + wag, r.hemY - 10, 70 + wag, r.hemY + 4);
    ctx.lineTo(58 + wag, r.hemY - 8);
    ctx.bezierCurveTo(76 + wag, r.hemY - 24, 60, r.waistY + 50, 10, r.waistY + 44);
    ctx.closePath();
    ctx.fillStyle = '#ece6fb';
    ctx.fill();
    this.outline(ctx, p.line, 2);
  }

  drawFishTail(ctx, r, t, p) {
    const wag = this.motion ? Math.sin(t * 2.2) * .18 : 0;
    ctx.save();
    ctx.translate(46, r.hemY - 14);
    ctx.rotate(.5 + wag);
    ctx.beginPath();
    ctx.moveTo(-6, -28);
    ctx.quadraticCurveTo(8, -6, 4, 12);
    ctx.quadraticCurveTo(-18, 18, -30, 36);
    ctx.quadraticCurveTo(0, 30, 8, 22);
    ctx.quadraticCurveTo(16, 30, 44, 34);
    ctx.quadraticCurveTo(30, 18, 12, 12);
    ctx.quadraticCurveTo(14, -10, 6, -30);
    ctx.closePath();
    ctx.fillStyle = '#4f86d9';
    ctx.fill();
    this.outline(ctx, p.line, 2);
    ctx.restore();
  }

  drawDress(ctx, r, p, breathe) {
    const sy = r.shoulderY + breathe * .4;
    // Skirt and bodice as one silhouette.
    ctx.beginPath();
    ctx.moveTo(-r.shoulder, sy + 6);
    ctx.quadraticCurveTo(0, sy - 8, r.shoulder, sy + 6);
    ctx.lineTo(r.waist, r.waistY);
    ctx.quadraticCurveTo(r.hem * .7, r.hemY - 40, r.hem, r.hemY);
    for (let i = 1; i <= 8; i += 1) {
      const x = r.hem - (r.hem * 2) * (i / 8);
      ctx.quadraticCurveTo(x + r.hem / 8, r.hemY + 9, x, r.hemY);
    }
    ctx.quadraticCurveTo(-r.hem * .7, r.hemY - 40, -r.waist, r.waistY);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, sy, 0, r.hemY);
    grad.addColorStop(0, p.dress);
    grad.addColorStop(1, p.dressShade);
    ctx.fillStyle = grad;
    ctx.fill();
    this.outline(ctx, p.line);

    ctx.save();
    ctx.clip();
    if (this.kind === 'claude') {
      // Black corset and the orange front panel from the reference.
      ctx.fillStyle = p.bodice;
      ctx.beginPath();
      ctx.moveTo(-r.waist - 6, r.waistY - 26); ctx.lineTo(r.waist + 6, r.waistY - 26);
      ctx.lineTo(r.waist + 4, r.waistY + 8); ctx.lineTo(-r.waist - 4, r.waistY + 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = p.trim;
      ctx.beginPath();
      ctx.moveTo(4, r.waistY + 8); ctx.lineTo(24, r.waistY + 8); ctx.lineTo(r.hem * .62, r.hemY + 10); ctx.lineTo(r.hem * .1, r.hemY + 10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e8a34a';
      for (const y of [r.waistY - 18, r.waistY - 6]) { ctx.beginPath(); ctx.arc(0, y, 2.4, 0, TAU); ctx.fill(); }
    } else if (this.kind === 'deepseek') {
      ctx.fillStyle = p.trim;
      ctx.fillRect(-r.hem, r.waistY - 4, r.hem * 2, 10);
      ctx.fillStyle = '#7cc4ff';
      ctx.beginPath(); ctx.moveTo(-r.shoulder, sy + 4); ctx.lineTo(0, sy + 26); ctx.lineTo(r.shoulder, sy + 4); ctx.lineTo(r.shoulder, sy + 14); ctx.lineTo(0, sy + 36); ctx.lineTo(-r.shoulder, sy + 14); ctx.closePath(); ctx.fill();
    } else {
      ctx.strokeStyle = p.trim;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-r.waist - 4, r.waistY); ctx.quadraticCurveTo(0, r.waistY + 8, r.waist + 4, r.waistY); ctx.stroke();
      ctx.globalAlpha = .55;
      ctx.lineWidth = 1.5;
      for (const x of [-r.hem * .5, 0, r.hem * .5]) { ctx.beginPath(); ctx.moveTo(x * .4, r.waistY + 10); ctx.lineTo(x, r.hemY + 6); ctx.stroke(); }
    }
    ctx.restore();
    // Hem trim.
    ctx.strokeStyle = p.trim;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-r.hem + 4, r.hemY - 4); ctx.quadraticCurveTo(0, r.hemY + 2, r.hem - 4, r.hemY - 4); ctx.stroke();
    // Little boots.
    ctx.fillStyle = this.kind === 'deepseek' ? '#2b4c9b' : '#f6efe6';
    for (const x of [-16, 16]) { roundedRect(ctx, x - 8, r.hemY + 2, 16, 12, 5); ctx.fill(); this.outline(ctx, p.line, 1.6); }
  }

  drawArms(ctx, r, p, t, breathe) {
    const sy = r.shoulderY + 10 + breathe * .4;
    const wave = this.state === 'speaking' && this.motion ? Math.sin(t * 9) * .35 : 0;
    const sleeve = this.kind === 'deepseek' ? '#f4f8ff' : p.dress;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * (r.shoulder - 4), sy);
      // Claude holds her book with the right arm; others wave with it.
      const swing = side === 1 ? (this.kind === 'claude' ? -.9 : -wave * 2) : .12;
      ctx.rotate(side * .18 + swing * side * .5);
      roundedRect(ctx, -9, -4, 18, r.armLen, 9);
      ctx.fillStyle = sleeve;
      ctx.fill();
      this.outline(ctx, p.line, 2);
      ctx.fillStyle = p.skin;
      ctx.beginPath(); ctx.arc(0, r.armLen - 2, 8, 0, TAU); ctx.fill();
      this.outline(ctx, p.line, 1.6);
      ctx.restore();
    }
    if (this.kind === 'claude') {
      ctx.save();
      ctx.translate(r.shoulder - 4 - r.armLen * .55, sy + r.armLen * .5);
      ctx.rotate(-.18);
      roundedRect(ctx, -14, -20, 28, 36, 3);
      ctx.fillStyle = '#6b3a24';
      ctx.fill();
      this.outline(ctx, '#3d1f12', 2);
      ctx.strokeStyle = '#e8a34a';
      ctx.lineWidth = 1.6;
      this.drawStar(ctx, 0, -2, 7, 8);
      ctx.restore();
    }
  }

  drawStar(ctx, x, y, radius, rays) {
    ctx.beginPath();
    for (let i = 0; i < rays; i += 1) {
      const a = (i / rays) * TAU;
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
    }
    ctx.stroke();
  }

  drawHead(ctx, r, p, breathe) {
    ctx.fillStyle = p.skin;
    roundedRect(ctx, -7, r.headY + r.ry * .7, 14, r.neck - r.headY - r.ry * .55 + 6, 4);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-r.rx, r.headY - 6 + breathe * .2);
    ctx.bezierCurveTo(-r.rx, r.headY + r.ry * .7, -r.rx * .45, r.headY + r.ry, 0, r.headY + r.ry);
    ctx.bezierCurveTo(r.rx * .45, r.headY + r.ry, r.rx, r.headY + r.ry * .7, r.rx, r.headY - 6 + breathe * .2);
    ctx.bezierCurveTo(r.rx, r.headY - r.ry, -r.rx, r.headY - r.ry, -r.rx, r.headY - 6);
    ctx.closePath();
    ctx.fill();
    this.outline(ctx, p.line, 2);
  }

  drawFace(ctx, r, p, t, breathe) {
    const lookX = this.look.x * r.rx * .08;
    const lookY = this.look.y * r.ry * .05;
    const eyeY = r.headY + r.ry * .22 + breathe * .2 + lookY;
    const eyeX = r.rx * .4;
    const ew = r.rx * .17;
    const eh = r.rx * .25;
    const happy = this.state === 'speaking' || this.mood === '开心';
    const blink = this.state === 'sleeping' || (this.motion && (t % 4.2) < .12);
    ctx.save();
    ctx.translate(lookX, 0);
    for (const side of [-1, 1]) {
      const x = side * eyeX;
      if (blink || (happy && this.talk < .05)) {
        ctx.strokeStyle = p.eyeDeep;
        ctx.lineWidth = 3;
        ctx.beginPath();
        if (happy && !blink) { ctx.moveTo(x - ew, eyeY + 2); ctx.quadraticCurveTo(x, eyeY - eh * .8, x + ew, eyeY + 2); }
        else { ctx.moveTo(x - ew, eyeY); ctx.quadraticCurveTo(x, eyeY + eh * .45, x + ew, eyeY); }
        ctx.stroke();
        continue;
      }
      const grad = ctx.createLinearGradient(0, eyeY - eh, 0, eyeY + eh);
      grad.addColorStop(0, p.eyeDeep);
      grad.addColorStop(.6, p.eye);
      grad.addColorStop(1, '#ffffff');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.ellipse(x, eyeY, ew, eh, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = p.eyeDeep;
      ctx.beginPath(); ctx.ellipse(x + this.look.x * 2, eyeY + 1, ew * .42, eh * .45, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(x - ew * .35, eyeY - eh * .4, ew * .32, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(x + ew * .35, eyeY + eh * .35, ew * .15, 0, TAU); ctx.fill();
      // Upper lash line.
      ctx.strokeStyle = '#2a1d2c';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - ew * 1.2, eyeY - eh * .75); ctx.quadraticCurveTo(x, eyeY - eh * 1.25, x + ew * 1.2, eyeY - eh * .7); ctx.stroke();
    }
    ctx.fillStyle = '#f39aa6';
    ctx.globalAlpha = .35;
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(side * r.rx * .62, eyeY + eh * 1.25, r.rx * .14, r.rx * .06, 0, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    const mouthY = r.headY + r.ry * .68;
    ctx.strokeStyle = '#7a3a43';
    ctx.lineWidth = 2.4;
    if (this.talk > .08) {
      ctx.fillStyle = '#9b3c4a';
      ctx.beginPath(); ctx.ellipse(0, mouthY + 2, r.rx * .07, 2 + this.talk * r.rx * .08, 0, 0, TAU); ctx.fill();
    } else if (happy) {
      ctx.beginPath(); ctx.arc(0, mouthY - 2, r.rx * .08, .15, Math.PI - .15); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(-r.rx * .05, mouthY); ctx.quadraticCurveTo(0, mouthY + 3, r.rx * .05, mouthY); ctx.stroke();
    }
    ctx.restore();
  }

  drawBangs(ctx, r, p, t, breathe) {
    const top = r.headY - r.ry * 1.02 + breathe * .2;
    const fringe = r.headY + r.ry * .02 + breathe * .2;
    const sway = this.motion ? Math.sin(t * 1.6) * 1.5 : 0;
    ctx.beginPath();
    ctx.moveTo(-r.rx * 1.08, r.headY + r.ry * .3);
    ctx.bezierCurveTo(-r.rx * 1.15, top, r.rx * 1.15, top, r.rx * 1.08, r.headY + r.ry * .3);
    // Zig-zag fringe back across the forehead.
    const points = [.85, .55, .3, 0, -.3, -.55, -.85];
    points.forEach((k, i) => {
      const x = k * r.rx + sway;
      const depth = i % 2 ? fringe - r.ry * .12 : fringe + r.ry * .02;
      ctx.quadraticCurveTo(x + r.rx * .12, depth - r.ry * .3, x, depth);
      ctx.quadraticCurveTo(x - r.rx * .06, depth - r.ry * .2, x - r.rx * .15, depth - r.ry * .28);
    });
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, top, 0, fringe);
    grad.addColorStop(0, p.hair);
    grad.addColorStop(1, p.hairShade);
    ctx.fillStyle = grad;
    ctx.fill();
    this.outline(ctx, p.hairLine);
    // Shine.
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = .5;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, r.headY - r.ry * .1, r.rx * .72, Math.PI * 1.2, Math.PI * 1.45); ctx.stroke();
    ctx.globalAlpha = 1;
    // Side locks framing the face.
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * r.rx * .95, r.headY - r.ry * .1);
      ctx.quadraticCurveTo(side * r.rx * 1.12, r.headY + r.ry * .7, side * (r.rx * .9 + sway), r.headY + r.ry * 1.25);
      ctx.quadraticCurveTo(side * r.rx * .82, r.headY + r.ry * .6, side * r.rx * .78, r.headY);
      ctx.closePath();
      ctx.fillStyle = p.hairShade;
      ctx.fill();
      this.outline(ctx, p.hairLine, 1.8);
    }
  }

  drawHeadAccessories(ctx, r, p, t, breathe) {
    const crown = r.headY - r.ry * .82 + breathe * .2;
    if (this.kind === 'gpt') {
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * r.rx * .45, crown + 6);
        ctx.bezierCurveTo(side * r.rx * .55, crown - r.ry * .7, side * r.rx * 1.05, crown - r.ry * .5, side * r.rx * .8, crown - r.ry * .95);
        ctx.bezierCurveTo(side * r.rx * 1.2, crown - r.ry * .45, side * r.rx * .9, crown, side * r.rx * .72, crown + 10);
        ctx.closePath();
        ctx.fillStyle = '#f1ecfe';
        ctx.fill();
        this.outline(ctx, p.line, 2);
      }
      ctx.strokeStyle = p.trim;
      ctx.lineWidth = 2;
      this.drawKnot(ctx, r.rx * .62, r.headY - r.ry * .35, r.rx * .14);
    } else if (this.kind === 'deepseek') {
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * r.rx * .98, r.headY);
        ctx.quadraticCurveTo(side * r.rx * 1.45, r.headY - r.ry * .4, side * r.rx * 1.3, r.headY - r.ry * .75);
        ctx.quadraticCurveTo(side * r.rx * 1.15, r.headY - r.ry * .3, side * r.rx * .95, r.headY - r.ry * .3);
        ctx.closePath();
        ctx.fillStyle = '#8fcaff';
        ctx.fill();
        this.outline(ctx, p.line, 1.8);
      }
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(r.rx * .55, r.headY - r.ry * .6, r.rx * .16, r.rx * .1, -.3, 0, TAU); ctx.fill();
      this.outline(ctx, p.line, 1.6);
    } else if (this.kind === 'claude') {
      const fx = r.rx * .58;
      const fy = r.headY - r.ry * .55;
      // Black ribbon tails behind the flower.
      ctx.fillStyle = p.bodice;
      for (const angle of [.5, 1.2]) {
        ctx.save(); ctx.translate(fx, fy); ctx.rotate(angle);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r.rx * .5, -r.rx * .08); ctx.lineTo(r.rx * .46, r.rx * .1); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      const spin = this.motion ? t * .3 : 0;
      ctx.fillStyle = '#f08a3a';
      for (let i = 0; i < 10; i += 1) {
        const a = spin + (i / 10) * TAU;
        ctx.beginPath(); ctx.ellipse(fx + Math.cos(a) * r.rx * .12, fy + Math.sin(a) * r.rx * .12, r.rx * .1, r.rx * .045, a, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = '#ffd08a';
      ctx.beginPath(); ctx.arc(fx, fy, r.rx * .07, 0, TAU); ctx.fill();
      this.outline(ctx, p.hairLine, 1.4);
    }
  }

  drawKnot(ctx, x, y, size) {
    for (let i = 0; i < 3; i += 1) {
      const a = (i / 3) * TAU;
      ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * size * .45, y + Math.sin(a) * size * .45, size * .7, size * .32, a, 0, TAU); ctx.stroke();
    }
  }

  drawParticles(ctx, t, color) {
    if (!this.motion) return;
    ctx.save();
    ctx.fillStyle = this.accent || color;
    for (let i = 0; i < 4; i += 1) {
      const angle = t * (.35 + i * .08) + i * 1.7;
      const x = Math.cos(angle) * (112 + i * 6);
      const y = Math.sin(angle * .8) * 90 - 20;
      ctx.globalAlpha = .35 + .3 * Math.sin(t * 2 + i);
      ctx.beginPath(); ctx.arc(x, y, i % 2 ? 2 : 3, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // ───────────────────────── Clawd ─────────────────────────

  drawClawd(ctx, t) {
    const adult = this.mode === 'adult';
    const px = adult ? 14 : 12;
    const cols = CLAWD_SPRITE[0].length;
    const rows = CLAWD_SPRITE.length;
    const walking = this.motion && (this.state === 'thinking' || this.state === 'speaking');
    const step = walking ? Math.floor(t * 6) % 2 : 0;
    const hop = Math.sin(this.bounce * Math.PI) * 26;
    const bob = this.motion ? Math.round(Math.sin(t * 2.4) * 1.2) : 0;
    const blink = this.state === 'sleeping' || (this.motion && (t % 3.6) < .14);
    const lookCol = Math.round(this.look.x * 1.2);
    const lookRow = this.look.y > .5 ? 1 : 0;
    const waveUp = this.state === 'speaking' && this.motion && Math.floor(t * 5) % 2 === 0;
    const ox = -cols * px / 2;
    const oy = -rows * px / 2 + 20 - hop;

    this.drawShadow(ctx, oy + rows * px + hop + 6, cols * px * .45 * (1 - hop / 80));
    ctx.save();
    ctx.translate(ox, oy);
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const cell = CLAWD_SPRITE[y][x];
        if (cell === '.') continue;
        const dx = x * px;
        let dy = y * px;
        if (cell === 'L') {
          // Alternate leg pairs lift while walking.
          const pair = x === 3 || x === 10 ? 0 : 1;
          if (walking && pair === step && y === 7) continue;
          ctx.fillStyle = CLAWD.shade;
        } else if (cell === 'A') {
          if (waveUp && x > 8) dy -= px;
          ctx.fillStyle = CLAWD.body;
        } else {
          ctx.fillStyle = y === 5 ? CLAWD.shade : CLAWD.body;
        }
        if (cell !== 'L') dy -= bob;
        ctx.fillRect(dx, dy, px + 1, px + 1);
      }
    }
    // Eyes are drawn on top so they can glance around and blink.
    ctx.fillStyle = CLAWD.eye;
    for (const col of [4, 11]) {
      const ex = (col + lookCol * .5) * px;
      const ey = (1 + lookRow * .5) * px - bob;
      if (blink) ctx.fillRect(ex, ey + px * 1.2, px, px * .5);
      else ctx.fillRect(ex, ey, px, px * 2);
    }
    ctx.restore();
  }

  // ─────────────────────── shared state marks ───────────────────────

  drawStateMarks(ctx, t) {
    const topY = this.kind === 'clawd' ? -90 : this.mode === 'adult' ? -160 : -132;
    const orange = '#d97757';
    if (this.state === 'thinking') {
      // Claude Code style spinning asterisk.
      ctx.save();
      ctx.translate(this.kind === 'clawd' ? 0 : 70, topY);
      ctx.rotate(t * 3);
      ctx.strokeStyle = this.kind === 'clawd' || this.kind === 'claude' ? orange : this.accent;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      this.drawStar(ctx, 0, 0, 12, 6);
      ctx.restore();
    } else if (this.state === 'speaking') {
      const rise = (t * 30) % 40;
      ctx.save();
      ctx.globalAlpha = 1 - rise / 40;
      ctx.fillStyle = '#ff7a95';
      const x = 74;
      const y = topY + 20 - rise;
      ctx.beginPath();
      ctx.moveTo(x, y + 6);
      ctx.bezierCurveTo(x - 12, y - 4, x - 6, y - 14, x, y - 6);
      ctx.bezierCurveTo(x + 6, y - 14, x + 12, y - 4, x, y + 6);
      ctx.fill();
      ctx.restore();
    } else if (this.state === 'sleeping') {
      ctx.save();
      ctx.fillStyle = this.accent;
      ctx.font = 'bold 18px system-ui, sans-serif';
      const drift = (t * 8) % 20;
      ctx.globalAlpha = 1 - drift / 20;
      ctx.fillText('z', 60, topY + 10 - drift);
      ctx.fillText('Z', 74, topY - 4 - drift);
      ctx.restore();
    }
  }
}
