'use client';
import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { RefreshCw, KeyRound, AlertCircle, X } from 'lucide-react';
import AIMark from '@/components/marketing/AIMark';
import { mintAgentToken } from '@/lib/actions/agentToken';
import { AGENT_OPTIONS, type AgentId } from './types';

const ADJECTIVES = [
  'swift', 'bright', 'calm', 'keen', 'bold', 'crisp', 'pure', 'warm',
  'jade', 'nova', 'sage', 'lunar', 'echo', 'arc', 'zen', 'flux', 'aura',
];
const NOUNS = [
  'agent', 'link', 'bridge', 'key', 'flow', 'sync', 'node', 'hub',
  'beam', 'core', 'gate', 'relay', 'spark', 'mesh', 'port',
];

function generateName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj}-${noun}`;
}

interface Props {
  workspaceId: string;
  onCreated: (token: string, name: string, agent: AgentId | null) => void;
  onDismiss: () => void;
}

export default function McpCreateToken({ workspaceId, onCreated, onDismiss }: Props) {
  const t = useTranslations('WorkspaceSettings');
  const [name, setName] = useState(() => generateName());
  const [scope, setScope] = useState<'read' | 'write'>('read');
  const [agent, setAgent] = useState<AgentId | null>(null);
  const [expiresIn, setExpiresIn] = useState<30 | 60 | 90 | null>(null);
  const [error, setError] = useState('');
  const [isMinting, startMintTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setError('');
    startMintTransition(async () => {
      try {
        const res = await mintAgentToken(workspaceId, trimmed, scope, agent ?? undefined, expiresIn);
        onCreated(res.token, trimmed, agent);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create token');
      }
    });
  };

  return (
    <div className="border border-neutral-800 rounded-xl bg-neutral-900/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-100">{t('mcpCreateTitle')}</h3>
          <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">{t('mcpCreateHint')}</p>
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
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={isMinting}
              autoFocus
              className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-600 px-3 py-2.5 text-sm outline-none focus:border-blue-500/60 transition-colors disabled:opacity-50 font-medium tracking-wide"
            />
            <button
              type="button"
              onClick={() => setName(generateName())}
              disabled={isMinting}
              title={t('mcpCreateNameRegen')}
              className="shrink-0 flex items-center gap-1.5 text-[11px] font-semibold text-neutral-400 hover:text-neutral-200 bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 px-3 py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw size={13} />
            </button>
          </div>
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
                disabled={isMinting}
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
                disabled={isMinting}
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
            {([
              { days: 30,   label: t('tokenExpiry30d') },
              { days: 60,   label: t('tokenExpiry60d') },
              { days: 90,   label: t('tokenExpiry90d') },
              { days: null, label: t('tokenExpiryForever') },
            ] as const).map(({ days, label }) => (
              <button
                key={String(days)}
                type="button"
                onClick={() => setExpiresIn(days as 30 | 60 | 90 | null)}
                disabled={isMinting}
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
          disabled={isMinting || !name.trim()}
          className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 rounded-lg transition-colors"
        >
          <KeyRound size={14} />
          {isMinting ? t('creating') : t('mcpCreateCTA')}
        </button>
      </form>
    </div>
  );
}
