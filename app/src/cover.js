// Cover renderer, recorded rebuild: every function that turns photos plus
// studio settings into finished cover art. One render path serves both the
// editor preview and the PNG export (drawCoverArt), so the exported art can
// never drift from what the maker saw. Layouts come from panels.js and colour
// from grades.js; this file owns drawing: panels, keylines, lettering, seal,
// billing, stickers and the finishing pass.

import { layoutById } from './panels.js';
import { gradeById, posterizePanelPixels } from './grades.js';

const DISPLAY_FONT = '"Arial Black", "Segoe UI", system-ui, sans-serif';
const SCRIPT_FONT = '"Segoe Script", "Brush Script MT", "Comic Sans MS", cursive';
const BODY_FONT = '"Segoe UI", system-ui, sans-serif';

/** Deterministic generator: grain and scenery are identical on every render. */
function seededRandom(seed) {
  let v = seed >>> 0;
  return () => {
    v = (v * 1664525 + 1013904223) >>> 0;
    return v / 4294967296;
  };
}

let cachedGrainTile = null;
/** Builds once the 256px noise tile the grain pass stamps across a cover. */
function filmGrainTile() {
  if (cachedGrainTile) return cachedGrainTile;
  cachedGrainTile = document.createElement('canvas');
  cachedGrainTile.width = 256;
  cachedGrainTile.height = 256;
  const ctx = cachedGrainTile.getContext('2d');
  const image = ctx.createImageData(256, 256);
  const rnd = seededRandom(20261119);
  for (let i = 0; i < image.data.length; i += 4) {
    const shade = Math.floor(rnd() * 255);
    image.data[i] = shade;
    image.data[i + 1] = shade;
    image.data[i + 2] = shade;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return cachedGrainTile;
}

/** Traces a panel outline — rectangle or slashed polygon — as the current path. */
function tracePanelPath(ctx, panel, width, height) {
  ctx.beginPath();
  if (panel.poly) {
    panel.poly.forEach(([px, py], index) => {
      if (index === 0) ctx.moveTo(px * width, py * height);
      else ctx.lineTo(px * width, py * height);
    });
    ctx.closePath();
  } else {
    ctx.rect(panel.x * width, panel.y * height, panel.w * width, panel.h * height);
  }
}

/**
 * Cover-fits a photo into a panel-sized canvas using the maker's crop: zoom
 * scales it, pan offsets shift it, and the anchor decides the base position —
 * top keeps faces (our portrait-aware answer to a blind centre crop), bottom
 * keeps the ground line.
 */
export function drawPhotoCroppedIntoPanel(photo, panelState, panelWidth, panelHeight, filter = 'none') {
  const off = document.createElement('canvas');
  off.width = Math.max(2, Math.round(panelWidth));
  off.height = Math.max(2, Math.round(panelHeight));
  const ctx = off.getContext('2d');
  ctx.filter = filter;
  const scale = Math.max(panelWidth / photo.naturalWidth, panelHeight / photo.naturalHeight) * panelState.zoom;
  const dw = photo.naturalWidth * scale;
  const dh = photo.naturalHeight * scale;
  let baseY = (panelHeight - dh) / 2;
  if (panelState.anchor === 'top') baseY = 0;
  if (panelState.anchor === 'bottom') baseY = panelHeight - dh;
  const drawX = (panelWidth - dw) / 2 + panelState.offsetX * panelWidth;
  const drawY = baseY + panelState.offsetY * panelHeight;
  ctx.drawImage(photo, drawX, drawY, dw, dh);
  return off;
}

/** Palm silhouette: curved trunk, then a crown of seven arcing fronds. */
function drawPalmSilhouette(ctx, baseX, baseY, size, colour) {
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = size * 0.07;
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.quadraticCurveTo(baseX + size * 0.12, baseY - size * 0.55, baseX + size * 0.3, baseY - size);
  ctx.stroke();
  const crownX = baseX + size * 0.3;
  const crownY = baseY - size;
  ctx.lineWidth = size * 0.045;
  for (let frond = 0; frond < 7; frond += 1) {
    const angle = Math.PI * (0.08 + frond * 0.13);
    const reach = size * (0.55 + (frond % 3) * 0.12);
    ctx.beginPath();
    ctx.moveTo(crownX, crownY);
    ctx.quadraticCurveTo(
      crownX + Math.cos(angle) * reach * 0.6, crownY - Math.sin(angle) * reach * 0.7 - size * 0.1,
      crownX + Math.cos(angle) * reach, crownY - Math.sin(angle) * reach * 0.35 + size * 0.22,
    );
    ctx.stroke();
  }
}

/**
 * The painted scenery a photo-less panel shows: four original canvas backdrops
 * (sunset bay, neon towers, dusk skyline, teal pier). Because of them a cover
 * is a finished poster the moment the app opens.
 */
export function drawSceneryBackdrop(panelState, panelWidth, panelHeight) {
  const off = document.createElement('canvas');
  off.width = Math.max(2, Math.round(panelWidth));
  off.height = Math.max(2, Math.round(panelHeight));
  const ctx = off.getContext('2d');
  const w = off.width;
  const h = off.height;
  const variant = ((panelState.scenery % 4) + 4) % 4;
  if (variant === 0) {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#3d1d63'); sky.addColorStop(0.45, '#c73e7d');
    sky.addColorStop(0.72, '#ff8c42'); sky.addColorStop(1, '#2a9d8f');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffd76e';
    ctx.beginPath(); ctx.arc(w * 0.68, h * 0.62, h * 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(20, 12, 40, 0.85)'; ctx.fillRect(0, h * 0.78, w, h * 0.22);
    ctx.fillStyle = 'rgba(255, 183, 71, 0.5)';
    for (let s = 0; s < 9; s += 1) ctx.fillRect(w * (0.45 + s * 0.045), h * (0.8 + (s % 3) * 0.06), w * 0.05, 2);
    drawPalmSilhouette(ctx, w * 0.08, h * 0.95, h * 0.62, '#160a26');
    drawPalmSilhouette(ctx, w * 0.9, h * 0.98, h * 0.5, '#160a26');
  } else if (variant === 1) {
    const night = ctx.createLinearGradient(0, 0, 0, h);
    night.addColorStop(0, '#0b1030'); night.addColorStop(0.7, '#25104d'); night.addColorStop(1, '#12081f');
    ctx.fillStyle = night; ctx.fillRect(0, 0, w, h);
    const rnd = seededRandom(47);
    for (let t = 0; t < 7; t += 1) {
      const tw = w * (0.1 + rnd() * 0.09);
      const tx = t * (w / 6.4);
      const th = h * (0.35 + rnd() * 0.4);
      ctx.fillStyle = '#0d0d1f'; ctx.fillRect(tx, h - th, tw, th);
      for (let win = 0; win < 26; win += 1) {
        ctx.fillStyle = rnd() > 0.5 ? 'rgba(0, 229, 255, 0.85)' : 'rgba(255, 47, 179, 0.85)';
        ctx.fillRect(tx + rnd() * tw * 0.85, h - th + rnd() * th * 0.9, 3, 4);
      }
    }
    ctx.fillStyle = 'rgba(255, 47, 179, 0.16)'; ctx.fillRect(0, h * 0.86, w, h * 0.14);
    drawPalmSilhouette(ctx, w * 0.82, h * 1.02, h * 0.55, '#05050f');
  } else if (variant === 2) {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#1d2a6b'); sky.addColorStop(0.55, '#8e3b8f'); sky.addColorStop(1, '#ff7e47');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffb347';
    ctx.beginPath(); ctx.arc(w * 0.3, h * 0.66, h * 0.13, 0, Math.PI * 2); ctx.fill();
    const rnd = seededRandom(91);
    let cursor = 0;
    ctx.fillStyle = '#140b2a';
    while (cursor < w) {
      const bw = w * (0.06 + rnd() * 0.1);
      const bh = h * (0.2 + rnd() * 0.3);
      ctx.fillStyle = '#140b2a'; ctx.fillRect(cursor, h - bh, bw, bh);
      ctx.fillStyle = 'rgba(255, 214, 110, 0.9)';
      for (let win = 0; win < 8; win += 1) ctx.fillRect(cursor + rnd() * bw * 0.85, h - bh + rnd() * bh * 0.85, 3, 3);
      cursor += bw + w * 0.012;
    }
  } else {
    const sea = ctx.createLinearGradient(0, 0, 0, h);
    sea.addColorStop(0, '#aee9ff'); sea.addColorStop(0.35, '#3fc1c9'); sea.addColorStop(1, '#0e7c86');
    ctx.fillStyle = sea; ctx.fillRect(0, 0, w, h);
    const rnd = seededRandom(7);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    for (let s = 0; s < 40; s += 1) ctx.fillRect(rnd() * w, h * 0.4 + rnd() * h * 0.55, w * 0.03, 2);
    ctx.fillStyle = '#6b4226';
    ctx.beginPath();
    ctx.moveTo(0, h); ctx.lineTo(w * 0.55, h * 0.45); ctx.lineTo(w * 0.72, h * 0.45); ctx.lineTo(w * 0.35, h);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(40, 22, 8, 0.8)'; ctx.lineWidth = 3;
    for (let p = 0; p < 6; p += 1) {
      ctx.beginPath();
      ctx.moveTo(w * (0.06 + p * 0.055), h * (0.94 - p * 0.082));
      ctx.lineTo(w * (0.62 + p * 0.016), h * (0.94 - p * 0.082));
      ctx.stroke();
    }
  }
  return off;
}

/** Stacks a grade's wash and cast over one panel canvas, then its finish pass. */
export function applyViceGradeToPanel(panelCanvas, grade, finish) {
  const ctx = panelCanvas.getContext('2d');
  const { width: w, height: h } = panelCanvas;
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, grade.washTop);
  wash.addColorStop(1, grade.washBottom);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'color';
  ctx.globalAlpha = grade.castAlpha;
  ctx.fillStyle = grade.cast;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  if (finish === 'painted') posterizePanelPixels(panelCanvas, 7, 1.06);
  if (finish === 'ink') posterizePanelPixels(panelCanvas, 4, 1.35);
}

/** Renders one panel: photo or scenery, graded, clipped or tilted into place. */
function renderPanelInto(ctx, panel, panelState, photos, grade, finish, width, height) {
  const pw = panel.w * width;
  const ph = panel.h * height;
  const photo = panelState.photoIndex >= 0 ? photos[panelState.photoIndex] : null;
  const art = photo
    ? drawPhotoCroppedIntoPanel(photo, panelState, pw, ph, grade.filter)
    : drawSceneryBackdrop(panelState, pw, ph);
  applyViceGradeToPanel(art, grade, finish);
  ctx.save();
  if (panel.rot) {
    const cx = (panel.x + panel.w / 2) * width;
    const cy = (panel.y + panel.h / 2) * height;
    ctx.translate(cx, cy);
    ctx.rotate((panel.rot * Math.PI) / 180);
    if (panel.frame) {
      const pad = Math.min(pw, ph) * 0.045;
      ctx.fillStyle = '#fdfdf8';
      ctx.fillRect(-pw / 2 - pad, -ph / 2 - pad, pw + pad * 2, ph + pad * 2.6);
    }
    ctx.drawImage(art, -pw / 2, -ph / 2, pw, ph);
  } else {
    tracePanelPath(ctx, panel, width, height);
    ctx.clip();
    ctx.drawImage(art, panel.x * width, panel.y * height, pw, ph);
  }
  ctx.restore();
}

/** Thick white keylines between panels — the poster's most recognisable bones. */
function drawPanelKeylines(ctx, layout, width, height) {
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(6, width * 0.007);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = ctx.lineWidth * 0.7;
  for (const panel of layout.panels) {
    if (panel.rot) {
      ctx.save();
      ctx.translate((panel.x + panel.w / 2) * width, (panel.y + panel.h / 2) * height);
      ctx.rotate((panel.rot * Math.PI) / 180);
      ctx.strokeRect((-panel.w * width) / 2, (-panel.h * height) / 2, panel.w * width, panel.h * height);
      ctx.restore();
    } else {
      tracePanelPath(ctx, panel, width, height);
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(8, width * 0.009);
  ctx.strokeRect(0, 0, width, height);
}

/** The dark chip carrying a cast role ("THE DRIVER") pinned inside a panel. */
function drawRoleTagChip(ctx, panel, text, width, height) {
  const label = (text || '').trim().toUpperCase();
  if (!label) return;
  const fontSize = Math.max(15, width * 0.017);
  ctx.save();
  ctx.font = `700 ${fontSize}px ${BODY_FONT}`;
  const chipWidth = ctx.measureText(label).width + fontSize * 1.1;
  const chipX = (panel.x + panel.w) * width - chipWidth - width * 0.012;
  let chipY = (panel.y + panel.h) * height - fontSize * 2.15;
  if (panel.y + panel.h > 0.95) chipY -= height * 0.045;
  ctx.fillStyle = 'rgba(8, 8, 18, 0.82)';
  ctx.fillRect(chipX, chipY, chipWidth, fontSize * 1.55);
  ctx.fillStyle = '#ffd76e';
  ctx.fillRect(chipX, chipY, 4, fontSize * 1.55);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, chipX + chipWidth / 2 + 2, chipY + fontSize * 0.8);
  ctx.restore();
}

/**
 * Shrinks display lettering until it fits a target width. The measured width
 * is padded for letter-spacing and for the chrome extrusion's rightward stack,
 * which measureText cannot see — without the pad a long title's last letter
 * slides off the poster's right edge.
 */
function fitDisplayFont(ctx, text, targetWidth, startSize) {
  let size = startSize;
  const rendered = () => ctx.measureText(text).width + text.length * size * 0.02 + size * 0.1;
  ctx.font = `900 ${size}px ${DISPLAY_FONT}`;
  while (rendered() > targetWidth && size > 14) {
    size *= 0.94;
    ctx.font = `900 ${size}px ${DISPLAY_FONT}`;
  }
  return size;
}

/**
 * The poster title, two original treatments: 'chrome' — a striped retro-chrome
 * fill (bright bands over a dark split) laid on a stack of offset dark copies
 * that extrude it into 3D; 'sunset' — a hot sunset gradient, white keyline.
 * Returns the title's baseline so the subtitle can sit under it.
 */
export function renderPosterTitleLettering(ctx, state, width, height) {
  const title = (state.title || '').trim().toUpperCase();
  if (!title) return 0;
  const size = fitDisplayFont(ctx, title, width * 0.88, height * 0.115);
  const baselineY = height * 0.045 + size;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.round(size * 0.02)}px`;
  ctx.font = `900 ${size}px ${DISPLAY_FONT}`;
  if (state.lettering === 'chrome') {
    ctx.fillStyle = '#131a2c';
    for (let depth = 7; depth >= 1; depth -= 1) {
      ctx.fillText(title, width / 2 + depth * (size * 0.012), baselineY + depth * (size * 0.02));
    }
    const chrome = ctx.createLinearGradient(0, baselineY - size, 0, baselineY);
    chrome.addColorStop(0, '#ffffff'); chrome.addColorStop(0.24, '#bfe3ff');
    chrome.addColorStop(0.4, '#476b8a'); chrome.addColorStop(0.49, '#ffffff');
    chrome.addColorStop(0.53, '#1d2733'); chrome.addColorStop(0.62, '#ffe9a8');
    chrome.addColorStop(0.82, '#ff9d5c'); chrome.addColorStop(1, '#e23e8f');
    ctx.fillStyle = chrome;
    ctx.fillText(title, width / 2, baselineY);
    ctx.lineWidth = Math.max(2, size * 0.035);
    ctx.strokeStyle = 'rgba(10, 12, 24, 0.9)';
    ctx.strokeText(title, width / 2, baselineY);
  } else {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = size * 0.16;
    ctx.shadowOffsetY = size * 0.05;
    const sunset = ctx.createLinearGradient(0, baselineY - size, 0, baselineY);
    sunset.addColorStop(0, '#ffe259'); sunset.addColorStop(0.55, '#ff7518'); sunset.addColorStop(1, '#ff2fb3');
    ctx.fillStyle = sunset;
    ctx.fillText(title, width / 2, baselineY);
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.lineWidth = Math.max(2, size * 0.045);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(title, width / 2, baselineY);
  }
  ctx.restore();
  return baselineY;
}

/** Neon script subtitle under the title, drawn twice for a stronger glow. */
function drawNeonSubtitle(ctx, state, width, titleBottom) {
  const subtitle = (state.subtitle || '').trim();
  if (!subtitle) return titleBottom;
  const size = Math.max(20, width * 0.032);
  ctx.save();
  ctx.font = `italic 700 ${size}px ${SCRIPT_FONT}`;
  ctx.textAlign = 'center';
  ctx.shadowColor = '#ff2fb3';
  ctx.shadowBlur = size * 0.7;
  ctx.fillStyle = '#ffd7f2';
  ctx.fillText(subtitle, width / 2, titleBottom + size * 1.25);
  ctx.shadowBlur = size * 0.25;
  ctx.fillText(subtitle, width / 2, titleBottom + size * 1.25);
  ctx.restore();
  return titleBottom + size * 1.5;
}

/** Five-star heat meter riding under the subtitle. */
function drawHeatStarMeter(ctx, state, width, topY) {
  const stars = Math.max(0, Math.min(5, state.stars || 0));
  if (stars === 0) return;
  const size = Math.max(16, width * 0.021);
  ctx.save();
  ctx.font = `${size}px ${BODY_FONT}`;
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#ffd76e';
  ctx.fillText('★'.repeat(stars) + '☆'.repeat(5 - stars), width / 2, topY + size * 1.15);
  ctx.restore();
}

/** Our own circular seal — ringed text around a BH monogram — bottom-left. */
function drawOriginalSeal(ctx, width, height) {
  const radius = Math.min(width, height) * 0.075;
  const cx = radius * 1.35;
  const cy = height - radius * 1.5;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(10, 10, 24, 0.78)';
  ctx.fill();
  ctx.lineWidth = radius * 0.07;
  ctx.strokeStyle = '#ffd76e';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.78, 0, Math.PI * 2);
  ctx.lineWidth = radius * 0.03;
  ctx.stroke();
  const ring = 'BAYSHORE HEAT • ORIGINAL COVER • ';
  ctx.fillStyle = '#ffd76e';
  ctx.font = `700 ${radius * 0.19}px ${BODY_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const step = (Math.PI * 2) / ring.length;
  for (let i = 0; i < ring.length; i += 1) {
    const angle = i * step - Math.PI / 2;
    ctx.save();
    ctx.translate(cx + Math.cos(angle) * radius * 0.88, cy + Math.sin(angle) * radius * 0.88);
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillText(ring[i], 0, 0);
    ctx.restore();
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${radius * 0.52}px ${DISPLAY_FONT}`;
  ctx.fillText('BH', cx, cy + radius * 0.05);
  ctx.restore();
}

/** Movie-poster billing block: one tight credit line along the foot. */
function drawBillingBlock(ctx, state, width, height) {
  const billing = (state.billing || '').trim().toUpperCase();
  if (!billing) return;
  let size = Math.max(11, width * 0.0135);
  ctx.save();
  ctx.font = `600 ${size}px ${BODY_FONT}`;
  while (ctx.measureText(billing).width > width * 0.86 && size > 8) {
    size *= 0.95;
    ctx.font = `600 ${size}px ${BODY_FONT}`;
  }
  if ('letterSpacing' in ctx) ctx.letterSpacing = '1px';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = 5;
  ctx.fillText(billing, width / 2, height - height * 0.018);
  ctx.restore();
}

/** Halftone title band: printed dots that swell at the top and fade downward. */
function drawHalftoneTitleBand(ctx, width, height) {
  const bandHeight = height * 0.3;
  const gap = Math.max(14, width * 0.016);
  ctx.save();
  for (let row = 0; row * gap < bandHeight; row += 1) {
    const fade = 1 - (row * gap) / bandHeight;
    for (let col = 0; col * gap < width + gap; col += 1) {
      const radius = gap * 0.3 * fade;
      if (radius < 0.6) continue;
      ctx.beginPath();
      ctx.arc(col * gap + (row % 2 ? gap / 2 : 0), row * gap + gap / 2, radius, 0, Math.PI * 2);
      ctx.fillStyle = (col + row) % 3 === 0 ? `rgba(255, 215, 110, ${0.34 * fade})` : `rgba(255, 47, 179, ${0.3 * fade})`;
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * Drawn poster stickers — no image assets: a corner ribbon whose spine runs
 * from (width − reach, 0) to (width, reach) with its words centred on that
 * spine, a gold palm badge, and a rotated heat-index tag.
 */
function drawPosterStickers(ctx, state, width, height) {
  const stickers = state.stickers ?? {};
  if (stickers.ribbon) {
    const reach = Math.min(width, height) * 0.24;
    const bandWidth = Math.min(width, height) * 0.05;
    ctx.save();
    ctx.translate(width - reach / 2, reach / 2);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#e23e8f';
    ctx.fillRect(-reach * 0.78, -bandWidth / 2, reach * 1.56, bandWidth);
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${bandWidth * 0.4}px ${BODY_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CORAL BAY • EST. 2026', 0, bandWidth * 0.04);
    ctx.restore();
  }
  if (stickers.palmBadge) {
    const radius = Math.min(width, height) * 0.055;
    const cx = width - radius * 1.5;
    const cy = radius * 3.1;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd76e';
    ctx.fill();
    ctx.lineWidth = radius * 0.08;
    ctx.strokeStyle = '#131a2c';
    ctx.stroke();
    drawPalmSilhouette(ctx, cx - radius * 0.28, cy + radius * 0.62, radius * 1.15, '#131a2c');
    ctx.restore();
  }
  if (stickers.heatTag) {
    const tagWidth = width * 0.17;
    const tagHeight = tagWidth * 0.34;
    ctx.save();
    ctx.translate(width - tagWidth * 0.62, height - tagHeight * 2.9);
    ctx.rotate(-0.1);
    ctx.fillStyle = '#131a2c';
    ctx.fillRect(-tagWidth / 2, -tagHeight / 2, tagWidth, tagHeight);
    ctx.strokeStyle = '#ffd76e';
    ctx.lineWidth = 2;
    ctx.strokeRect(-tagWidth / 2, -tagHeight / 2, tagWidth, tagHeight);
    ctx.beginPath();
    ctx.arc(-tagWidth * 0.43, 0, tagHeight * 0.11, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd76e';
    ctx.fill();
    ctx.font = `800 ${tagHeight * 0.36}px ${BODY_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('HEAT INDEX 98°', tagWidth * 0.07, 0);
    ctx.restore();
  }
}

/** Top and bottom scrims that keep lettering readable over busy art. */
function drawLetteringScrims(ctx, width, height) {
  const top = ctx.createLinearGradient(0, 0, 0, height * 0.3);
  top.addColorStop(0, 'rgba(8, 4, 20, 0.52)');
  top.addColorStop(1, 'rgba(8, 4, 20, 0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, width, height * 0.3);
  const bottom = ctx.createLinearGradient(0, height * 0.88, 0, height);
  bottom.addColorStop(0, 'rgba(8, 4, 20, 0)');
  bottom.addColorStop(1, 'rgba(8, 4, 20, 0.5)');
  ctx.fillStyle = bottom;
  ctx.fillRect(0, height * 0.88, width, height * 0.12);
}

/** Finishing pass: the grade's sky glow, film grain and vignette. */
function applyFinishingPass(ctx, state, grade, width, height) {
  ctx.save();
  const glow = ctx.createRadialGradient(width / 2, 0, 0, width / 2, 0, height * 0.55);
  glow.addColorStop(0, grade.glow);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  if (state.grain > 0) {
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = state.grain * 0.22;
    ctx.fillStyle = ctx.createPattern(filmGrainTile(), 'repeat');
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  if (state.vignette > 0) {
    const shade = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.42,
      width / 2, height / 2, Math.max(width, height) * 0.78,
    );
    shade.addColorStop(0, 'rgba(0, 0, 0, 0)');
    shade.addColorStop(1, `rgba(5, 2, 12, ${state.vignette * 0.55})`);
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
}

/**
 * Draws the complete cover at the canvas's own size. Pop-out hero rendering
 * joins this path in the next stage; everything else — panels, keylines, role
 * tags, finishing, stickers, scrims, lettering, seal, billing — is final here.
 */
export function drawCoverArt(canvas, state, photos) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const layout = layoutById(state.layoutId);
  const grade = gradeById(state.gradeId);
  ctx.fillStyle = '#170b28';
  ctx.fillRect(0, 0, width, height);
  layout.panels.forEach((panel, index) => {
    renderPanelInto(ctx, panel, state.panels[index], photos, grade, state.finish, width, height);
  });
  drawPanelKeylines(ctx, layout, width, height);
  layout.panels.forEach((panel, index) => {
    if (!panel.rot) drawRoleTagChip(ctx, panel, state.panels[index].roleTag, width, height);
  });
  applyFinishingPass(ctx, state, grade, width, height);
  drawPosterStickers(ctx, state, width, height);
  drawLetteringScrims(ctx, width, height);
  if (state.halftoneBand) drawHalftoneTitleBand(ctx, width, height);
  const titleBottom = renderPosterTitleLettering(ctx, state, width, height);
  const subtitleBottom = drawNeonSubtitle(ctx, state, width, titleBottom);
  drawHeatStarMeter(ctx, state, width, subtitleBottom);
  if (state.showSeal) drawOriginalSeal(ctx, width, height);
  if (state.showBilling) drawBillingBlock(ctx, state, width, height);
}

/** Renders the cover at an exact export size and downloads it as a PNG. */
export function exportCoverPng(state, photos, size, onDone) {
  const off = document.createElement('canvas');
  off.width = size.width;
  off.height = size.height;
  drawCoverArt(off, state, photos);
  off.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `bayshore-heat-cover-${size.width}x${size.height}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 4000);
    if (onDone) onDone(link.download);
  }, 'image/png');
}
