// Character drawing. Every character is drawn in its own local space with the
// feet at (0, 0) and "up" pointing to -y. The engine supplies a pose object and
// handles world placement, facing and surface rotation.

const TAU = Math.PI * 2;

export const CHARACTERS = {
  claude: {
    name: 'Claude 娘', short: 'Claude', emoji: '✺', accent: '#d97757', units: 300, base: 150,
    blurb: '橙发、花饰与一本旧书。温柔认真，喜欢把事情讲清楚。',
    palette: { hair: '#ec7a3c', hairShade: '#c95a26', hairLine: '#8f3b16', skin: '#fff0e6', eye: '#c7742e', eyeDeep: '#6e3510', dress: '#fbf4e8', dressShade: '#ead9c0', trim: '#d9612b', line: '#6b3a1e', bodice: '#2b2321', boot: '#f6efe6' }
  },
  clawd: {
    name: 'Clawd', short: 'Clawd', emoji: '▚', accent: '#d97757', units: 0, base: 0,
    blurb: 'Claude Code 的像素小螃蟹。会爬墙、会倒挂在天花板上。',
    pixel: true
  },
  gpt: {
    name: 'GPT 娘', short: 'GPT', emoji: '✦', accent: '#a78bfa', units: 300, base: 150,
    blurb: '白发龙角与柔光翅膀。好奇心旺盛，什么都想试一试。',
    palette: { hair: '#f3f0ff', hairShade: '#c9bdf2', hairLine: '#8f80c8', skin: '#fff0e8', eye: '#8a72d8', eyeDeep: '#4b3a8f', dress: '#ffffff', dressShade: '#e4dcff', trim: '#a78bfa', line: '#7a6bb3', boot: '#f6efe6' }
  },
  deepseek: {
    name: 'DeepSeek 娘', short: 'DeepSeek', emoji: '◈', accent: '#55a8ff', units: 300, base: 150,
    blurb: '深海蓝与小小鱼尾。安静、聪明，偶尔吐泡泡。',
    palette: { hair: '#3d63b8', hairShade: '#284a93', hairLine: '#1d3470', skin: '#ffeee6', eye: '#3fa2ff', eyeDeep: '#1c4f9c', dress: '#f4f8ff', dressShade: '#c9dcf7', trim: '#2b4c9b', line: '#1d3470', boot: '#2b4c9b' }
  },
  custom: {
    name: '自定义', short: '自定义', emoji: '✧', accent: '#f472b6', units: 0, base: 0,
    blurb: '上传一张透明背景的 PNG，它就会在桌面上活过来。',
    image: true
  }
};

// Clawd, the Claude Code mascot, as a 16 × 6 body plus legs.
const CLAWD_W = 16;
const CLAWD = { body: '#d97757', shade: '#c2654a', dark: '#a9533b', eye: '#1b1714' };

export function petSize(kind, mode, scale = 1) {
  if (kind === 'clawd') {
    const px = (mode === 'adult' ? 7.5 : 6) * scale;
    return { w: CLAWD_W * px, h: 8 * px, px };
  }
  if (kind === 'custom') {
    const h = 130 * scale;
    return { w: h * .9, h };
  }
  const h = (mode === 'adult' ? 170 : 150) * scale;
  return { w: h * .62, h, k: h / 300 };
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function outline(ctx, color, width = 2.2) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

const ARM_ANGLES = { down: .16, up: 2.3, climb: 2.85, hold: -.55, hug: -.95, cheer: 2.45, wave: .16 };

function girlRig(mode) {
  return mode === 'adult'
    ? { headY: -92, rx: 46, ry: 50, shoulderY: -32, shoulder: 34, waistY: 28, waist: 22, hemY: 150, hem: 74, hairEnd: 90, armLen: 78 }
    : { headY: -46, rx: 72, ry: 66, shoulderY: 20, shoulder: 38, waistY: 58, waist: 30, hemY: 140, hem: 70, hairEnd: 70, armLen: 54 };
}

// Head center in local units after the feet-at-origin shift, for bubbles / pivots.
export function headOffset(kind, mode, scale = 1) {
  const size = petSize(kind, mode, scale);
  if (kind === 'clawd' || kind === 'custom') return { x: 0, y: -size.h * .62, top: -size.h };
  const r = girlRig(mode);
  const k = size.k;
  const shift = r.hemY + 14;
  return { x: 0, y: (r.headY - shift) * k, top: (r.headY - r.ry * 1.25 - shift) * k };
}

export function drawCharacter(ctx, kind, mode, scale, pose, t, extra = {}) {
  if (kind === 'clawd') return drawClawd(ctx, mode, scale, pose, t);
  if (kind === 'custom') return drawCustom(ctx, scale, pose, t, extra.image);
  return drawGirl(ctx, kind, mode, scale, pose, t);
}

// ───────────────────────── anime rig ─────────────────────────

function drawGirl(ctx, kind, mode, scale, pose, t) {
  const p = CHARACTERS[kind].palette;
  const r = girlRig(mode);
  const { k } = petSize(kind, mode, scale);
  const breathe = Math.sin(t * 2.1) * 1.6 * (pose.calm ?? 1);
  ctx.save();
  ctx.scale(k, k);
  ctx.translate(0, -(r.hemY + 14));
  if (pose.legs === 'sit') {
    ctx.translate(0, r.hemY + 14);
    ctx.scale(1.08, .84);
    ctx.translate(0, -(r.hemY + 14));
  }
  const ctxPose = { ...pose, breathe, kind, mode };
  if (kind === 'gpt') drawWings(ctx, r, t, p, pose);
  if (kind === 'deepseek') drawFishTail(ctx, r, t, p);
  drawBackHair(ctx, r, t, p, pose);
  if (kind === 'gpt') drawDragonTail(ctx, r, t, p);
  drawLegs(ctx, r, p, pose, t);
  drawDress(ctx, r, p, kind, breathe);
  drawArms(ctx, r, p, ctxPose, t);
  drawHead(ctx, r, p, breathe);
  drawFace(ctx, r, p, ctxPose, t);
  drawBangs(ctx, r, p, t, breathe);
  drawHeadAccessories(ctx, r, p, kind, t, breathe);
  ctx.restore();
}

function drawBackHair(ctx, r, t, p, pose) {
  const sway = Math.sin(t * 1.3) * 5 + (pose.hairWind || 0) * 18;
  const top = r.headY - r.ry * 1.05;
  const sideX = r.rx * 1.12;
  const end = r.hairEnd;
  const grad = ctx.createLinearGradient(0, top, 0, end);
  grad.addColorStop(0, p.hair);
  grad.addColorStop(1, p.hairShade);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-sideX, r.headY);
  ctx.bezierCurveTo(-sideX, top, sideX, top, sideX, r.headY);
  ctx.bezierCurveTo(sideX + 10, r.headY + 70, sideX + 14 + sway, end - 40, sideX * .9 + sway, end);
  const waves = 6;
  for (let i = 1; i <= waves; i += 1) {
    const x = sideX * .9 + sway - sideX * 1.8 * (i / waves);
    const y = end + (i % 2 ? -14 : 0);
    ctx.quadraticCurveTo(x + sideX * .15, y + 16, x, y);
  }
  ctx.bezierCurveTo(-sideX - 14 + sway, end - 40, -sideX - 10, r.headY + 70, -sideX, r.headY);
  ctx.closePath();
  ctx.fill();
  outline(ctx, p.hairLine);
}

function drawWings(ctx, r, t, p, pose) {
  const fast = pose.legs === 'dangle' || pose.arms === 'cheer';
  const flap = Math.sin(t * (fast ? 14 : 2.4)) * (fast ? .3 : .08);
  ctx.save();
  ctx.globalAlpha = .92;
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
    outline(ctx, p.line, 2);
    ctx.strokeStyle = '#b8a8ec';
    ctx.lineWidth = 1.6;
    for (const [x, y] of [[112, -6], [88, 14], [62, 30]]) {
      ctx.beginPath(); ctx.moveTo(4, 2); ctx.lineTo(x * .92, y * .92); ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawDragonTail(ctx, r, t, p) {
  const wag = Math.sin(t * 1.7) * 8;
  ctx.beginPath();
  ctx.moveTo(14, r.waistY + 30);
  ctx.bezierCurveTo(80, r.waistY + 40, 96 + wag, r.hemY - 10, 70 + wag, r.hemY + 4);
  ctx.lineTo(58 + wag, r.hemY - 8);
  ctx.bezierCurveTo(76 + wag, r.hemY - 24, 60, r.waistY + 50, 10, r.waistY + 44);
  ctx.closePath();
  ctx.fillStyle = '#ece6fb';
  ctx.fill();
  outline(ctx, p.line, 2);
}

function drawFishTail(ctx, r, t, p) {
  const wag = Math.sin(t * 2.2) * .18;
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
  outline(ctx, p.line, 2);
  ctx.restore();
}

function drawLegs(ctx, r, p, pose, t) {
  const phase = pose.legPhase || 0;
  ctx.fillStyle = p.boot;
  for (const side of [-1, 1]) {
    let x = side * 16;
    let y = r.hemY + 2;
    let w = 16;
    let h = 12;
    if (pose.legs === 'walk') {
      const s = Math.sin(phase + (side > 0 ? Math.PI : 0));
      x += s * 7;
      y -= Math.max(0, s) * 7;
    } else if (pose.legs === 'dangle') {
      y += 12 + Math.sin(t * 9 + side) * 3;
      x += Math.sin(t * 7 + side * 2) * 4;
      // Bare legs show while dangling below the hem.
      ctx.save();
      ctx.fillStyle = p.skin;
      roundedRect(ctx, x - 5, r.hemY - 8, 10, y - r.hemY + 10, 5);
      ctx.fill();
      outline(ctx, p.line, 1.4);
      ctx.restore();
    } else if (pose.legs === 'sit') {
      x = side * 26;
      y = r.hemY - 2;
      w = 22;
      h = 13;
    } else if (pose.legs === 'tuck') {
      y -= 6;
    }
    roundedRect(ctx, x - w / 2, y, w, h, 5);
    ctx.fill();
    outline(ctx, p.line, 1.6);
  }
}

function drawDress(ctx, r, p, kind, breathe) {
  const sy = r.shoulderY + breathe * .4;
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
  outline(ctx, p.line);

  ctx.save();
  ctx.clip();
  if (kind === 'claude') {
    ctx.fillStyle = p.bodice;
    ctx.beginPath();
    ctx.moveTo(-r.waist - 6, r.waistY - 26); ctx.lineTo(r.waist + 6, r.waistY - 26);
    ctx.lineTo(r.waist + 4, r.waistY + 8); ctx.lineTo(-r.waist - 4, r.waistY + 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = p.trim;
    ctx.beginPath();
    ctx.moveTo(4, r.waistY + 8); ctx.lineTo(24, r.waistY + 8); ctx.lineTo(r.hem * .62, r.hemY + 10); ctx.lineTo(r.hem * .1, r.hemY + 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8a34a';
    for (const y of [r.waistY - 18, r.waistY - 6]) { ctx.beginPath(); ctx.arc(0, y, 2.4, 0, TAU); ctx.fill(); }
  } else if (kind === 'deepseek') {
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
  ctx.strokeStyle = p.trim;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-r.hem + 4, r.hemY - 4); ctx.quadraticCurveTo(0, r.hemY + 2, r.hem - 4, r.hemY - 4); ctx.stroke();
}

function drawArms(ctx, r, p, pose, t) {
  const sy = r.shoulderY + 10 + pose.breathe * .4;
  const base = ARM_ANGLES[pose.arms] ?? ARM_ANGLES.down;
  for (const side of [-1, 1]) {
    let angle = base;
    if (pose.arms === 'wave' && side === 1) angle = 2.5 + Math.sin(t * 11) * .38;
    if (pose.arms === 'cheer' || pose.arms === 'up') angle += Math.sin(t * 9 + side) * .12;
    if (pose.arms === 'climb') angle += Math.sin((pose.legPhase || 0) + (side > 0 ? Math.PI : 0)) * .25;
    if (pose.arms === 'down' && pose.legs === 'walk') angle += Math.sin((pose.legPhase || 0) + (side > 0 ? 0 : Math.PI)) * .18;
    // Claude holds her book against her chest with the right arm.
    const holdsBook = pose.kind === 'claude' && side === 1 && pose.arms === 'down';
    if (holdsBook) angle = -.95;
    ctx.save();
    ctx.translate(side * (r.shoulder - 4), sy);
    ctx.rotate(-side * angle);
    roundedRect(ctx, -9, -4, 18, r.armLen, 9);
    ctx.fillStyle = pose.kind === 'deepseek' ? '#f4f8ff' : p.dress;
    ctx.fill();
    outline(ctx, p.line, 2);
    ctx.fillStyle = p.skin;
    ctx.beginPath(); ctx.arc(0, r.armLen - 2, 8, 0, TAU); ctx.fill();
    outline(ctx, p.line, 1.6);
    ctx.restore();
  }
  if (pose.kind === 'claude' && pose.arms === 'down') {
    ctx.save();
    ctx.translate(r.shoulder * .2, sy + r.armLen * .55);
    ctx.rotate(-.18);
    roundedRect(ctx, -14, -20, 28, 36, 3);
    ctx.fillStyle = '#6b3a24';
    ctx.fill();
    outline(ctx, '#3d1f12', 2);
    ctx.strokeStyle = '#e8a34a';
    ctx.lineWidth = 1.6;
    starburst(ctx, 0, -2, 7, 8);
    ctx.restore();
  }
  if (pose.item && (pose.arms === 'hold' || pose.arms === 'hug')) {
    ctx.save();
    ctx.font = `${r.armLen * .7}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pose.item, 0, sy + r.armLen * .55);
    ctx.restore();
  }
}

function starburst(ctx, x, y, radius, rays) {
  ctx.beginPath();
  for (let i = 0; i < rays; i += 1) {
    const a = (i / rays) * TAU;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
  }
  ctx.stroke();
}

function drawHead(ctx, r, p, breathe) {
  ctx.fillStyle = p.skin;
  roundedRect(ctx, -7, r.headY + r.ry * .7, 14, r.shoulderY - r.headY - r.ry * .55 + 6, 4);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-r.rx, r.headY - 6 + breathe * .2);
  ctx.bezierCurveTo(-r.rx, r.headY + r.ry * .7, -r.rx * .45, r.headY + r.ry, 0, r.headY + r.ry);
  ctx.bezierCurveTo(r.rx * .45, r.headY + r.ry, r.rx, r.headY + r.ry * .7, r.rx, r.headY - 6 + breathe * .2);
  ctx.bezierCurveTo(r.rx, r.headY - r.ry, -r.rx, r.headY - r.ry, -r.rx, r.headY - 6);
  ctx.closePath();
  ctx.fill();
  outline(ctx, p.line, 2);
}

function drawFace(ctx, r, p, pose, t) {
  const look = pose.look || { x: 0, y: 0 };
  const lookX = look.x * r.rx * .08;
  const lookY = look.y * r.ry * .05;
  const eyeY = r.headY + r.ry * .22 + pose.breathe * .2 + lookY;
  const eyeX = r.rx * .4;
  const ew = r.rx * .17;
  const eh = r.rx * .25;
  let eyes = pose.eyes || 'open';
  if (eyes === 'open' && (t % 4.2) < .12) eyes = 'closed';
  ctx.save();
  ctx.translate(lookX, 0);
  for (const side of [-1, 1]) {
    const x = side * eyeX;
    ctx.strokeStyle = p.eyeDeep;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    if (eyes === 'closed' || eyes === 'sleepy') {
      ctx.beginPath(); ctx.moveTo(x - ew, eyeY); ctx.quadraticCurveTo(x, eyeY + eh * .45, x + ew, eyeY); ctx.stroke();
      continue;
    }
    if (eyes === 'happy') {
      ctx.beginPath(); ctx.moveTo(x - ew, eyeY + 2); ctx.quadraticCurveTo(x, eyeY - eh * .8, x + ew, eyeY + 2); ctx.stroke();
      continue;
    }
    if (eyes === 'dizzy') {
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let a = 0; a < TAU * 2.2; a += .3) {
        const rad = (a / (TAU * 2.2)) * ew * 1.1;
        const px = x + Math.cos(a + t * 8 * side) * rad;
        const py = eyeY + Math.sin(a + t * 8 * side) * rad;
        if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      continue;
    }
    if (eyes === 'angry') {
      ctx.beginPath(); ctx.moveTo(x - ew * 1.2, eyeY - eh * (side < 0 ? 1.1 : .6)); ctx.lineTo(x + ew * 1.2, eyeY - eh * (side < 0 ? .6 : 1.1)); ctx.stroke();
    }
    const wide = eyes === 'wide';
    const grad = ctx.createLinearGradient(0, eyeY - eh, 0, eyeY + eh);
    grad.addColorStop(0, p.eyeDeep);
    grad.addColorStop(.6, p.eye);
    grad.addColorStop(1, '#ffffff');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.ellipse(x, eyeY, ew * (wide ? 1.15 : 1), eh * (wide ? 1.1 : 1), 0, 0, TAU); ctx.fill();
    ctx.fillStyle = p.eyeDeep;
    const pupil = wide ? .25 : .42;
    ctx.beginPath(); ctx.ellipse(x + look.x * 2, eyeY + 1, ew * pupil, eh * (pupil + .03), 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x - ew * .35, eyeY - eh * .4, ew * .32, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x + ew * .35, eyeY + eh * .35, ew * .15, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2a1d2c';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - ew * 1.2, eyeY - eh * .75); ctx.quadraticCurveTo(x, eyeY - eh * 1.25, x + ew * 1.2, eyeY - eh * .7); ctx.stroke();
  }
  const blush = .3 + (pose.blush || 0) * .5;
  ctx.fillStyle = '#f39aa6';
  ctx.globalAlpha = blush;
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(side * r.rx * .62, eyeY + eh * 1.25, r.rx * .14, r.rx * .06, 0, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1;
  const mouthY = r.headY + r.ry * .68;
  ctx.strokeStyle = '#7a3a43';
  ctx.fillStyle = '#9b3c4a';
  ctx.lineWidth = 2.4;
  const mouth = (pose.talk || 0) > .08 ? 'talk' : pose.mouth || 'smile';
  const w = r.rx * .08;
  ctx.beginPath();
  if (mouth === 'talk') { ctx.ellipse(0, mouthY + 2, w * .9, 2 + pose.talk * r.rx * .08, 0, 0, TAU); ctx.fill(); }
  else if (mouth === 'chomp') { ctx.ellipse(0, mouthY + 2, w, 1 + Math.abs(Math.sin(t * 14)) * r.rx * .07, 0, 0, TAU); ctx.fill(); }
  else if (mouth === 'o') { ctx.ellipse(0, mouthY + 2, w * .6, w * .8, 0, 0, TAU); ctx.fill(); }
  else if (mouth === 'cat') { ctx.moveTo(-w * 1.4, mouthY - 1); ctx.quadraticCurveTo(-w * .7, mouthY + 4, 0, mouthY - 1); ctx.quadraticCurveTo(w * .7, mouthY + 4, w * 1.4, mouthY - 1); ctx.stroke(); }
  else if (mouth === 'wobble') { ctx.moveTo(-w * 1.4, mouthY); for (let i = 1; i <= 6; i += 1) ctx.lineTo(-w * 1.4 + i * w * .47, mouthY + (i % 2 ? -2 : 2)); ctx.stroke(); }
  else if (mouth === 'flat') { ctx.moveTo(-w * .8, mouthY); ctx.lineTo(w * .8, mouthY); ctx.stroke(); }
  else if (mouth === 'frown') { ctx.arc(0, mouthY + 6, w, Math.PI + .3, -.3); ctx.stroke(); }
  else { ctx.arc(0, mouthY - 2, w, .15, Math.PI - .15); ctx.stroke(); }
  ctx.restore();
}

function drawBangs(ctx, r, p, t, breathe) {
  const top = r.headY - r.ry * 1.02 + breathe * .2;
  const fringe = r.headY + r.ry * .02 + breathe * .2;
  const sway = Math.sin(t * 1.6) * 1.5;
  ctx.beginPath();
  ctx.moveTo(-r.rx * 1.08, r.headY + r.ry * .3);
  ctx.bezierCurveTo(-r.rx * 1.15, top, r.rx * 1.15, top, r.rx * 1.08, r.headY + r.ry * .3);
  [.85, .55, .3, 0, -.3, -.55, -.85].forEach((k, i) => {
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
  outline(ctx, p.hairLine);
  ctx.strokeStyle = '#ffffff';
  ctx.globalAlpha = .5;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, r.headY - r.ry * .1, r.rx * .72, Math.PI * 1.2, Math.PI * 1.45); ctx.stroke();
  ctx.globalAlpha = 1;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * r.rx * .95, r.headY - r.ry * .1);
    ctx.quadraticCurveTo(side * r.rx * 1.12, r.headY + r.ry * .7, side * (r.rx * .9 + sway), r.headY + r.ry * 1.25);
    ctx.quadraticCurveTo(side * r.rx * .82, r.headY + r.ry * .6, side * r.rx * .78, r.headY);
    ctx.closePath();
    ctx.fillStyle = p.hairShade;
    ctx.fill();
    outline(ctx, p.hairLine, 1.8);
  }
}

function drawHeadAccessories(ctx, r, p, kind, t, breathe) {
  const crown = r.headY - r.ry * .82 + breathe * .2;
  if (kind === 'gpt') {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * r.rx * .45, crown + 6);
      ctx.bezierCurveTo(side * r.rx * .55, crown - r.ry * .7, side * r.rx * 1.05, crown - r.ry * .5, side * r.rx * .8, crown - r.ry * .95);
      ctx.bezierCurveTo(side * r.rx * 1.2, crown - r.ry * .45, side * r.rx * .9, crown, side * r.rx * .72, crown + 10);
      ctx.closePath();
      ctx.fillStyle = '#f1ecfe';
      ctx.fill();
      outline(ctx, p.line, 2);
    }
    ctx.strokeStyle = p.trim;
    ctx.lineWidth = 2;
    const size = r.rx * .14;
    for (let i = 0; i < 3; i += 1) {
      const a = (i / 3) * TAU;
      ctx.beginPath(); ctx.ellipse(r.rx * .62 + Math.cos(a) * size * .45, r.headY - r.ry * .35 + Math.sin(a) * size * .45, size * .7, size * .32, a, 0, TAU); ctx.stroke();
    }
  } else if (kind === 'deepseek') {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * r.rx * .98, r.headY);
      ctx.quadraticCurveTo(side * r.rx * 1.45, r.headY - r.ry * .4, side * r.rx * 1.3, r.headY - r.ry * .75);
      ctx.quadraticCurveTo(side * r.rx * 1.15, r.headY - r.ry * .3, side * r.rx * .95, r.headY - r.ry * .3);
      ctx.closePath();
      ctx.fillStyle = '#8fcaff';
      ctx.fill();
      outline(ctx, p.line, 1.8);
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(r.rx * .55, r.headY - r.ry * .6, r.rx * .16, r.rx * .1, -.3, 0, TAU); ctx.fill();
    outline(ctx, p.line, 1.6);
  } else if (kind === 'claude') {
    const fx = r.rx * .58;
    const fy = r.headY - r.ry * .55;
    ctx.fillStyle = p.bodice;
    for (const angle of [.5, 1.2]) {
      ctx.save(); ctx.translate(fx, fy); ctx.rotate(angle);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r.rx * .5, -r.rx * .08); ctx.lineTo(r.rx * .46, r.rx * .1); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    const spin = t * .3;
    ctx.fillStyle = '#f08a3a';
    for (let i = 0; i < 10; i += 1) {
      const a = spin + (i / 10) * TAU;
      ctx.beginPath(); ctx.ellipse(fx + Math.cos(a) * r.rx * .12, fy + Math.sin(a) * r.rx * .12, r.rx * .1, r.rx * .045, a, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#ffd08a';
    ctx.beginPath(); ctx.arc(fx, fy, r.rx * .07, 0, TAU); ctx.fill();
    outline(ctx, p.hairLine, 1.4);
  }
}

// ───────────────────────── Clawd ─────────────────────────

function drawClawd(ctx, mode, scale, pose, t) {
  const { px } = petSize('clawd', mode, scale);
  const rect = (x, y, w, h) => ctx.fillRect(Math.round(x * px * 10) / 10, Math.round(y * px * 10) / 10, w * px + .6, h * px + .6);
  const sit = pose.legs === 'sit' || pose.legs === 'tuck';
  const legRows = sit ? 0 : pose.legs === 'dangle' ? 3 : 2;
  // Body bottom sits on the feet line, legs below it.
  const bodyBottom = -legRows;
  const bodyTop = bodyBottom - 6;
  const bob = pose.legs === 'walk' ? (Math.sin(pose.legPhase * 2) > 0 ? -.25 : 0) : 0;
  const ox = -CLAWD_W / 2;
  ctx.save();
  ctx.translate(0, bob * px);
  // Legs.
  ctx.fillStyle = CLAWD.dark;
  for (const [index, col] of [3, 5, 10, 12].entries()) {
    if (sit) break;
    let lift = 0;
    let dx = 0;
    if (pose.legs === 'walk') {
      const pair = index === 0 || index === 2 ? 0 : 1;
      lift = (Math.sin(pose.legPhase) > 0) === (pair === 0) ? .8 : 0;
    } else if (pose.legs === 'dangle') {
      dx = Math.sin(t * 12 + index) * .35;
    }
    rect(ox + col + dx, bodyBottom, 1, legRows - lift);
  }
  // Body.
  ctx.fillStyle = CLAWD.body;
  rect(ox + 2, bodyTop, 12, 6);
  ctx.fillStyle = CLAWD.shade;
  rect(ox + 2, bodyBottom - 1, 12, 1);
  // Arms: claws on each side.
  ctx.fillStyle = CLAWD.body;
  for (const side of [-1, 1]) {
    const x = side < 0 ? ox : ox + 14;
    let y = bodyTop + 3;
    let raised = pose.arms === 'up' || pose.arms === 'cheer' || pose.arms === 'climb';
    if (pose.arms === 'wave' && side === 1) raised = Math.sin(t * 10) > 0;
    if (pose.arms === 'cheer') raised = Math.sin(t * 10 + side) > -.3;
    if (raised) {
      y = bodyTop + 1;
      rect(x + (side < 0 ? 0 : 1), y - 1, 1, 2);
      rect(x, y + 1, 2, 1);
    } else if (pose.arms === 'hold' || pose.arms === 'hug') {
      rect(x + (side < 0 ? 1 : 0), y, 1, 1);
      rect(side < 0 ? ox + 3 : ox + 12, y + 1, 1, 1);
    } else {
      rect(x, y, 2, 1);
    }
  }
  // Eyes.
  const look = pose.look || { x: 0, y: 0 };
  const lx = Math.max(-.6, Math.min(.6, look.x * .6));
  const ly = Math.max(0, Math.min(.5, look.y * .5));
  let eyes = pose.eyes || 'open';
  if (eyes === 'open' && (t % 3.6) < .14) eyes = 'closed';
  ctx.fillStyle = CLAWD.eye;
  for (const col of [4, 11]) {
    const ex = ox + col + lx;
    const ey = bodyTop + 1 + ly;
    if (eyes === 'closed' || eyes === 'sleepy') rect(ex - .2, ey + 1.2, 1.4, .5);
    else if (eyes === 'happy') { rect(ex - .5, ey + 1, .6, .6); rect(ex, ey + .4, 1, .6); rect(ex + .9, ey + 1, .6, .6); }
    else if (eyes === 'dizzy') { rect(ex - .4, ey, .6, .6); rect(ex + .8, ey, .6, .6); rect(ex + .2, ey + .6, .6, .6); rect(ex - .4, ey + 1.2, .6, .6); rect(ex + .8, ey + 1.2, .6, .6); }
    else if (eyes === 'wide') rect(ex - .3, ey - .2, 1.6, 2.2);
    else if (eyes === 'angry') { rect(ex, ey + .5, 1, 1.5); rect(col === 4 ? ex - .3 : ex + .3, ey, 1, .4); }
    else rect(ex, ey, 1, 2);
  }
  // A tiny mouth only shows up while eating or talking.
  const talk = pose.mouth === 'chomp' ? Math.abs(Math.sin(t * 14)) : pose.talk || 0;
  if (talk > .1) {
    ctx.fillStyle = CLAWD.eye;
    rect(ox + 7.3, bodyTop + 3.6, 1.4, .3 + talk * .8);
  }
  if (pose.blush) {
    ctx.fillStyle = 'rgba(255,140,160,.55)';
    rect(ox + 2.6, bodyTop + 3.2, 1.2, .6);
    rect(ox + 12.2, bodyTop + 3.2, 1.2, .6);
  }
  if (pose.item && (pose.arms === 'hold' || pose.arms === 'hug')) {
    ctx.font = `${px * 3}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pose.item, 0, (bodyTop + 4.5) * px);
  }
  ctx.restore();
}

// ───────────────────────── custom image ─────────────────────────

function drawCustom(ctx, scale, pose, t, image) {
  const { w, h } = petSize('custom', 'chibi', scale);
  if (!image || !image.complete || !image.naturalWidth) {
    ctx.fillStyle = 'rgba(244,114,182,.8)';
    ctx.beginPath(); ctx.ellipse(0, -h / 2, w / 2, h / 2, 0, 0, TAU); ctx.fill();
    return;
  }
  const ratio = Math.min(w / image.naturalWidth, h / image.naturalHeight);
  const dw = image.naturalWidth * ratio;
  const dh = image.naturalHeight * ratio;
  const hop = pose.legs === 'walk' ? Math.abs(Math.sin(pose.legPhase)) * 6 : 0;
  const breathe = 1 + Math.sin(t * 2.1) * .015;
  ctx.save();
  ctx.translate(0, -hop);
  ctx.scale(1 / breathe, breathe);
  ctx.drawImage(image, -dw / 2, -dh, dw, dh);
  ctx.restore();
  if (pose.eyes === 'closed' || pose.eyes === 'sleepy') {
    ctx.fillStyle = 'rgba(20,16,40,.12)';
    ctx.fillRect(-dw / 2, -dh, dw, dh);
  }
}

// Static thumbnail for the wardrobe and pickers.
export function drawThumbnail(canvas, kind, mode = 'chibi', image = null) {
  const ctx = canvas.getContext('2d');
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  const width = canvas.clientWidth || canvas.width;
  const height = canvas.clientHeight || canvas.height;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const size = petSize(kind, mode, 1);
  const fit = Math.min((width * .8) / size.w, (height * .86) / (size.h * 1.15));
  ctx.translate(width / 2, height * .93);
  ctx.scale(fit, fit);
  drawCharacter(ctx, kind, mode, 1, { legs: 'stand', arms: kind === 'clawd' ? 'up' : 'down', eyes: 'happy', mouth: 'smile', blush: .4 }, 1.3, { image });
}
