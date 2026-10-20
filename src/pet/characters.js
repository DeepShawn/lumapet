// Character drawing. Every character is drawn in its own local space with the
// feet at (0, 0) and "up" pointing to -y. The engine supplies a pose object and
// handles world placement, facing and surface rotation.

import { drawGirl, girlRig } from './girl.js';

const TAU = Math.PI * 2;

export const CHARACTERS = {
  claude: {
    name: 'Claude 娘', short: 'Claude', emoji: '✺', accent: '#d97757', units: 300, base: 150,
    blurb: '橙发、花饰与一本旧书。温柔认真，喜欢把事情讲清楚。'
  },
  clawd: {
    name: 'Clawd', short: 'Clawd', emoji: '▚', accent: '#d97757', units: 0, base: 0,
    blurb: 'Claude Code 的像素小螃蟹。会爬墙、会倒挂在天花板上。',
    pixel: true
  },
  gpt: {
    name: 'GPT 娘', short: 'GPT', emoji: '✦', accent: '#a78bfa', units: 300, base: 150,
    blurb: '白发龙角与柔光翅膀。好奇心旺盛，什么都想试一试。'
  },
  deepseek: {
    name: 'DeepSeek 娘', short: 'DeepSeek', emoji: '◈', accent: '#55a8ff', units: 300, base: 150,
    blurb: '深海蓝与小小鱼尾。安静、聪明，偶尔吐泡泡。'
  },
  custom: {
    name: '自定义', short: '自定义', emoji: '✧', accent: '#f472b6', units: 0, base: 0,
    blurb: '上传一张透明背景的 PNG，它就会在桌面上活过来。',
    image: true
  }
};

// Clawd, the Claude Code mascot, as a 16 × 6 body plus legs.
const CLAWD_W = 16;
const CLAWD = { body: '#d97757', light: '#e99a7c', shade: '#c2654a', dark: '#a9533b', eye: '#1b1714' };

export function petSize(kind, mode, scale = 1) {
  if (kind === 'clawd') {
    const px = (mode === 'adult' ? 7.5 : 6) * scale;
    return { w: CLAWD_W * px, h: 8 * px, px };
  }
  if (kind === 'custom') {
    const h = 130 * scale;
    return { w: h * .9, h };
  }
  const h = (mode === 'adult' ? 186 : 162) * scale;
  return { w: h * .62, h, k: h / 300 };
}

// Head center in local units after the feet-at-origin shift, for bubbles / pivots.
export function headOffset(kind, mode, scale = 1) {
  const size = petSize(kind, mode, scale);
  if (kind === 'clawd' || kind === 'custom') return { x: 0, y: -size.h * .62, top: -size.h };
  const r = girlRig(mode, kind);
  const k = size.k;
  const shift = r.hemY + 14;
  return { x: 0, y: (r.headY - shift) * k, top: (r.headY - r.ry * 1.25 - shift) * k };
}

export function drawCharacter(ctx, kind, mode, scale, pose, t, extra = {}) {
  if (kind === 'clawd') return drawClawd(ctx, mode, scale, pose, t);
  if (kind === 'custom') return drawCustom(ctx, scale, pose, t, extra.image);
  const r = girlRig(mode, kind);
  const { k } = petSize(kind, mode, scale);
  ctx.save();
  ctx.scale(k, k);
  ctx.translate(0, -(r.hemY + 14));
  if (pose.legs === 'sit') {
    ctx.translate(0, r.hemY + 14);
    ctx.scale(1.08, .84);
    ctx.translate(0, -(r.hemY + 14));
  }
  drawGirl(ctx, kind, mode, pose, t);
  ctx.restore();
  return undefined;
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
  // Half-pixel highlight on top and shade down the far side for volume.
  ctx.fillStyle = CLAWD.light;
  rect(ox + 2, bodyTop, 12, .5);
  rect(ox + 2, bodyTop, .5, 5);
  ctx.fillStyle = CLAWD.shade;
  rect(ox + 13.5, bodyTop + .5, .5, 5);
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
