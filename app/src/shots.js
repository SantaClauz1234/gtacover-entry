// Screenshot scenes for the maker's own captures, written fresh in the
// recorded-v2 session and driven by the ?shot= query that shots.json names.
//
// ?shot=cover hides the whole studio so the frame IS the exported cover,
// drawn by the app's own renderer at the requested post size; ?shot=editor
// keeps the full studio with sample photos loaded. The scene hands the editor
// a plain description — size, layout, grade, title, subtitle, coverline — and
// the editor applies it and paints. The ready flag is raised after two
// animation frames so a headless browser captures a painted frame, never a
// half-drawn one.

export async function runShotScene(shot, query, applyScene) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const scene = {
    size: query.get('size') || undefined,
    layout: query.get('layout') || undefined,
    grade: query.get('grade') || undefined,
    title: query.get('title') || undefined,
    subtitle: query.get('subtitle') || undefined,
    coverline: query.get('coverline') || undefined,
  };
  await applyScene(scene);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.__shotReady = true;
    });
  });
}
