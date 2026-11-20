// The cover renderer: every function that turns photos + settings into finished cover
// art on a canvas. The editor preview and the PNG export run this exact same code path
// (drawCoverArt), so what the maker sees is byte-for-byte the art they export — the
// exported screenshots are this canvas, never a mock-up.

import { layoutById } from './panels.js';
import { gradeById, posterizePanelPixels } from './grades.js';

const DISPLAY_FONT = '"Arial Black", "Segoe UI", system-ui, sans-serif';
const SCRIPT_FONT = '"Segoe Script", "Brush Script MT", "Comic Sans MS", cursive';
const BODY_FONT = '"Segoe UI", system-ui, sans-serif';

/** Deterministic little random generator, so film grain is identical on every render. */
function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

let grainTile = null;
/** Builds (once) the 256px noise tile the grain pass stamps over the finished cover. */
function filmGrainTile() {
  if (grainTile) return grainTile;
  grainTile = document.createElement('canvas');
  grainTile.width = 256;
  grainTile.height = 256;
  const ctx = grainTile.getContext('2d');
  const image = ctx.createImageData(256, 256);
  const random = seededRandom(20261119);
  for (let i = 0; i < image.data.length; i += 4) {
    const shade = Math.floor(random() * 255);
    image.data[i] = shade;
    image.data[i + 1] = shade;
    image.data[i + 2] = shade;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return grainTile;
}

/** Traces a panel's shape (rectangle or slashed polygon) as the current path. */
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
 * Draws one photo into a panel-sized offscreen canvas with the maker's crop: the photo
 * is cover-fitted, scaled by the panel zoom, shifted by its offsets, and based on its
 * portrait anchor — top-anchored crops keep faces (the portrait-aware crop the editor
 * offers instead of a blind centre crop), bottom-anchored crops keep the ground line.
 */
function drawPhotoCroppedIntoPanel(photo, panelState, panelWidth, panelHeight, filter = 'none') {
  const off = document.createElement('canvas');
  off.width = Math.max(2, Math.round(panelWidth));
  off.height = Math.max(2, Math.round(panelHeight));
  const ctx = off.getContext('2d');
  ctx.filter = filter;
  const scale = Math.max(panelWidth / photo.naturalWidth, panelHeight / photo.naturalHeight) * panelState.zoom;
  const drawnWidth = photo.naturalWidth * scale;
  const drawnHeight = photo.naturalHeight * scale;
  let baseY = (panelHeight - drawnHeight) / 2;
  if (panelState.anchor === 'top') baseY = 0;
  if (panelState.anchor === 'bottom') baseY = panelHeight - drawnHeight;
  const drawX = (panelWidth - drawnWidth) / 2 + panelState.offsetX * panelWidth;
  const drawY = baseY + panelState.offsetY * panelHeight;
  ctx.drawImage(photo, drawX, drawY, drawnWidth, drawnHeight);
  return off;
}

/** A palm silhouette: curved trunk and a crown of arcing fronds, filled in one colour. */
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
 * The procedural scenery a panel shows when no photo is assigned to it: four original
 * canvas-painted Vice backdrops (sunset bay, neon street, dusk skyline, teal pier), so
 * a cover is a complete poster the moment the app opens, before any photo is added.
 */
function drawSceneryBackdrop(panelState, panelWidth, panelHeight) {
  const off = document.createElement('canvas');
  off.width = Math.max(2, Math.round(panelWidth));
  off.height = Math.max(2, Math.round(panelHeight));
  const ctx = off.getContext('2d');
  const w = off.width;
  const h = off.height;
  const variant = panelState.scenery % 4;
  if (variant === 0) {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#3d1d63'); sky.addColorStop(0.45, '#c73e7d'); sky.addColorStop(0.72, '#ff8c42'); sky.addColorStop(1, '#2a9d8f');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffd76e';
    ctx.beginPath(); ctx.arc(w * 0.68, h * 0.62, h * 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(20, 12, 40, 0.85)';
    ctx.fillRect(0, h * 0.78, w, h * 0.22);
    ctx.fillStyle = 'rgba(255, 183, 71, 0.5)';
    for (let streak = 0; streak < 9; streak += 1) ctx.fillRect(w * (0.45 + streak * 0.045), h * (0.8 + (streak % 3) * 0.06), w * 0.05, 2);
    drawPalmSilhouette(ctx, w * 0.08, h * 0.95, h * 0.62, '#160a26');
    drawPalmSilhouette(ctx, w * 0.9, h * 0.98, h * 0.5, '#160a26');
  } else if (variant === 1) {
    const night = ctx.createLinearGradient(0, 0, 0, h);
    night.addColorStop(0, '#0b1030'); night.addColorStop(0.7, '#25104d'); night.addColorStop(1, '#12081f');
    ctx.fillStyle = night; ctx.fillRect(0, 0, w, h);
    const random = seededRandom(40 + panelState.scenery * 7);
    for (let tower = 0; tower < 7; tower += 1) {
      const towerWidth = w * (0.1 + random() * 0.09);
      const towerX = tower * (w / 6.4);
      const towerHeight = h * (0.35 + random() * 0.4);
      ctx.fillStyle = '#0d0d1f';
      ctx.fillRect(towerX, h - towerHeight, towerWidth, towerHeight);
      for (let win = 0; win < 26; win += 1) {
        ctx.fillStyle = random() > 0.5 ? 'rgba(0, 229, 255, 0.85)' : 'rgba(255, 47, 179, 0.85)';
        ctx.fillRect(towerX + random() * towerWidth * 0.85, h - towerHeight + random() * towerHeight * 0.9, 3, 4);
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
    const random = seededRandom(90);
    ctx.fillStyle = '#140b2a';
    let cursor = 0;
    while (cursor < w) {
      const blockWidth = w * (0.06 + random() * 0.1);
      const blockHeight = h * (0.2 + random() * 0.3);
      ctx.fillRect(cursor, h - blockHeight, blockWidth, blockHeight);
      ctx.fillStyle = 'rgba(255, 214, 110, 0.9)';
      for (let win = 0; win < 8; win += 1) ctx.fillRect(cursor + random() * blockWidth * 0.85, h - blockHeight + random() * blockHeight * 0.85, 3, 3);
      ctx.fillStyle = '#140b2a';
      cursor += blockWidth + w * 0.012;
    }
  } else {
    const sea = ctx.createLinearGradient(0, 0, 0, h);
    sea.addColorStop(0, '#aee9ff'); sea.addColorStop(0.35, '#3fc1c9'); sea.addColorStop(1, '#0e7c86');
    ctx.fillStyle = sea; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    const random = seededRandom(7);
    for (let sparkle = 0; sparkle < 40; sparkle += 1) ctx.fillRect(random() * w, h * 0.4 + random() * h * 0.55, w * 0.03, 2);
    ctx.fillStyle = '#6b4226';
    ctx.beginPath();
    ctx.moveTo(0, h); ctx.lineTo(w * 0.55, h * 0.45); ctx.lineTo(w * 0.72, h * 0.45); ctx.lineTo(w * 0.35, h); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(40, 22, 8, 0.8)'; ctx.lineWidth = 3;
    for (let plank = 0; plank < 6; plank += 1) {
      ctx.beginPath();
      ctx.moveTo(w * (0.06 + plank * 0.055), h * (0.94 - plank * 0.082));
      ctx.lineTo(w * (0.62 + plank * 0.016), h * (0.94 - plank * 0.082));
      ctx.stroke();
    }
  }
  return off;
}

/** Stacks a grade's filter, wash and cast over one panel canvas, then its finish. */
function applyViceGradeToPanel(panelCanvas, grade, finish) {
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

/** Renders one panel: picks its photo or scenery, grades it, clips and draws it. */
function renderPanelInto(ctx, panel, panelState, photos, grade, finish, width, height) {
  const pixelWidth = panel.w * width;
  const pixelHeight = panel.h * height;
  const photo = panelState.photoIndex >= 0 ? photos[panelState.photoIndex] : null;
  let art;
  if (photo) {
    art = drawPhotoCroppedIntoPanel(photo, panelState, pixelWidth, pixelHeight, grade.filter);
  } else {
    art = drawSceneryBackdrop(panelState, pixelWidth, pixelHeight);
  }
  applyViceGradeToPanel(art, grade, finish);
  ctx.save();
  if (panel.rot) {
    const centreX = (panel.x + panel.w / 2) * width;
    const centreY = (panel.y + panel.h / 2) * height;
    ctx.translate(centreX, centreY);
    ctx.rotate((panel.rot * Math.PI) / 180);
    if (panel.frame) {
      ctx.fillStyle = '#fdfdf8';
      const pad = Math.min(pixelWidth, pixelHeight) * 0.045;
      ctx.fillRect(-pixelWidth / 2 - pad, -pixelHeight / 2 - pad, pixelWidth + pad * 2, pixelHeight + pad * 2.6);
    }
    ctx.drawImage(art, -pixelWidth / 2, -pixelHeight / 2, pixelWidth, pixelHeight);
  } else {
    tracePanelPath(ctx, panel, width, height);
    ctx.clip();
    ctx.drawImage(art, panel.x * width, panel.y * height, pixelWidth, pixelHeight);
  }
  ctx.restore();
}

/** The thick white keylines between panels — the poster's most recognisable bones. */
function drawPanelKeylines(ctx, layout, width, height) {
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(6, width * 0.007);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = ctx.lineWidth * 0.7;
  for (const panel of layout.panels) {
    if (panel.rot) {
      const centreX = (panel.x + panel.w / 2) * width;
      const centreY = (panel.y + panel.h / 2) * height;
      ctx.save();
      ctx.translate(centreX, centreY);
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

/**
 * The pop-out hero: the hero panel's photo is drawn a second time, spilling past its
 * frame over the neighbouring panels with a soft shadow, so the subject breaks out of
 * the collage the way the board's winning covers do. Drawn after the keylines and
 * before the lettering, so the title still sits over the art.
 */
function drawPopOutHero(ctx, layout, state, photos, grade, finish, width, height) {
  const heroIndex = layout.panels.findIndex((panel) => panel.hero);
  if (heroIndex === -1) return;
  const panel = layout.panels[heroIndex];
  if (panel.rot || panel.poly) return;
  const panelState = state.panels[heroIndex];
  const photo = panelState && panelState.photoIndex >= 0 ? photos[panelState.photoIndex] : null;
  if (!photo) return;
  const spillX = width * 0.055;
  const spillY = height * 0.055;
  const fromX = Math.max(0, panel.x * width - (panel.x > 0.4 ? spillX : 0));
  const fromY = Math.max(0, panel.y * height - (panel.y > 0.4 ? spillY : 0));
  const toX = Math.min(width, (panel.x + panel.w) * width + spillX);
  const toY = Math.min(height, (panel.y + panel.h) * height + spillY);
  const art = drawPhotoCroppedIntoPanel(photo, panelState, toX - fromX, toY - fromY, grade.filter);
  applyViceGradeToPanel(art, grade, finish);
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = width * 0.02;
  ctx.drawImage(art, fromX, fromY, toX - fromX, toY - fromY);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(6, width * 0.007);
  ctx.strokeRect(fromX, fromY, toX - fromX, toY - fromY);
  ctx.restore();
}

/** The small dark chip with a cast role ("THE DRIVER") pinned inside a panel. */
function drawRoleTagChip(ctx, panel, text, width, height) {
  if (!text.trim()) return;
  const fontSize = Math.max(15, width * 0.017);
  ctx.save();
  ctx.font = `700 ${fontSize}px ${BODY_FONT}`;
  const label = text.trim().toUpperCase();
  const chipWidth = ctx.measureText(label).width + fontSize * 1.1;
  const chipX = (panel.x + panel.w) * width - chipWidth - width * 0.012;
  let chipY = (panel.y + panel.h) * height - fontSize * 2.15;
  if (panel.y + panel.h > 0.95) chipY -= height * 0.045; // lift clear of the billing block
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
 * Fits display lettering to a target width by shrinking the font until it fits.
 * The measured width is padded for the letter-spacing and the chrome extrusion's
 * rightward stack, which measureText does not know about — without the pad, a long
 * title's last letter slides off the poster's right edge.
 */
function fitDisplayFont(ctx, text, targetWidth, startSize) {
  let size = startSize;
  const renderedWidth = () => ctx.measureText(text).width + text.length * size * 0.02 + size * 0.1;
  ctx.font = `900 ${size}px ${DISPLAY_FONT}`;
  while (renderedWidth() > targetWidth && size > 14) {
    size *= 0.94;
    ctx.font = `900 ${size}px ${DISPLAY_FONT}`;
  }
  return size;
}

/**
 * The poster title. Two lettering treatments, both original: 'chrome' — the striped
 * retro-chrome fill (bright bands over a dark split) on a stack of offset dark copies
 * that extrude it into 3D; and 'sunset' — a hot sunset gradient with a white keyline.
 */
function renderPosterTitleLettering(ctx, state, width, height) {
  const title = state.title.trim().toUpperCase();
  if (!title) return 0;
  const centreX = width / 2;
  const baseSize = height * 0.115;
  const size = fitDisplayFont(ctx, title, width * 0.88, baseSize);
  const baselineY = height * 0.045 + size;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.round(size * 0.02)}px`;
  if (state.lettering === 'chrome') {
    ctx.font = `900 ${size}px ${DISPLAY_FONT}`;
    ctx.fillStyle = '#131a2c';
    for (let depth = 7; depth >= 1; depth -= 1) {
      ctx.fillText(title, centreX + depth * (size * 0.012), baselineY + depth * (size * 0.02));
    }
    const chrome = ctx.createLinearGradient(0, baselineY - size, 0, baselineY);
    chrome.addColorStop(0, '#ffffff');
    chrome.addColorStop(0.24, '#bfe3ff');
    chrome.addColorStop(0.4, '#476b8a');
    chrome.addColorStop(0.49, '#ffffff');
    chrome.addColorStop(0.53, '#1d2733');
    chrome.addColorStop(0.62, '#ffe9a8');
    chrome.addColorStop(0.82, '#ff9d5c');
    chrome.addColorStop(1, '#e23e8f');
    ctx.fillStyle = chrome;
    ctx.fillText(title, centreX, baselineY);
    ctx.lineWidth = Math.max(2, size * 0.035);
    ctx.strokeStyle = 'rgba(10, 12, 24, 0.9)';
    ctx.strokeText(title, centreX, baselineY);
  } else {
    ctx.font = `900 ${size}px ${DISPLAY_FONT}`;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = size * 0.16;
    ctx.shadowOffsetY = size * 0.05;
    const sunset = ctx.createLinearGradient(0, baselineY - size, 0, baselineY);
    sunset.addColorStop(0, '#ffe259');
    sunset.addColorStop(0.55, '#ff7518');
    sunset.addColorStop(1, '#ff2fb3');
    ctx.fillStyle = sunset;
    ctx.fillText(title, centreX, baselineY);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.lineWidth = Math.max(2, size * 0.045);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(title, centreX, baselineY);
  }
  ctx.restore();
  return baselineY;
}

/** The neon script subtitle under the title, with its pink glow. */
function drawNeonSubtitle(ctx, state, width, titleBottom) {
  const subtitle = state.subtitle.trim();
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

/** The five-star heat meter that rides under the subtitle. */
function drawHeatStarMeter(ctx, state, width, topY) {
  const stars = Math.max(0, Math.min(5, state.stars));
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

/** Our own circular seal — ringed text around a BH monogram — bottom-left of the art. */
function drawOriginalSeal(ctx, width, height) {
  const radius = Math.min(width, height) * 0.075;
  const centreX = radius * 1.35;
  const centreY = height - radius * 1.5;
  ctx.save();
  ctx.beginPath();
  ctx.arc(centreX, centreY, radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(10, 10, 24, 0.78)';
  ctx.fill();
  ctx.lineWidth = radius * 0.07;
  ctx.strokeStyle = '#ffd76e';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(centreX, centreY, radius * 0.78, 0, Math.PI * 2);
  ctx.lineWidth = radius * 0.03;
  ctx.stroke();
  const ringText = 'BAYSHORE HEAT • ORIGINAL COVER • ';
  ctx.fillStyle = '#ffd76e';
  ctx.font = `700 ${radius * 0.19}px ${BODY_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const stepAngle = (Math.PI * 2) / ringText.length;
  for (let i = 0; i < ringText.length; i += 1) {
    const angle = i * stepAngle - Math.PI / 2;
    ctx.save();
    ctx.translate(centreX + Math.cos(angle) * radius * 0.88, centreY + Math.sin(angle) * radius * 0.88);
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillText(ringText[i], 0, 0);
    ctx.restore();
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${radius * 0.52}px ${DISPLAY_FONT}`;
  ctx.fillText('BH', centreX, centreY + radius * 0.05);
  ctx.restore();
}

/** The movie-poster billing block: one tight line of credits along the foot. */
function drawBillingBlock(ctx, state, width, height) {
  const billing = state.billing.trim().toUpperCase();
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

/** Grain + vignette + the grade's sky glow, the finishing pass over the whole cover. */
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
    const tile = filmGrainTile();
    const pattern = ctx.createPattern(tile, 'repeat');
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  if (state.vignette > 0) {
    const shade = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.42, width / 2, height / 2, Math.max(width, height) * 0.78);
    shade.addColorStop(0, 'rgba(0, 0, 0, 0)');
    shade.addColorStop(1, `rgba(5, 2, 12, ${state.vignette * 0.55})`);
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
}

/**
 * The halftone title band: rows of printed dots that swell and fade down the top of
 * the poster, the pulp-print texture the ace-tier house app wears behind its title.
 */
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
 * Poster stickers, all drawn — no image assets: a corner ribbon ("CORAL BAY •
 * EST. 2026"), a gold palm badge, and a rotated heat-index tag. They are the dressing
 * that makes a cover look printed and collected rather than merely exported.
 */
function drawPosterStickers(ctx, state, width, height) {
  const stickers = state.stickers ?? {};
  ctx.save();
  if (stickers.ribbon) {
    // A band across the top-right corner: its spine runs from (width - reach, 0) to
    // (width, reach), so the band is drawn centred on that spine's midpoint, rotated
    // to lie along it, with the words centred on the spine where they stay on-canvas.
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
    const centreX = width - radius * 1.5;
    const centreY = radius * 3.1;
    ctx.beginPath();
    ctx.arc(centreX, centreY, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd76e';
    ctx.fill();
    ctx.lineWidth = radius * 0.08;
    ctx.strokeStyle = '#131a2c';
    ctx.stroke();
    drawPalmSilhouette(ctx, centreX - radius * 0.28, centreY + radius * 0.62, radius * 1.15, '#131a2c');
  }
  if (stickers.heatTag) {
    const tagWidth = width * 0.17;
    const tagHeight = tagWidth * 0.34;
    const centreX = width - tagWidth * 0.62;
    const centreY = height - tagHeight * 2.9;
    ctx.save();
    ctx.translate(centreX, centreY);
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
  ctx.restore();
}

/** Scrims that keep the lettering readable over busy art, top and bottom. */
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

/**
 * Draws the complete cover onto a canvas at the canvas's own size. This is the single
 * render path: the editor calls it on every change and exportCoverPng calls it on a
 * fresh full-size canvas, so the preview can never drift from the exported art.
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
  if (state.popOut) drawPopOutHero(ctx, layout, state, photos, grade, state.finish, width, height);
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

/** Renders the cover at an exact export size and downloads it as a PNG file. */
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
