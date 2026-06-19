// Single source of truth for plan limits. Mirrors the pricing page
// (src/components/marketing/LandingPricing.tsx). `Infinity` = unlimited.
//
// The subscription belongs to the BILLING OWNER (a user), not a workspace.
// A workspace's limits are always read from its `billing_owner_id`'s plan.

export type PlanTier = 'free' | 'startup' | 'professional' | 'enterprise';

export interface PlanLimits {
  /** Distinct members (seats) across all the owner's workspaces. Counts the owner too. */
  seats: number;
  /** Active connected AI agents (PAT + OAuth) across the owner's workspaces. */
  agents: number;
  /** Pooled storage in bytes across all the owner's workspaces. */
  storageBytes: number;
  /** Audit-log retention window in days. */
  auditDays: number;
  /** How many workspaces the owner may own. */
  workspaces: number;
}

const MB = 1024 * 1024;
const GB = 1024 * 1024 * 1024;

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    seats: 2,
    agents: 2,
    storageBytes: 512 * MB,
    auditDays: 7,
    workspaces: 2,
  },
  startup: {
    seats: 5,
    agents: 5,
    storageBytes: 5 * GB,
    auditDays: 30,
    workspaces: Infinity,
  },
  professional: {
    seats: 15,
    agents: Infinity,
    storageBytes: 20 * GB,
    auditDays: 90,
    workspaces: Infinity,
  },
  enterprise: {
    seats: Infinity,
    agents: Infinity,
    storageBytes: 1024 * GB,
    auditDays: 365,
    workspaces: Infinity,
  },
};

export const DEFAULT_TIER: PlanTier = 'free';

export function isPlanTier(value: string): value is PlanTier {
  return value === 'free' || value === 'startup' || value === 'professional' || value === 'enterprise';
}
