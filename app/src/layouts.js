// Panel layouts for Bayshore Heat, written fresh in the recorded-v2 session.
//
// A layout is a list of panels in normalised poster coordinates: every number
// is a fraction of the poster's width or height (0..1), so one layout renders
// unchanged at 1080x1080, 1080x1350 and 1920x1080. Three panel shapes exist:
//  - a plain rectangle {x, y, w, h},
//  - a slashed panel, which also carries `poly`, a list of [x, y] corners for
//    the diagonal comic cut (its x/y/w/h are the polygon's bounding box),
//  - a snapshot panel, which carries `rot` (tilt in degrees) and `frame`
//    (a printed-photo white border).
// The first panel of a hero-led layout carries `hero: true`; the pop-out
// treatment in the renderer lifts exactly that panel out of its frame.
//
// Layout 11, `coverline`, is new in this session: a tall hero on the left, two
// stacked panels on the right, and a full-width strip along the foot — the
// strip is where the coverline headline band sits, so the words read like a
// magazine coverline over the bottom of the poster.

export const POSTER_SIZES = [
  { id: '1080x1080', label: 'Square 1080 × 1080', width: 1080, height: 1080 },
  { id: '1080x1350', label: 'Portrait 1080 × 1350', width: 1080, height: 1350 },
  { id: '1920x1080', label: 'Wide 1920 × 1080', width: 1920, height: 1080 },
];

export function sizeById(id) {
  for (const size of POSTER_SIZES) if (size.id === id) return size;
  return POSTER_SIZES[1];
}

export const ROLE_TAG_PRESETS = [
  'THE DRIVER', 'THE DREAMER', 'THE LOCAL', 'THE STRANGER', 'THE LOOKOUT',
  'THE HEART', 'THE WILD CARD', 'THE BOSS', 'THE GHOST', 'THE NEWCOMER',
];

function cell(x, y, w, h, opts) {
  const panel = { x, y, w, h };
  if (opts) Object.assign(panel, opts);
  return panel;
}

function cut(points, opts) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const panel = {
    poly: points,
    x: left,
    y: top,
    w: Math.max(...xs) - left,
    h: Math.max(...ys) - top,
  };
  if (opts) Object.assign(panel, opts);
  return panel;
}

const T = 1 / 3;

export const PANEL_LAYOUTS = [
  {
    id: 'hero', name: 'Hero + Three',
    panels: [
      cell(0, 0, 0.62, 1, { hero: true }),
      cell(0.62, 0, 0.38, 0.34),
      cell(0.62, 0.34, 0.38, 0.33),
      cell(0.62, 0.67, 0.38, 0.33),
    ],
  },
  {
    id: 'nine', name: 'Classic Nine Grid',
    panels: [
      cell(0, 0, T, T, { hero: true }), cell(T, 0, T, T), cell(2 * T, 0, T, T),
      cell(0, T, T, T), cell(T, T, T, T), cell(2 * T, T, T, T),
      cell(0, 2 * T, T, T), cell(T, 2 * T, T, T), cell(2 * T, 2 * T, T, T),
    ],
  },
  {
    id: 'slashed', name: 'Slashed Comic',
    panels: [
      cut([[0, 0], [0.58, 0], [0.42, 1], [0, 1]], { hero: true }),
      cut([[0.58, 0], [1, 0], [1, 0.52], [0.5, 0.52]]),
      cut([[0.5, 0.52], [1, 0.52], [1, 1], [0.42, 1]]),
    ],
  },
  {
    id: 'triptych', name: 'Triptych Strips',
    panels: [
      cell(0, 0, 0.34, 1, { hero: true }),
      cell(0.34, 0, 0.33, 1),
      cell(0.67, 0, 0.33, 1),
    ],
  },
  {
    id: 'fullbleed', name: 'Full Bleed + Snapshot',
    panels: [
      cell(0, 0, 1, 1, { hero: true }),
      cell(0.58, 0.55, 0.36, 0.36, { rot: -6, frame: true }),
    ],
  },
  {
    id: 'polaroid', name: 'Tilted Snapshots',
    panels: [
      cell(0.05, 0.08, 0.42, 0.52, { rot: -5, frame: true, hero: true }),
      cell(0.53, 0.05, 0.42, 0.52, { rot: 4, frame: true }),
      cell(0.28, 0.5, 0.44, 0.44, { rot: -2, frame: true }),
    ],
  },
  {
    id: 'story', name: 'Story Stack',
    panels: [
      cell(0, 0, 1, 0.55, { hero: true }),
      cell(0, 0.55, 0.5, 0.45),
      cell(0.5, 0.55, 0.5, 0.45),
    ],
  },
  {
    id: 'banner', name: 'Wide Banner Split',
    panels: [
      cell(0.38, 0, 0.62, 1, { hero: true }),
      cell(0, 0, 0.38, 0.5),
      cell(0, 0.5, 0.38, 0.5),
    ],
  },
  {
    id: 'castwall', name: 'Cast Wall Five',
    panels: [
      cell(0, 0, 0.5, 0.58, { hero: true }),
      cell(0.5, 0, 0.5, 0.58),
      cell(0, 0.58, T, 0.42),
      cell(T, 0.58, T, 0.42),
      cell(2 * T, 0.58, T, 0.42),
    ],
  },
  {
    id: 'duo', name: 'Duo Stack',
    panels: [
      cell(0, 0, 1, 0.62, { hero: true }),
      cell(0, 0.62, 1, 0.38),
    ],
  },
  {
    id: 'coverline', name: 'Coverline Strip',
    panels: [
      cell(0, 0, 0.58, 0.78, { hero: true }),
      cell(0.58, 0, 0.42, 0.39),
      cell(0.58, 0.39, 0.42, 0.39),
      cell(0, 0.78, 1, 0.22),
    ],
  },
];

export function layoutById(id) {
  for (const layout of PANEL_LAYOUTS) if (layout.id === id) return layout;
  return PANEL_LAYOUTS[0];
}

// A panel's starting settings: painted scenery backdrop, centred crop, no tag.
// The scenery variant cycles with the panel index so neighbouring panels differ.
export function freshPanelState(index) {
  return {
    photoIndex: -1,
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    anchor: 'center',
    roleTag: '',
    scenery: index % 4,
  };
}

// A panel's rectangle in whole pixels for a poster of the given size.
export function panelPixels(panel, width, height) {
  return {
    x: panel.x * width,
    y: panel.y * height,
    w: panel.w * width,
    h: panel.h * height,
  };
}

function insidePolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const xi = poly[i][0];
    const yi = poly[i][1];
    const xj = poly[j][0];
    const yj = poly[j][1];
    const crosses = (yi > y) !== (yj > y);
    if (crosses && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Hit test for the editor canvas: normalised point -> topmost panel index, -1
// when the point lands on no panel. Later panels paint over earlier ones, so
// the search runs backwards.
export function panelAtPoint(layout, x, y) {
  for (let i = layout.panels.length - 1; i >= 0; i -= 1) {
    const panel = layout.panels[i];
    if (panel.poly) {
      if (insidePolygon(x, y, panel.poly)) return i;
    } else if (x >= panel.x && x <= panel.x + panel.w && y >= panel.y && y <= panel.y + panel.h) {
      return i;
    }
  }
  return -1;
}
