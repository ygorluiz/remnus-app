'use client';

import { createContext, useContext } from 'react';

export interface WorkspaceMember {
  id: string;
  name: string | null;
  email?: string | null;
  image: string | null;
  role?: string;
}

const MembersContext = createContext<WorkspaceMember[]>([]);

/**
 * Provides the current workspace's member list to database views so that
 * `user` / `multi_user` property cells can resolve ids → name + avatar.
 * Mounted by DatabaseView and the full-page row editor route.
 */
export function MembersProvider({
  members,
  children,
}: {
  members: WorkspaceMember[] | null | undefined;
  children: React.ReactNode;
}) {
  return <MembersContext.Provider value={members ?? []}>{children}</MembersContext.Provider>;
}

export function useMembers(): WorkspaceMember[] {
  return useContext(MembersContext);
}

export function useMember(userId: string | null | undefined): WorkspaceMember | undefined {
  const members = useMembers();
  if (!userId) return undefined;
  return members.find((m) => m.id === userId);
}
