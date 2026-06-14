'use server';
import { cookies } from 'next/headers';
import type { AppTheme } from '@/lib/themes';

export type EditorFontSize = 'sm' | 'md' | 'lg';
export type SidebarDensity = 'compact' | 'comfortable';
export type DefaultPageWidth = 'narrow' | 'wide' | 'full';

const YEAR = 60 * 60 * 24 * 365;

export async function setEditorFontSize(size: EditorFontSize) {
  const store = await cookies();
  store.set('remnus_editor_font_size', size, { path: '/', maxAge: YEAR });
}

export async function setSidebarDensity(density: SidebarDensity) {
  const store = await cookies();
  store.set('remnus_sidebar_density', density, { path: '/', maxAge: YEAR });
}

export async function setDefaultPageWidth(width: DefaultPageWidth) {
  const store = await cookies();
  store.set('remnus_default_width', width, { path: '/', maxAge: YEAR });
}

export async function setTheme(theme: AppTheme) {
  const store = await cookies();
  store.set('remnus_theme', theme, { path: '/', maxAge: YEAR, sameSite: 'lax' });
}

export async function getPreferences(): Promise<{
  editorFontSize: EditorFontSize;
  sidebarDensity: SidebarDensity;
  defaultPageWidth: DefaultPageWidth;
}> {
  const store = await cookies();
  return {
    editorFontSize: (store.get('remnus_editor_font_size')?.value ?? 'md') as EditorFontSize,
    sidebarDensity: (store.get('remnus_sidebar_density')?.value ?? 'comfortable') as SidebarDensity,
    defaultPageWidth: (store.get('remnus_default_width')?.value ?? 'narrow') as DefaultPageWidth,
  };
}
