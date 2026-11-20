// Panel layouts for the cover collage. Every layout is a list of panels in poster
// coordinates (0..1 on each axis, so the same layout works at 1080x1080, 1080x1350 and
// 1920x1080). A panel is a rectangle {x, y, w, h}; a slashed panel instead carries a
// `poly` list of corner points for the diagonal comic look; a snapshot panel carries a
// `rot` tilt in degrees and a thick `frame` because it is drawn as a printed photo
// dropped on top of the poster. The first panel of hero-led layouts is flagged `hero`:
// it is the one the pop-out treatment lifts out of its frame.

export const POSTER_SIZES = [
  { id: '1080x1080', label: 'Square 1080 × 1080', width: 1080, height: 1080 },
  { id: '1080x1350', label: 'Portrait 1080 × 1350', width: 1080, height: 1350 },
  { id: '1920x1080', label: 'Wide 1920 × 1080', width: 1920, height: 1080 },
];

export const ROLE_TAG_PRESETS = [
  'THE DRIVER', 'THE DREAMER', 'THE LOCAL', 'THE STRANGER', 'THE LOOKOUT',
  'THE HEART', 'THE WILD CARD', 'THE BOSS', 'THE GHOST', 'THE NEWCOMER',
];

function rectPanel(x, y, w, h, extra = {}) {
  return { x, y, w, h, ...extra };
}

function polyPanel(points, extra = {}) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return {
    poly: points,
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
    ...extra,
  };
}

export const PANEL_LAYOUTS = [
  {
    id: 'hero', name: 'Hero + Three',
    panels: [
      rectPanel(0, 0, 0.62, 1, { hero: true }),
      rectPanel(0.62, 0, 0.38, 0.34),
      rectPanel(0.62, 0.34, 0.38, 0.33),
      rectPanel(0.62, 0.67, 0.38, 0.33),
    ],
  },
  {
    id: 'nine', name: 'Classic Nine Grid',
    panels: [
      rectPanel(0, 0, 1 / 3, 1 / 3, { hero: true }), rectPanel(1 / 3, 0, 1 / 3, 1 / 3), rectPanel(2 / 3, 0, 1 / 3, 1 / 3),
      rectPanel(0, 1 / 3, 1 / 3, 1 / 3), rectPanel(1 / 3, 1 / 3, 1 / 3, 1 / 3), rectPanel(2 / 3, 1 / 3, 1 / 3, 1 / 3),
      rectPanel(0, 2 / 3, 1 / 3, 1 / 3), rectPanel(1 / 3, 2 / 3, 1 / 3, 1 / 3), rectPanel(2 / 3, 2 / 3, 1 / 3, 1 / 3),
    ],
  },
  {
    id: 'slashed', name: 'Slashed Comic',
    panels: [
      polyPanel([[0, 0], [0.58, 0], [0.42, 1], [0, 1]], { hero: true }),
      polyPanel([[0.58, 0], [1, 0], [1, 0.52], [0.5, 0.52]]),
      polyPanel([[0.5, 0.52], [1, 0.52], [1, 1], [0.42, 1]]),
    ],
  },
  {
    id: 'triptych', name: 'Triptych Strips',
    panels: [
      rectPanel(0, 0, 0.34, 1, { hero: true }),
      rectPanel(0.34, 0, 0.33, 1),
      rectPanel(0.67, 0, 0.33, 1),
    ],
  },
  {
    id: 'fullbleed', name: 'Full Bleed + Snapshot',
    panels: [
      rectPanel(0, 0, 1, 1, { hero: true }),
      rectPanel(0.58, 0.55, 0.36, 0.36, { rot: -6, frame: true }),
    ],
  },
  {
    id: 'polaroid', name: 'Tilted Snapshots',
    panels: [
      rectPanel(0.05, 0.08, 0.42, 0.52, { rot: -5, frame: true, hero: true }),
      rectPanel(0.53, 0.05, 0.42, 0.52, { rot: 4, frame: true }),
      rectPanel(0.28, 0.5, 0.44, 0.44, { rot: -2, frame: true }),
    ],
  },
  {
    id: 'story', name: 'Story Stack',
    panels: [
      rectPanel(0, 0, 1, 0.55, { hero: true }),
      rectPanel(0, 0.55, 0.5, 0.45),
      rectPanel(0.5, 0.55, 0.5, 0.45),
    ],
  },
  {
    id: 'banner', name: 'Wide Banner Split',
    panels: [
      rectPanel(0.38, 0, 0.62, 1, { hero: true }),
      rectPanel(0, 0, 0.38, 0.5),
      rectPanel(0, 0.5, 0.38, 0.5),
    ],
  },
];

/** Finds a layout by id, falling back to the hero layout for an unknown id. */
export function layoutById(id) {
  return PANEL_LAYOUTS.find((layout) => layout.id === id) ?? PANEL_LAYOUTS[0];
}

/** The default per-panel settings a fresh panel starts with. */
export function freshPanelState(index) {
  return {
    photoIndex: -1, // -1 means the procedural scenery backdrop, not a user photo
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    anchor: 'center',
    roleTag: '',
    scenery: index % 4,
  };
}
