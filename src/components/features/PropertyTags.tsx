'use client';

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import {
  type SelectOption,
  type StatusGroup,
  normalizeOption,
  getStatusGroup,
  getOptionColorByValue,
} from '@/lib/types/properties';
import { useMember, type WorkspaceMember } from './MembersContext';
import PageIcon from './PageIcon';

// ── Select / multi-select option icon ───────────────────────────────────────

/** The option's configured icon (emoji/lucide/upload), tinted by its chip color. Null when unset. */
export function OptionIcon({
  value,
  options,
  size = 12,
}: {
  value: string;
  options?: (string | SelectOption)[];
  size?: number;
}) {
  const opt = (options ?? []).map(normalizeOption).find((o) => o.value === value);
  if (!opt?.icon) return null;
  return <PageIcon icon={opt.icon} iconColor={opt.color} size={size} hideFallback className="shrink-0" />;
}

// ── Status ───────────────────────────────────────────────────────────────────

/**
 * A small progress-ring glyph indicating a status option's group:
 * todo = dashed empty ring, in_progress = half-filled, complete = filled check.
 */
export function StatusIcon({
  group,
  color,
  size = 13,
}: {
  group: StatusGroup;
  color: string;
  size?: number;
}) {
  if (group === 'complete') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" className="shrink-0" aria-hidden>
        <circle cx="8" cy="8" r="7" fill={color} />
        <path d="M4.8 8.2l2 2 4.4-4.6" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (group === 'in_progress') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" className="shrink-0" aria-hidden>
        <circle cx="8" cy="8" r="7" fill="none" stroke={color} strokeWidth="1.6" />
        <path d="M8 1.5 A6.5 6.5 0 0 1 8 14.5 Z" fill={color} />
      </svg>
    );
  }
  // todo
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className="shrink-0" aria-hidden>
      <circle cx="8" cy="8" r="7" fill="none" stroke={color} strokeWidth="1.6" strokeDasharray="2.2 2" />
    </svg>
  );
}

export function StatusChip({
  value,
  options,
  iconSize = 12,
}: {
  value: string;
  options?: (string | SelectOption)[];
  iconSize?: number;
}) {
  if (!value) return null;
  const opt = (options ?? []).map(normalizeOption).find((o) => o.value === value);
  const group = opt ? getStatusGroup(opt) : 'todo';
  const c = getOptionColorByValue(options ?? [], value);
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium align-middle"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      <StatusIcon group={group} color={c.dot} size={iconSize} />
      <span className="truncate">{value}</span>
    </span>
  );
}

// ── Users ────────────────────────────────────────────────────────────────────

function initialsOf(member: WorkspaceMember | undefined): string {
  const src = member?.name || member?.email || '';
  const parts = src.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Deterministic avatar tint from a user id (stable across renders).
const AVATAR_TINTS = ['#6366f1', '#14b8a6', '#a855f7', '#ec4899', '#f97316', '#22c55e', '#eab308', '#ef4444'];
function tintFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_TINTS[h % AVATAR_TINTS.length];
}

export function UserAvatar({
  member,
  size = 18,
}: {
  member: WorkspaceMember | undefined;
  size?: number;
}) {
  const dim = { width: size, height: size };
  if (member?.image) {
     
    return (
      <img
        src={member.image}
        alt={member.name || ''}
        className="rounded-full object-cover shrink-0 border border-neutral-700/40"
        style={dim}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span
      className="rounded-full shrink-0 flex items-center justify-center font-semibold text-white border border-white/10"
      style={{ ...dim, backgroundColor: member ? tintFor(member.id) : '#52525b', fontSize: Math.round(size * 0.42) }}
    >
      {initialsOf(member)}
    </span>
  );
}

/** A single user pill — avatar + name. Resolves the id against workspace members. */
export function UserChip({ userId, avatarSize = 16 }: { userId: string; avatarSize?: number }) {
  const t = useTranslations('Database');
  const member = useMember(userId);
  return (
    <span className="inline-flex items-center gap-1.5 max-w-full align-middle text-xs text-neutral-100">
      <UserAvatar member={member} size={avatarSize} />
      <span className="truncate">{member ? member.name || member.email : t('unknownUser')}</span>
    </span>
  );
}

/**
 * Avatar-only stack for `user`/`multi_user` cells (no name text) — used on
 * calendar cards where space is tight. The viewer's own avatar (when among
 * the assignees) gets a ring in the theme's accent color (`--color-blue-500`,
 * which is redefined per `[data-theme]` block in globals.css, so it's already
 * theme-aware for free). Hovering the whole stack shows one tooltip listing
 * every assignee's avatar + name, stacked — not per-avatar tooltips.
 */
export function UserAvatarStack({
  value,
  currentUserId,
  size = 16,
}: {
  value: unknown;
  currentUserId?: string | null;
  size?: number;
}) {
  const [hovered, setHovered] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const ids = Array.isArray(value) ? (value as string[]) : value ? [String(value)] : [];
  if (ids.length === 0) return null;

  const handleEnter = () => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (rect) setCoords({ top: rect.top - 6, left: rect.left });
    setHovered(true);
  };

  return (
    <div
      ref={anchorRef}
      className="relative inline-flex items-center gap-1"
      onMouseEnter={handleEnter}
      onMouseLeave={() => setHovered(false)}
    >
      {ids.map((id) => (
        <StackedAvatar key={id} userId={id} isSelf={!!currentUserId && id === currentUserId} size={size} />
      ))}
      {hovered && coords && createPortal(
        <div
          className="fixed z-9999 -translate-y-full bg-neutral-900 border border-neutral-800 rounded-md shadow-xl py-1.5 px-2 flex flex-col gap-1.5 pointer-events-none"
          style={{ top: coords.top, left: coords.left }}
        >
          {ids.map((id) => <TooltipRow key={id} userId={id} />)}
        </div>,
        document.body,
      )}
    </div>
  );
}

function StackedAvatar({ userId, isSelf, size }: { userId: string; isSelf: boolean; size: number }) {
  const member = useMember(userId);
  return (
    <span className={`shrink-0 rounded-full ${isSelf ? 'p-0.5 border-2 border-blue-500' : ''}`}>
      <UserAvatar member={member} size={size} />
    </span>
  );
}

function TooltipRow({ userId }: { userId: string }) {
  const t = useTranslations('Database');
  const member = useMember(userId);
  return (
    <span className="flex items-center gap-1.5 text-xs text-neutral-100 whitespace-nowrap">
      <UserAvatar member={member} size={16} />
      {member ? member.name || member.email : t('unknownUser')}
    </span>
  );
}

/** Renders one or many user chips for `user` / `multi_user` cells. */
export function UserTags({
  value,
  avatarSize = 16,
  wrap = true,
}: {
  value: unknown;
  avatarSize?: number;
  wrap?: boolean;
}) {
  const ids = Array.isArray(value) ? (value as string[]) : value ? [String(value)] : [];
  if (ids.length === 0) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 ${wrap ? 'flex-wrap' : 'flex-nowrap overflow-hidden'}`}>
      {ids.map((id) => (
        <span
          key={id}
          className="inline-flex items-center gap-1.5 bg-neutral-800/60 rounded-full pl-0.5 pr-2 py-0.5 max-w-full"
        >
          <UserChip userId={id} avatarSize={avatarSize} />
        </span>
      ))}
    </span>
  );
}
