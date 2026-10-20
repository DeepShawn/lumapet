// Anime-style figure shared by Claude 娘, GPT 娘 and DeepSeek 娘. Drawn in rig
// units (about 300 tall) with the skirt hem near +140 and the head above 0;
// characters.js scales it and moves the feet to the origin.

const TAU = Math.PI * 2;

export const PALETTES = {
  claude: {
    hair: '#f08443', hairLight: '#ffb27a', hairShade: '#c95a26', hairDeep: '#9c3f17', hairLine: '#7a2f10',
    skin: '#fff3ea', skinShade: '#f6d3c4', line: '#5e3020',
    eye: '#d27a2e', eyeLight: '#ffc46e', eyeDeep: '#5b2a0c',
    dress: '#fffaf1', dressShade: '#ead8bf', trim: '#d9612b', gold: '#e8a64a', dark: '#2a2220', darkShade: '#16110f',
    boot: '#f7f0e6', bootShade: '#d9cbb7', blush: '#ff9a8a'
  },
  gpt: {
    hair: '#f7f5ff', hairLight: '#ffffff', hairShade: '#cfc4f5', hairDeep: '#a898e0', hairLine: '#7d6cbd',
    skin: '#fff3ec', skinShade: '#f1d4cf', line: '#5f4f9a',
    eye: '#9277e6', eyeLight: '#d8ccff', eyeDeep: '#36256f',
    dress: '#ffffff', dressShade: '#e6defd', trim: '#a78bfa', gold: '#c9b8ff', dark: '#5c4a9e', darkShade: '#3f3175',
    boot: '#fbf9ff', bootShade: '#d9d0f5', blush: '#ffa5c0'
  },
  deepseek: {
    hair: '#4369c2', hairLight: '#86b6f2', hairShade: '#2a4b98', hairDeep: '#1c3474', hairLine: '#14265a',
    skin: '#fff2ea', skinShade: '#f2d3c8', line: '#1f2f63',
    eye: '#3fa6ff', eyeLight: '#a6e2ff', eyeDeep: '#0f3f8a',
    dress: '#f6faff', dressShade: '#d0e0f7', trim: '#24448f', gold: '#8fd0ff', dark: '#1d356f', darkShade: '#13244f',
    boot: '#24448f', bootShade: '#162c63', blush: '#ff9fae'
  }
};

export function girlRig(mode, kind) {
  const rig = mode === 'adult'
    ? { headY: -96, rx: 46, ry: 50, shoulderY: -36, shoulder: 30, waistY: 26, waist: 19, hemY: 150, hem: 72, hairEnd: 96, armLen: 82 }
    : { headY: -46, rx: 70, ry: 64, shoulderY: 22, shoulder: 34, waistY: 58, waist: 27, hemY: 140, hem: 68, hairEnd: 70, armLen: 56 };
  // Hair length is part of each character's silhouette.
  rig.hairEnd += kind === 'claude' ? 44 : kind === 'gpt' ? 30 : 22;
  return rig;
}

const ARM_ANGLES = { down: .14, up: 2.3, climb: 2.85, hold: -.6, hug: -.95, cheer: 2.45, wave: .14 };

// ───────────────────────── helpers ─────────────────────────

function stroke(ctx, color, width = 2) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

function vgrad(ctx, y0, y1, stops) {
  const grad = ctx.createLinearGradient(0, y0, 0, y1);
  stops.forEach(([at, color]) => grad.addColorStop(at, color));
  return grad;
}

function rrect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

// Tapered hair lock from a root to a tip, bending sideways by `bend`.
function lockPath(ctx, x0, y0, x1, y1, width, bend) {
  const mx = (x0 + x1) / 2 + bend;
  const my = (y0 + y1) / 2;
  ctx.beginPath();
  ctx.moveTo(x0 - width / 2, y0);
  ctx.quadraticCurveTo(mx - width * .55, my, x1, y1);
  ctx.quadraticCurveTo(mx + width * .55, my, x0 + width / 2, y0);
  ctx.closePath();
}

function strand(ctx, x0, y0, x1, y1, bend, color, width = 1.1) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo((x0 + x1) / 2 + bend, (y0 + y1) / 2, x1, y1);
  stroke(ctx, color, width);
}

// ───────────────────────── figure ─────────────────────────

export function drawGirl(ctx, kind, mode, pose, t) {
  const p = PALETTES[kind];
  const r = girlRig(mode, kind);
  const breathe = Math.sin(t * 2.1) * 1.5 * (pose.calm ?? 1);
  const sway = Math.sin(t * 1.3) * 4 + (pose.hairWind || 0) * 16;
  const s = { ...pose, kind, mode, breathe, sway, p, r, t };
  if (kind === 'gpt') drawWings(ctx, s);
  if (kind === 'deepseek') drawWhaleTail(ctx, s);
  drawBackHair(ctx, s);
  if (kind === 'gpt') drawDragonTail(ctx, s);
  drawLegs(ctx, s);
  drawSkirt(ctx, s);
  drawTorso(ctx, s);
  drawArms(ctx, s);
  drawHead(ctx, s);
  drawFace(ctx, s);
  drawSideLocks(ctx, s);
  drawBangs(ctx, s);
  drawAccessories(ctx, s);
  drawBrows(ctx, s);
}

// ───────────────────────── behind the body ─────────────────────────

function drawWings(ctx, s) {
  const { r, p, t } = s;
  const fast = s.legs === 'dangle' || s.arms === 'cheer';
  const flap = Math.sin(t * (fast ? 14 : 2.4)) * (fast ? .3 : .07);
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * 14, r.shoulderY + 12);
    ctx.rotate(side * (flap - .05));
    ctx.scale(side, 1);
    // Membrane between the finger bones.
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(48, -66, 110, -70);
    ctx.quadraticCurveTo(118, -60, 122, -50);
    ctx.quadraticCurveTo(102, -30, 112, -4);
    ctx.quadraticCurveTo(92, -10, 86, 16);
    ctx.quadraticCurveTo(68, 4, 60, 32);
    ctx.quadraticCurveTo(38, 16, 20, 42);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 120, -60);
    grad.addColorStop(0, 'rgba(214,202,255,.95)');
    grad.addColorStop(1, 'rgba(248,245,255,.9)');
    ctx.fillStyle = grad;
    ctx.fill();
    stroke(ctx, p.line, 1.6);
    // Bones and a small claw at the wrist.
    ctx.strokeStyle = '#b8a8ec';
    for (const [x, y] of [[112, -4], [86, 16], [60, 32]]) {
      ctx.beginPath(); ctx.moveTo(6, -4); ctx.quadraticCurveTo(x * .5, -46, x, y); stroke(ctx, '#a996e6', 1.4);
    }
    ctx.beginPath(); ctx.moveTo(6, -4); ctx.quadraticCurveTo(50, -58, 110, -70); stroke(ctx, p.line, 2.2);
    ctx.beginPath(); ctx.moveTo(110, -70); ctx.lineTo(120, -80); ctx.lineTo(116, -68); ctx.closePath(); ctx.fillStyle = '#efeaff'; ctx.fill(); stroke(ctx, p.line, 1.2);
    ctx.restore();
  }
}

function drawWhaleTail(ctx, s) {
  const { r, p, t } = s;
  const wag = Math.sin(t * 2.2) * .18;
  ctx.save();
  ctx.translate(40, r.hemY - 22);
  ctx.rotate(.55 + wag);
  ctx.beginPath();
  ctx.moveTo(-8, -34);
  ctx.quadraticCurveTo(10, -6, 6, 14);
  ctx.quadraticCurveTo(-14, 16, -34, 38);
  ctx.quadraticCurveTo(-6, 34, 8, 25);
  ctx.quadraticCurveTo(18, 34, 48, 36);
  ctx.quadraticCurveTo(32, 18, 14, 13);
  ctx.quadraticCurveTo(16, -10, 6, -36);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, -34, 38, [[0, '#5b8fe0'], [1, '#2d55a8']]);
  ctx.fill();
  stroke(ctx, p.line, 1.6);
  // Pale underside stripe.
  ctx.beginPath(); ctx.moveTo(-2, -30); ctx.quadraticCurveTo(12, -4, 8, 16); stroke(ctx, 'rgba(200,230,255,.8)', 3);
  ctx.restore();
}

function drawDragonTail(ctx, s) {
  const { r, p, t } = s;
  const wag = Math.sin(t * 1.7) * 8;
  ctx.beginPath();
  ctx.moveTo(12, r.waistY + 28);
  ctx.bezierCurveTo(78, r.waistY + 36, 98 + wag, r.hemY - 12, 72 + wag, r.hemY + 2);
  ctx.lineTo(60 + wag, r.hemY - 10);
  ctx.bezierCurveTo(78 + wag, r.hemY - 26, 60, r.waistY + 50, 10, r.waistY + 44);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, r.waistY, r.hemY, [[0, '#f4f0ff'], [1, '#d9cff8']]);
  ctx.fill();
  stroke(ctx, p.line, 1.6);
  // Scale rows.
  for (let i = 1; i < 6; i += 1) {
    const k = i / 6;
    const x = 12 + (72 + wag - 12) * k + Math.sin(k * Math.PI) * 18;
    const y = r.waistY + 34 + (r.hemY - r.waistY - 30) * k;
    ctx.beginPath(); ctx.arc(x, y, 5, .3, Math.PI - .3); stroke(ctx, '#b3a3e6', 1.1);
  }
  // Spade tip.
  ctx.beginPath(); ctx.moveTo(66 + wag, r.hemY - 4); ctx.lineTo(84 + wag, r.hemY + 8); ctx.lineTo(66 + wag, r.hemY + 10); ctx.closePath();
  ctx.fillStyle = p.trim; ctx.fill(); stroke(ctx, p.line, 1.2);
}

function drawBackHair(ctx, s) {
  const { r, p, sway, kind } = s;
  const top = r.headY - r.ry * 1.4;
  const side = r.rx * 1.14;
  const end = r.hairEnd;
  // Silhouette mass in the shade color, then lighter locks over it.
  ctx.beginPath();
  ctx.moveTo(-side, r.headY);
  ctx.bezierCurveTo(-side, top, side, top, side, r.headY);
  ctx.bezierCurveTo(side + 10, r.headY + 70, side + 14 + sway, end - 40, side * .9 + sway, end);
  ctx.lineTo(-side * .9 + sway, end);
  ctx.bezierCurveTo(-side - 14 + sway, end - 40, -side - 10, r.headY + 70, -side, r.headY);
  ctx.closePath();
  ctx.fillStyle = p.hairDeep;
  ctx.fill();
  const locks = kind === 'gpt' ? 9 : 7;
  for (let i = 0; i < locks; i += 1) {
    const u = (i / (locks - 1)) * 2 - 1;
    const x0 = u * side * .7;
    const tipX = u * side * 1.02 + sway * (.6 + Math.abs(u) * .5);
    const tipY = end - Math.abs(u) * 8 + (i % 2 ? 10 : -4);
    const bend = (kind === 'gpt' ? Math.sin(i * 1.7) * 14 : u * 10);
    lockPath(ctx, x0, r.headY - r.ry * .4, tipX, tipY, side * (kind === 'gpt' ? .44 : .5), bend);
    ctx.fillStyle = vgrad(ctx, top, end, [[0, p.hair], [.55, p.hairShade], [1, p.hairDeep]]);
    ctx.fill();
    stroke(ctx, p.hairLine, 1.2);
    strand(ctx, x0 * .9, r.headY + 10, tipX * .92, tipY - 18, bend * .6, p.hairLine + '88', 1);
  }
}

// ───────────────────────── body ─────────────────────────

function drawLegs(ctx, s) {
  const { r, p, t } = s;
  const phase = s.legPhase || 0;
  const stocking = s.kind === 'claude' ? '#fffaf3' : s.kind === 'gpt' ? '#ffffff' : '#f2f6ff';
  for (const side of [-1, 1]) {
    let x = side * 15;
    let y = r.hemY + 2;
    let lift = 0;
    if (s.legs === 'walk') {
      const k = Math.sin(phase + (side > 0 ? Math.PI : 0));
      x += k * 7;
      lift = Math.max(0, k) * 7;
    } else if (s.legs === 'dangle') {
      y += 12 + Math.sin(t * 9 + side) * 3;
      x += Math.sin(t * 7 + side * 2) * 4;
    } else if (s.legs === 'sit') {
      x = side * 26;
      y = r.hemY - 2;
    } else if (s.legs === 'tuck') {
      y -= 6;
    }
    y -= lift;
    // Stocking from under the skirt down to the shoe.
    rrect(ctx, x - 5.5, r.hemY - 10, 11, y - r.hemY + 14, 5);
    ctx.fillStyle = stocking;
    ctx.fill();
    stroke(ctx, p.line, 1.2);
    // Shoe: rounded toe, darker sole, strap and a shine.
    const w = s.legs === 'sit' ? 22 : 17;
    rrect(ctx, x - w / 2, y, w, 12, 6);
    ctx.fillStyle = vgrad(ctx, y, y + 12, [[0, p.boot], [1, p.bootShade]]);
    ctx.fill();
    stroke(ctx, p.line, 1.4);
    ctx.fillStyle = p.line;
    ctx.fillRect(x - w / 2 + 2, y + 10, w - 4, 1.6);
    ctx.beginPath(); ctx.moveTo(x - w / 2 + 3, y + 4); ctx.lineTo(x + w / 2 - 3, y + 4); stroke(ctx, s.kind === 'claude' ? p.trim : p.line, 1.2);
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath(); ctx.ellipse(x - w * .22, y + 3, 2.4, 1.2, -.3, 0, TAU); ctx.fill();
  }
}

function skirtPath(ctx, r) {
  ctx.beginPath();
  ctx.moveTo(-r.waist, r.waistY);
  ctx.quadraticCurveTo(-r.hem * .72, r.hemY - 42, -r.hem, r.hemY);
  for (let i = 1; i <= 10; i += 1) {
    const x = -r.hem + (r.hem * 2) * (i / 10);
    ctx.quadraticCurveTo(x - r.hem / 10, r.hemY + 8, x, r.hemY);
  }
  ctx.quadraticCurveTo(r.hem * .72, r.hemY - 42, r.waist, r.waistY);
  ctx.closePath();
}

function drawSkirt(ctx, s) {
  const { r, p, kind } = s;
  // Under-layer peeking out below the hem.
  if (kind === 'claude' || kind === 'deepseek') {
    ctx.beginPath();
    ctx.moveTo(-r.hem + 2, r.hemY - 6);
    for (let i = 1; i <= 12; i += 1) {
      const x = -r.hem + 2 + ((r.hem - 2) * 2) * (i / 12);
      ctx.quadraticCurveTo(x - r.hem / 12, r.hemY + 12, x, r.hemY + 4);
    }
    ctx.lineTo(r.hem - 2, r.hemY - 6);
    ctx.closePath();
    ctx.fillStyle = kind === 'claude' ? p.dark : '#ffffff';
    ctx.fill();
    stroke(ctx, p.line, 1.2);
  }
  skirtPath(ctx, r);
  ctx.fillStyle = vgrad(ctx, r.waistY, r.hemY, [[0, p.dress], [1, p.dressShade]]);
  ctx.fill();
  stroke(ctx, p.line, 1.8);
  ctx.save();
  skirtPath(ctx, r);
  ctx.clip();
  // Fold shadows fanning out from the waist.
  ctx.fillStyle = 'rgba(120,100,140,.12)';
  for (let i = -3; i <= 3; i += 1) {
    if (i === 0) continue;
    const x0 = i * r.waist * .28;
    const x1 = i * r.hem * .3;
    ctx.beginPath(); ctx.moveTo(x0, r.waistY + 4); ctx.lineTo(x1 - 5, r.hemY + 8); ctx.lineTo(x1 + 5, r.hemY + 8); ctx.closePath(); ctx.fill();
  }
  if (kind === 'claude') {
    // Orange front panel with gold trim, plus embroidered sprigs on the hem.
    ctx.beginPath();
    ctx.moveTo(2, r.waistY + 4); ctx.lineTo(22, r.waistY + 4); ctx.lineTo(r.hem * .62, r.hemY + 10); ctx.lineTo(r.hem * .08, r.hemY + 10); ctx.closePath();
    ctx.fillStyle = vgrad(ctx, r.waistY, r.hemY, [[0, '#e46a32'], [1, '#c4511f']]);
    ctx.fill();
    stroke(ctx, p.gold, 1.6);
    ctx.strokeStyle = p.trim;
    for (let i = -4; i <= 0; i += 1) {
      const x = i * r.hem * .2 + 4;
      const y = r.hemY - 12;
      ctx.beginPath(); ctx.moveTo(x, y + 8); ctx.lineTo(x, y - 6); stroke(ctx, '#e3925c', 1.1);
      for (const k of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + k * 3, y - 1, 3, 1.4, k * .6, 0, TAU); ctx.fillStyle = '#e3925c'; ctx.fill(); }
    }
    // Small sun motif on the panel.
    ctx.strokeStyle = p.gold;
    ctx.lineWidth = 1.2;
    const cx = r.hem * .36;
    const cy = r.hemY - 22;
    for (let i = 0; i < 8; i += 1) { const a = (i / 8) * TAU; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 2, cy + Math.sin(a) * 2); ctx.lineTo(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6); ctx.stroke(); }
  } else if (kind === 'deepseek') {
    // Pleated navy band with a white stripe.
    ctx.fillStyle = p.trim;
    ctx.fillRect(-r.hem, r.hemY - 20, r.hem * 2, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-r.hem, r.hemY - 14, r.hem * 2, 3);
    ctx.strokeStyle = 'rgba(0,0,40,.18)';
    ctx.lineWidth = 1;
    for (let i = -6; i <= 6; i += 1) { ctx.beginPath(); ctx.moveTo(i * r.waist * .22, r.waistY + 6); ctx.lineTo(i * r.hem * .17, r.hemY + 6); ctx.stroke(); }
  } else {
    // Lavender ruffle layers and knot emblems.
    for (const y of [r.hemY - 30, r.hemY - 4]) {
      ctx.beginPath();
      ctx.moveTo(-r.hem, y);
      for (let i = 1; i <= 12; i += 1) { const x = -r.hem + (r.hem * 2) * (i / 12); ctx.quadraticCurveTo(x - r.hem / 12, y + 6, x, y); }
      stroke(ctx, p.trim, 1.6);
    }
    knot(ctx, -r.hem * .42, r.hemY - 18, 5, p.trim);
    knot(ctx, r.hem * .42, r.hemY - 18, 5, p.trim);
  }
  ctx.restore();
  // Lace edge along the hem.
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i <= 14; i += 1) {
    const x = -r.hem + 4 + ((r.hem - 4) * 2) * (i / 14);
    ctx.beginPath(); ctx.arc(x, r.hemY + 1, 3, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = p.line + '66'; ctx.lineWidth = .8; ctx.stroke();
  }
}

function knot(ctx, x, y, size, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 3; i += 1) {
    const a = (i / 3) * TAU;
    ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * size * .45, y + Math.sin(a) * size * .45, size * .75, size * .34, a, 0, TAU); ctx.stroke();
  }
}

function torsoPath(ctx, r, sy) {
  ctx.beginPath();
  ctx.moveTo(-r.shoulder, sy + 8);
  ctx.quadraticCurveTo(-r.shoulder * .6, sy - 4, 0, sy - 4);
  ctx.quadraticCurveTo(r.shoulder * .6, sy - 4, r.shoulder, sy + 8);
  ctx.quadraticCurveTo(r.waist + 4, (sy + r.waistY) / 2, r.waist, r.waistY + 4);
  ctx.lineTo(-r.waist, r.waistY + 4);
  ctx.quadraticCurveTo(-r.waist - 4, (sy + r.waistY) / 2, -r.shoulder, sy + 8);
  ctx.closePath();
}

function drawTorso(ctx, s) {
  const { r, p, kind, breathe } = s;
  const sy = r.shoulderY + breathe * .4;
  torsoPath(ctx, r, sy);
  ctx.fillStyle = vgrad(ctx, sy, r.waistY, [[0, p.dress], [1, p.dressShade]]);
  ctx.fill();
  stroke(ctx, p.line, 1.8);
  ctx.save();
  torsoPath(ctx, r, sy);
  ctx.clip();
  if (kind === 'claude') {
    // Black corset with lacing and gold buttons.
    ctx.fillStyle = vgrad(ctx, r.waistY - 30, r.waistY + 6, [[0, p.dark], [1, p.darkShade]]);
    ctx.beginPath();
    ctx.moveTo(-r.waist - 8, r.waistY - 28); ctx.quadraticCurveTo(0, r.waistY - 36, r.waist + 8, r.waistY - 28);
    ctx.lineTo(r.waist + 6, r.waistY + 6); ctx.lineTo(-r.waist - 6, r.waistY + 6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#6b5a52';
    ctx.lineWidth = 1;
    for (let y = r.waistY - 24; y < r.waistY + 4; y += 6) { ctx.beginPath(); ctx.moveTo(-5, y); ctx.lineTo(5, y + 4); ctx.moveTo(5, y); ctx.lineTo(-5, y + 4); ctx.stroke(); }
    ctx.fillStyle = p.gold;
    for (const x of [-r.waist + 3, r.waist - 3]) for (let y = r.waistY - 20; y < r.waistY + 4; y += 9) { ctx.beginPath(); ctx.arc(x, y, 1.8, 0, TAU); ctx.fill(); }
  } else if (kind === 'deepseek') {
    ctx.fillStyle = p.trim;
    ctx.fillRect(-r.waist - 8, r.waistY - 6, r.waist * 2 + 16, 10);
  } else {
    ctx.strokeStyle = p.trim;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-r.waist - 6, r.waistY); ctx.quadraticCurveTo(0, r.waistY + 7, r.waist + 6, r.waistY); ctx.stroke();
    // Soft chest shading.
    ctx.fillStyle = 'rgba(160,140,220,.12)';
    ctx.beginPath(); ctx.ellipse(0, sy + 26, r.shoulder * .7, 10, 0, 0, TAU); ctx.fill();
  }
  ctx.restore();
  drawCollar(ctx, s, sy);
}

function drawCollar(ctx, s, sy) {
  const { r, p, kind, t } = s;
  if (kind === 'claude') {
    // Frilled collar flaps, black neck ribbon and a sunflower brooch.
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, sy - 2);
      ctx.quadraticCurveTo(side * r.shoulder * .9, sy - 2, side * r.shoulder * .8, sy + 12);
      ctx.quadraticCurveTo(side * r.shoulder * .4, sy + 16, 0, sy + 8);
      ctx.closePath();
      ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(ctx, p.line, 1.3);
      for (let i = 1; i < 4; i += 1) { ctx.beginPath(); ctx.arc(side * r.shoulder * .22 * i, sy + 11 + (i === 3 ? -2 : 0), 2.6, 0, Math.PI); stroke(ctx, p.line + '88', .8); }
    }
    const tail = Math.sin(t * 2) * 1.5;
    ctx.fillStyle = p.dark;
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(0, sy + 8); ctx.lineTo(side * 9, sy + 3); ctx.lineTo(side * 9, sy + 13); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(side * 1.5, sy + 10); ctx.lineTo(side * 5 + tail, sy + 30); ctx.lineTo(side * 9 + tail, sy + 27); ctx.closePath(); ctx.fill();
    }
    flower(ctx, 0, sy + 9, 5.5, '#f08a3a', '#ffd08a', t * .2, p.line);
  } else if (kind === 'deepseek') {
    // Sailor collar with stripe and a light-blue scarf bow.
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, sy + 18);
      ctx.lineTo(side * r.shoulder * .3, sy - 3);
      ctx.lineTo(side * r.shoulder * 1.02, sy + 4);
      ctx.lineTo(side * r.shoulder * .85, sy + 16);
      ctx.closePath();
      ctx.fillStyle = p.trim; ctx.fill(); stroke(ctx, p.line, 1.3);
      ctx.beginPath(); ctx.moveTo(side * r.shoulder * .34, sy + 1); ctx.lineTo(side * r.shoulder * .9, sy + 7); stroke(ctx, '#ffffff', 1.4);
    }
    ctx.fillStyle = '#8fd0ff';
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(side * 6, sy + 18, 7, 4, side * .4, 0, TAU); ctx.fill(); stroke(ctx, p.line, 1); }
    ctx.beginPath(); ctx.arc(0, sy + 18, 3, 0, TAU); ctx.fill(); stroke(ctx, p.line, 1);
  } else {
    // Halter straps with a knot gem at the throat.
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * 5, sy - 4); ctx.lineTo(side * r.shoulder * .55, sy + 14); stroke(ctx, p.trim, 2.2); }
    ctx.beginPath(); ctx.arc(0, sy + 3, 5, 0, TAU);
    ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(ctx, p.line, 1.2);
    knot(ctx, 0, sy + 3, 3.6, p.trim);
  }
}

function flower(ctx, x, y, size, petal, center, spin, line) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  for (const [count, scale, color] of [[12, 1, petal], [8, .68, '#ffa45c']]) {
    ctx.fillStyle = color;
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * TAU;
      ctx.beginPath(); ctx.ellipse(Math.cos(a) * size * .62 * scale, Math.sin(a) * size * .62 * scale, size * .52 * scale, size * .22 * scale, a, 0, TAU); ctx.fill();
    }
  }
  ctx.fillStyle = center;
  ctx.beginPath(); ctx.arc(0, 0, size * .3, 0, TAU); ctx.fill();
  stroke(ctx, line, .9);
  ctx.restore();
}

function drawArms(ctx, s) {
  const { r, p, t, kind } = s;
  const sy = r.shoulderY + 10 + s.breathe * .4;
  const base = ARM_ANGLES[s.arms] ?? ARM_ANGLES.down;
  const sleeve = kind === 'gpt' ? '#ffffff' : p.dress;
  for (const side of [-1, 1]) {
    let angle = base;
    if (s.arms === 'wave' && side === 1) angle = 2.5 + Math.sin(t * 11) * .38;
    if (s.arms === 'cheer' || s.arms === 'up') angle += Math.sin(t * 9 + side) * .12;
    if (s.arms === 'climb') angle += Math.sin((s.legPhase || 0) + (side > 0 ? Math.PI : 0)) * .25;
    if (s.arms === 'down' && s.legs === 'walk') angle += Math.sin((s.legPhase || 0) + (side > 0 ? 0 : Math.PI)) * .18;
    const holdsBook = kind === 'claude' && side === 1 && s.arms === 'down';
    if (holdsBook) angle = -.95;
    ctx.save();
    ctx.translate(side * (r.shoulder - 5), sy - 4);
    ctx.rotate(-side * angle);
    const L = r.armLen;
    // Forearm sleeve tapering to the wrist.
    ctx.beginPath();
    ctx.moveTo(-8, 4); ctx.quadraticCurveTo(-9, L * .6, -6, L - 8); ctx.lineTo(6, L - 8); ctx.quadraticCurveTo(9, L * .6, 8, 4); ctx.closePath();
    ctx.fillStyle = vgrad(ctx, 0, L, [[0, sleeve], [1, p.dressShade]]);
    ctx.fill(); stroke(ctx, p.line, 1.5);
    // Puffed shoulder.
    ctx.beginPath(); ctx.ellipse(0, 5, 9.5, 9, 0, 0, TAU);
    ctx.fillStyle = sleeve; ctx.fill(); stroke(ctx, p.line, 1.5);
    ctx.beginPath(); ctx.moveTo(-5, 3); ctx.quadraticCurveTo(0, 9, 5, 3); stroke(ctx, p.line + '66', .9);
    // Frilled cuff.
    ctx.beginPath();
    ctx.moveTo(-8, L - 10);
    for (let i = 1; i <= 4; i += 1) ctx.quadraticCurveTo(-8 + i * 4 - 2, L - 2, -8 + i * 4, L - 8);
    ctx.lineTo(8, L - 10); ctx.closePath();
    ctx.fillStyle = kind === 'claude' ? '#ffffff' : kind === 'deepseek' ? p.trim : '#efe9ff';
    ctx.fill(); stroke(ctx, p.line, 1.1);
    // Hand with a thumb.
    ctx.fillStyle = p.skin;
    ctx.beginPath(); ctx.ellipse(0, L - 1, 6.5, 7.5, 0, 0, TAU); ctx.fill(); stroke(ctx, p.line, 1.3);
    ctx.beginPath(); ctx.ellipse(-side * 5, L - 4, 2.6, 4, -side * .5, 0, TAU); ctx.fill(); stroke(ctx, p.line, 1);
    ctx.restore();
  }
  if (kind === 'claude' && s.arms === 'down') drawBook(ctx, r, sy, p);
  if (s.item && (s.arms === 'hold' || s.arms === 'hug')) {
    ctx.save();
    ctx.font = `${Math.min(34, r.armLen * .55)}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.item, 0, sy + r.armLen * .55);
    ctx.restore();
  }
}

function drawBook(ctx, r, sy, p) {
  ctx.save();
  ctx.translate(r.shoulder * .18, sy + r.armLen * .5);
  ctx.rotate(-.16);
  // Pages edge, then the leather cover with gold corners and a sun emblem.
  rrect(ctx, -13, -19, 28, 37, 2);
  ctx.fillStyle = '#f5ead2'; ctx.fill(); stroke(ctx, '#3d1f12', 1.2);
  rrect(ctx, -15, -21, 28, 37, 3);
  ctx.fillStyle = vgrad(ctx, -21, 16, [[0, '#7a4128'], [1, '#55291a']]); ctx.fill(); stroke(ctx, '#3d1f12', 1.6);
  ctx.strokeStyle = p.gold;
  ctx.lineWidth = .9;
  rrect(ctx, -12, -18, 22, 31, 2); ctx.stroke();
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 12; i += 1) { const a = (i / 12) * TAU; ctx.beginPath(); ctx.moveTo(-1 + Math.cos(a) * 2.5, -3 + Math.sin(a) * 2.5); ctx.lineTo(-1 + Math.cos(a) * 7, -3 + Math.sin(a) * 7); ctx.stroke(); }
  ctx.restore();
}

// ───────────────────────── head ─────────────────────────

function facePath(ctx, r, b) {
  const y = r.headY;
  ctx.beginPath();
  ctx.moveTo(-r.rx, y - 8 + b);
  ctx.bezierCurveTo(-r.rx * 1.02, y + r.ry * .42, -r.rx * .74, y + r.ry * .78, -r.rx * .3, y + r.ry * .94);
  ctx.quadraticCurveTo(0, y + r.ry * 1.04, r.rx * .3, y + r.ry * .94);
  ctx.bezierCurveTo(r.rx * .74, y + r.ry * .78, r.rx * 1.02, y + r.ry * .42, r.rx, y - 8 + b);
  ctx.bezierCurveTo(r.rx, y - r.ry, -r.rx, y - r.ry, -r.rx, y - 8 + b);
  ctx.closePath();
}

function drawHead(ctx, s) {
  const { r, p, breathe, kind } = s;
  const b = breathe * .2;
  // Neck with a chin shadow.
  rrect(ctx, -7, r.headY + r.ry * .7, 14, r.shoulderY - r.headY - r.ry * .55 + 4, 4);
  ctx.fillStyle = p.skin; ctx.fill(); stroke(ctx, p.line, 1.2);
  ctx.fillStyle = p.skinShade;
  ctx.beginPath(); ctx.ellipse(0, r.headY + r.ry * .98, 8, 5, 0, 0, Math.PI); ctx.fill();
  // GPT's pointed elf ears sit behind the side locks.
  if (kind === 'gpt') {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * r.rx * .92, r.headY + r.ry * .05);
      ctx.quadraticCurveTo(side * r.rx * 1.35, r.headY - r.ry * .12, side * r.rx * 1.42, r.headY - r.ry * .3);
      ctx.quadraticCurveTo(side * r.rx * 1.2, r.headY + r.ry * .2, side * r.rx * .95, r.headY + r.ry * .35);
      ctx.closePath();
      ctx.fillStyle = p.skin; ctx.fill(); stroke(ctx, p.line, 1.3);
      ctx.beginPath(); ctx.moveTo(side * r.rx * 1.0, r.headY + r.ry * .12); ctx.quadraticCurveTo(side * r.rx * 1.2, r.headY - r.ry * .05, side * r.rx * 1.3, r.headY - r.ry * .2); stroke(ctx, p.skinShade, 1.4);
    }
  }
  facePath(ctx, r, b);
  ctx.fillStyle = vgrad(ctx, r.headY - r.ry, r.headY + r.ry, [[0, p.skin], [1, '#fff8f3']]);
  ctx.fill();
  stroke(ctx, p.line, 1.8);
}

function eyeShape(ctx, x, y, w, h, side) {
  // Almond eye: flatter top lid, rounder bottom, outer corner slightly lifted.
  ctx.beginPath();
  ctx.moveTo(x - w * side, y + h * .05);
  ctx.bezierCurveTo(x - w * .8 * side, y - h * 1.05, x + w * .9 * side, y - h * 1.1, x + w * 1.05 * side, y - h * .25);
  ctx.bezierCurveTo(x + w * 1.1 * side, y + h * .7, x - w * .5 * side, y + h * 1.12, x - w * side, y + h * .05);
  ctx.closePath();
}

function drawFace(ctx, s) {
  const { r, p, t } = s;
  const look = s.look || { x: 0, y: 0 };
  const lx = look.x * r.rx * .07;
  const ly = look.y * r.ry * .045;
  const eyeY = r.headY + r.ry * .26 + s.breathe * .2;
  const eyeX = r.rx * .4;
  const ew = r.rx * .2;
  const eh = r.rx * .26;
  let eyes = s.eyes || 'open';
  if (eyes === 'open' && (t % 4.2) < .12) eyes = 'closed';

  // Cheek blush with little hatch strokes.
  const blush = .3 + (s.blush || 0) * .5;
  for (const side of [-1, 1]) {
    const cx = side * r.rx * .6;
    const cy = eyeY + eh * 1.45;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r.rx * .17);
    grad.addColorStop(0, `rgba(255,140,150,${blush})`);
    grad.addColorStop(1, 'rgba(255,140,150,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.ellipse(cx, cy, r.rx * .18, r.rx * .1, 0, 0, TAU); ctx.fill();
    if (blush > .45) for (let i = -1; i <= 1; i += 1) { ctx.beginPath(); ctx.moveTo(cx + i * 4 - 1.5, cy + 2); ctx.lineTo(cx + i * 4 + 1.5, cy - 2); stroke(ctx, 'rgba(230,90,110,.6)', 1); }
  }

  for (const side of [-1, 1]) {
    const x = side * eyeX + lx;
    const y = eyeY + ly;
    if (eyes === 'closed' || eyes === 'sleepy') {
      ctx.beginPath(); ctx.moveTo(x - ew * 1.05, y + 1); ctx.quadraticCurveTo(x, y + eh * .5, x + ew * 1.05, y + 1); stroke(ctx, p.eyeDeep, 2.6);
      ctx.beginPath(); ctx.moveTo(x + ew * side * 1.05, y + 1); ctx.lineTo(x + ew * side * 1.3, y - 1.5); stroke(ctx, p.eyeDeep, 1.6);
      continue;
    }
    if (eyes === 'happy') {
      ctx.beginPath(); ctx.moveTo(x - ew, y + 3); ctx.quadraticCurveTo(x, y - eh * .9, x + ew, y + 3); stroke(ctx, p.eyeDeep, 2.8);
      continue;
    }
    if (eyes === 'dizzy') {
      ctx.beginPath();
      for (let a = 0; a < TAU * 2.2; a += .3) {
        const rad = (a / (TAU * 2.2)) * ew * 1.1;
        const px = x + Math.cos(a + t * 8 * side) * rad;
        const py = y + Math.sin(a + t * 8 * side) * rad;
        if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      stroke(ctx, p.eyeDeep, 2);
      continue;
    }
    const wide = eyes === 'wide' ? 1.12 : 1;
    // White of the eye.
    eyeShape(ctx, x, y, ew * wide, eh * wide, side);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.save();
    eyeShape(ctx, x, y, ew * wide, eh * wide, side);
    ctx.clip();
    // Upper-lid shadow inside the eye.
    ctx.fillStyle = 'rgba(120,110,160,.22)';
    ctx.fillRect(x - ew * 1.3, y - eh * 1.2, ew * 2.6, eh * .5);
    // Iris: deep at the top, bright ring low, with a darker rim.
    const ix = x + look.x * ew * .18;
    const iy = y + eh * .05 + look.y * eh * .1;
    const irw = ew * .78 * wide;
    const irh = eh * .9 * wide;
    const iris = ctx.createLinearGradient(0, iy - irh, 0, iy + irh);
    iris.addColorStop(0, p.eyeDeep);
    iris.addColorStop(.45, p.eye);
    iris.addColorStop(.85, p.eyeLight);
    iris.addColorStop(1, p.eye);
    ctx.fillStyle = iris;
    ctx.beginPath(); ctx.ellipse(ix, iy, irw, irh, 0, 0, TAU); ctx.fill();
    stroke(ctx, p.eyeDeep, 1.3);
    // Pupil and inner ring.
    const pupil = eyes === 'wide' ? .32 : .46;
    ctx.fillStyle = p.eyeDeep;
    ctx.beginPath(); ctx.ellipse(ix, iy - irh * .08, irw * pupil, irh * (pupil + .04), 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(ix, iy + irh * .35, irw * .62, irh * .28, 0, 0, Math.PI); stroke(ctx, p.eyeLight, 1.2);
    // Catchlights.
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(ix - irw * .38 * side, iy - irh * .42, irw * .34, irh * .24, -.4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(ix + irw * .42 * side, iy + irh * .38, irw * .14, 0, TAU); ctx.fill();
    ctx.globalAlpha = .8 + Math.sin(t * 3 + side) * .2;
    ctx.beginPath(); ctx.arc(ix + irw * .1 * side, iy - irh * .58, irw * .07, 0, TAU); ctx.fill();
    ctx.restore();
    // Upper lash line with an outer flick, lower lash at the outer corner.
    ctx.beginPath();
    ctx.moveTo(x - ew * 1.02 * side, y - eh * .02);
    ctx.bezierCurveTo(x - ew * .7 * side, y - eh * 1.02 * wide, x + ew * .8 * side, y - eh * 1.12 * wide, x + ew * 1.08 * side, y - eh * .3);
    ctx.lineTo(x + ew * 1.32 * side, y - eh * .05);
    stroke(ctx, '#24181c', 3);
    ctx.beginPath(); ctx.moveTo(x - ew * .1 * side, y + eh * 1.02); ctx.quadraticCurveTo(x + ew * .6 * side, y + eh * .98, x + ew * .95 * side, y + eh * .55); stroke(ctx, '#5a3c40', 1.1);
    // Double-lid crease.
    ctx.beginPath(); ctx.moveTo(x - ew * .5 * side, y - eh * 1.25); ctx.quadraticCurveTo(x + ew * .3 * side, y - eh * 1.45, x + ew * .9 * side, y - eh * 1.05); stroke(ctx, p.skinShade, 1.1);
    if (eyes === 'angry') { ctx.beginPath(); ctx.moveTo(x - ew * 1.1 * side, y - eh * 1.25); ctx.lineTo(x + ew * 1.1 * side, y - eh * 1.6); stroke(ctx, p.eyeDeep, 2); }
  }

  // Tiny nose.
  ctx.beginPath(); ctx.moveTo(lx * .6 + 1, eyeY + eh * .95); ctx.lineTo(lx * .6 - .5, eyeY + eh * 1.18); stroke(ctx, '#d79a8c', 1.3);

  // Mouth.
  const mouthY = r.headY + r.ry * .72;
  const w = r.rx * .085;
  const mouth = (s.talk || 0) > .08 ? 'talk' : s.mouth || 'smile';
  ctx.save();
  ctx.translate(lx * .5, 0);
  const open = (h) => {
    ctx.beginPath(); ctx.ellipse(0, mouthY + 2, w, h, 0, 0, TAU);
    ctx.fillStyle = '#9b3a48'; ctx.fill(); stroke(ctx, '#6b2a35', 1.2);
    ctx.save(); ctx.clip();
    ctx.fillStyle = '#f28c9a'; ctx.beginPath(); ctx.ellipse(0, mouthY + 2 + h * .7, w * .8, h * .6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-w, mouthY + 2 - h, w * 2, h * .3);
    ctx.restore();
  };
  if (mouth === 'talk') open(2 + s.talk * r.rx * .07);
  else if (mouth === 'chomp') open(1.5 + Math.abs(Math.sin(t * 14)) * r.rx * .06);
  else if (mouth === 'open') open(r.rx * .06);
  else if (mouth === 'o') open(w * .75);
  else {
    ctx.beginPath();
    if (mouth === 'cat') { ctx.moveTo(-w * 1.4, mouthY - 1); ctx.quadraticCurveTo(-w * .7, mouthY + 4, 0, mouthY - 1); ctx.quadraticCurveTo(w * .7, mouthY + 4, w * 1.4, mouthY - 1); }
    else if (mouth === 'wobble') { ctx.moveTo(-w * 1.4, mouthY); for (let i = 1; i <= 6; i += 1) ctx.lineTo(-w * 1.4 + i * w * .47, mouthY + (i % 2 ? -2 : 2)); }
    else if (mouth === 'flat') { ctx.moveTo(-w * .8, mouthY); ctx.lineTo(w * .8, mouthY); }
    else if (mouth === 'frown') ctx.arc(0, mouthY + 6, w, Math.PI + .3, -.3);
    else ctx.arc(0, mouthY - 2, w, .2, Math.PI - .2);
    stroke(ctx, '#7a3a43', 1.8);
  }
  ctx.restore();
}

function bangsPath(ctx, r, s, shift = 0) {
  const top = r.headY - r.ry * 1.36;
  const fringe = r.headY + r.ry * .04 + shift;
  const sway = Math.sin(s.t * 1.6) * 1.4;
  ctx.beginPath();
  ctx.moveTo(-r.rx * 1.08, r.headY + r.ry * .32 + shift);
  ctx.bezierCurveTo(-r.rx * 1.2, top, r.rx * 1.2, top, r.rx * 1.08, r.headY + r.ry * .32 + shift);
  // Strands of uneven length; the middle part frames the eyes.
  const tips = [[.9, .16], [.66, -.02], [.42, .1], [.2, -.06], [-.04, .06], [-.26, -.08], [-.48, .1], [-.7, -.02], [-.92, .16]];
  for (const [k, depth] of tips) {
    const x = k * r.rx + sway;
    const y = fringe + depth * r.ry;
    ctx.quadraticCurveTo(x + r.rx * .1, y - r.ry * .32, x, y);
    ctx.quadraticCurveTo(x - r.rx * .05, y - r.ry * .24, x - r.rx * .14, y - r.ry * .3);
  }
  ctx.closePath();
}

function drawBangs(ctx, s) {
  const { r, p } = s;
  // Shadow the bangs cast on the forehead.
  ctx.save();
  facePath(ctx, r, 0);
  ctx.clip();
  bangsPath(ctx, r, s, r.ry * .08);
  ctx.fillStyle = p.skinShade;
  ctx.fill();
  ctx.restore();
  bangsPath(ctx, r, s);
  ctx.fillStyle = vgrad(ctx, r.headY - r.ry, r.headY + r.ry * .15, [[0, p.hair], [.7, p.hair], [1, p.hairShade]]);
  ctx.fill();
  stroke(ctx, p.hairLine, 1.7);
  // Strand lines from the crown into the fringe.
  for (const k of [-.75, -.42, -.12, .2, .52, .8]) strand(ctx, k * r.rx * .45, r.headY - r.ry * .66, k * r.rx * .92, r.headY - r.ry * .04, k * 8, p.hairShade, 1.1);
  // Glossy "angel ring" highlight, broken into soft dashes.
  ctx.save();
  ctx.setLineDash([r.rx * .18, r.rx * .07]);
  ctx.beginPath(); ctx.ellipse(0, r.headY - r.ry * .48, r.rx * .78, r.ry * .22, 0, Math.PI * 1.08, Math.PI * 1.92);
  stroke(ctx, p.hairLight, 3.2);
  ctx.restore();
  // Ahoge: one rebellious strand on top.
  if (s.kind !== 'deepseek') {
    const wob = Math.sin(s.t * 2.4) * 4;
    ctx.beginPath();
    ctx.moveTo(-2, r.headY - r.ry * .74);
    ctx.quadraticCurveTo(10 + wob, r.headY - r.ry * 1.45, 22 + wob, r.headY - r.ry * 1.3);
    ctx.quadraticCurveTo(10 + wob, r.headY - r.ry * 1.3, 5, r.headY - r.ry * .74);
    ctx.closePath();
    ctx.fillStyle = p.hair; ctx.fill(); stroke(ctx, p.hairLine, 1.3);
  }
}

function drawSideLocks(ctx, s) {
  const { r, p, sway, kind } = s;
  const length = kind === 'claude' ? r.ry * 2.1 : r.ry * 1.45;
  for (const side of [-1, 1]) {
    const x0 = side * r.rx * .9;
    const y0 = r.headY - r.ry * .1;
    const x1 = side * (r.rx * .92 + sway * .6);
    const y1 = r.headY + length;
    lockPath(ctx, x0, y0, x1, y1, r.rx * .26, side * r.rx * .16);
    ctx.fillStyle = vgrad(ctx, y0, y1, [[0, p.hair], [1, p.hairShade]]);
    ctx.fill();
    stroke(ctx, p.hairLine, 1.5);
    strand(ctx, x0, y0 + 8, x1 - side * 2, y1 - 12, side * r.rx * .1, p.hairShade, 1);
    if (kind === 'deepseek') {
      // Small white bead ties near the tips.
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(x1 - side * 1, y1 - length * .28, 3.2, 0, TAU); ctx.fill(); stroke(ctx, p.line, 1);
    }
  }
}

function drawAccessories(ctx, s) {
  const { r, p, kind, t, breathe } = s;
  const crown = r.headY - r.ry * .84 + breathe * .2;
  if (kind === 'gpt') {
    // Swept-back dragon horns with ridge rings.
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * r.rx * .42, crown + 8);
      ctx.bezierCurveTo(side * r.rx * .5, crown - r.ry * .62, side * r.rx * 1.08, crown - r.ry * .5, side * r.rx * .86, crown - r.ry * 1.02);
      ctx.bezierCurveTo(side * r.rx * 1.26, crown - r.ry * .45, side * r.rx * .92, crown, side * r.rx * .72, crown + 12);
      ctx.closePath();
      ctx.fillStyle = vgrad(ctx, crown - r.ry, crown + 10, [[0, '#ffffff'], [1, '#ddd3fb']]);
      ctx.fill();
      stroke(ctx, p.line, 1.6);
      for (let i = 1; i <= 4; i += 1) {
        const k = i / 5;
        const x = side * (r.rx * (.57 + .3 * k));
        const y = crown + 6 - r.ry * .95 * k;
        ctx.beginPath(); ctx.moveTo(x - side * 6 * (1 - k * .6), y + 3); ctx.quadraticCurveTo(x, y - 2, x + side * 6 * (1 - k * .6), y + 1); stroke(ctx, '#b4a4e8', 1.1);
      }
    }
    // Knot hair clip.
    ctx.beginPath(); ctx.arc(r.rx * .62, r.headY - r.ry * .36, r.rx * .13, 0, TAU);
    ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(ctx, p.line, 1.2);
    knot(ctx, r.rx * .62, r.headY - r.ry * .36, r.rx * .1, p.trim);
  } else if (kind === 'deepseek') {
    // Fin ears with membrane lines.
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * r.rx * .98, r.headY + r.ry * .05);
      ctx.quadraticCurveTo(side * r.rx * 1.5, r.headY - r.ry * .38, side * r.rx * 1.34, r.headY - r.ry * .82);
      ctx.quadraticCurveTo(side * r.rx * 1.2, r.headY - r.ry * .4, side * r.rx * .96, r.headY - r.ry * .3);
      ctx.closePath();
      ctx.fillStyle = vgrad(ctx, r.headY - r.ry * .8, r.headY, [[0, '#bfe4ff'], [1, '#6aaef0']]);
      ctx.fill();
      stroke(ctx, p.line, 1.4);
      for (const k of [.3, .55, .8]) { ctx.beginPath(); ctx.moveTo(side * r.rx, r.headY - r.ry * .1); ctx.lineTo(side * r.rx * (1.1 + k * .3), r.headY - r.ry * (.25 + k * .5)); stroke(ctx, 'rgba(30,60,120,.35)', 1); }
    }
    // Little whale hair clip.
    ctx.save();
    ctx.translate(r.rx * .55, r.headY - r.ry * .6);
    ctx.rotate(-.3);
    ctx.beginPath(); ctx.ellipse(0, 0, r.rx * .17, r.rx * .1, 0, 0, TAU);
    ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(ctx, p.line, 1.2);
    ctx.beginPath(); ctx.moveTo(r.rx * .15, 0); ctx.lineTo(r.rx * .26, -r.rx * .07); ctx.lineTo(r.rx * .26, r.rx * .07); ctx.closePath(); ctx.fill(); stroke(ctx, p.line, 1.1);
    ctx.fillStyle = p.line; ctx.beginPath(); ctx.arc(-r.rx * .08, -r.rx * .01, 1.4, 0, TAU); ctx.fill();
    ctx.restore();
  } else {
    // Sunflower ornament with black ribbon tails and a tassel.
    const fx = r.rx * .6;
    const fy = r.headY - r.ry * .56;
    ctx.fillStyle = p.dark;
    for (const [angle, len] of [[.45, .55], [1.15, .6]]) {
      ctx.save(); ctx.translate(fx, fy); ctx.rotate(angle + Math.sin(t * 2) * .05);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r.rx * len, -r.rx * .09); ctx.lineTo(r.rx * (len - .06), r.rx * .02); ctx.lineTo(r.rx * len, r.rx * .1); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(fx + side * r.rx * .14, fy - r.rx * .02, r.rx * .14, r.rx * .07, side * .3, 0, TAU);
      ctx.fill();
    }
    ctx.beginPath(); ctx.moveTo(fx + r.rx * .05, fy + 4); ctx.lineTo(fx + r.rx * .1, fy + r.ry * .55); stroke(ctx, p.gold, 1.4);
    ctx.fillStyle = p.gold; rrect(ctx, fx + r.rx * .07, fy + r.ry * .5, 4, 9, 2); ctx.fill();
    flower(ctx, fx, fy, r.rx * .2, '#f08a3a', '#ffd08a', t * .3, p.hairLine);
  }
}

function drawBrows(ctx, s) {
  const { r, p } = s;
  const eyeY = r.headY + r.ry * .26;
  const tilt = s.eyes === 'angry' ? -.25 : s.eyes === 'dizzy' || s.mouth === 'frown' ? .22 : 0;
  ctx.save();
  ctx.globalAlpha = .7;
  for (const side of [-1, 1]) {
    const x = side * r.rx * .4;
    const y = eyeY - r.rx * .45;
    ctx.beginPath();
    ctx.moveTo(x - side * r.rx * .16, y + tilt * 6);
    ctx.quadraticCurveTo(x, y - 3, x + side * r.rx * .17, y + 1 - tilt * 6);
    stroke(ctx, p.hairLine, 1.6);
  }
  ctx.restore();
}
