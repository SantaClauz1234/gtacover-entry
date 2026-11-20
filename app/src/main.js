// Bayshore Heat — Cover Studio: the editor wiring. This file owns the studio's state
// (photos, per-panel crops, caption, grade, layout) and connects every control on the
// page to the renderer in cover.js. Photos are read from the maker's own machine with
// object URLs and are never uploaded anywhere; the app works fully offline.

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
  popOut: true,
  showSeal: true,
  showBilling: true,
  grain: 0.35,
  vignette: 0.45,
  panels: [],
  selectedPanel: 0,
};

const photos = []; // HTMLImageElement list, in tray order
const photoNames = []; // matching display names for the panel photo picker

/** Loads an image from a URL (object URL or app-relative path) as a promise. */
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

/** Keeps the per-panel settings list the same length as the layout's panel list. */
function ensurePanelStates() {
  const count = currentLayout().panels.length;
  while (state.panels.length < count) state.panels.push(freshPanelState(state.panels.length));
  state.panels.length = count;
  if (state.selectedPanel >= count) state.selectedPanel = 0;
}

/** Re-renders the cover and refreshes every control that mirrors the state. */
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
}

/** Adds photos to the tray and, if the panels are still empty, spreads them out. */
async function addPhotosFromFiles(files) {
  const imageFiles = [...files].filter((file) => file.type.startsWith('image/'));
  if (imageFiles.length === 0) return;
  for (const file of imageFiles) {
    const img = await loadPhotoFromUrl(URL.createObjectURL(file));
    photos.push(img);
    photoNames.push(file.name.replace(/\.[^.]+$/, ''));
  }
  refreshPhotoTray();
  if (state.panels.every((panel) => panel.photoIndex === -1)) spreadPhotosAcrossPanels();
  renderStudio();
  say(`${photos.length} photo${photos.length === 1 ? '' : 's'} in the tray — panels filled, photos stayed on your computer.`);
}

/** Loads the two sample photos that ship with the app (made for make.fun, free to use). */
async function loadSamplePhotos() {
  if (photos.length > 0) return;
  const boulevard = await loadPhotoFromUrl('samples/boulevard.jpg');
  const pier = await loadPhotoFromUrl('samples/pier.jpg');
  photos.push(boulevard, pier);
  photoNames.push('Sample — boulevard', 'Sample — pier');
  refreshPhotoTray();
}

/** Rebuilds the photo tray thumbnails from the photo list. */
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

/** Rebuilds the "photo in this panel" picker: scenery backdrop plus every photo. */
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

/**
 * Spread: one photo per panel, round-robin, each with its own crop — the hero panel
 * gets a portrait-anchored close crop, the rest alternate anchors and zooms, and the
 * first panels pick up cast role tags so the poster reads like a cast collage.
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

/** Mirrors the selected panel's settings into the inspector controls. */
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

/** Highlights the active layout, grade and panel choices across the studio. */
function markActiveButtons() {
  document.querySelectorAll('#layout-grid button').forEach((button) => {
    button.classList.toggle('active', button.dataset.layout === state.layoutId);
  });
  document.querySelectorAll('#grade-grid button').forEach((button) => {
    button.classList.toggle('active', button.dataset.grade === state.gradeId);
  });
}

/** Builds the layout picker, grade swatches, panel chips and role-tag presets. */
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
    button.style.borderLeftColor = grade.washBottom;
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

/** Rebuilds the panel selector chips for the current layout. */
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

/** Point-in-polygon test for the slashed layout's panels. */
function pointInsidePolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Hit-tests a click on the cover and returns the topmost panel under it. */
function panelIndexAtPoint(x, y) {
  const layout = currentLayout();
  for (let index = layout.panels.length - 1; index >= 0; index -= 1) {
    const panel = layout.panels[index];
    if (panel.poly) {
      if (pointInsidePolygon(x, y, panel.poly)) return index;
    } else if (x >= panel.x && x <= panel.x + panel.w && y >= panel.y && y <= panel.y + panel.h) {
      return index;
    }
  }
  return -1;
}

/** Drag-to-pan and scroll-to-zoom directly on the cover, plus click-to-select. */
function wireCanvasGestures() {
  let drag = null;
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const index = panelIndexAtPoint(x, y);
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

/** Connects every form control on the page to the state it edits. */
function wireStudioControls() {
  const photoInput = document.getElementById('photo-input');
  photoInput.addEventListener('change', () => addPhotosFromFiles(photoInput.files ?? []));
  const dropZone = document.getElementById('drop-zone');
  dropZone.addEventListener('dragover', (event) => event.preventDefault());
  dropZone.addEventListener('drop', (event) => {
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
  document.getElementById('popout-toggle').addEventListener('change', (event) => {
    state.popOut = event.target.checked;
    renderStudio();
  });
  document.getElementById('seal-toggle').addEventListener('change', (event) => {
    state.showSeal = event.target.checked;
    renderStudio();
  });
  document.getElementById('billing-toggle').addEventListener('change', (event) => {
    state.showBilling = event.target.checked;
    renderStudio();
  });
  document.getElementById('size-select').addEventListener('change', (event) => {
    state.sizeId = event.target.value;
    renderStudio();
  });
  const doExport = () => {
    exportCoverPng(state, photos, currentSize(), (name) => say(`Saved ${name} — ready to post.`));
  };
  document.getElementById('export-png').addEventListener('click', doExport);
  const doExportAll = () => {
    POSTER_SIZES.forEach((size, index) => {
      setTimeout(() => exportCoverPng(state, photos, size, (name) => say(`Saved ${name}.`)), index * 350);
    });
  };
  document.getElementById('export-all').addEventListener('click', doExportAll);
  document.getElementById('export-all-top').addEventListener('click', doExportAll);
}

/** Applies a screenshot scene's parameters, then paints the studio. */
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

buildStudioControls();
wireStudioControls();
wireCanvasGestures();

const shotKind = new URLSearchParams(location.search).get('shot');
if (shotKind) {
  runShotScene(shotKind, new URLSearchParams(location.search), applyShotScene);
} else {
  loadSamplePhotos()
    .then(() => {
      spreadPhotosAcrossPanels();
      renderStudio();
    })
    .catch(() => renderStudio());
}
