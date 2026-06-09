'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface Workspace {
  id: string;
  name: string;
  icon: string | null;
}

interface Props {
  clientName: string;
  scope: 'read' | 'write';
  workspaces: Workspace[];
  userName: string;
  onApprove: (formData: FormData) => Promise<void>;
  onDeny: () => Promise<void>;
}

export function OAuthAuthorizeForm({ clientName, scope, workspaces, userName, onApprove, onDeny }: Props) {
  const t = useTranslations('OAuthAuthorize');

  // Default to the scope the client requested, but let the user choose (incl. upgrading to write).
  const [selectedScope, setSelectedScope] = useState<'read' | 'write'>(scope);

  const scopePermissions = selectedScope === 'write'
    ? [t('permReadWrite'), t('permCreateEdit')]
    : [t('permReadOnly')];

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 relative">
      <div className="absolute top-4 left-4">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Remnus</span>
        </Link>
      </div>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex flex-col items-center hover:opacity-80 transition-opacity">
            <img
              src="/logo-square-dark.png"
              alt="Remnus"
              className="w-14 h-14 object-contain rounded-xl mb-4 shadow-lg"
            />
            <h1 className="text-2xl font-bold text-white tracking-tight">Remnus</h1>
          </Link>
          <p className="text-neutral-400 text-sm mt-2 text-center px-2">
            {t('subtitle', { client: clientName })}
          </p>
          <p className="text-neutral-600 text-xs mt-1">{t('signedInAs', { user: userName })}</p>
        </div>

        {/* Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
          {/* Access level selector */}
          <div className="px-6 pt-5 pb-4 border-b border-neutral-800">
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2.5">{t('accessLevel')}</p>
            <div className="flex gap-2 mb-3">
              {(['read', 'write'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedScope(s)}
                  className={`flex-1 px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
                    selectedScope === s
                      ? s === 'write'
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                        : 'bg-blue-500/10 border-blue-500/40 text-blue-300'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-600'
                  }`}
                >
                  {s === 'read' ? t('scopeReadLabel') : t('scopeWriteLabel')}
                </button>
              ))}
            </div>
            <ul className="space-y-2">
              {scopePermissions.map((perm) => (
                <li key={perm} className="flex items-center gap-2.5 text-sm text-neutral-300">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#7fc36d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {perm}
                </li>
              ))}
            </ul>
          </div>

          {/* Workspace selector + Authorize */}
          <form action={onApprove} className="px-6 py-5">
            <input type="hidden" name="scope" value={selectedScope} />
            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-2 block">
              {t('selectWorkspace')}
            </label>
            <select
              name="workspace_id"
              required
              defaultValue={workspaces[0]?.id}
              className="w-full bg-neutral-800 border border-neutral-700 text-neutral-100 text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:border-blue-500 mb-4"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-medium text-sm py-2.5 rounded-lg transition-colors"
            >
              {t('authorize')}
            </button>
          </form>
        </div>

        {/* Deny + disclaimer */}
        <div className="mt-4 text-center">
          <form action={onDeny}>
            <button
              type="submit"
              className="text-neutral-500 hover:text-neutral-300 text-sm py-1.5 transition-colors"
            >
              {t('deny')}
            </button>
          </form>
          <p className="text-xs text-neutral-700 mt-3 px-4">{t('disclaimer')}</p>
        </div>
      </div>
    </div>
  );
}
