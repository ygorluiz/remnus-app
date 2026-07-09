'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const ZOOM_KEY = 'remnus_desktop_zoom';

function readZoom(): number {
  try {
    const v = parseFloat(localStorage.getItem(ZOOM_KEY) || '');
    if (!isNaN(v) && v >= 0.5 && v <= 2.0) return v;
  } catch {}
  return 1;
}

const ZoomContext = createContext<number>(1);

/**
 * Returns the current desktop zoom factor (1 when no zoom or in web view).
 * Use this to adjust `getBoundingClientRect()` coordinates before applying
 * them to `position: fixed` elements — when a CSS transform is the fixed
 * containing block, viewport coords must be divided by the zoom factor.
 */
export function useZoom(): number {
  return useContext(ZoomContext);
}

export default function ZoomProvider({ children }: { children: React.ReactNode }) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setZoom(readZoom());
    // Clear any CSS zoom applied by Tauri initialization_script before React mounted
    document.documentElement.style.zoom = '';
    document.documentElement.style.width = '';
    document.documentElement.style.height = '';
    document.documentElement.style.overflow = '';

    const handler = () => setZoom(readZoom());
    window.addEventListener('remnus-zoom-changed', handler);
    return () => window.removeEventListener('remnus-zoom-changed', handler);
  }, []);

  // `zoom` starts at 1 and resolves to the stored value AFTER mount (effect).
  // The rendered tree shape must NOT change between those two renders — otherwise
  // the children move between DOM depths and React remounts the entire app, which
  // (racing the first navigation) crashed Next's client Router with "Rendered
  // more hooks than during the previous render" on Tauri's first open. So we
  // ALWAYS render the same outer+inner div structure; only the inner style and
  // the context value change. At zoom === 1 the inner div carries NO transform,
  // so it creates no containing block and `position: fixed` still resolves to the
  // viewport exactly as before.
  const inv = `${(100 / zoom).toFixed(4)}%`;
  const innerStyle: React.CSSProperties =
    zoom === 1
      ? { width: '100%', height: '100%', overflow: 'hidden' }
      : {
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
          width: inv,
          height: inv,
          overflow: 'hidden',
        };
  return (
    <ZoomContext.Provider value={zoom}>
      <div className="h-screen w-screen overflow-hidden">
        <div style={innerStyle}>{children}</div>
      </div>
    </ZoomContext.Provider>
  );
}
