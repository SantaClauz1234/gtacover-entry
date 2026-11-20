// Panel layouts, recorded rebuild. A layout is a list of panels in normalised
// poster coordinates (0..1 on both axes), so one layout renders unchanged at
// 1080x1080, 1080x1350 and 1920x1080. A plain panel is a rectangle {x,y,w,h};
// a slashed panel carries a `poly` point list for the diagonal comic cut; a
// snapshot panel carries `rot` (tilt in degrees) and `frame` (printed-photo
// border). The first panel of hero-led layouts is flagged `hero` — stage C's
// pop-out treatment lifts exactly that panel out of its frame.

export const POSTER_SIZES = [
  { id: '1080x1080', label: 'Square 1080 × 1080', width: 1080, height: 1080 },
  { id: '1080x1350', label: 'Portrait 1080 × 1350', width: 1080, height: 1350 },
  { id: '1920x1080', label: 'Wide 1920 × 1080', width: 1920, height: 1080 },
];

export const ROLE_TAG_PRESETS = [
  'THE DRIVER', 'THE DREAMER', 'THE LOCAL', 'THE STRANGER', 'THE LOOKOUT',
  'THE HEART', 'THE WILD CARD', 'THE BOSS', 'THE GHOST', 'THE NEWCOMER',
];

function rect(x, y, w, h, extra = {}) {
  return { x, y, w, h, ...extra };
}

function slash(points, extra = {}) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return {
    poly: points,
    x: Math.min(...xs), y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys),
    ...extra,
  };
}

const third = 1 / 3;

export const PANEL_LAYOUTS = [
  {
    id: 'hero', name: 'Hero + Three',
    panels: [
      rect(0, 0, 0.62, 1, { hero: true }),
      rect(0.62, 0, 0.38, 0.34), rect(0.62, 0.34, 0.38, 0.33), rect(0.62, 0.67, 0.38, 0.33),
    ],
  },
  {
    id: 'nine', name: 'Classic Nine Grid',
    panels: [
      rect(0, 0, third, third, { hero: true }), rect(third, 0, third, third), rect(2 * third, 0, third, third),
      rect(0, third, third, third), rect(third, third, third, third), rect(2 * third, third, third, third),
      rect(0, 2 * third, third, third), rect(third, 2 * third, third, third), rect(2 * third, 2 * third, third, third),
    ],
  },
  {
    id: 'slashed', name: 'Slashed Comic',
    panels: [
      slash([[0, 0], [0.58, 0], [0.42, 1], [0, 1]], { hero: true }),
      slash([[0.58, 0], [1, 0], [1, 0.52], [0.5, 0.52]]),
      slash([[0.5, 0.52], [1, 0.52], [1, 1], [0.42, 1]]),
    ],
  },
  {
    id: 'triptych', name: 'Triptych Strips',
    panels: [
      rect(0, 0, 0.34, 1, { hero: true }), rect(0.34, 0, 0.33, 1), rect(0.67, 0, 0.33, 1),
    ],
  },
  {
    id: 'fullbleed', name: 'Full Bleed + Snapshot',
    panels: [
      rect(0, 0, 1, 1, { hero: true }),
      rect(0.58, 0.55, 0.36, 0.36, { rot: -6, frame: true }),
    ],
  },
  {
    id: 'polaroid', name: 'Tilted Snapshots',
    panels: [
      rect(0.05, 0.08, 0.42, 0.52, { rot: -5, frame: true, hero: true }),
      rect(0.53, 0.05, 0.42, 0.52, { rot: 4, frame: true }),
      rect(0.28, 0.5, 0.44, 0.44, { rot: -2, frame: true }),
    ],
  },
  {
    id: 'story', name: 'Story Stack',
    panels: [
      rect(0, 0, 1, 0.55, { hero: true }), rect(0, 0.55, 0.5, 0.45), rect(0.5, 0.55, 0.5, 0.45),
    ],
  },
  {
    id: 'banner', name: 'Wide Banner Split',
    panels: [
      rect(0.38, 0, 0.62, 1, { hero: true }), rect(0, 0, 0.38, 0.5), rect(0, 0.5, 0.38, 0.5),
    ],
  },
  {
    id: 'castwall', name: 'Cast Wall Five',
    panels: [
      rect(0, 0, 0.5, 0.58, { hero: true }), rect(0.5, 0, 0.5, 0.58),
      rect(0, 0.58, third, 0.42), rect(third, 0.58, third, 0.42), rect(2 * third, 0.58, third, 0.42),
    ],
  },
  {
    id: 'duo', name: 'Duo Stack',
    panels: [
      rect(0, 0, 1, 0.62, { hero: true }), rect(0, 0.62, 1, 0.38),
    ],
  },
];

/** Looks a layout up by id; unknown ids fall back to Hero + Three. */
export function layoutById(id) {
  return PANEL_LAYOUTS.find((layout) => layout.id === id) ?? PANEL_LAYOUTS[0];
}

/** The default settings a panel starts with: scenery backdrop, centred crop, no tag. */
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
