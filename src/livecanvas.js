const TAU = Math.PI * 2;

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

function lerp(from, to, amount) {
  return from + (to - from) * Math.min(1, amount);
}

export class LiveCanvasPet {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.kind = options.kind || 'gpt';
    this.mode = options.mode || 'chibi';
    this.accent = options.accent || '#a78bfa';
    this.motion = options.motion !== false;
    this.state = options.state || 'idle';
    this.pointer = { x: 0, y: 0, active: false };
    this.look = { x: 0, y: 0 };
    this.talk = 0;
    this.mood = '平静';
    this.started = false;
    this.frame = 0;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
    this.bindPointer();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(1, Math.round(rect.width * ratio));
    this.canvas.height = Math.max(1, Math.round(rect.height * ratio));
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.width = rect.width;
    this.height = rect.height;
  }

  bindPointer() {
    this.onPointerMove = (event) => {
      const rect = this.canvas.getBoundingClientRect();
      this.pointer = { x: (event.clientX - rect.left) / rect.width * 2 - 1, y: (event.clientY - rect.top) / rect.height * 2 - 1, active: true };
    };
    this.onPointerLeave = () => { this.pointer.active = false; };
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerleave', this.onPointerLeave);
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
    this.resizeObserver.disconnect();
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
  }

  draw() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);
    const t = this.frame;
    const breathing = this.motion ? Math.sin(t * 2.1) * 2.2 : 0;
    this.look.x = lerp(this.look.x, this.pointer.active ? this.pointer.x * 7 : 0, .08);
    this.look.y = lerp(this.look.y, this.pointer.active ? this.pointer.y * 4 : 0, .08);
    const talkTarget = this.state === 'thinking' || this.state === 'speaking' ? (Math.sin(t * 18) + 1) / 2 : 0;
    this.talk = lerp(this.talk, talkTarget, .16);
    const cx = w / 2;
    const cy = h * .49 + breathing;
    const scale = Math.min(w / 250, h / 330);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    this.drawShadow(ctx);
    this.drawBody(ctx, breathing);
    this.drawHead(ctx, breathing);
    this.drawFace(ctx, t);
    this.drawParticles(ctx, t);
    ctx.restore();
  }

  drawShadow(ctx) {
    ctx.save();
    ctx.globalAlpha = .24;
    ctx.fillStyle = '#101024';
    ctx.beginPath();
    ctx.ellipse(0, 143, 65, 13, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  colors() {
    return this.kind === 'deepseek'
      ? { hair: '#4b6fbd', hairLight: '#85c8f4', body: '#273d86', skin: '#ffe6dc', eye: '#4aa9ff', accent: '#55a8ff' }
      : { hair: '#a78bfa', hairLight: '#e1d9ff', body: '#5a438e', skin: '#ffeadf', eye: '#8068d4', accent: this.accent };
  }

  drawBody(ctx, breathing) {
    const c = this.colors();
    const adult = this.mode === 'adult';
    const bodyWidth = adult ? 67 : 75;
    const bodyHeight = adult ? 124 : 100;
    const gradient = ctx.createLinearGradient(-bodyWidth, 46, bodyWidth, 155);
    gradient.addColorStop(0, c.body);
    gradient.addColorStop(1, c.hair);
    ctx.fillStyle = gradient;
    roundedRect(ctx, -bodyWidth, 36, bodyWidth * 2, bodyHeight, 28);
    ctx.fill();
    ctx.fillStyle = '#fff9f3';
    roundedRect(ctx, -bodyWidth * .61, 73, bodyWidth * 1.22, bodyHeight * .7, 20);
    ctx.fill();
    ctx.fillStyle = c.accent;
    ctx.globalAlpha = .55;
    ctx.beginPath();
    ctx.moveTo(-bodyWidth * .62, 88); ctx.lineTo(-bodyWidth * .34, 110); ctx.lineTo(-bodyWidth * .5, 149); ctx.lineTo(-bodyWidth * .72, 130); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = c.skin;
    ctx.lineWidth = 13;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-bodyWidth + 8, 65 + breathing); ctx.quadraticCurveTo(-bodyWidth - 22, 92, -bodyWidth - 7, 112); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bodyWidth - 8, 65 + breathing); ctx.quadraticCurveTo(bodyWidth + 22, 92, bodyWidth + 7, 112); ctx.stroke();
  }

  drawHead(ctx, breathing) {
    const c = this.colors();
    const adult = this.mode === 'adult';
    const headW = adult ? 82 : 88;
    const headH = adult ? 92 : 98;
    ctx.fillStyle = c.skin;
    ctx.beginPath();
    ctx.ellipse(0, -22, headW, headH, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = c.hair;
    ctx.beginPath();
    ctx.moveTo(-headW, -30);
    ctx.quadraticCurveTo(-headW - 8, -115, 0, -126);
    ctx.quadraticCurveTo(headW + 8, -115, headW, -30);
    ctx.quadraticCurveTo(48, -64, 26, -78);
    ctx.quadraticCurveTo(6, -36, 0, -73);
    ctx.quadraticCurveTo(-13, -36, -29, -78);
    ctx.quadraticCurveTo(-50, -61, -headW, -30);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = c.hairLight;
    ctx.globalAlpha = .45;
    ctx.beginPath(); ctx.ellipse(-39, -74, 10, 30, -.25, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(40, -73, 9, 26, .25, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    if (this.kind === 'deepseek') {
      ctx.beginPath(); ctx.moveTo(-headW + 4, -44); ctx.quadraticCurveTo(-headW - 22, -57, -headW - 9, -77); ctx.quadraticCurveTo(-headW + 10, -66, -headW + 17, -48); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(headW - 4, -44); ctx.quadraticCurveTo(headW + 22, -57, headW + 9, -77); ctx.quadraticCurveTo(headW - 10, -66, headW - 17, -48); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(-headW + 5, -75); ctx.quadraticCurveTo(-headW - 14, -123, -headW + 11, -142); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(headW - 5, -75); ctx.quadraticCurveTo(headW + 14, -123, headW - 11, -142); ctx.stroke();
    }
    ctx.fillStyle = c.accent;
    ctx.globalAlpha = .8;
    ctx.beginPath(); ctx.arc(45, -87, 10, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }

  drawFace(ctx, t) {
    const c = this.colors();
    const blink = Math.sin(t * .75) > .985 || this.state === 'sleeping';
    const eyeY = -24;
    const eyeX = 31;
    ctx.save();
    ctx.translate(this.look.x, this.look.y);
    ctx.fillStyle = c.eye;
    for (const x of [-eyeX, eyeX]) {
      if (blink) {
        ctx.strokeStyle = '#281f45'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x - 7, eyeY); ctx.quadraticCurveTo(x, eyeY + 5, x + 7, eyeY); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.ellipse(x, eyeY, 12, 17, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - 4, eyeY - 6, 4, 0, TAU); ctx.fill();
        ctx.fillStyle = c.eye;
      }
    }
    ctx.fillStyle = '#ef8e9f'; ctx.globalAlpha = .32;
    ctx.beginPath(); ctx.ellipse(-52, 3, 14, 6, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(52, 3, 14, 6, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = '#5d376b'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    if (this.talk > .08) {
      ctx.fillStyle = '#5d376b'; ctx.beginPath(); ctx.ellipse(0, 16, 8, 5 + this.talk * 6, 0, 0, TAU); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(0, 13, 8, 0.2, Math.PI - .2); ctx.stroke();
    }
    ctx.restore();
  }

  drawParticles(ctx, t) {
    if (!this.motion) return;
    const c = this.colors();
    ctx.fillStyle = c.accent;
    ctx.globalAlpha = .55;
    for (let i = 0; i < 3; i += 1) {
      const angle = t * (.4 + i * .1) + i * 2;
      const x = Math.cos(angle) * (105 + i * 8);
      const y = Math.sin(angle * .8) * 85 - 10;
      ctx.beginPath(); ctx.arc(x, y, i === 1 ? 3 : 2, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
