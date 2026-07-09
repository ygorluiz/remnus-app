'use client';

import DashboardOverview from '@/components/features/finance/dashboard/DashboardOverview';

export default function DashboardClient({ workspaceId }: { workspaceId: string }) {
  return <DashboardOverview workspaceId={workspaceId} />;
}
