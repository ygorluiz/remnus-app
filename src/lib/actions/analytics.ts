'use server';
import { db } from '@/db';
import {
  users, accounts, userSessions, workspaceMembers, workspaces, workspaceItems,
} from '@/db/schema';
import { eq, inArray, asc, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/session';
import { getTranslations } from 'next-intl/server';

async function assertAdmin() {
  const user = await getCurrentUser();
  if (user.role !== 'admin') {
    const t = await getTranslations('Errors');
    throw new Error(t('adminRequired'));
  }
  return user;
}

export type PerUserActivity = {
  totalSeconds: number;
  sessionCount: number;
  lastActive: number | null; // epoch ms
};

export type EngagementOverview = {
  totalSeconds: number;
  sessionCount: number;
  avgSessionSeconds: number;
  dau: number;
  wau: number;
  mau: number;
  newThisWeek: number;
  newThisMonth: number;
  signupTrend: { date: string; count: number }[]; // last 30 days, oldest → newest
  perUser: Record<string, PerUserActivity>;
};

const DAY = 24 * 60 * 60;

// Timestamp columns are stored as integer Unix seconds, but the createdAt
// gotcha (see AGENTS.md) means some legacy rows hold a CURRENT_TIMESTAMP text
// value instead. Normalize both forms to epoch ms, returning null when invalid
// so callers never feed NaN into new Date().toISOString().
function toEpochMs(val: unknown): number | null {
  if (val == null) return null;
  if (typeof val === 'number') {
    if (!isFinite(val)) return null;
    return val < 1e12 ? val * 1000 : val; // seconds vs already-ms heuristic
  }
  const d = new Date(val as string);
  return isNaN(d.getTime()) ? null : d.getTime();
}

export async function getEngagementOverview(): Promise<EngagementOverview> {
  await assertAdmin();

  const nowSec = Math.floor(Date.now() / 1000);
  const dayCut = nowSec - DAY;
  const weekCut = nowSec - 7 * DAY;
  const monthCut = nowSec - 30 * DAY;

  const [signups] = await db
    .select({
      week: sql<number>`count(case when ${users.createdAt} >= ${weekCut} then 1 end)`,
      month: sql<number>`count(case when ${users.createdAt} >= ${monthCut} then 1 end)`,
    })
    .from(users);

  const [agg] = await db
    .select({
      totalSeconds: sql<number>`coalesce(sum(${userSessions.durationSeconds}), 0)`,
      sessionCount: sql<number>`cast(count(*) as int)`,
    })
    .from(userSessions);

  const [active] = await db
    .select({
      dau: sql<number>`count(distinct case when ${userSessions.lastSeenAt} >= ${dayCut} then ${userSessions.userId} end)`,
      wau: sql<number>`count(distinct case when ${userSessions.lastSeenAt} >= ${weekCut} then ${userSessions.userId} end)`,
      mau: sql<number>`count(distinct case when ${userSessions.lastSeenAt} >= ${monthCut} then ${userSessions.userId} end)`,
    })
    .from(userSessions);

  const perUserRows = await db
    .select({
      userId: userSessions.userId,
      totalSeconds: sql<number>`coalesce(sum(${userSessions.durationSeconds}), 0)`,
      sessionCount: sql<number>`cast(count(*) as int)`,
      lastSeen: sql<number>`max(${userSessions.lastSeenAt})`,
    })
    .from(userSessions)
    .groupBy(userSessions.userId);

  const perUser: Record<string, PerUserActivity> = {};
  for (const r of perUserRows) {
    perUser[r.userId] = {
      totalSeconds: r.totalSeconds,
      sessionCount: r.sessionCount,
      lastActive: toEpochMs(r.lastSeen),
    };
  }

  // Acquisition trend: signups per day over the last 30 days, bucketed in JS.
  const signupRows = await db
    .select({ createdAt: sql<number>`${users.createdAt}` })
    .from(users)
    .where(sql`${users.createdAt} >= ${monthCut}`);

  const buckets = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date((nowSec - i * DAY) * 1000);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const row of signupRows) {
    const ms = toEpochMs(row.createdAt);
    if (ms == null) continue;
    const key = new Date(ms).toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const signupTrend = [...buckets.entries()].map(([date, count]) => ({ date, count }));

  const sessionCount = agg?.sessionCount ?? 0;
  const totalSeconds = agg?.totalSeconds ?? 0;

  return {
    totalSeconds,
    sessionCount,
    avgSessionSeconds: sessionCount > 0 ? Math.round(totalSeconds / sessionCount) : 0,
    dau: active?.dau ?? 0,
    wau: active?.wau ?? 0,
    mau: active?.mau ?? 0,
    newThisWeek: signups?.week ?? 0,
    newThisMonth: signups?.month ?? 0,
    signupTrend,
    perUser,
  };
}

export type UserDetailWorkspace = {
  id: string;
  name: string;
  role: string;
  items: { id: string; type: 'page' | 'database'; title: string; icon: string | null }[];
};

export type UserDetail = {
  account: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    role: string;
    createdAt: number | null; // epoch ms
    authType: 'google' | 'github' | 'email' | 'unknown';
  };
  activity: PerUserActivity;
  workspaces: UserDetailWorkspace[];
};

export async function getUserDetail(userId: string): Promise<UserDetail> {
  await assertAdmin();

  const [u] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: users.role,
      createdAt: sql<number>`${users.createdAt}`,
      hasPassword: sql<number>`case when ${users.passwordHash} is not null then 1 else 0 end`,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!u) {
    const t = await getTranslations('Errors');
    throw new Error(t('userNotFound'));
  }

  const providerRows = await db
    .select({ provider: accounts.provider })
    .from(accounts)
    .where(eq(accounts.userId, userId));
  const providers = providerRows.map((p) => p.provider);
  const authType = providers.includes('google')
    ? ('google' as const)
    : providers.includes('github')
      ? ('github' as const)
      : u.hasPassword
        ? ('email' as const)
        : ('unknown' as const);

  const [act] = await db
    .select({
      totalSeconds: sql<number>`coalesce(sum(${userSessions.durationSeconds}), 0)`,
      sessionCount: sql<number>`cast(count(*) as int)`,
      lastSeen: sql<number>`max(${userSessions.lastSeenAt})`,
    })
    .from(userSessions)
    .where(eq(userSessions.userId, userId));

  // Workspaces the user belongs to, with their membership role.
  const memberships = await db
    .select({
      workspaceId: workspaceMembers.workspaceId,
      role: workspaceMembers.role,
      name: workspaces.name,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId));

  const wsIds = memberships.map((m) => m.workspaceId);
  const itemRows = wsIds.length
    ? await db
        .select({
          id: workspaceItems.id,
          workspaceId: workspaceItems.workspaceId,
          type: workspaceItems.type,
          title: workspaceItems.title,
          icon: workspaceItems.icon,
        })
        .from(workspaceItems)
        .where(inArray(workspaceItems.workspaceId, wsIds))
        .orderBy(asc(workspaceItems.sortOrder), asc(workspaceItems.createdAt))
    : [];

  const itemsByWs = itemRows.reduce<Record<string, UserDetailWorkspace['items']>>((acc, it) => {
    (acc[it.workspaceId] ??= []).push({ id: it.id, type: it.type, title: it.title, icon: it.icon });
    return acc;
  }, {});

  const workspacesDetail: UserDetailWorkspace[] = memberships.map((m) => ({
    id: m.workspaceId,
    name: m.name,
    role: m.role,
    items: itemsByWs[m.workspaceId] ?? [],
  }));

  return {
    account: {
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image,
      role: u.role,
      createdAt: toEpochMs(u.createdAt),
      authType,
    },
    activity: {
      totalSeconds: act?.totalSeconds ?? 0,
      sessionCount: act?.sessionCount ?? 0,
      lastActive: toEpochMs(act?.lastSeen),
    },
    workspaces: workspacesDetail,
  };
}
