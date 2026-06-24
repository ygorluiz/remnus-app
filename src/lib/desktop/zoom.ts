// Desktop (Tauri) zoom helpers. Plain module — the `window`/`localStorage`
// access lives inside the functions, so it is import-safe from any context
// (only executed on the client when the function is actually called).

export const ZOOM_KEY = 'remnus_desktop_zoom';
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 2.0;
export const ZOOM_STEP = 0.1;
export const ZOOM_DEFAULT = 1.0;

export function applyDesktopZoom(factor: number) {
  try { localStorage.setItem(ZOOM_KEY, String(factor)); } catch {}
  window.dispatchEvent(new Event('remnus-zoom-changed'));
}

export function initDesktopZoom() {
  // ZoomProvider handles initialization on mount — nothing to do here.
}

export function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function getSavedZoom(): number {
  try {
    const saved = localStorage.getItem(ZOOM_KEY);
    if (saved) {
      const f = parseFloat(saved);
      if (!isNaN(f) && f >= ZOOM_MIN && f <= ZOOM_MAX) return f;
    }
  } catch {}
  return ZOOM_DEFAULT;
}
