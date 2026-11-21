// Bayshore Heat — Cover Studio editor, written fresh in the recorded-v2 session.
//
// This file owns the studio state — photos, per-panel crops, caption,
// coverline, layout, grade, dressing — and connects every control on the page
// to the renderer in cover.js. Photos are read from the maker's own machine
// with object URLs and are never uploaded; the whole studio works offline
// from its own files. Headline presets the maker saves live in localStorage
// (see presets.js); nothing about them ever leaves the machine.

import { drawCoverArt, exportCoverPng } from './cover.js';
import {
  PANEL_LAYOUTS, POSTER_SIZES, ROLE_TAG_PRESETS, freshPanelState,
  layoutById, panelAtPoint, sizeById,
} from './layouts.js';
import { VICE_GRADES } from './grades.js';
import {
  CAPTION_TEMPLATES, HEADLINE_PRESETS, POSTER_FORMULAS,
  headlineFields, headlinePresetFromState,
  loadSavedHeadlinePresets, saveHeadlinePresets,
} from './presets.js';
import { runShotScene } from './shots.js';

const canvas = document.getElementById('cover-canvas');
const statusLine = document.getElementById('status-line');

const state = {
  title: 'Bayshore Heat',
  subtitle: 'welcome to coral bay',
  billing: 'Bayshore Heat Pictures presents a Coral Bay story starring you and yours — music by the tide, directed by the golden hour',
  coverline: 'ONE LAST SUMMER IN CORAL BAY',
  coverlineOn: false,
  coverlineStyle: 'band',
  layoutId: 'hero',
  gradeId: 'sunset',
  finish: 'photo',
  sizeId: '1080x1350',
  lettering: 'chrome',
  stars: 5,
  popOut: true,
  showSeal: true,
  showBilling: true,
  grain: 0.35,
  vignette: 0.45,
  halftoneBand: false,
  stickers: { ribbon: true, palmBadge: false, heatTag: true },
  panels: [],
  selectedPanel: 0,
};

const photos = []; // image elements, in tray order
const photoNames = []; // matching display names for the panel photo picker
let savedHeadlines = loadSavedHeadlinePresets();

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
  return sizeById(state.sizeId);
}

function currentLayout() {
  return layoutById(state.layoutId);
}

// Keeps the per-panel settings list exactly as long as the active layout.
function ensurePanelStates() {
  const count = currentLayout().panels.length;
  while (state.panels.length < count) state.panels.push(freshPanelState(state.panels.length));
  state.panels.length = count;
  if (state.selectedPanel >= count) state.selectedPanel = 0;
}

// Repaints the cover, then refreshes the inspector, pickers and history.
function renderStudio() {
  ensurePanelStates();
  const size = currentSize();
  if (canvas.width !== size.width || canvas.height !== size.height) {
    canvas.width = size.width;
    canvas.height = size.height;
  }
  drawCoverArt(canvas, state, photos);
  syncPanelInspector();
  markActiveButtons();
  trackHistory();
}

// --- Undo / redo -----------------------------------------------------------
// Studio state is plain JSON (photos live outside it, in the tray), so a
// snapshot is one stringify. A render whose state differs from the last
// snapshot pushes the previous snapshot onto the undo stack; restoring sets a
// flag so the restore itself is not recorded as a fresh edit.

const undoStack = [];
const redoStack = [];
let lastSnapshot = '';
let restoringSnapshot = false;

function stateSnapshot() {
  return JSON.stringify(state);
}

function trackHistory() {
  const snapshot = stateSnapshot();
  if (!lastSnapshot) {
    lastSnapshot = snapshot;
    return;
  }
  if (snapshot !== lastSnapshot && !restoringSnapshot) {
    undoStack.push(lastSnapshot);
    if (undoStack.length > 50) undoStack.shift();
    redoStack.length = 0;
    lastSnapshot = snapshot;
  }
  document.getElementById('undo-button').disabled = undoStack.length === 0;
  document.getElementById('redo-button').disabled = redoStack.length === 0;
}

function restoreSnapshot(snapshot) {
  restoringSnapshot = true;
  const data = JSON.parse(snapshot);
  state.panels = [];
  Object.assign(state, data);
  lastSnapshot = snapshot;
  buildPanelChips();
  syncAllControlsFromState();
  renderStudio();
  restoringSnapshot = false;
  document.getElementById('undo-button').disabled = undoStack.length === 0;
  document.getElementById('redo-button').disabled = redoStack.length === 0;
}

function undoLastEdit() {
  if (undoStack.length === 0) return;
  redoStack.push(stateSnapshot());
  restoreSnapshot(undoStack.pop());
  say('Undone — the cover is back one step.');
}

function redoLastEdit() {
  if (redoStack.length === 0) return;
  undoStack.push(stateSnapshot());
  restoreSnapshot(redoStack.pop());
  say('Redone.');
}

// Pushes every state field back into its control, after undo or a formula.
function syncAllControlsFromState() {
  document.getElementById('title-input').value = state.title;
  document.getElementById('subtitle-input').value = state.subtitle;
  document.getElementById('billing-input').value = state.billing;
  document.getElementById('coverline-input').value = state.coverline;
  document.getElementById('coverline-toggle').checked = state.coverlineOn;
  document.getElementById('coverline-style-select').value = state.coverlineStyle;
  document.getElementById('lettering-select').value = state.lettering;
  document.getElementById('stars-range').value = String(state.stars);
  document.getElementById('finish-select').value = state.finish;
  document.getElementById('size-select').value = state.sizeId;
  document.getElementById('popout-toggle').checked = state.popOut;
  document.getElementById('seal-toggle').checked = state.showSeal;
  document.getElementById('billing-toggle').checked = state.showBilling;
  document.getElementById('halftone-toggle').checked = state.halftoneBand;
  document.getElementById('ribbon-toggle').checked = state.stickers.ribbon;
  document.getElementById('palm-badge-toggle').checked = state.stickers.palmBadge;
  document.getElementById('heat-tag-toggle').checked = state.stickers.heatTag;
  document.getElementById('grain-range').value = String(state.grain);
  document.getElementById('vignette-range').value = String(state.vignette);
}

// Applies a one-click poster formula: layout, grade, finish, lettering — and,
// for the Coverline Strip formula, the coverline itself — all at once.
function applyPosterFormula(formula) {
  Object.assign(state, formula.recipe);
  state.selectedPanel = 0;
  ensurePanelStates();
  buildPanelChips();
  syncAllControlsFromState();
  renderStudio();
  say(`Poster formula applied: ${formula.name}. Swap in your photos and export.`);
}

// Applies a headline preset: title, subtitle, coverline, layout and grade
// from one saved headline, photos untouched.
function applyHeadlinePreset(preset) {
  Object.assign(state, headlineFields(preset));
  state.selectedPanel = 0;
  ensurePanelStates();
  buildPanelChips();
  syncAllControlsFromState();
  renderStudio();
  say(`Headline preset applied: ${preset.name}.`);
}

// Rebuilds the headline-preset list: the four built-ins, then the maker's
// saved ones, each with a delete button. Saving under an existing name
// replaces that preset instead of duplicating it.
function buildHeadlinePresets() {
  const list = document.getElementById('headline-presets');
  list.replaceChildren();
  const renderOne = (preset, saved) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = preset.name;
    button.title = `${preset.title} — ${preset.subtitle}`;
    button.addEventListener('click', () => applyHeadlinePreset(preset));
    list.appendChild(button);
    if (saved) {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '✕';
      remove.title = `Delete saved headline “${preset.name}”`;
      remove.className = 'mini-delete';
      remove.addEventListener('click', () => {
        savedHeadlines = savedHeadlines.filter((p) => p.name !== preset.name);
        saveHeadlinePresets(savedHeadlines);
        buildHeadlinePresets();
        say(`Deleted saved headline “${preset.name}”.`);
      });
      list.appendChild(remove);
    }
  };
  for (const preset of HEADLINE_PRESETS) renderOne(preset, false);
  for (const preset of savedHeadlines) renderOne(preset, true);
}

function saveCurrentHeadline() {
  const nameInput = document.getElementById('headline-preset-name');
  const name = (nameInput.value || '').trim() || `My headline ${savedHeadlines.length + 1}`;
  const preset = headlinePresetFromState(name, state);
  savedHeadlines = savedHeadlines.filter((p) => p.name !== name);
  savedHeadlines.push(preset);
  if (saveHeadlinePresets(savedHeadlines)) {
    nameInput.value = '';
    buildHeadlinePresets();
    say(`Headline saved as “${name}” — one click brings it back on any photos.`);
  } else {
    say('Could not save the headline in this browser.');
  }
}

// Builds the poster-formula buttons and the caption-template chips.
function buildPresetControls() {
  const list = document.getElementById('formula-list');
  for (const formula of POSTER_FORMULAS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = formula.name;
    button.addEventListener('click', () => applyPosterFormula(formula));
    list.appendChild(button);
  }
  const templates = document.getElementById('caption-templates');
  for (const template of CAPTION_TEMPLATES) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.textContent = template.title;
    chip.title = `${template.title} — ${template.subtitle}`;
    chip.addEventListener('click', () => {
      state.title = template.title;
      state.subtitle = template.subtitle;
      document.getElementById('title-input').value = template.title;
      document.getElementById('subtitle-input').value = template.subtitle;
      renderStudio();
      say(`Caption: ${template.title} — ${template.subtitle}.`);
    });
    templates.appendChild(chip);
  }
  buildHeadlinePresets();
}

// Adds user files to the tray; a still-empty poster is spread automatically.
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

// Loads the two sample photos shipped inside app/ (free to use, made for the kit).
async function loadSamplePhotos() {
  if (photos.length > 0) return;
  photos.push(await loadPhotoFromUrl('samples/boulevard.jpg'));
  photos.push(await loadPhotoFromUrl('samples/pier.jpg'));
  photoNames.push('Sample — boulevard', 'Sample — pier');
  refreshPhotoTray();
}

// Rebuilds the tray thumbnails; a click sends that photo to the selected panel.
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
      state.panels[state.selectedPanel].photoIndex = index;
      renderStudio();
      say(`Panel ${state.selectedPanel + 1} now shows ${photoNames[index]}.`);
    });
    tray.appendChild(thumb);
  });
  refreshPanelPhotoOptions();
}

// Rebuilds the inspector's photo picker: scenery backdrop plus every photo.
function refreshPanelPhotoOptions() {
  const select = document.getElementById('panel-photo-select');
  select.replaceChildren();
  const scenery = document.createElement('option');
  scenery.value = '-1';
  scenery.textContent = 'Scenery backdrop (painted)';
  select.appendChild(scenery);
  photos.forEach((img, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = photoNames[index] ?? `Photo ${index + 1}`;
    select.appendChild(option);
  });
}

// Spread: one photo per panel, round-robin, each with its own crop — the hero
// panel gets a portrait-anchored close crop, the rest alternate anchors and
// zooms, and the leading panels pick up cast role tags so the poster reads
// like a cast collage from the first click.
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

// Fill all: every panel shows the same photo, each cropped differently.
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

// Mirrors the selected panel's settings into the inspector controls.
function syncPanelInspector() {
  const panel = state.panels[state.selectedPanel];
  if (!panel) return;
  document.getElementById('panel-photo-select').value = String(panel.photoIndex);
  document.getElementById('panel-zoom').value = String(panel.zoom);
  document.getElementById('panel-pan-x').value = String(panel.offsetX);
  document.getElementById('panel-pan-y').value = String(panel.offsetY);
  document.getElementById('panel-anchor').value = panel.anchor;
  document.getElementById('panel-tag').value = panel.roleTag;
  document.querySelectorAll('#panel-chips button').forEach((chip, index) => {
    chip.classList.toggle('active', index === state.selectedPanel);
  });
}

// Highlights the active layout and grade choices across the studio.
function markActiveButtons() {
  document.querySelectorAll('#layout-grid button').forEach((button) => {
    button.classList.toggle('active', button.dataset.layout === state.layoutId);
  });
  document.querySelectorAll('#grade-grid button').forEach((button) => {
    button.classList.toggle('active', button.dataset.grade === state.gradeId);
  });
}

// Builds the layout picker, grade swatches, panel chips and role-tag presets.
function buildStudioControls() {
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
    button.style.borderLeftColor = grade.bottom;
    button.addEventListener('click', () => {
      state.gradeId = grade.id;
      renderStudio();
      say(`Grade: ${grade.name}.`);
    });
    gradeGrid.appendChild(button);
  }
  const tagPresets = document.getElementById('tag-presets');
  for (const tag of ROLE_TAG_PRESETS.slice(0, 6)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = tag;
    button.addEventListener('click', () => {
      state.panels[state.selectedPanel].roleTag = tag;
      renderStudio();
    });
    tagPresets.appendChild(button);
  }
  buildPanelChips();
}

// Rebuilds the panel selector chips for the active layout, hero starred.
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

// Drag-to-pan and scroll-to-zoom directly on the cover, click-to-select.
function wireCanvasGestures() {
  let drag = null;
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const index = panelAtPoint(currentLayout(), x, y);
    if (index === -1) return;
    state.selectedPanel = index;
    drag = { lastX: event.clientX, lastY: event.clientY };
    canvas.setPointerCapture(event.pointerId);
    renderStudio();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const rect = canvas.getBoundingClientRect();
    const panel = state.panels[state.selectedPanel];
    panel.offsetX += (event.clientX - drag.lastX) / rect.width;
    panel.offsetY += (event.clientY - drag.lastY) / rect.height;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    renderStudio();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const panel = state.panels[state.selectedPanel];
    panel.zoom = Math.min(3, Math.max(1, panel.zoom * (event.deltaY < 0 ? 1.06 : 0.94)));
    renderStudio();
  }, { passive: false });
}

// Connects every form control on the page to the state it edits.
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
    fillAllPanelsFromOnePhoto(panel.photoIndex >= 0 ? panel.photoIndex : 0);
    renderStudio();
    say('Every panel now shows one photo, cropped differently per panel.');
  });
  document.getElementById('spread-photos').addEventListener('click', () => {
    spreadPhotosAcrossPanels();
    renderStudio();
    say('Photos spread across the panels, one cast member per panel.');
  });
  const textInputs = [
    ['title-input', (value) => { state.title = value; }],
    ['subtitle-input', (value) => { state.subtitle = value; }],
    ['billing-input', (value) => { state.billing = value; }],
    ['coverline-input', (value) => { state.coverline = value; }],
  ];
  for (const [id, apply] of textInputs) {
    document.getElementById(id).addEventListener('input', (event) => {
      apply(event.target.value);
      renderStudio();
    });
  }
  document.getElementById('coverline-toggle').addEventListener('change', (event) => {
    state.coverlineOn = event.target.checked;
    renderStudio();
    say(state.coverlineOn ? 'Coverline on — a headline band across the lower third.' : 'Coverline off.');
  });
  document.getElementById('coverline-style-select').addEventListener('change', (event) => {
    state.coverlineStyle = event.target.value;
    renderStudio();
  });
  document.getElementById('save-headline-preset').addEventListener('click', saveCurrentHeadline);
  document.getElementById('headline-preset-name').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveCurrentHeadline();
    }
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
  document.getElementById('panel-photo-select').addEventListener('change', (event) => {
    state.panels[state.selectedPanel].photoIndex = Number(event.target.value);
    renderStudio();
  });
  document.getElementById('panel-zoom').addEventListener('input', (event) => {
    state.panels[state.selectedPanel].zoom = Number(event.target.value);
    renderStudio();
  });
  document.getElementById('panel-pan-x').addEventListener('input', (event) => {
    state.panels[state.selectedPanel].offsetX = Number(event.target.value);
    renderStudio();
  });
  document.getElementById('panel-pan-y').addEventListener('input', (event) => {
    state.panels[state.selectedPanel].offsetY = Number(event.target.value);
    renderStudio();
  });
  document.getElementById('panel-anchor').addEventListener('change', (event) => {
    state.panels[state.selectedPanel].anchor = event.target.value;
    renderStudio();
  });
  document.getElementById('panel-tag').addEventListener('input', (event) => {
    state.panels[state.selectedPanel].roleTag = event.target.value;
    renderStudio();
  });
  document.getElementById('panel-auto-center').addEventListener('click', () => {
    const panel = state.panels[state.selectedPanel];
    panel.offsetX = 0;
    panel.offsetY = 0;
    panel.zoom = 1;
    renderStudio();
  });
  document.getElementById('panel-scenery-next').addEventListener('click', () => {
    const panel = state.panels[state.selectedPanel];
    panel.photoIndex = -1;
    panel.scenery = (panel.scenery + 1) % 4;
    renderStudio();
    say('Panel now shows a painted scenery backdrop.');
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
  document.getElementById('undo-button').addEventListener('click', undoLastEdit);
  document.getElementById('redo-button').addEventListener('click', redoLastEdit);
  document.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    const key = event.key.toLowerCase();
    if (key === 'z' && !event.shiftKey) {
      event.preventDefault();
      undoLastEdit();
    } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
      event.preventDefault();
      redoLastEdit();
    }
  });
  document.getElementById('size-select').addEventListener('change', (event) => {
    state.sizeId = event.target.value;
    renderStudio();
  });
  document.getElementById('export-png').addEventListener('click', () => {
    exportCoverPng(state, photos, currentSize(), (name) => say(`Saved ${name} — ready to post.`));
  });
  const exportAll = () => {
    POSTER_SIZES.forEach((size, index) => {
      setTimeout(() => exportCoverPng(state, photos, size, (name) => say(`Saved ${name}.`)), index * 350);
    });
  };
  document.getElementById('export-all').addEventListener('click', exportAll);
  document.getElementById('export-all-top').addEventListener('click', exportAll);
}

// Applies a screenshot scene: samples in, layout/grade/caption/size set, paint.
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
  if (scene.coverline) {
    state.coverline = scene.coverline;
    state.coverlineOn = true;
    document.getElementById('coverline-input').value = scene.coverline;
    document.getElementById('coverline-toggle').checked = true;
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

buildStudioControls();
buildPresetControls();
wireStudioControls();
wireCanvasGestures();

const shotKind = new URLSearchParams(location.search).get('shot');
if (shotKind) {
  runShotScene(shotKind, new URLSearchParams(location.search), applyShotScene);
} else {
  loadSamplePhotos()
    .then(() => { spreadPhotosAcrossPanels(); renderStudio(); })
    .catch(() => renderStudio());
}
