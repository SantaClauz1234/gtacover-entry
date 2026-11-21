// Vice colour grades for Bayshore Heat, written fresh in the recorded-v2 session.
//
// A grade is one look applied to every panel of a cover. It has four parts:
//  1. a canvas `filter` string used while the photo (or scenery) is painted,
//  2. a two-stop wash, blended in soft-light from the top colour to the bottom,
//  3. a flat colour cast at low alpha that drags the whole panel into one
//     duotone family, and
//  4. a glow colour for the finishing pass at the top of the poster.
// Noir is deliberately the odd one out: it drains the colour and leans on
// contrast instead, which is what makes the Ink Confidential formula work.
//
// Finishes are separate from grades. `quantizePanel` snaps every channel of a
// panel onto a short ladder of levels after a contrast lift around mid-grey:
// a wide ladder (7 steps, gentle lift) reads as painted poster colour, a
// narrow ladder (4 steps, hard lift) reads as poster ink. It edits in place.

function makeGrade(id, name, filter, top, bottom, cast, castAlpha, glow) {
  return { id, name, filter, top, bottom, cast, castAlpha, glow };
}

export const VICE_GRADES = [
  makeGrade('sunset', 'Sunset Boulevard',
    'saturate(1.3) contrast(1.07) brightness(1.03)',
    '#ff9a3d', '#d6336c', '#ff7e47', 0.16, '#ffb347'),
  makeGrade('neon', 'Neon Nights',
    'saturate(1.45) contrast(1.15) brightness(0.98)',
    '#00e5ff', '#ff2fb3', '#7b2ff7', 0.18, '#ff2fb3'),
  makeGrade('golden', 'Golden Hour',
    'saturate(1.18) contrast(1.04) brightness(1.07) sepia(0.22)',
    '#ffd76e', '#ff7847', '#ffb347', 0.14, '#ffd76e'),
  makeGrade('teal', 'Teal Heat',
    'saturate(1.25) contrast(1.1) brightness(1.0)',
    '#00c2a8', '#ff5e3a', '#00c2a8', 0.15, '#2ee6c8'),
  makeGrade('magenta', 'Magenta Vice',
    'saturate(1.4) contrast(1.1) brightness(1.02)',
    '#ff2fb3', '#3d0ca3', '#ff2fb3', 0.17, '#ff5ec4'),
  makeGrade('dusk', 'Coral Dusk',
    'saturate(1.15) contrast(1.06) brightness(0.99) sepia(0.12)',
    '#ff8c69', '#5b2a86', '#ff8c69', 0.15, '#ffa07a'),
  makeGrade('gold', 'Bayshore Gold',
    'saturate(1.22) contrast(1.08) brightness(1.05) sepia(0.3)',
    '#f6c453', '#b34724', '#f6c453', 0.16, '#ffe08a'),
  makeGrade('noir', 'Noir Ink Grade',
    'grayscale(1) contrast(1.3) brightness(1.02)',
    '#cfd8dc', '#10131a', '#90a4ae', 0.10, '#ffffff'),
];

export function gradeById(id) {
  for (const grade of VICE_GRADES) if (grade.id === id) return grade;
  return VICE_GRADES[0];
}

export const FINISH_MODES = [
  { id: 'photo', name: 'Photo' },
  { id: 'painted', name: 'Painted' },
  { id: 'ink', name: 'Poster Ink' },
];

export function finishById(id) {
  for (const mode of FINISH_MODES) if (mode.id === id) return mode;
  return FINISH_MODES[0];
}

export function quantizePanel(canvas, levels, lift) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  if (w === 0 || h === 0) return;
  const image = ctx.getImageData(0, 0, w, h);
  const px = image.data;
  const step = 255 / (levels - 1);
  for (let i = 0; i < px.length; i += 4) {
    for (let c = 0; c < 3; c += 1) {
      const lifted = (px[i + c] - 128) * lift + 128;
      let snapped = Math.round(lifted / step) * step;
      if (snapped < 0) snapped = 0;
      if (snapped > 255) snapped = 255;
      px[i + c] = snapped;
    }
  }
  ctx.putImageData(image, 0, 0);
}
