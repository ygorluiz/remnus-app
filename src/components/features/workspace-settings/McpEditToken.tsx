'use client';
import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Save, AlertCircle, X } from 'lucide-react';
import AIMark from '@/components/marketing/AIMark';
import { updateAgentToken } from '@/lib/actions/agentToken';
import { AGENT_OPTIONS, type AgentId, type AgentToken } from './types';

interface Props {
  token: AgentToken;
  onSaved: () => void;
  onDismiss: () => void;
}

export default function McpEditToken({ token, onSaved, onDismiss }: Props) {
  const t = useTranslations('WorkspaceSettings');

  const [name, setName] = useState(token.name);
  const [scope, setScope] = useState<'read' | 'write'>(token.scope);
  const [agent, setAgent] = useState<AgentId | null>(
    (AGENT_OPTIONS.find(a => a.id === token.agentName)?.id ?? null) as AgentId | null,
  );
  // undefined = keep current expiry; null = no expiry; number = set new
  const [expiresIn, setExpiresIn] = useState<number | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [isSaving, startSaveTransition] = useTransition();

  const currentExpiryLabel = (() => {
    if (!token.expiresAt) return t('tokenExpiryForever');
    const msLeft = new Date(token.expiresAt).getTime() - Date.now();
    if (msLeft <= 0) return t('tokenExpired');
    return t('tokenExpiresInDays', { days: Math.ceil(msLeft / (1000 * 60 * 60 * 24)) });
  })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setError('');
    startSaveTransition(async () => {
      try {
        await updateAgentToken(token.id, {
          name: trimmed,
          scope,
          agentName: agent,
          expiresInDays: expiresIn,
        });
        onSaved();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save');
      }
    });
  };

  return (
    <div className="border border-neutral-800 rounded-xl bg-neutral-900/30 overflow-hidden">
      <div className="flex items-start justify-between px-5 pt-5 pb-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-100">{t('mcpEditTitle')}</h3>
          <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">{t('mcpEditHint')}</p>
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 p-1 text-neutral-600 hover:text-neutral-400 transition-colors rounded ml-4 mt-0.5"
        >
          <X size={14} />
        </button>
      </div>

      <div className="h-px bg-neutral-800 mx-5" />

      <form onSubmit={handleSubmit} className="px-5 py-5 space-y-5">

        {/* ── Name ── */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">
            {t('mcpCreateNameLabel')}
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={isSaving}
            autoFocus
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-600 px-3 py-2.5 text-sm outline-none focus:border-blue-500/60 transition-colors disabled:opacity-50 font-medium tracking-wide"
          />
        </div>

        {/* ── Scope ── */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">
            {t('mcpCreateScopeLabel')}
          </label>
          <div className="flex gap-2">
            {(['read', 'write'] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setScope(s)}
                disabled={isSaving}
                className={`flex-1 px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
                  scope === s
                    ? s === 'write'
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                      : 'bg-blue-500/10 border-blue-500/40 text-blue-300'
                    : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-600'
                }`}
              >
                {s === 'read' ? t('tokenScopeRead') : t('tokenScopeWrite')}
              </button>
            ))}
          </div>
        </div>

        {/* ── Agent ── */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">
            {t('mcpCreateAgentLabel')}
          </label>
          <div className="flex gap-1.5 flex-wrap">
            {AGENT_OPTIONS.map(({ id, label, aiMarkName }) => (
              <button
                key={id}
                type="button"
                onClick={() => setAgent(agent === id ? null : id)}
                disabled={isSaving}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[11px] font-semibold transition-all ${
                  agent === id
                    ? 'bg-blue-500/15 border-blue-500/40 text-blue-300 shadow-[0_0_8px_rgba(68,92,149,0.2)]'
                    : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-600'
                }`}
              >
                <AIMark name={aiMarkName} size={12} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Expiry ── */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">
            {t('tokenExpiryLabel')}
          </label>
          <div className="flex gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setExpiresIn(undefined)}
              disabled={isSaving}
              className={`px-2.5 py-1.5 rounded-md border text-[11px] font-semibold transition-colors ${
                expiresIn === undefined
                  ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                  : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-600'
              }`}
            >
              {t('mcpEditExpiryKeep')} <span className="opacity-60">({currentExpiryLabel})</span>
            </button>
            {([
              { days: 30,   label: t('tokenExpiry30d') },
              { days: 60,   label: t('tokenExpiry60d') },
              { days: 90,   label: t('tokenExpiry90d') },
              { days: null, label: t('tokenExpiryForever') },
            ] as const).map(({ days, label }) => (
              <button
                key={String(days)}
                type="button"
                onClick={() => setExpiresIn(days as number | null)}
                disabled={isSaving}
                className={`px-2.5 py-1.5 rounded-md border text-[11px] font-semibold transition-colors ${
                  expiresIn === days
                    ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                    : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle size={12} /> {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSaving || !name.trim()}
          className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 rounded-lg transition-colors"
        >
          <Save size={14} />
          {isSaving ? t('saving') : t('mcpEditCTA')}
        </button>
      </form>
    </div>
  );
}
