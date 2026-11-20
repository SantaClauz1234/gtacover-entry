// Bayshore Heat — Cover Studio editor, stage A: state, photo loading and the
// basic wiring. The studio state is plain data (title, subtitle, per-panel
// crops); photos live beside it as image elements in tray order and are read
// from the maker's own machine with object URLs — never uploaded anywhere.

import { POSTER_SIZES, STARTER_PANELS, drawCoverArt, exportCoverPng, freshPanelState } from './cover.js';
import { runShotScene } from './shots.js';

const canvas = document.getElementById('cover-canvas');
const statusLine = document.getElementById('status-line');

const state = {
  title: 'Bayshore Heat',
  subtitle: 'welcome to coral bay',
  billing: '',
  layoutId: 'hero',
  gradeId: 'sunset',
  finish: 'photo',
  sizeId: '1080x1350',
  lettering: 'sunset',
  stars: 5,
  popOut: false,
  showSeal: false,
  showBilling: false,
  grain: 0,
  vignette: 0,
  halftoneBand: false,
  stickers: { ribbon: false, palmBadge: false, heatTag: false },
  panels: STARTER_PANELS.map((_, index) => freshPanelState(index)),
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

/** Repaints the preview canvas at the currently selected post size. */
function renderStudio() {
  const size = currentSize();
  if (canvas.width !== size.width || canvas.height !== size.height) {
    canvas.width = size.width;
    canvas.height = size.height;
  }
  drawCoverArt(canvas, state, photos);
}

/** Sends each photo to its own panel in order, hero panel first. */
function spreadPhotosAcrossPanels() {
  if (photos.length === 0) return;
  state.panels.forEach((panel, index) => {
    panel.photoIndex = index % photos.length;
  });
}

/** Rebuilds the tray thumbnails; clicking one sends it to the first panel. */
function refreshPhotoTray() {
  const tray = document.getElementById('photo-tray');
  tray.replaceChildren();
  photos.forEach((img, index) => {
    const thumb = document.createElement('img');
    thumb.src = img.src;
    thumb.className = 'thumb';
    thumb.alt = photoNames[index] ?? `Photo ${index + 1}`;
    thumb.addEventListener('click', () => {
      state.panels[0].photoIndex = index;
      renderStudio();
    });
    tray.appendChild(thumb);
  });
}

/** Adds user files to the tray, then spreads them across the panels. */
async function addPhotosFromFiles(files) {
  const images = [...files].filter((file) => file.type.startsWith('image/'));
  for (const file of images) {
    photos.push(await loadPhotoFromUrl(URL.createObjectURL(file)));
    photoNames.push(file.name.replace(/\.[^.]+$/, ''));
  }
  if (images.length === 0) return;
  refreshPhotoTray();
  spreadPhotosAcrossPanels();
  renderStudio();
  say(`${photos.length} photo(s) in the tray — photos stayed on your computer.`);
}

/** Loads the two sample photos shipped inside app/ (free to use, made for the kit). */
async function loadSamplePhotos() {
  if (photos.length > 0) return;
  photos.push(await loadPhotoFromUrl('samples/boulevard.jpg'));
  photos.push(await loadPhotoFromUrl('samples/pier.jpg'));
  photoNames.push('Sample — boulevard', 'Sample — pier');
  refreshPhotoTray();
}

/** Stage-A wiring: upload, samples, caption text, post size and single export. */
function wireBasicControls() {
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
  });
  document.getElementById('title-input').addEventListener('input', (event) => {
    state.title = event.target.value;
    renderStudio();
  });
  document.getElementById('subtitle-input').addEventListener('input', (event) => {
    state.subtitle = event.target.value;
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

/** Applies a screenshot scene: samples in, caption and size set, then paint. */
async function applyShotScene(scene) {
  await loadSamplePhotos();
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
  spreadPhotosAcrossPanels();
  renderStudio();
}

wireBasicControls();

const shotKind = new URLSearchParams(location.search).get('shot');
if (shotKind) {
  runShotScene(shotKind, new URLSearchParams(location.search), applyShotScene);
} else {
  loadSamplePhotos()
    .then(() => { spreadPhotosAcrossPanels(); renderStudio(); })
    .catch(() => renderStudio());
}
