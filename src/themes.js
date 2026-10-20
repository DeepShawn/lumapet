// Desktop themes: CSS variables for the UI chrome plus an animated wallpaper
// painter. Painters keep their particles in a per-theme scratch object.

const TAU = Math.PI * 2;
const rand = (min, max) => min + Math.random() * (max - min);

export const THEMES = {
  aurora: {
    name: '极光', emoji: '🌌', dark: true,
    vars: { accent: '#8b7cff', accent2: '#4fe3c1', text: '#f4f2ff', muted: '#a9a5c7', glass: 'rgba(22, 20, 44, .62)', glassStrong: 'rgba(30, 27, 58, .86)', border: 'rgba(255,255,255,.14)', taskbar: 'rgba(12, 11, 28, .55)' },
    preview: 'linear-gradient(160deg,#0b0d26,#1b1446 55%,#0f3a3a)',
    paint: paintAurora
  },
  sakura: {
    name: '樱花', emoji: '🌸', dark: false,
    vars: { accent: '#ec5f8c', accent2: '#ffb36b', text: '#3b2430', muted: '#8c6876', glass: 'rgba(255, 246, 249, .7)', glassStrong: 'rgba(255, 250, 252, .9)', border: 'rgba(160, 80, 110, .18)', taskbar: 'rgba(255, 240, 246, .62)' },
    preview: 'linear-gradient(180deg,#ffd6e3,#fff1f4 60%,#f7d9e8)',
    paint: paintSakura
  },
  neon: {
    name: '赛博霓虹', emoji: '🌆', dark: true,
    vars: { accent: '#ff4fd8', accent2: '#3ef2ff', text: '#fdf2ff', muted: '#b59cc8', glass: 'rgba(24, 6, 40, .62)', glassStrong: 'rgba(32, 8, 52, .88)', border: 'rgba(255, 79, 216, .35)', taskbar: 'rgba(14, 2, 26, .6)' },
    preview: 'linear-gradient(180deg,#14002e,#4a0b63 60%,#ff3d81)',
    paint: paintNeon
  },
  ocean: {
    name: '深海', emoji: '🐋', dark: true,
    vars: { accent: '#4cc9ff', accent2: '#7dffd6', text: '#eaf8ff', muted: '#8fb6c9', glass: 'rgba(4, 30, 52, .6)', glassStrong: 'rgba(6, 38, 64, .88)', border: 'rgba(140, 220, 255, .2)', taskbar: 'rgba(2, 18, 34, .58)' },
    preview: 'linear-gradient(180deg,#0a5a80,#022a44 60%,#011423)',
    paint: paintOcean
  },
  forest: {
    name: '萤火森林', emoji: '🌲', dark: true,
    vars: { accent: '#c8f560', accent2: '#ffd36b', text: '#effae6', muted: '#9db494', glass: 'rgba(10, 30, 20, .62)', glassStrong: 'rgba(14, 38, 26, .88)', border: 'rgba(200, 245, 96, .18)', taskbar: 'rgba(6, 18, 12, .6)' },
    preview: 'linear-gradient(180deg,#123526,#071a11 70%,#030b07)',
    paint: paintForest
  },
  snow: {
    name: '冬夜', emoji: '❄️', dark: true,
    vars: { accent: '#9ec5ff', accent2: '#ffe29a', text: '#f2f6ff', muted: '#a3b0c8', glass: 'rgba(20, 28, 52, .6)', glassStrong: 'rgba(26, 36, 64, .88)', border: 'rgba(200, 220, 255, .2)', taskbar: 'rgba(12, 16, 32, .58)' },
    preview: 'linear-gradient(180deg,#1b2850,#2c3d6e 60%,#c9d6f0)',
    paint: paintSnow
  },
  paper: {
    name: '水墨', emoji: '🖌️', dark: false,
    vars: { accent: '#c0392b', accent2: '#2c3e50', text: '#2a2522', muted: '#7a7168', glass: 'rgba(250, 246, 238, .78)', glassStrong: 'rgba(252, 249, 243, .94)', border: 'rgba(60, 50, 40, .16)', taskbar: 'rgba(244, 238, 228, .7)' },
    preview: 'linear-gradient(180deg,#f7f1e6,#ebe3d4)',
    paint: paintPaper
  },
  retro: {
    name: '像素 98', emoji: '💾', dark: false, retro: true,
    vars: { accent: '#000080', accent2: '#008080', text: '#000000', muted: '#3a3a3a', glass: '#c0c0c0', glassStrong: '#c0c0c0', border: '#808080', taskbar: '#c0c0c0' },
    preview: 'linear-gradient(180deg,#008080,#008080)',
    paint: paintRetro
  }
};

export function applyTheme(id, root = document.documentElement, accentOverride = '') {
  const theme = THEMES[id] || THEMES.aurora;
  const vars = theme.vars;
  root.dataset.theme = THEMES[id] ? id : 'aurora';
  root.classList.toggle('theme-dark', theme.dark);
  root.classList.toggle('theme-light', !theme.dark);
  root.classList.toggle('theme-retro', Boolean(theme.retro));
  root.style.setProperty('--accent', accentOverride || vars.accent);
  root.style.setProperty('--accent-2', vars.accent2);
  root.style.setProperty('--text', vars.text);
  root.style.setProperty('--muted', vars.muted);
  root.style.setProperty('--glass', vars.glass);
  root.style.setProperty('--glass-strong', vars.glassStrong);
  root.style.setProperty('--border', vars.border);
  root.style.setProperty('--taskbar', vars.taskbar);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.dark ? '#0d0c1c' : '#f4eee6');
  return theme;
}

export class Wallpaper {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.themeId = 'aurora';
    this.scratch = {};
    this.animated = true;
    this.last = 0;
    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
  }

  setTheme(id) {
    this.themeId = THEMES[id] ? id : 'aurora';
    this.scratch = {};
    this.paint(performance.now() / 1000);
  }

  resize() {
    const ratio = Math.min(1.5, window.devicePixelRatio || 1);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.round(this.width * ratio);
    this.canvas.height = Math.round(this.height * ratio);
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.scratch = {};
    this.paint(performance.now() / 1000);
  }

  // Called from the main loop; wallpapers only need ~30 fps.
  tick(now) {
    if (!this.animated) return;
    if (now - this.last < 33) return;
    this.last = now;
    this.paint(now / 1000);
  }

  paint(t) {
    const theme = THEMES[this.themeId];
    theme.paint(this.ctx, this.width, this.height, t, this.scratch);
  }
}

// ───────────────────────── painters ─────────────────────────

function stars(ctx, w, h, t, s, count = 140, maxY = 1) {
  s.stars ||= Array.from({ length: count }, () => ({ x: Math.random() * w, y: Math.random() * h * maxY, r: rand(.3, 1.4), p: rand(0, TAU), sp: rand(.6, 2) }));
  ctx.fillStyle = '#fff';
  for (const star of s.stars) {
    ctx.globalAlpha = .35 + .55 * (Math.sin(t * star.sp + star.p) + 1) / 2;
    ctx.beginPath(); ctx.arc(star.x, star.y, star.r, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// Pre-rendered layer for the parts of a wallpaper that never move. Built once
// per theme/resize at device resolution, then blitted every frame.
function layer(s, key, w, h, draw) {
  if (!s[key]) {
    const ratio = Math.min(1.5, window.devicePixelRatio || 1);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
    const lctx = canvas.getContext('2d');
    lctx.scale(ratio, ratio);
    draw(lctx);
    s[key] = canvas;
  }
  return s[key];
}

// Soft round glow sprite, cheaper than a radial gradient per particle.
function glowSprite(s, key, rgb) {
  if (!s[key]) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 32;
    const gctx = canvas.getContext('2d');
    const grad = gctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, `rgba(${rgb},1)`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, 32, 32);
    s[key] = canvas;
  }
  return s[key];
}

function paintAurora(ctx, w, h, t, s) {
  ctx.drawImage(layer(s, 'bg', w, h, (lctx) => {
    const bg = lctx.createLinearGradient(0, 0, w * .4, h);
    bg.addColorStop(0, '#05071a');
    bg.addColorStop(.55, '#120e33');
    bg.addColorStop(1, '#071c24');
    lctx.fillStyle = bg;
    lctx.fillRect(0, 0, w, h);
  }), 0, 0, w, h);
  stars(ctx, w, h, t, s, 160, .8);
  // Aurora curtains are drawn at eighth resolution from cached gradient
  // strips, then scaled up: smooth, and far cheaper than per-column gradients.
  const lw = Math.ceil(w / 8);
  const lh = Math.ceil(h / 8);
  if (!s.aurora || s.aurora.width !== lw) {
    s.aurora = Object.assign(document.createElement('canvas'), { width: lw, height: lh });
    s.strips = [[79, 227, 193], [139, 124, 255], [255, 120, 200]].map(([r, g, b]) => {
      const strip = Object.assign(document.createElement('canvas'), { width: 1, height: 128 });
      const sctx = strip.getContext('2d');
      const grad = sctx.createLinearGradient(0, 0, 0, 128);
      grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
      grad.addColorStop(.72, `rgba(${r},${g},${b},.5)`);
      grad.addColorStop(.9, `rgba(${r},${g},${b},.75)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      sctx.fillStyle = grad;
      sctx.fillRect(0, 0, 1, 128);
      return strip;
    });
  }
  const actx = s.aurora.getContext('2d');
  actx.clearRect(0, 0, lw, lh);
  actx.globalCompositeOperation = 'lighter';
  const bands = [
    { strip: 0, y: .27, amp: .07, speed: .18, thick: .22, alpha: .5 },
    { strip: 1, y: .35, amp: .09, speed: -.13, thick: .26, alpha: .45 },
    { strip: 2, y: .2, amp: .05, speed: .09, thick: .14, alpha: .3 }
  ];
  for (const band of bands) {
    for (let x = 0; x < lw; x += 1) {
      const u = x / lw;
      const n = Math.sin(u * 5 + t * band.speed * 3) + Math.sin(u * 11 - t * band.speed * 5) * .5;
      const y = lh * (band.y + n * band.amp);
      const len = lh * band.thick * (.6 + .4 * Math.sin(u * 7 + t * .6));
      // Fine vertical rays give the curtain texture.
      actx.globalAlpha = band.alpha * (.65 + .35 * Math.sin(u * 140 + t * 2 + band.strip));
      actx.drawImage(s.strips[band.strip], x, y - len, 1, len + 4);
    }
  }
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.drawImage(s.aurora, 0, 0, w, h);
  ctx.restore();
  ctx.drawImage(layer(s, 'hills', w, h, (lctx) => {
    lctx.fillStyle = '#060818';
    lctx.beginPath();
    lctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 40) lctx.lineTo(x, h * .82 - Math.abs(Math.sin(x * .004) * 90 + Math.sin(x * .011) * 40));
    lctx.lineTo(w, h);
    lctx.fill();
  }), 0, 0, w, h);
}

function paintSakura(ctx, w, h, t, s) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#ffd3e1');
  bg.addColorStop(.55, '#fff0f4');
  bg.addColorStop(1, '#fbe3ee');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  const sun = ctx.createRadialGradient(w * .78, h * .26, 10, w * .78, h * .26, h * .3);
  sun.addColorStop(0, 'rgba(255,255,255,.95)');
  sun.addColorStop(.3, 'rgba(255,220,230,.6)');
  sun.addColorStop(1, 'rgba(255,220,230,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);
  for (const [i, color] of ['rgba(232,170,200,.5)', 'rgba(214,150,186,.55)', 'rgba(190,128,168,.6)'].entries()) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 30) ctx.lineTo(x, h * (.7 + i * .07) - Math.sin(x * .003 + i * 2) * 50 - Math.sin(x * .009 + i) * 18);
    ctx.lineTo(w, h);
    ctx.fill();
  }
  // Cherry tree silhouette in the corner.
  ctx.fillStyle = 'rgba(120,70,90,.55)';
  ctx.beginPath(); ctx.moveTo(w * .06, h); ctx.quadraticCurveTo(w * .1, h * .6, w * .02, h * .3); ctx.lineTo(w * .05, h * .3); ctx.quadraticCurveTo(w * .14, h * .55, w * .11, h); ctx.fill();
  ctx.fillStyle = 'rgba(255,170,200,.55)';
  s.blossom ||= Array.from({ length: 40 }, () => ({ x: rand(-.05, .25), y: rand(.08, .45), r: rand(20, 55) }));
  for (const b of s.blossom) { ctx.beginPath(); ctx.arc(b.x * w, b.y * h, b.r, 0, TAU); ctx.fill(); }
  s.petals ||= Array.from({ length: Math.round(w / 22) }, () => ({ x: rand(0, w), y: rand(-h, h), vx: rand(15, 45), vy: rand(30, 70), r: rand(4, 8), a: rand(0, TAU), sp: rand(1, 3) }));
  const dt = s.lastT ? Math.min(.1, t - s.lastT) : 0;
  s.lastT = t;
  for (const p of s.petals) {
    p.x += (p.vx + Math.sin(t + p.a) * 20) * dt;
    p.y += p.vy * dt;
    p.a += p.sp * dt;
    if (p.y > h + 10) { p.y = -10; p.x = rand(-w * .2, w); }
    if (p.x > w + 10) p.x = -10;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.a);
    ctx.scale(1, Math.abs(Math.cos(p.a * 1.3)) * .8 + .2);
    ctx.fillStyle = '#ff9fbf';
    ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * .62, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

function paintNeon(ctx, w, h, t, s) {
  const horizon = h * .62;
  ctx.drawImage(layer(s, 'scene', w, h, (lctx) => {
    const sky = lctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#0b0020');
    sky.addColorStop(.6, '#3b0a5e');
    sky.addColorStop(1, '#ff3d81');
    lctx.fillStyle = sky;
    lctx.fillRect(0, 0, w, horizon);
    // Striped sun.
    const r = Math.min(w, h) * .2;
    lctx.save();
    lctx.beginPath(); lctx.arc(w / 2, horizon - r * .35, r, 0, TAU); lctx.clip();
    const sun = lctx.createLinearGradient(0, horizon - r * 1.35, 0, horizon);
    sun.addColorStop(0, '#ffe66d');
    sun.addColorStop(1, '#ff2e97');
    lctx.fillStyle = sun;
    lctx.fillRect(w / 2 - r, horizon - r * 1.4, r * 2, r * 2);
    lctx.fillStyle = '#3b0a5e';
    for (let i = 0; i < 7; i += 1) lctx.fillRect(w / 2 - r, horizon - r * .55 + i * r * .13, r * 2, 2 + i * 1.3);
    lctx.restore();
    // City skyline with lit windows.
    lctx.fillStyle = '#16002a';
    const city = Array.from({ length: Math.ceil(w / 28) }, (_, i) => ({ x: i * 28, h: rand(20, 110), lit: Math.random() > .5 }));
    for (const b of city) lctx.fillRect(b.x, horizon - b.h, 26, b.h);
    lctx.fillStyle = 'rgba(62,242,255,.6)';
    for (const b of city) if (b.lit) for (let y = horizon - b.h + 6; y < horizon - 6; y += 10) if (Math.sin(y * 13 + b.x) > .3) lctx.fillRect(b.x + 6, y, 3, 3);
    const floor = lctx.createLinearGradient(0, horizon, 0, h);
    floor.addColorStop(0, '#22003a');
    floor.addColorStop(1, '#060010');
    lctx.fillStyle = floor;
    lctx.fillRect(0, horizon, w, h - horizon);
    // Vertical grid lines with a cheap two-pass glow.
    for (const [width, color] of [[5, 'rgba(255,79,216,.18)'], [1.4, 'rgba(255,120,226,.85)']]) {
      lctx.strokeStyle = color;
      lctx.lineWidth = width;
      for (let i = -20; i <= 20; i += 1) { lctx.beginPath(); lctx.moveTo(w / 2 + i * 12, horizon); lctx.lineTo(w / 2 + i * w * .12, h); lctx.stroke(); }
    }
  }), 0, 0, w, h);
  stars(ctx, w, h, t, s, 70, .4);
  const offset = (t * .6) % 1;
  for (const [width, color] of [[5, 'rgba(255,79,216,.18)'], [1.4, 'rgba(255,120,226,.85)']]) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let i = 0; i < 14; i += 1) {
      const k = (i + offset) / 14;
      const y = horizon + (h - horizon) * k * k;
      ctx.moveTo(0, y); ctx.lineTo(w, y);
    }
    ctx.stroke();
  }
}

function paintOcean(ctx, w, h, t, s) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0b6a92');
  bg.addColorStop(.45, '#03314f');
  bg.addColorStop(1, '#010f1d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i += 1) {
    const x = w * (.1 + i * .17) + Math.sin(t * .3 + i) * 40;
    const grad = ctx.createLinearGradient(x, 0, x + 120, h * .8);
    grad.addColorStop(0, 'rgba(160,230,255,.12)');
    grad.addColorStop(1, 'rgba(160,230,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.moveTo(x - 30, 0); ctx.lineTo(x + 40, 0); ctx.lineTo(x + 260, h * .85); ctx.lineTo(x + 80, h * .85); ctx.fill();
  }
  ctx.restore();
  // Whale silhouette drifting by.
  const wx = ((t * 18) % (w + 600)) - 300;
  ctx.fillStyle = 'rgba(2,20,36,.55)';
  ctx.beginPath(); ctx.ellipse(wx, h * .32, 150, 42, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(wx - 140, h * .32); ctx.lineTo(wx - 210, h * .32 - 36 + Math.sin(t) * 8); ctx.lineTo(wx - 200, h * .32 + 30 + Math.sin(t) * 8); ctx.fill();
  s.kelp ||= Array.from({ length: Math.ceil(w / 70) }, (_, i) => ({ x: i * 70 + rand(-20, 20), h: rand(.18, .4), p: rand(0, TAU) }));
  ctx.strokeStyle = 'rgba(10,60,50,.8)';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  for (const k of s.kelp) {
    ctx.beginPath(); ctx.moveTo(k.x, h);
    for (let y = 0; y < k.h * h; y += 16) ctx.lineTo(k.x + Math.sin(t * 1.2 + k.p + y * .02) * (y * .08), h - y);
    ctx.stroke();
  }
  s.bubbles ||= Array.from({ length: 50 }, () => ({ x: rand(0, w), y: rand(0, h), r: rand(2, 7), v: rand(20, 60), p: rand(0, TAU) }));
  const dt = s.lastT ? Math.min(.1, t - s.lastT) : 0;
  s.lastT = t;
  ctx.strokeStyle = 'rgba(200,240,255,.55)';
  ctx.lineWidth = 1.2;
  for (const b of s.bubbles) {
    b.y -= b.v * dt;
    if (b.y < -10) { b.y = h + 10; b.x = rand(0, w); }
    ctx.beginPath(); ctx.arc(b.x + Math.sin(t * 2 + b.p) * 6, b.y, b.r, 0, TAU); ctx.stroke();
  }
}

function paintForest(ctx, w, h, t, s) {
  ctx.drawImage(layer(s, 'scene', w, h, (lctx) => {
    const bg = lctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0f2f2a');
    bg.addColorStop(.6, '#081a12');
    bg.addColorStop(1, '#020805');
    lctx.fillStyle = bg;
    lctx.fillRect(0, 0, w, h);
    const moon = lctx.createRadialGradient(w * .2, h * .18, 4, w * .2, h * .18, 140);
    moon.addColorStop(0, 'rgba(255,250,220,.95)');
    moon.addColorStop(.15, 'rgba(255,250,220,.6)');
    moon.addColorStop(1, 'rgba(255,250,220,0)');
    lctx.fillStyle = moon;
    lctx.fillRect(0, 0, w, h);
    ['#0c2a1e', '#071b13', '#030c08'].forEach((color, depth) => {
      lctx.fillStyle = color;
      const step = 60 - depth * 12;
      for (let x = -step; x < w + step; x += step) {
        const base = h * (.86 + depth * .05);
        const th = (rand(.25, .5) + depth * .1) * h;
        const wd = rand(26, 46);
        const tx = x + rand(-15, 15);
        lctx.beginPath(); lctx.moveTo(tx, base - th); lctx.lineTo(tx - wd, base); lctx.lineTo(tx + wd, base); lctx.fill();
      }
      lctx.fillRect(0, h * (.86 + depth * .05), w, h);
    });
  }), 0, 0, w, h);
  s.flies ||= Array.from({ length: 46 }, () => ({ x: rand(0, w), y: rand(h * .3, h), p: rand(0, TAU), sp: rand(.2, .6) }));
  const sprite = glowSprite(s, 'glow', '230,255,140');
  for (const f of s.flies) {
    const x = f.x + Math.sin(t * f.sp + f.p) * 60;
    const y = f.y + Math.cos(t * f.sp * 1.3 + f.p) * 40;
    ctx.globalAlpha = .9 * (Math.sin(t * 2 + f.p * 3) + 1) / 2;
    ctx.drawImage(sprite, x - 14, y - 14, 28, 28);
  }
  ctx.globalAlpha = 1;
}

function paintSnow(ctx, w, h, t, s) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#111a3a');
  bg.addColorStop(.7, '#2b3c6c');
  bg.addColorStop(1, '#55699c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  stars(ctx, w, h, t, s, 80, .5);
  ctx.fillStyle = '#fdf6dc';
  ctx.shadowColor = '#fff6c8';
  ctx.shadowBlur = 40;
  ctx.beginPath(); ctx.arc(w * .82, h * .18, 38, 0, TAU); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#2b3c6c';
  ctx.beginPath(); ctx.arc(w * .82 + 16, h * .18 - 8, 34, 0, TAU); ctx.fill();
  ctx.fillStyle = '#dfe8fa';
  ctx.beginPath(); ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 30) ctx.lineTo(x, h * .9 - Math.sin(x * .004) * 30 - Math.sin(x * .013) * 10);
  ctx.lineTo(w, h); ctx.fill();
  // A warm cabin window glowing in the hills.
  ctx.fillStyle = '#3a2a3a';
  ctx.fillRect(w * .12, h * .86 - 40, 60, 40);
  ctx.beginPath(); ctx.moveTo(w * .12 - 8, h * .86 - 40); ctx.lineTo(w * .12 + 30, h * .86 - 70); ctx.lineTo(w * .12 + 68, h * .86 - 40); ctx.fill();
  ctx.fillStyle = `rgba(255,214,120,${.75 + Math.sin(t * 3) * .1})`;
  ctx.fillRect(w * .12 + 20, h * .86 - 28, 14, 12);
  s.flakes ||= Array.from({ length: Math.round(w / 9) }, () => ({ x: rand(0, w), y: rand(0, h), r: rand(.8, 3), v: rand(20, 60), p: rand(0, TAU) }));
  const dt = s.lastT ? Math.min(.1, t - s.lastT) : 0;
  s.lastT = t;
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  for (const f of s.flakes) {
    f.y += f.v * dt;
    if (f.y > h) { f.y = -5; f.x = rand(0, w); }
    ctx.beginPath(); ctx.arc(f.x + Math.sin(t + f.p) * 12, f.y, f.r, 0, TAU); ctx.fill();
  }
}

function paintPaper(ctx, w, h, t, s) {
  ctx.fillStyle = '#f6f0e5';
  ctx.fillRect(0, 0, w, h);
  s.grain ||= Array.from({ length: 900 }, () => ({ x: rand(0, w), y: rand(0, h), a: rand(.02, .06) }));
  for (const g of s.grain) { ctx.fillStyle = `rgba(80,60,40,${g.a})`; ctx.fillRect(g.x, g.y, 1.2, 1.2); }
  ctx.fillStyle = '#c0392b';
  ctx.globalAlpha = .85;
  ctx.beginPath(); ctx.arc(w * .72, h * .26, Math.min(w, h) * .07, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;
  for (const [i, alpha] of [.12, .2, .32].entries()) {
    ctx.fillStyle = `rgba(30,30,36,${alpha})`;
    ctx.beginPath(); ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 12) {
      const peak = Math.pow(Math.abs(Math.sin(x * (.0025 + i * .001) + i * 1.7)), 3) * h * (.32 - i * .05);
      ctx.lineTo(x, h * (.78 + i * .06) - peak - Math.sin(x * .03) * 4);
    }
    ctx.lineTo(w, h); ctx.fill();
  }
  // Mist band drifting across the mountains.
  const mist = ctx.createLinearGradient(0, h * .66, 0, h * .8);
  mist.addColorStop(0, 'rgba(246,240,229,0)');
  mist.addColorStop(.5, 'rgba(246,240,229,.7)');
  mist.addColorStop(1, 'rgba(246,240,229,0)');
  ctx.fillStyle = mist;
  ctx.fillRect(0, h * .66, w, h * .14);
  // Two ink birds.
  ctx.strokeStyle = 'rgba(30,30,36,.7)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 2; i += 1) {
    const bx = ((t * 25 + i * 160) % (w + 200)) - 100;
    const by = h * (.2 + i * .06) + Math.sin(t + i) * 10;
    const flap = Math.sin(t * 6 + i) * 6;
    ctx.beginPath(); ctx.moveTo(bx - 12, by - flap); ctx.quadraticCurveTo(bx - 4, by - 4, bx, by); ctx.quadraticCurveTo(bx + 4, by - 4, bx + 12, by - flap); ctx.stroke();
  }
}

function paintRetro(ctx, w, h, t, s) {
  ctx.fillStyle = '#008080';
  ctx.fillRect(0, 0, w, h);
  // Classic flying-window screensaver motif, very faint.
  s.wins ||= Array.from({ length: 14 }, () => ({ x: rand(-1, 1), y: rand(-1, 1), z: rand(.2, 1) }));
  const dt = s.lastT ? Math.min(.1, t - s.lastT) : 0;
  s.lastT = t;
  for (const win of s.wins) {
    win.z -= dt * .08;
    if (win.z <= .05) { win.z = 1; win.x = rand(-1, 1); win.y = rand(-1, 1); }
    const size = 18 / win.z;
    const x = w / 2 + (win.x / win.z) * w * .2;
    const y = h / 2 + (win.y / win.z) * h * .2;
    ctx.globalAlpha = .1;
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00'];
    colors.forEach((color, i) => { ctx.fillStyle = color; ctx.fillRect(x + (i % 2) * size / 2, y + Math.floor(i / 2) * size / 2, size / 2 - 1, size / 2 - 1); });
  }
  ctx.globalAlpha = 1;
}
