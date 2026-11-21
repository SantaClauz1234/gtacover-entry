// Painted scenery backdrops and film grain, written fresh in the recorded-v2
// session.
//
// A panel with no photo shows one of four original canvas backdrops instead
// of an empty box, so a cover is already a finished poster the moment the app
// opens: a sunset bay, neon towers, a dusk skyline, or a teal pier. All four
// are drawn in code — no image assets — and every random-looking detail comes
// from a seeded generator, so the same panel paints identically on every
// render and every export. The grain tile is built once and reused by the
// finishing pass.

function mulberry(seed) {
  let v = seed >>> 0;
  return () => {
    v = (v * 1664525 + 1013904223) >>> 0;
    return v / 4294967296;
  };
}

let grainTile = null;

export function grainCanvas() {
  if (grainTile) return grainTile;
  const tile = document.createElement('canvas');
  tile.width = 256;
  tile.height = 256;
  const ctx = tile.getContext('2d');
  const image = ctx.createImageData(256, 256);
  const rnd = mulberry(20261119);
  for (let i = 0; i < image.data.length; i += 4) {
    const shade = Math.floor(rnd() * 255);
    image.data[i] = shade;
    image.data[i + 1] = shade;
    image.data[i + 2] = shade;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  grainTile = tile;
  return tile;
}

// A palm in silhouette: one curved trunk, then seven arcing fronds fanning
// out of the crown. Used by the sunset bay, the neon towers and the palm badge.
export function paintPalm(ctx, baseX, baseY, size, colour) {
  ctx.save();
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
      crownX + Math.cos(angle) * reach * 0.6,
      crownY - Math.sin(angle) * reach * 0.7 - size * 0.1,
      crownX + Math.cos(angle) * reach,
      crownY - Math.sin(angle) * reach * 0.35 + size * 0.22,
    );
    ctx.stroke();
  }
  ctx.restore();
}

function paintSunsetBay(ctx, w, h) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#3d1d63');
  sky.addColorStop(0.45, '#c73e7d');
  sky.addColorStop(0.72, '#ff8c42');
  sky.addColorStop(1, '#2a9d8f');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffd76e';
  ctx.beginPath();
  ctx.arc(w * 0.68, h * 0.62, h * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(20, 12, 40, 0.85)';
  ctx.fillRect(0, h * 0.78, w, h * 0.22);
  ctx.fillStyle = 'rgba(255, 183, 71, 0.5)';
  for (let s = 0; s < 9; s += 1) {
    ctx.fillRect(w * (0.45 + s * 0.045), h * (0.8 + (s % 3) * 0.06), w * 0.05, 2);
  }
  paintPalm(ctx, w * 0.08, h * 0.95, h * 0.62, '#160a26');
  paintPalm(ctx, w * 0.9, h * 0.98, h * 0.5, '#160a26');
}

function paintNeonTowers(ctx, w, h) {
  const night = ctx.createLinearGradient(0, 0, 0, h);
  night.addColorStop(0, '#0b1030');
  night.addColorStop(0.7, '#25104d');
  night.addColorStop(1, '#12081f');
  ctx.fillStyle = night;
  ctx.fillRect(0, 0, w, h);
  const rnd = mulberry(47);
  for (let t = 0; t < 7; t += 1) {
    const tw = w * (0.1 + rnd() * 0.09);
    const tx = t * (w / 6.4);
    const th = h * (0.35 + rnd() * 0.4);
    ctx.fillStyle = '#0d0d1f';
    ctx.fillRect(tx, h - th, tw, th);
    for (let win = 0; win < 26; win += 1) {
      ctx.fillStyle = rnd() > 0.5 ? 'rgba(0, 229, 255, 0.85)' : 'rgba(255, 47, 179, 0.85)';
      ctx.fillRect(tx + rnd() * tw * 0.85, h - th + rnd() * th * 0.9, 3, 4);
    }
  }
  ctx.fillStyle = 'rgba(255, 47, 179, 0.16)';
  ctx.fillRect(0, h * 0.86, w, h * 0.14);
  paintPalm(ctx, w * 0.82, h * 1.02, h * 0.55, '#05050f');
}

function paintDuskSkyline(ctx, w, h) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#1d2a6b');
  sky.addColorStop(0.55, '#8e3b8f');
  sky.addColorStop(1, '#ff7e47');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffb347';
  ctx.beginPath();
  ctx.arc(w * 0.3, h * 0.66, h * 0.13, 0, Math.PI * 2);
  ctx.fill();
  const rnd = mulberry(91);
  let cursor = 0;
  while (cursor < w) {
    const bw = w * (0.06 + rnd() * 0.1);
    const bh = h * (0.2 + rnd() * 0.3);
    ctx.fillStyle = '#140b2a';
    ctx.fillRect(cursor, h - bh, bw, bh);
    ctx.fillStyle = 'rgba(255, 214, 110, 0.9)';
    for (let win = 0; win < 8; win += 1) {
      ctx.fillRect(cursor + rnd() * bw * 0.85, h - bh + rnd() * bh * 0.85, 3, 3);
    }
    cursor += bw + w * 0.012;
  }
}

function paintTealPier(ctx, w, h) {
  const sea = ctx.createLinearGradient(0, 0, 0, h);
  sea.addColorStop(0, '#aee9ff');
  sea.addColorStop(0.35, '#3fc1c9');
  sea.addColorStop(1, '#0e7c86');
  ctx.fillStyle = sea;
  ctx.fillRect(0, 0, w, h);
  const rnd = mulberry(7);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  for (let s = 0; s < 40; s += 1) {
    ctx.fillRect(rnd() * w, h * 0.4 + rnd() * h * 0.55, w * 0.03, 2);
  }
  ctx.fillStyle = '#6b4226';
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(w * 0.55, h * 0.45);
  ctx.lineTo(w * 0.72, h * 0.45);
  ctx.lineTo(w * 0.35, h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(40, 22, 8, 0.8)';
  ctx.lineWidth = 3;
  for (let p = 0; p < 6; p += 1) {
    ctx.beginPath();
    ctx.moveTo(w * (0.06 + p * 0.055), h * (0.94 - p * 0.082));
    ctx.lineTo(w * (0.62 + p * 0.016), h * (0.94 - p * 0.082));
    ctx.stroke();
  }
}

const SCENERY_PAINTERS = [paintSunsetBay, paintNeonTowers, paintDuskSkyline, paintTealPier];

// Paints the scenery backdrop for one photo-less panel, at panel pixel size,
// and returns it as a canvas the renderer can grade and place.
export function sceneryCanvas(panelState, panelWidth, panelHeight) {
  const off = document.createElement('canvas');
  off.width = Math.max(2, Math.round(panelWidth));
  off.height = Math.max(2, Math.round(panelHeight));
  const ctx = off.getContext('2d');
  const variant = ((panelState.scenery % 4) + 4) % 4;
  SCENERY_PAINTERS[variant](ctx, off.width, off.height);
  return off;
}
