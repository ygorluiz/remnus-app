'use server';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { headers } from 'next/headers';

export type SessionUser = {
  id: string;
  role: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

// Memoized per-request: session is fetched at most once regardless of how many
// server actions run in the same render cycle.
export const getCurrentUser = cache(async (): Promise<SessionUser> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) redirect('/login');
  return {
    id: session.user.id,
    role: (session.user as Record<string, unknown>).role as string ?? 'user',
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
  };
});
