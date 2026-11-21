// Cover renderer, written fresh in the recorded-v2 session.
//
// One render path serves both the editor preview and the PNG export, so the
// exported art can never drift from what the maker saw. This file is only the
// orchestration: layouts come from layouts.js, colour from grades.js, painted
// backdrops from scenery.js, and every letter on the poster from lettering.js.
// The order of a render never changes: panels, keylines, pop-out hero, role
// chips, finishing pass, stickers, scrims, halftone band, title, subtitle,
// stars, coverline, seal, billing.

import { layoutById, panelPixels } from './layouts.js';
import { gradeById, quantizePanel } from './grades.js';
import { grainCanvas, sceneryCanvas } from './scenery.js';
import {
  drawBilling, drawCoverline, drawHalftoneBand, drawHeatStars, drawRoleChip,
  drawScrims, drawSeal, drawStickers, drawSubtitle, drawTitle,
} from './lettering.js';

// Cover-fits a photo into a panel-sized canvas using the maker's crop: zoom
// scales it, pan offsets shift it, and the anchor decides the base position —
// top keeps faces (our portrait-aware answer to a blind centre crop), bottom
// keeps the ground line.
export function cropPhotoToPanel(photo, panelState, panelWidth, panelHeight, filter) {
  const off = document.createElement('canvas');
  off.width = Math.max(2, Math.round(panelWidth));
  off.height = Math.max(2, Math.round(panelHeight));
  const ctx = off.getContext('2d');
  ctx.filter = filter || 'none';
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

// Stacks a grade's wash and cast over one panel canvas, then its finish pass.
export function gradePanel(panelCanvas, grade, finish) {
  const ctx = panelCanvas.getContext('2d');
  const w = panelCanvas.width;
  const h = panelCanvas.height;
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, grade.top);
  wash.addColorStop(1, grade.bottom);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'color';
  ctx.globalAlpha = grade.castAlpha;
  ctx.fillStyle = grade.cast;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  if (finish === 'painted') quantizePanel(panelCanvas, 7, 1.06);
  if (finish === 'ink') quantizePanel(panelCanvas, 4, 1.35);
}

// Traces a panel outline — rectangle or slashed polygon — as the current path.
function tracePanel(ctx, panel, width, height) {
  ctx.beginPath();
  if (panel.poly) {
    panel.poly.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point[0] * width, point[1] * height);
      else ctx.lineTo(point[0] * width, point[1] * height);
    });
    ctx.closePath();
  } else {
    const box = panelPixels(panel, width, height);
    ctx.rect(box.x, box.y, box.w, box.h);
  }
}

// Renders one panel: photo or scenery, graded, clipped or tilted into place.
function paintPanel(ctx, panel, panelState, photos, grade, finish, width, height) {
  const box = panelPixels(panel, width, height);
  const photo = panelState.photoIndex >= 0 ? photos[panelState.photoIndex] : null;
  const art = photo
    ? cropPhotoToPanel(photo, panelState, box.w, box.h, grade.filter)
    : sceneryCanvas(panelState, box.w, box.h);
  gradePanel(art, grade, finish);
  ctx.save();
  if (panel.rot) {
    const cx = (panel.x + panel.w / 2) * width;
    const cy = (panel.y + panel.h / 2) * height;
    ctx.translate(cx, cy);
    ctx.rotate((panel.rot * Math.PI) / 180);
    if (panel.frame) {
      const pad = Math.min(box.w, box.h) * 0.045;
      ctx.fillStyle = '#fdfdf8';
      ctx.fillRect(-box.w / 2 - pad, -box.h / 2 - pad, box.w + pad * 2, box.h + pad * 2.6);
    }
    ctx.drawImage(art, -box.w / 2, -box.h / 2, box.w, box.h);
  } else {
    tracePanel(ctx, panel, width, height);
    ctx.clip();
    ctx.drawImage(art, box.x, box.y, box.w, box.h);
  }
  ctx.restore();
}

// Thick white keylines between panels — the poster's most recognisable bones.
function paintKeylines(ctx, layout, width, height) {
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
      tracePanel(ctx, panel, width, height);
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(8, width * 0.009);
  ctx.strokeRect(0, 0, width, height);
}

// The pop-out hero: the hero panel's photo is painted a second time, spilling
// past its frame over the neighbouring panels under a soft shadow, so the
// subject breaks out of the collage the way the board's winning covers do.
// It runs after the keylines and before the lettering, so the title still
// sits over the art, and it skips tilted or slashed hero panels, whose frames
// are not rectangles a spill can honestly escape from.
function paintPopOut(ctx, layout, state, photos, grade, finish, width, height) {
  const heroIndex = layout.panels.findIndex((panel) => panel.hero);
  if (heroIndex === -1) return;
  const panel = layout.panels[heroIndex];
  if (panel.rot || panel.poly) return;
  const panelState = state.panels[heroIndex];
  if (!panelState || panelState.photoIndex < 0) return;
  const photo = photos[panelState.photoIndex];
  if (!photo) return;
  const spillX = width * 0.055;
  const spillY = height * 0.055;
  const fromX = Math.max(0, panel.x * width - (panel.x > 0.4 ? spillX : 0));
  const fromY = Math.max(0, panel.y * height - (panel.y > 0.4 ? spillY : 0));
  const toX = Math.min(width, (panel.x + panel.w) * width + spillX);
  const toY = Math.min(height, (panel.y + panel.h) * height + spillY);
  const art = cropPhotoToPanel(photo, panelState, toX - fromX, toY - fromY, grade.filter);
  gradePanel(art, grade, finish);
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

// Finishing pass: the grade's sky glow, film grain and vignette.
function paintFinish(ctx, state, grade, width, height) {
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
    ctx.fillStyle = ctx.createPattern(grainCanvas(), 'repeat');
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

// Draws the complete cover at the canvas's own size, in the fixed order the
// header comment lists. Every render — preview or export — goes through here.
export function drawCoverArt(canvas, state, photos) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const layout = layoutById(state.layoutId);
  const grade = gradeById(state.gradeId);
  ctx.fillStyle = '#170b28';
  ctx.fillRect(0, 0, width, height);
  layout.panels.forEach((panel, index) => {
    paintPanel(ctx, panel, state.panels[index], photos, grade, state.finish, width, height);
  });
  paintKeylines(ctx, layout, width, height);
  if (state.popOut) paintPopOut(ctx, layout, state, photos, grade, state.finish, width, height);
  layout.panels.forEach((panel, index) => {
    if (!panel.rot) drawRoleChip(ctx, panel, state.panels[index].roleTag, width, height);
  });
  paintFinish(ctx, state, grade, width, height);
  drawStickers(ctx, state, width, height);
  drawScrims(ctx, width, height);
  if (state.halftoneBand) drawHalftoneBand(ctx, width, height);
  const titleBottom = drawTitle(ctx, state, width, height);
  const subtitleBottom = drawSubtitle(ctx, state, width, titleBottom);
  drawHeatStars(ctx, state, width, subtitleBottom);
  drawCoverline(ctx, state, width, height);
  if (state.showSeal) drawSeal(ctx, width, height);
  if (state.showBilling) drawBilling(ctx, state, width, height);
}

// Renders the cover at an exact export size and downloads it as a PNG.
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
