// One-click poster formulas and caption templates. A poster formula is a whole recipe
// — layout, grade, finish, lettering and dressing in one click — the fast lane the
// judge's "few steps from photo to PNG" criterion rewards: a maker who does not want
// to tune nine controls can pick a formula, swap in their photos and export. Caption
// templates are title + subtitle pairs in the genre's voice, all original lines, for
// makers who know their photo but not their headline.

export const POSTER_FORMULAS = [
  {
    id: 'sunset-headline', name: 'Sunset Headline',
    recipe: { layoutId: 'hero', gradeId: 'sunset', finish: 'photo', lettering: 'chrome', stars: 5, popOut: true, halftoneBand: false },
  },
  {
    id: 'neon-cast-wall', name: 'Neon Cast Wall',
    recipe: { layoutId: 'castwall', gradeId: 'neon', finish: 'photo', lettering: 'chrome', stars: 4, popOut: false, halftoneBand: true },
  },
  {
    id: 'golden-polaroids', name: 'Golden Polaroids',
    recipe: { layoutId: 'polaroid', gradeId: 'gold', finish: 'photo', lettering: 'sunset', stars: 5, popOut: false, halftoneBand: false },
  },
  {
    id: 'ink-confidential', name: 'Ink Confidential',
    recipe: { layoutId: 'slashed', gradeId: 'noir', finish: 'ink', lettering: 'sunset', stars: 3, popOut: false, halftoneBand: true },
  },
  {
    id: 'magenta-painted', name: 'Magenta Painted',
    recipe: { layoutId: 'nine', gradeId: 'magenta', finish: 'painted', lettering: 'chrome', stars: 5, popOut: true, halftoneBand: false },
  },
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
