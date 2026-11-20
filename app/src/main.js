// Bayshore Heat — Cover Studio editor, stage B: the layout and grade systems
// are wired in. State now carries the full poster recipe (layout, grade,
// finish, lettering, dressing) and the per-panel list grows or shrinks to fit
// whichever of the ten layouts is active. The panel inspector, canvas gestures
// and history arrive in the next stage; this stage wires the pickers, the
// caption fields and the poster-dressing toggles.

import { drawCoverArt, exportCoverPng } from './cover.js';
import { PANEL_LAYOUTS, POSTER_SIZES, ROLE_TAG_PRESETS, freshPanelState, layoutById } from './panels.js';
import { VICE_GRADES } from './grades.js';
import { runShotScene } from './shots.js';

const canvas = document.getElementById('cover-canvas');
const statusLine = document.getElementById('status-line');

const state = {
  title: 'Bayshore Heat',
  subtitle: 'welcome to coral bay',
  billing: 'Bayshore Heat Pictures presents a Coral Bay story starring you and yours — music by the tide, directed by the golden hour',
  layoutId: 'hero',
  gradeId: 'sunset',
  finish: 'photo',
  sizeId: '1080x1350',
  lettering: 'chrome',
  stars: 5,
  popOut: false,
  showSeal: true,
  showBilling: true,
  grain: 0.35,
  vignette: 0.45,
  halftoneBand: false,
  stickers: { ribbon: true, palmBadge: false, heatTag: true },
  panels: [],
  selectedPanel: 0,
};

const photos = [];
const photoNames = [];

/** Loads an image element from an object URL or an app-relative path. */
export function loadPhotoFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function say(message) {
  statusLine.textContent = message;
}

function currentSize() {
  return POSTER_SIZES.find((size) => size.id === state.sizeId) ?? POSTER_SIZES[1];
}

function currentLayout() {
  return layoutById(state.layoutId);
}

/** Keeps the per-panel settings list exactly as long as the active layout. */
function ensurePanelStates() {
  const count = currentLayout().panels.length;
  while (state.panels.length < count) state.panels.push(freshPanelState(state.panels.length));
  state.panels.length = count;
  if (state.selectedPanel >= count) state.selectedPanel = 0;
}

/** Repaints the preview and re-marks the active picker buttons. */
function renderStudio() {
  ensurePanelStates();
  const size = currentSize();
  if (canvas.width !== size.width || canvas.height !== size.height) {
    canvas.width = size.width;
    canvas.height = size.height;
  }
  drawCoverArt(canvas, state, photos);
  document.querySelectorAll('#layout-grid button').forEach((button) => {
    button.classList.toggle('active', button.dataset.layout === state.layoutId);
  });
  document.querySelectorAll('#grade-grid button').forEach((button) => {
    button.classList.toggle('active', button.dataset.grade === state.gradeId);
  });
  document.querySelectorAll('#panel-chips button').forEach((chip, index) => {
    chip.classList.toggle('active', index === state.selectedPanel);
  });
}

/**
 * Spread: one photo per panel, round-robin, each with its own crop — the hero
 * panel gets a portrait-anchored close crop, the rest alternate anchors and
 * zooms, and the leading panels pick up cast role tags so the poster reads
 * like a cast collage from the first click.
 */
function spreadPhotosAcrossPanels() {
  if (photos.length === 0) return;
  ensurePanelStates();
  const anchors = ['top', 'center', 'bottom'];
  state.panels.forEach((panel, index) => {
    panel.photoIndex = index % photos.length;
    panel.anchor = anchors[index % anchors.length];
    panel.zoom = index === 0 ? 1.12 : 1 + (index % 3) * 0.12;
    panel.offsetX = 0;
    panel.offsetY = 0;
    if (!panel.roleTag && index < ROLE_TAG_PRESETS.length) panel.roleTag = ROLE_TAG_PRESETS[index];
  });
}

/** Fill all: every panel shows the same photo, each cropped differently. */
function fillAllPanelsFromOnePhoto(photoIndex) {
  if (photoIndex < 0 || photoIndex >= photos.length) return;
  ensurePanelStates();
  const anchors = ['top', 'center', 'bottom'];
  state.panels.forEach((panel, index) => {
    panel.photoIndex = photoIndex;
    panel.anchor = anchors[index % anchors.length];
    panel.zoom = 1 + (index % 4) * 0.14;
    panel.offsetX = ((index % 3) - 1) * 0.08;
    panel.offsetY = 0;
  });
}

/** Rebuilds the tray thumbnails; a click sends that photo to the selected panel. */
function refreshPhotoTray() {
  const tray = document.getElementById('photo-tray');
  tray.replaceChildren();
  photos.forEach((img, index) => {
    const thumb = document.createElement('img');
    thumb.src = img.src;
    thumb.className = 'thumb';
    thumb.alt = photoNames[index] ?? `Photo ${index + 1}`;
    thumb.title = `${photoNames[index] ?? 'Photo'} — click to send to the selected panel`;
    thumb.addEventListener('click', () => {
      ensurePanelStates();
      state.panels[state.selectedPanel].photoIndex = index;
      renderStudio();
      say(`Panel ${state.selectedPanel + 1} now shows ${photoNames[index]}.`);
    });
    tray.appendChild(thumb);
  });
}

/** Adds user files to the tray; a still-empty poster is spread automatically. */
async function addPhotosFromFiles(files) {
  const images = [...files].filter((file) => file.type.startsWith('image/'));
  for (const file of images) {
    photos.push(await loadPhotoFromUrl(URL.createObjectURL(file)));
    photoNames.push(file.name.replace(/\.[^.]+$/, ''));
  }
  if (images.length === 0) return;
  refreshPhotoTray();
  if (state.panels.every((panel) => panel.photoIndex === -1)) spreadPhotosAcrossPanels();
  renderStudio();
  say(`${photos.length} photo(s) in the tray — panels filled, photos stayed on your computer.`);
}

/** Loads the two sample photos shipped inside app/ (free to use, made for the kit). */
async function loadSamplePhotos() {
  if (photos.length > 0) return;
  photos.push(await loadPhotoFromUrl('samples/boulevard.jpg'));
  photos.push(await loadPhotoFromUrl('samples/pier.jpg'));
  photoNames.push('Sample — boulevard', 'Sample — pier');
  refreshPhotoTray();
}

/** Builds the layout picker, the grade swatches and the panel selector chips. */
function buildPickerControls() {
  const layoutGrid = document.getElementById('layout-grid');
  for (const layout of PANEL_LAYOUTS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.layout = layout.id;
    button.textContent = layout.name;
    button.addEventListener('click', () => {
      state.layoutId = layout.id;
      state.selectedPanel = 0;
      ensurePanelStates();
      buildPanelChips();
      renderStudio();
      say(`Layout: ${layout.name} — ${layout.panels.length} panels.`);
    });
    layoutGrid.appendChild(button);
  }
  const gradeGrid = document.getElementById('grade-grid');
  for (const grade of VICE_GRADES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.grade = grade.id;
    button.textContent = grade.name;
    button.style.borderLeftColor = grade.washBottom;
    button.addEventListener('click', () => {
      state.gradeId = grade.id;
      renderStudio();
      say(`Grade: ${grade.name}.`);
    });
    gradeGrid.appendChild(button);
  }
  buildPanelChips();
}

/** Rebuilds the panel selector chips for the active layout, hero starred. */
function buildPanelChips() {
  const chips = document.getElementById('panel-chips');
  chips.replaceChildren();
  currentLayout().panels.forEach((panel, index) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.textContent = panel.hero ? `Panel ${index + 1} ★` : `Panel ${index + 1}`;
    chip.addEventListener('click', () => {
      state.selectedPanel = index;
      renderStudio();
    });
    chips.appendChild(chip);
  });
}

/** Wires photos, caption, lettering, finish, dressing, size and export. */
function wireStudioControls() {
  const input = document.getElementById('photo-input');
  input.addEventListener('change', () => addPhotosFromFiles(input.files ?? []));
  const zone = document.getElementById('drop-zone');
  zone.addEventListener('dragover', (event) => event.preventDefault());
  zone.addEventListener('drop', (event) => {
    event.preventDefault();
    if (event.dataTransfer) addPhotosFromFiles(event.dataTransfer.files);
  });
  document.getElementById('load-samples').addEventListener('click', async () => {
    await loadSamplePhotos();
    spreadPhotosAcrossPanels();
    renderStudio();
    say('Sample photos loaded and spread across the panels.');
  });
  document.getElementById('clear-photos').addEventListener('click', () => {
    photos.length = 0;
    photoNames.length = 0;
    state.panels.forEach((panel) => { panel.photoIndex = -1; });
    refreshPhotoTray();
    renderStudio();
    say('Photos cleared — panels now show the painted scenery backdrops.');
  });
  document.getElementById('fill-all-panels').addEventListener('click', () => {
    const panel = state.panels[state.selectedPanel];
    fillAllPanelsFromOnePhoto(panel && panel.photoIndex >= 0 ? panel.photoIndex : 0);
    renderStudio();
    say('Every panel now shows one photo, cropped differently per panel.');
  });
  document.getElementById('spread-photos').addEventListener('click', () => {
    spreadPhotosAcrossPanels();
    renderStudio();
    say('Photos spread across the panels, one cast member per panel.');
  });
  document.getElementById('title-input').addEventListener('input', (event) => {
    state.title = event.target.value;
    renderStudio();
  });
  document.getElementById('subtitle-input').addEventListener('input', (event) => {
    state.subtitle = event.target.value;
    renderStudio();
  });
  document.getElementById('billing-input').addEventListener('input', (event) => {
    state.billing = event.target.value;
    renderStudio();
  });
  document.getElementById('lettering-select').addEventListener('change', (event) => {
    state.lettering = event.target.value;
    renderStudio();
  });
  document.getElementById('stars-range').addEventListener('input', (event) => {
    state.stars = Number(event.target.value);
    renderStudio();
  });
  document.getElementById('finish-select').addEventListener('change', (event) => {
    state.finish = event.target.value;
    renderStudio();
    say(`Finish: ${event.target.selectedOptions[0].textContent}.`);
  });
  const dressing = [
    ['popout-toggle', (checked) => { state.popOut = checked; }],
    ['seal-toggle', (checked) => { state.showSeal = checked; }],
    ['billing-toggle', (checked) => { state.showBilling = checked; }],
    ['halftone-toggle', (checked) => { state.halftoneBand = checked; }],
    ['ribbon-toggle', (checked) => { state.stickers.ribbon = checked; }],
    ['palm-badge-toggle', (checked) => { state.stickers.palmBadge = checked; }],
    ['heat-tag-toggle', (checked) => { state.stickers.heatTag = checked; }],
  ];
  for (const [id, apply] of dressing) {
    document.getElementById(id).addEventListener('change', (event) => {
      apply(event.target.checked);
      renderStudio();
    });
  }
  document.getElementById('grain-range').addEventListener('input', (event) => {
    state.grain = Number(event.target.value);
    renderStudio();
  });
  document.getElementById('vignette-range').addEventListener('input', (event) => {
    state.vignette = Number(event.target.value);
    renderStudio();
  });
  document.getElementById('size-select').addEventListener('change', (event) => {
    state.sizeId = event.target.value;
    renderStudio();
  });
  document.getElementById('export-png').addEventListener('click', () => {
    exportCoverPng(state, photos, currentSize(), (name) => say(`Saved ${name} — ready to post.`));
  });
}

/** Applies a screenshot scene: samples in, layout/grade/caption/size set, paint. */
async function applyShotScene(scene) {
  await loadSamplePhotos();
  if (scene.layout) state.layoutId = scene.layout;
  if (scene.grade) state.gradeId = scene.grade;
  if (scene.title) {
    state.title = scene.title;
    document.getElementById('title-input').value = scene.title;
  }
  if (scene.subtitle) {
    state.subtitle = scene.subtitle;
    document.getElementById('subtitle-input').value = scene.subtitle;
  }
  if (scene.size) {
    state.sizeId = scene.size;
    document.getElementById('size-select').value = scene.size;
  }
  ensurePanelStates();
  buildPanelChips();
  spreadPhotosAcrossPanels();
  renderStudio();
}

buildPickerControls();
wireStudioControls();

const shotKind = new URLSearchParams(location.search).get('shot');
if (shotKind) {
  runShotScene(shotKind, new URLSearchParams(location.search), applyShotScene);
} else {
  loadSamplePhotos()
    .then(() => { spreadPhotosAcrossPanels(); renderStudio(); })
    .catch(() => renderStudio());
}
