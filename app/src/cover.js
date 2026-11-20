// Cover renderer, stage A: the single path that paints a cover onto a canvas.
// The editor preview and the PNG export both call drawCoverArt, so the art a
// maker exports is exactly the art they were looking at. Stage A knows one
// hero-led collage; the layout and grade systems arrive as their own modules
// in the next stage and this file will import them instead of hard-coding.

export const POSTER_SIZES = [
  { id: '1080x1080', label: 'Square 1080 × 1080', width: 1080, height: 1080 },
  { id: '1080x1350', label: 'Portrait 1080 × 1350', width: 1080, height: 1350 },
  { id: '1920x1080', label: 'Wide 1920 × 1080', width: 1920, height: 1080 },
];

const TITLE_FONT = '"Arial Black", "Segoe UI", system-ui, sans-serif';
const SCRIPT_FONT = '"Segoe Script", "Brush Script MT", cursive';
const BODY_FONT = '"Segoe UI", system-ui, sans-serif';

// The stage-A collage: one large hero panel on the left, three stacked on the right.
export const STARTER_PANELS = [
  { x: 0, y: 0, w: 0.62, h: 1, hero: true },
  { x: 0.62, y: 0, w: 0.38, h: 0.34 },
  { x: 0.62, y: 0.34, w: 0.38, h: 0.33 },
  { x: 0.62, y: 0.67, w: 0.38, h: 0.33 },
];

/** A fresh per-panel record: no photo yet, centred crop, first scenery backdrop. */
export function freshPanelState(index) {
  return { photoIndex: -1, zoom: 1, offsetX: 0, offsetY: 0, anchor: 'center', roleTag: '', scenery: index % 4 };
}

/** Small deterministic generator so scenery windows land the same on every paint. */
function seededRandom(seed) {
  let v = seed >>> 0;
  return () => {
    v = (v * 1664525 + 1013904223) >>> 0;
    return v / 4294967296;
  };
}

/** Palm silhouette: a curved trunk with a crown of arcing fronds. */
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
 * Painted scenery for a panel that holds no photo yet: four original canvas
 * backdrops (sunset bay, neon towers, dusk skyline, teal pier), so the poster
 * is complete the moment the app opens, before anyone adds a photo.
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

/**
 * Cover-fits one photo into a panel-sized canvas honouring zoom, pan offsets
 * and the crop anchor: a top anchor keeps faces in frame, a bottom anchor
 * keeps the ground line, the centre anchor splits the difference.
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
  ctx.drawImage(photo, (panelWidth - dw) / 2 + panelState.offsetX * panelWidth, baseY + panelState.offsetY * panelHeight, dw, dh);
  return off;
}

/** Sunset wash laid over a panel canvas so every panel shares one Vice family. */
function applySunsetWashToPanel(panelCanvas) {
  const ctx = panelCanvas.getContext('2d');
  const { width: w, height: h } = panelCanvas;
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, '#ff9a3d');
  wash.addColorStop(1, '#d6336c');
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
}

/** Paints every panel of the stage-A collage, then its white keylines. */
function paintStarterCollage(ctx, state, photos, width, height) {
  STARTER_PANELS.forEach((panel, index) => {
    const panelState = state.panels[index] ?? freshPanelState(index);
    const photo = panelState.photoIndex >= 0 ? photos[panelState.photoIndex] : null;
    const art = photo
      ? drawPhotoCroppedIntoPanel(photo, panelState, panel.w * width, panel.h * height, 'saturate(1.3) contrast(1.07)')
      : drawSceneryBackdrop(panelState, panel.w * width, panel.h * height);
    applySunsetWashToPanel(art);
    ctx.save();
    ctx.beginPath();
    ctx.rect(panel.x * width, panel.y * height, panel.w * width, panel.h * height);
    ctx.clip();
    ctx.drawImage(art, panel.x * width, panel.y * height, panel.w * width, panel.h * height);
    ctx.restore();
  });
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(6, width * 0.007);
  for (const panel of STARTER_PANELS) ctx.strokeRect(panel.x * width, panel.y * height, panel.w * width, panel.h * height);
  ctx.lineWidth = Math.max(8, width * 0.009);
  ctx.strokeRect(0, 0, width, height);
  ctx.restore();
}

/** Stage-A lettering: a sunset-gradient title with a white keyline, plus a neon script subtitle. */
function paintStarterLettering(ctx, state, width, height) {
  const title = (state.title || '').trim().toUpperCase();
  if (!title) return;
  ctx.save();
  const scrim = ctx.createLinearGradient(0, 0, 0, height * 0.3);
  scrim.addColorStop(0, 'rgba(8, 4, 20, 0.52)');
  scrim.addColorStop(1, 'rgba(8, 4, 20, 0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, width, height * 0.3);
  let size = height * 0.115;
  ctx.textAlign = 'center';
  ctx.font = `900 ${size}px ${TITLE_FONT}`;
  while (ctx.measureText(title).width > width * 0.88 && size > 14) {
    size *= 0.94;
    ctx.font = `900 ${size}px ${TITLE_FONT}`;
  }
  const baseline = height * 0.045 + size;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = size * 0.16;
  ctx.shadowOffsetY = size * 0.05;
  const fill = ctx.createLinearGradient(0, baseline - size, 0, baseline);
  fill.addColorStop(0, '#ffe259'); fill.addColorStop(0.55, '#ff7518'); fill.addColorStop(1, '#ff2fb3');
  ctx.fillStyle = fill;
  ctx.fillText(title, width / 2, baseline);
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.lineWidth = Math.max(2, size * 0.045);
  ctx.strokeStyle = '#ffffff';
  ctx.strokeText(title, width / 2, baseline);
  const subtitle = (state.subtitle || '').trim();
  if (subtitle) {
    const subSize = Math.max(20, width * 0.032);
    ctx.font = `italic 700 ${subSize}px ${SCRIPT_FONT}`;
    ctx.shadowColor = '#ff2fb3';
    ctx.shadowBlur = subSize * 0.7;
    ctx.fillStyle = '#ffd7f2';
    ctx.fillText(subtitle, width / 2, baseline + subSize * 1.25);
  }
  ctx.restore();
  void BODY_FONT;
}

/** Draws the whole cover at the canvas's own size — preview and export share this. */
export function drawCoverArt(canvas, state, photos) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  ctx.fillStyle = '#170b28';
  ctx.fillRect(0, 0, width, height);
  paintStarterCollage(ctx, state, photos, width, height);
  paintStarterLettering(ctx, state, width, height);
}

/** Renders at an exact size on a scratch canvas and downloads the PNG. */
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
