// Vice colour grades, recorded rebuild. Each grade is three stacked layers:
// a filter string applied while the photo is drawn, a soft-light gradient wash
// running from the grade's top colour to its bottom colour, and a faint solid
// cast that pulls the whole panel into one duotone family. Noir is the odd one
// out on purpose — it drains the colour and leans on contrast. Below the grades
// sit the two finish treatments the top of the board sells, Painted and Poster
// Ink, both implemented as a per-panel pixel pass.

export const VICE_GRADES = [
  { id: 'sunset', name: 'Sunset Boulevard', filter: 'saturate(1.3) contrast(1.07) brightness(1.03)', washTop: '#ff9a3d', washBottom: '#d6336c', cast: '#ff7e47', castAlpha: 0.16, glow: '#ffb347' },
  { id: 'neon', name: 'Neon Nights', filter: 'saturate(1.45) contrast(1.15) brightness(0.98)', washTop: '#00e5ff', washBottom: '#ff2fb3', cast: '#7b2ff7', castAlpha: 0.18, glow: '#ff2fb3' },
  { id: 'golden', name: 'Golden Hour', filter: 'saturate(1.18) contrast(1.04) brightness(1.07) sepia(0.22)', washTop: '#ffd76e', washBottom: '#ff7847', cast: '#ffb347', castAlpha: 0.14, glow: '#ffd76e' },
  { id: 'teal', name: 'Teal Heat', filter: 'saturate(1.25) contrast(1.1) brightness(1.0)', washTop: '#00c2a8', washBottom: '#ff5e3a', cast: '#00c2a8', castAlpha: 0.15, glow: '#2ee6c8' },
  { id: 'magenta', name: 'Magenta Vice', filter: 'saturate(1.4) contrast(1.1) brightness(1.02)', washTop: '#ff2fb3', washBottom: '#3d0ca3', cast: '#ff2fb3', castAlpha: 0.17, glow: '#ff5ec4' },
  { id: 'dusk', name: 'Coral Dusk', filter: 'saturate(1.15) contrast(1.06) brightness(0.99) sepia(0.12)', washTop: '#ff8c69', washBottom: '#5b2a86', cast: '#ff8c69', castAlpha: 0.15, glow: '#ffa07a' },
  { id: 'gold', name: 'Bayshore Gold', filter: 'saturate(1.22) contrast(1.08) brightness(1.05) sepia(0.3)', washTop: '#f6c453', washBottom: '#b34724', cast: '#f6c453', castAlpha: 0.16, glow: '#ffe08a' },
  { id: 'noir', name: 'Noir Ink Grade', filter: 'grayscale(1) contrast(1.3) brightness(1.02)', washTop: '#cfd8dc', washBottom: '#10131a', cast: '#90a4ae', castAlpha: 0.1, glow: '#ffffff' },
];

/** Looks a grade up by id; unknown ids fall back to Sunset Boulevard. */
export function gradeById(id) {
  return VICE_GRADES.find((grade) => grade.id === id) ?? VICE_GRADES[0];
}

export const FINISH_MODES = [
  { id: 'photo', name: 'Photo' },
  { id: 'painted', name: 'Painted' },
  { id: 'ink', name: 'Poster Ink' },
];

/**
 * Snaps every channel of a panel canvas onto a short ladder of levels, after a
 * contrast lift around mid-grey. Wide ladders read as painted poster colour;
 * narrow ladders with a hard lift read as ink. Runs in place on the panel.
 */
export function posterizePanelPixels(canvas, levels, contrastLift) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  if (width === 0 || height === 0) return;
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const step = 255 / (levels - 1);
  for (let i = 0; i < data.length; i += 4) {
    for (let channel = 0; channel < 3; channel += 1) {
      const lifted = (data[i + channel] - 128) * contrastLift + 128;
      const snapped = Math.round(lifted / step) * step;
      data[i + channel] = snapped < 0 ? 0 : snapped > 255 ? 255 : snapped;
    }
  }
  ctx.putImageData(image, 0, 0);
}
