'use client';
import { useEffect, useState } from 'react';

/**
 * Detects whether the app is running inside the Tauri desktop shell.
 * SSR-safe: returns `false` on the first render, then resolves after mount.
 * Mirrors the detection used in `TauriTitlebar.tsx`.
 */
export function useIsTauri(): boolean {
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    if ('__TAURI_INTERNALS__' in window || '__TAURI__' in window) {
      setIsTauri(true);
    }
  }, []);

  return isTauri;
}
