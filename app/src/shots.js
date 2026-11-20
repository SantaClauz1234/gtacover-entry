// Fixed scenes for the maker's screenshots, driven by the ?shot= query the shots.json
// file names. ?shot=cover hides the whole studio and shows only the exported art (the
// screenshot IS the cover the app exports, drawn by the app's own renderer at the
// requested post size); ?shot=editor shows the full studio with sample photos loaded
// and a styled cover in progress. window.__shotReady is set after two animation
// frames so a headless browser knows the scene has painted.

export async function runShotScene(shot, query, applyScene) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await applyScene({
    size: query.get('size'),
    layout: query.get('layout'),
    grade: query.get('grade'),
    title: query.get('title'),
    subtitle: query.get('subtitle'),
  });
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
