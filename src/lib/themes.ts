export type AppTheme = 'remnus' | 'dracula' | 'tokyo-night' | 'nord' | 'catppuccin';

export const APP_THEMES: {
  value: AppTheme;
  label: string;
  dark: boolean;
  swatches: [string, string, string];
}[] = [
  { value: 'remnus',      label: 'Remnus',      dark: true,  swatches: ['#1d1f23', '#282c34', '#445c95'] },
  { value: 'dracula',     label: 'Dracula',     dark: true,  swatches: ['#282a36', '#21222c', '#bd93f9'] },
  { value: 'tokyo-night', label: 'Tokyo Night', dark: true,  swatches: ['#1a1b26', '#16161e', '#7aa2f7'] },
  { value: 'nord',        label: 'Nord',        dark: true,  swatches: ['#2e3440', '#3b4252', '#88c0d0'] },
  { value: 'catppuccin',  label: 'Catppuccin',  dark: false, swatches: ['#ffffff', '#f7f8fa', '#2563eb'] },
];
