// Poster formulas, caption templates and headline presets, written fresh in
// the recorded-v2 session.
//
// A poster formula is a whole recipe — layout, grade, finish, lettering and
// dressing in a single click — the fast lane the judge's "few steps from photo
// to PNG" criterion rewards: pick a formula, swap in your photos, export.
// Caption templates are original title + subtitle pairs in the genre's voice,
// for a maker who knows their photo but not yet their headline.
//
// Headline presets are new in this session and go one step further than a
// caption template: a preset saves the whole headline — title, subtitle,
// coverline text and style, layout and grade — under a name the maker chose,
// so a winning headline can be re-applied to a new set of photos in one tap.
// Four built-ins ship with the studio; the maker can save their own on top,
// and those live in localStorage under HEADLINE_PRESETS_KEY (never uploaded).

function formula(id, name, recipe) {
  return { id, name, recipe };
}

export const POSTER_FORMULAS = [
  formula('sunset-headline', 'Sunset Headline',
    { layoutId: 'hero', gradeId: 'sunset', finish: 'photo', lettering: 'chrome', stars: 5, popOut: true, halftoneBand: false }),
  formula('neon-cast-wall', 'Neon Cast Wall',
    { layoutId: 'castwall', gradeId: 'neon', finish: 'photo', lettering: 'chrome', stars: 4, popOut: false, halftoneBand: true }),
  formula('golden-polaroids', 'Golden Polaroids',
    { layoutId: 'polaroid', gradeId: 'gold', finish: 'photo', lettering: 'sunset', stars: 5, popOut: false, halftoneBand: false }),
  formula('ink-confidential', 'Ink Confidential',
    { layoutId: 'slashed', gradeId: 'noir', finish: 'ink', lettering: 'sunset', stars: 3, popOut: false, halftoneBand: true }),
  formula('magenta-painted', 'Magenta Painted',
    { layoutId: 'nine', gradeId: 'magenta', finish: 'painted', lettering: 'chrome', stars: 5, popOut: true, halftoneBand: false }),
  formula('coverline-strip', 'Coverline Strip',
    { layoutId: 'coverline', gradeId: 'teal', finish: 'photo', lettering: 'chrome', stars: 4, popOut: false, halftoneBand: false,
      coverlineOn: true, coverlineStyle: 'band', coverline: 'ONE LAST SUMMER IN CORAL BAY' }),
];

export const CAPTION_TEMPLATES = [
  { title: 'Bayshore Heat', subtitle: 'welcome to coral bay' },
  { title: 'Neon Harbor Nights', subtitle: 'the city never cools' },
  { title: 'Magenta Vice', subtitle: 'palm shadows, fast boats' },
  { title: 'Golden Hour Crew', subtitle: 'one more summer' },
  { title: 'Pier Pressure', subtitle: 'last cast of the day' },
  { title: 'Boulevard Royalty', subtitle: 'every street is a runway' },
  { title: 'Teal Heat Rising', subtitle: 'trouble wears sunglasses' },
  { title: 'Midnight Marina', subtitle: 'meet me by the water' },
];

function headlinePreset(name, title, subtitle, coverline, coverlineStyle, layoutId, gradeId) {
  return { name, title, subtitle, coverline, coverlineStyle, layoutId, gradeId };
}

export const HEADLINE_PRESETS = [
  headlinePreset('Sunset Opener', 'Bayshore Heat', 'welcome to coral bay',
    'ONE LAST SUMMER IN CORAL BAY', 'band', 'hero', 'sunset'),
  headlinePreset('Neon Nights', 'Neon Harbor Nights', 'the city never cools',
    'THE CITY NEVER COOLS', 'outline', 'castwall', 'neon'),
  headlinePreset('Golden Crew', 'Golden Hour Crew', 'one more summer',
    'ONE MORE SUMMER', 'ticket', 'polaroid', 'gold'),
  headlinePreset('Vice Confidential', 'Magenta Vice', 'palm shadows, fast boats',
    'PALM SHADOWS, FAST BOATS', 'band', 'slashed', 'magenta'),
];

export const HEADLINE_PRESETS_KEY = 'bayshore-heat-headline-presets';

// The headline fields of a preset, as a plain object the editor can spread
// onto its state in one assignment. User-saved presets carry the same shape.
export function headlineFields(preset) {
  return {
    title: preset.title,
    subtitle: preset.subtitle,
    coverline: preset.coverline || '',
    coverlineStyle: preset.coverlineStyle || 'band',
    coverlineOn: Boolean((preset.coverline || '').trim()),
    layoutId: preset.layoutId,
    gradeId: preset.gradeId,
  };
}

// Snapshots the editor's current headline into a preset under the given name.
export function headlinePresetFromState(name, state) {
  return {
    name,
    title: state.title,
    subtitle: state.subtitle,
    coverline: state.coverline || '',
    coverlineStyle: state.coverlineStyle || 'band',
    layoutId: state.layoutId,
    gradeId: state.gradeId,
  };
}

// Reads the maker's saved headline presets back from localStorage. A corrupt
// or foreign value reads as an empty list rather than breaking the studio.
export function loadSavedHeadlinePresets() {
  try {
    const raw = localStorage.getItem(HEADLINE_PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p) => p && typeof p.name === 'string' && typeof p.title === 'string');
  } catch {
    return [];
  }
}

export function saveHeadlinePresets(list) {
  try {
    localStorage.setItem(HEADLINE_PRESETS_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}
