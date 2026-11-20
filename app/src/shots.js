// Screenshot scenes for the maker's own captures, driven by the ?shot= query
// that shots.json names. ?shot=cover hides the whole studio so the frame IS the
// exported cover, drawn by the app's own renderer at the requested post size;
// ?shot=editor keeps the full studio with sample photos loaded. The ready flag
// is raised after two animation frames so a headless browser captures a
// painted frame, never a half-drawn one.

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
