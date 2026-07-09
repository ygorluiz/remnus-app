import { type AIMarkName } from '@/components/marketing/AIMark';

/**
 * Plain (non-`'use client'`) agent brand-icon data, safe to import from server
 * components. `AgentMark.tsx` re-exports these for client usage.
 *
 * Why this lives here and not in `AgentMark.tsx`: a server component (the OAuth
 * consent page) importing a value export from a `'use client'` module gets a
 * client *reference* (a proxy), not the real array — so `AGENT_MARKS.some(...)`
 * threw "is not a function" in production. Keeping the data in a server-safe
 * module avoids that.
 */

export type AgentMarkName = AIMarkName | 'vscode';

/** Canonical, user-selectable connectable agents. `id` is what we persist in `agent_name`. */
export const AGENT_MARKS: { id: string; label: string; mark: AgentMarkName }[] = [
  { id: 'claude',      label: 'Claude Code', mark: 'claude'      },
  { id: 'cursor',      label: 'Cursor',      mark: 'cursor'      },
  { id: 'vscode',      label: 'VS Code',     mark: 'vscode'      },
  { id: 'windsurf',    label: 'Windsurf',    mark: 'windsurf'    },
  { id: 'continue',    label: 'Continue',    mark: 'continue'    },
  { id: 'codex',       label: 'Codex',       mark: 'codex'       },
  { id: 'antigravity', label: 'Antigravity', mark: 'antigravity' },
  { id: 'gemini',      label: 'Gemini',      mark: 'gemini'      },
  { id: 'zed',         label: 'Zed',         mark: 'zed'         },
];

/** Map an explicit canonical agent id → mark. */
export function markForId(id?: string | null): AgentMarkName | null {
  if (!id) return null;
  return AGENT_MARKS.find(a => a.id === id)?.mark ?? null;
}

/** Best-effort inference from any free-text hint (PAT name, OAuth client_name, legacy ids). */
export function resolveAgentMark(hint?: string | null): AgentMarkName | null {
  if (!hint) return null;
  const s = hint.toLowerCase();
  // Order matters: check specific brands before the bare "code" → vscode rule.
  if (s.includes('antigravity')) return 'antigravity';
  if (s.includes('windsurf'))    return 'windsurf';
  if (s.includes('continue'))    return 'continue';
  if (s.includes('cursor'))      return 'cursor';
  if (s.includes('claude'))      return 'claude';
  // The Remnus .mcpb bundle connects Claude Desktop via the `mcp-remote` proxy,
  // which dynamic-registers under a generic name ("MCP CLI Proxy"/"MCP CLI Client").
  // Map those to Claude so the bundle shows the right brand icon out of the box.
  if (s.includes('mcp cli') || s.includes('mcp-remote') || s.includes('mcp remote')) return 'claude';
  if (s.includes('codex')) return 'codex';
  if (s.includes('chatgpt') || s.includes('openai')) return 'chatgpt';
  if (s.includes('gemini'))      return 'gemini';
  if (s.includes('zed'))         return 'zed';
  if (s.includes('vscode') || s.includes('vs code') || s.includes('visual studio')) return 'vscode';
  return null;
}
