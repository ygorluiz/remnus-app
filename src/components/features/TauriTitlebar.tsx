'use client';
import { useEffect, useRef, useState } from 'react';

export default function TauriTitlebar() {
  const [isTauri, setIsTauri] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const lastClickTime = useRef(0);

  useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window || '__TAURI__' in window)) return;
    setIsTauri(true);

    let unlisten: (() => void) | undefined;
    import('@tauri-apps/api/window').then(async ({ getCurrentWindow }) => {
      const win = getCurrentWindow();
      setIsMaximized(await win.isMaximized());
      unlisten = await win.onResized(async () => {
        setIsMaximized(await win.isMaximized());
      });
    });
    return () => { unlisten?.(); };
  }, []);

  if (!isTauri) return null;

  async function startDrag() {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().startDragging();
  }

  async function minimize() {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().minimize();
  }

  async function toggleMaximize() {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const win = getCurrentWindow();
    await win.toggleMaximize();
    setIsMaximized(await win.isMaximized());
  }

  async function closeWindow() {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().hide();
  }

  return (
    <div className="shrink-0 h-10 flex items-center bg-neutral-900 border-b border-neutral-800 select-none">
      {/* Drag region — fills available space */}
      <div
        className="flex-1 h-full"
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          const now = Date.now();
          if (now - lastClickTime.current < 300) {
            toggleMaximize();
          } else {
            startDrag();
          }
          lastClickTime.current = now;
        }}
      />

      {/* Window controls */}
      <div className="flex items-center px-1 gap-0.5">
        <button
          onClick={minimize}
          className="w-7 h-5 flex items-center justify-center rounded text-neutral-600 hover:text-neutral-300 hover:bg-neutral-800/60 transition-colors cursor-default"
          tabIndex={-1}
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
            <rect width="10" height="1" />
          </svg>
        </button>

        <button
          onClick={toggleMaximize}
          className="w-7 h-5 flex items-center justify-center rounded text-neutral-600 hover:text-neutral-300 hover:bg-neutral-800/60 transition-colors cursor-default"
          tabIndex={-1}
        >
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="2.5" y="0" width="7.5" height="7.5" />
              <polyline points="0,2.5 0,10 7.5,10" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="0.5" y="0.5" width="9" height="9" />
            </svg>
          )}
        </button>

        <button
          onClick={closeWindow}
          className="w-7 h-5 flex items-center justify-center rounded text-neutral-600 hover:text-white hover:bg-red-500/80 transition-colors cursor-default"
          tabIndex={-1}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
            <line x1="0.5" y1="0.5" x2="9.5" y2="9.5" />
            <line x1="9.5" y1="0.5" x2="0.5" y2="9.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
