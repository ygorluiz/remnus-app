'use client';
import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { X, User, Download, HardDrive, Crown, SlidersHorizontal } from 'lucide-react';
import ImportTab from './workspace-settings/ImportTab';
import { getCurrentUserStorageBytes } from '@/lib/actions/workspace';
import {
  setEditorFontSize, setSidebarDensity, setDefaultPageWidth,
  type EditorFontSize, type SidebarDensity, type DefaultPageWidth,
} from '@/lib/actions/preferences';
import { setLocale } from '@/lib/actions/locale';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ── Preference row ─────────────────────────────────────────────────────────────

function PrefRow<T extends string>({
  label, hint, options, value, onChange, wrap = false,
}: {
  label: string;
  hint?: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  wrap?: boolean;
}) {
  return (
    <div className={`py-4 border-b border-neutral-800 last:border-b-0 ${wrap ? '' : 'flex items-start justify-between gap-6'}`}>
      <div className={`min-w-0 ${wrap ? 'mb-3' : ''}`}>
        <p className="text-sm font-medium text-neutral-200">{label}</p>
        {hint && <p className="text-[11px] text-neutral-500 mt-0.5">{hint}</p>}
      </div>
      <div className={wrap ? 'flex flex-wrap gap-1.5' : 'flex gap-1 shrink-0'}>
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 text-xs font-medium border transition-colors cursor-pointer ${
              value === opt.value
                ? 'bg-neutral-700 border-neutral-600 text-neutral-100'
                : 'bg-transparent border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Locale names ───────────────────────────────────────────────────────────────

const LOCALE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'tr', label: 'Türkçe' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
  { value: 'hi', label: 'हिन्दी' },
] as const;

// ── Main component ─────────────────────────────────────────────────────────────

interface CurrentUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
}

interface UserSettingsModalProps {
  currentUser: CurrentUser;
  onClose: () => void;
}

type Tab = 'account' | 'preferences' | 'import';

export default function UserSettingsModal({ currentUser, onClose }: UserSettingsModalProps) {
  const t = useTranslations('UserSettings');
  const router = useRouter();
  const currentLocale = useLocale();

  const [activeTab, setActiveTab] = useState<Tab>('account');
  const [storageBytes, setStorageBytes] = useState<number | null>(null);
  const [avatarError, setAvatarError] = useState(false);

  // Preference states — read from cookie-derived data attributes on <html>
  const [locale, setLocaleState] = useState(currentLocale);
  const [editorSize, setEditorSizeState] = useState<EditorFontSize>(() => {
    if (typeof document === 'undefined') return 'md';
    return (document.documentElement.dataset.editorSize as EditorFontSize) ?? 'md';
  });
  const [density, setDensityState] = useState<SidebarDensity>('comfortable');
  const [defaultWidth, setDefaultWidthState] = useState<DefaultPageWidth>(() => {
    if (typeof document === 'undefined') return 'narrow';
    return (document.documentElement.dataset.defaultWidth as DefaultPageWidth) ?? 'narrow';
  });

  useEffect(() => {
    getCurrentUserStorageBytes().then(setStorageBytes).catch(() => setStorageBytes(0));
  }, []);

  // Apply editor size immediately via data attribute + refresh for SSR components
  async function handleEditorSize(v: EditorFontSize) {
    setEditorSizeState(v);
    document.documentElement.dataset.editorSize = v;
    await setEditorFontSize(v);
  }

  async function handleDensity(v: SidebarDensity) {
    setDensityState(v);
    await setSidebarDensity(v);
    router.refresh();
  }

  async function handleDefaultWidth(v: DefaultPageWidth) {
    setDefaultWidthState(v);
    document.documentElement.dataset.defaultWidth = v;
    await setDefaultPageWidth(v);
  }

  async function handleLocale(v: string) {
    setLocaleState(v);
    await setLocale(v);
    router.refresh();
  }

  const initials = (currentUser.name || currentUser.email || 'U').trim().charAt(0).toUpperCase();

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'account', label: t('tabAccount'), icon: <User size={13} /> },
    { id: 'preferences', label: t('tabPreferences'), icon: <SlidersHorizontal size={13} /> },
    { id: 'import', label: t('tabImport'), icon: <Download size={13} /> },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 md:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-full sm:max-w-2xl bg-neutral-850 border border-neutral-800 rounded-lg shadow-[0_0_50px_-12px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '88vh', minHeight: '480px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/30 shrink-0">
          <span className="text-sm font-semibold text-neutral-100 shrink-0">{t('title')}</span>
          <button
            onClick={onClose}
            className="p-1 text-neutral-500 hover:text-neutral-200 transition-colors rounded hover:bg-neutral-800 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body: left nav + content */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Left nav */}
          <div className="w-44 shrink-0 border-r border-neutral-800 flex flex-col bg-neutral-900/50">
            <nav className="flex-1 p-2 space-y-0.5 pt-3">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors cursor-pointer rounded ${
                    activeTab === tab.id
                      ? 'bg-neutral-800 text-neutral-100 font-medium'
                      : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/60'
                  }`}
                >
                  {tab.icon}
                  <span className="truncate">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab content */}
          <div key={activeTab} className="flex-1 overflow-y-auto p-6 animate-tab-fade">

          {/* Account */}
          {activeTab === 'account' && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="shrink-0">
                    {currentUser.image && !avatarError ? (
                      <img
                        src={currentUser.image}
                        alt={currentUser.name ?? 'User'}
                        className="w-14 h-14 rounded-full object-cover"
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-neutral-700 flex items-center justify-center text-xl font-semibold text-neutral-200">
                        {initials}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-100 truncate">
                      {currentUser.name ?? currentUser.email ?? 'User'}
                    </p>
                    {currentUser.name && currentUser.email && (
                      <p className="text-xs text-neutral-500 truncate mt-0.5">{currentUser.email}</p>
                    )}
                  </div>
                </div>

                <div className="border-t border-neutral-800" />

                <div className="border-t border-neutral-800 pt-5 space-y-4">
                  <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">{t('planTitle')}</p>
                  <div className="flex items-center justify-between py-3 border-b border-neutral-800">
                    <div className="flex items-center gap-2.5">
                      <Crown size={14} className="text-amber-400 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-neutral-200">{t('planFree')}</p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">{t('planFreeHint')}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-neutral-800 text-neutral-500 border border-neutral-700 shrink-0">
                      {t('planCurrentBadge')}
                    </span>
                  </div>

                  <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider pt-1">{t('storageTitle')}</p>
                  <div className="flex items-center gap-3 py-3 border-b border-neutral-800">
                    <HardDrive size={14} className="text-neutral-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-neutral-300">
                        {storageBytes === null
                          ? t('storageLoading')
                          : t('storageUsed', { size: formatBytes(storageBytes) })}
                      </p>
                      <p className="text-[11px] text-neutral-600 mt-0.5">{t('storageHint')}</p>
                    </div>
                  </div>
                </div>
          </div>
          )}

          {/* Preferences */}
          {activeTab === 'preferences' && (
            <div>
              <PrefRow
                label={t('prefLanguage')}
                hint={t('prefLanguageHint')}
                options={LOCALE_OPTIONS.map(l => ({ value: l.value, label: l.label }))}
                value={locale}
                onChange={handleLocale}
                wrap
              />
              <PrefRow
                label={t('prefEditorSize')}
                hint={t('prefEditorSizeHint')}
                options={[
                  { value: 'sm', label: t('prefSizeSmall') },
                  { value: 'md', label: t('prefSizeMedium') },
                  { value: 'lg', label: t('prefSizeLarge') },
                ]}
                value={editorSize}
                onChange={handleEditorSize}
              />
              <PrefRow
                label={t('prefSidebarDensity')}
                hint={t('prefSidebarDensityHint')}
                options={[
                  { value: 'compact', label: t('prefDensityCompact') },
                  { value: 'comfortable', label: t('prefDensityComfortable') },
                ]}
                value={density}
                onChange={handleDensity}
              />
              <PrefRow
                label={t('prefDefaultWidth')}
                hint={t('prefDefaultWidthHint')}
                options={[
                  { value: 'narrow', label: t('prefWidthNarrow') },
                  { value: 'wide', label: t('prefWidthWide') },
                  { value: 'full', label: t('prefWidthFull') },
                ]}
                value={defaultWidth}
                onChange={handleDefaultWidth}
              />
            </div>
          )}

          {/* Import */}
          {activeTab === 'import' && (
            <ImportTab workspaceId="" />
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
