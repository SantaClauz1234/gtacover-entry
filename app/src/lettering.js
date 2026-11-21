// Poster lettering and dressing, written fresh in the recorded-v2 session.
//
// Everything drawn on top of the panels lives here: the retro-chrome title,
// the neon script subtitle, the heat-star meter, the cast role chips, the
// original seal, the billing block, the halftone band, the drawn stickers,
// the readability scrims — and the new coverline, a magazine-style headline
// band across the lower third of the poster (see drawCoverline). All text is
// drawn with system fonts in code; no font file, logo or artwork is borrowed.

import { paintPalm } from './scenery.js';

export const DISPLAY_FONT = '"Arial Black", "Segoe UI", system-ui, sans-serif';
export const SCRIPT_FONT = '"Segoe Script", "Brush Script MT", "Comic Sans MS", cursive';
export const BODY_FONT = '"Segoe UI", system-ui, sans-serif';

// Shrinks display lettering until it fits the target width. The measured
// width is padded for letter-spacing and for the chrome extrusion's rightward
// stack, which measureText cannot see — without the pad a long title's last
// letter slides off the poster's right edge.
export function fitTitleSize(ctx, text, targetWidth, startSize) {
  let size = startSize;
  ctx.font = `900 ${size}px ${DISPLAY_FONT}`;
  const overflow = () => ctx.measureText(text).width + text.length * size * 0.02 + size * 0.1;
  while (overflow() > targetWidth && size > 14) {
    size *= 0.94;
    ctx.font = `900 ${size}px ${DISPLAY_FONT}`;
  }
  return size;
}

function paintChromeTitle(ctx, text, cx, baseline, size, width) {
  ctx.fillStyle = '#131a2c';
  for (let depth = 7; depth >= 1; depth -= 1) {
    ctx.fillText(text, cx + depth * (size * 0.012), baseline + depth * (size * 0.02));
  }
  const chrome = ctx.createLinearGradient(0, baseline - size, 0, baseline);
  chrome.addColorStop(0, '#ffffff');
  chrome.addColorStop(0.24, '#bfe3ff');
  chrome.addColorStop(0.4, '#476b8a');
  chrome.addColorStop(0.49, '#ffffff');
  chrome.addColorStop(0.53, '#1d2733');
  chrome.addColorStop(0.62, '#ffe9a8');
  chrome.addColorStop(0.82, '#ff9d5c');
  chrome.addColorStop(1, '#e23e8f');
  ctx.fillStyle = chrome;
  ctx.fillText(text, cx, baseline);
  ctx.lineWidth = Math.max(2, size * 0.035);
  ctx.strokeStyle = 'rgba(10, 12, 24, 0.9)';
  ctx.strokeText(text, cx, baseline);
}

function paintSunsetTitle(ctx, text, cx, baseline, size) {
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = size * 0.16;
  ctx.shadowOffsetY = size * 0.05;
  const sunset = ctx.createLinearGradient(0, baseline - size, 0, baseline);
  sunset.addColorStop(0, '#ffe259');
  sunset.addColorStop(0.55, '#ff7518');
  sunset.addColorStop(1, '#ff2fb3');
  ctx.fillStyle = sunset;
  ctx.fillText(text, cx, baseline);
  ctx.restore();
  ctx.lineWidth = Math.max(2, size * 0.045);
  ctx.strokeStyle = '#ffffff';
  ctx.strokeText(text, cx, baseline);
}

// The poster title, two original treatments: 'chrome' is a striped
// retro-chrome fill laid on a stack of offset dark copies that extrude it
// into 3D; 'sunset' is a hot sunset gradient under a white keyline. Returns
// the title's baseline so the subtitle can sit underneath it.
export function drawTitle(ctx, state, width, height) {
  const title = (state.title || '').trim().toUpperCase();
  if (!title) return 0;
  const size = fitTitleSize(ctx, title, width * 0.88, height * 0.115);
  const baseline = height * 0.045 + size;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.round(size * 0.02)}px`;
  ctx.font = `900 ${size}px ${DISPLAY_FONT}`;
  if (state.lettering === 'chrome') paintChromeTitle(ctx, title, width / 2, baseline, size, width);
  else paintSunsetTitle(ctx, title, width / 2, baseline, size);
  ctx.restore();
  return baseline;
}

// Neon script subtitle under the title, drawn twice for a stronger glow.
export function drawSubtitle(ctx, state, width, titleBottom) {
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

// Five-star heat meter riding under the subtitle.
export function drawHeatStars(ctx, state, width, topY) {
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

// The dark chip carrying a cast role ("THE DRIVER") pinned inside a panel.
export function drawRoleChip(ctx, panel, text, width, height) {
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

// Our own circular seal — ringed text around a BH monogram — bottom-left.
export function drawSeal(ctx, width, height) {
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

// Movie-poster billing block: one tight credit line along the foot.
export function drawBilling(ctx, state, width, height) {
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

// Halftone title band: printed dots that swell at the top and fade downward.
export function drawHalftoneBand(ctx, width, height) {
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
      ctx.fillStyle = (col + row) % 3 === 0
        ? `rgba(255, 215, 110, ${0.34 * fade})`
        : `rgba(255, 47, 179, ${0.3 * fade})`;
      ctx.fill();
    }
  }
  ctx.restore();
}

// Top and bottom scrims that keep lettering readable over busy art.
export function drawScrims(ctx, width, height) {
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

// Drawn poster stickers — no image assets: a corner ribbon whose spine runs
// from (width − reach, 0) to (width, reach) with its words centred on that
// spine, a gold palm badge, and a rotated heat-index tag.
export function drawStickers(ctx, state, width, height) {
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
    paintPalm(ctx, cx - radius * 0.28, cy + radius * 0.62, radius * 1.15, '#131a2c');
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

export const COVERLINE_STYLES = [
  { id: 'band', name: 'Gold band' },
  { id: 'outline', name: 'Outline shout' },
  { id: 'ticket', name: 'Ticket stub' },
];

// The coverline: a magazine-style headline line across the lower third of the
// poster, new in this session. Three styles share one text and one slot:
//  - 'band': a gold strip with dark condensed type, slightly tilted,
//  - 'outline': huge hollow type with a white keyline and a pink shadow,
//  - 'ticket': a dark ticket stub, punched hole and all, bottom-right.
// It is off by default so covers made before this session render unchanged;
// turning it on never moves the title, subtitle or billing.
export function drawCoverline(ctx, state, width, height) {
  if (!state.coverlineOn) return;
  const line = (state.coverline || '').trim().toUpperCase();
  if (!line) return;
  const style = state.coverlineStyle || 'band';
  if (style === 'outline') {
    let size = Math.max(24, width * 0.075);
    ctx.save();
    ctx.font = `900 ${size}px ${DISPLAY_FONT}`;
    while (ctx.measureText(line).width > width * 0.94 && size > 16) {
      size *= 0.95;
      ctx.font = `900 ${size}px ${DISPLAY_FONT}`;
    }
    const y = height * 0.72;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255, 47, 179, 0.85)';
    ctx.shadowBlur = size * 0.2;
    ctx.shadowOffsetY = size * 0.06;
    ctx.lineWidth = Math.max(2, size * 0.04);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(line, width / 2, y);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = 'rgba(10, 8, 24, 0.55)';
    ctx.fillText(line, width / 2, y);
    ctx.restore();
    return;
  }
  if (style === 'ticket') {
    const tagWidth = width * 0.52;
    const tagHeight = Math.max(34, height * 0.052);
    ctx.save();
    ctx.translate(width - tagWidth / 2 - width * 0.03, height * 0.78);
    ctx.rotate(-0.035);
    ctx.fillStyle = '#131a2c';
    ctx.fillRect(-tagWidth / 2, -tagHeight / 2, tagWidth, tagHeight);
    ctx.strokeStyle = '#ffd76e';
    ctx.lineWidth = 2;
    ctx.strokeRect(-tagWidth / 2, -tagHeight / 2, tagWidth, tagHeight);
    ctx.beginPath();
    ctx.arc(-tagWidth * 0.44, 0, tagHeight * 0.14, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd76e';
    ctx.fill();
    let size = tagHeight * 0.42;
    ctx.font = `800 ${size}px ${BODY_FONT}`;
    while (ctx.measureText(line).width > tagWidth * 0.82 && size > 10) {
      size *= 0.92;
      ctx.font = `800 ${size}px ${BODY_FONT}`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(line, tagWidth * 0.04, 0);
    ctx.restore();
    return;
  }
  const bandHeight = Math.max(30, height * 0.052);
  const y = height * 0.68;
  ctx.save();
  ctx.translate(width / 2, y);
  ctx.rotate(-0.012);
  ctx.fillStyle = '#ffd76e';
  ctx.fillRect(-width / 2, -bandHeight / 2, width, bandHeight);
  ctx.fillStyle = '#131a2c';
  ctx.fillRect(-width / 2, bandHeight / 2 - 3, width, 3);
  let size = bandHeight * 0.52;
  ctx.font = `900 ${size}px ${DISPLAY_FONT}`;
  while (ctx.measureText(line).width > width * 0.92 && size > 12) {
    size *= 0.92;
    ctx.font = `900 ${size}px ${DISPLAY_FONT}`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#131a2c';
  ctx.fillText(line, 0, size * 0.04);
  ctx.restore();
}
