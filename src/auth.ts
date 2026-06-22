import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { jwt } from 'better-auth/plugins';
import { db } from '@/db';
import { createSeedWorkspace } from '@/lib/seed';
import { captureServer, isCaptureAllowedFromRequest } from '@/lib/analytics/server';
import { users, accounts, workspaces, workspaceMembers } from '@/db/schema';
import { eq, ne } from 'drizzle-orm';
import { cookies } from 'next/headers';

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24,       // refresh every 24h
  },
  socialProviders: {
    google: {
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      prompt: 'select_account',
    },
    github: {
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
    },
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'user',
        required: false,
      },
      analyticsConsent: {
        type: 'string',
        required: false,
      },
      passwordHash: {
        type: 'string',
        required: false,
      },
    },
  },
  plugins: [
    jwt(),
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Seed default workspace with tasks database and welcome page
          await createSeedWorkspace(user.id, user.name);

          // Count real (non-demo) users; if this is the first one, promote to admin
          const allRealUsers = await db.select({ id: users.id }).from(users).where(ne(users.role, 'demo'));
          const isFirstUser = allRealUsers.length === 1;

          // Funnel: signup event
          try {
            const [acc] = await db
              .select({ provider: accounts.provider })
              .from(accounts)
              .where(eq(accounts.userId, user.id))
              .limit(1);

            let setOnce: Record<string, unknown> | undefined;
            const firstTouchRaw = (await cookies()).get('remnus_first_touch')?.value;
            if (firstTouchRaw) {
              try {
                const ft = JSON.parse(decodeURIComponent(firstTouchRaw));
                setOnce = {
                  initial_utm_source: ft.utm_source ?? null,
                  initial_utm_medium: ft.utm_medium ?? null,
                  initial_utm_campaign: ft.utm_campaign ?? null,
                  initial_referrer: ft.referrer ?? null,
                };
              } catch {
                // malformed cookie — skip attribution
              }
            }

            await captureServer({
              event: 'signup',
              userId: user.id,
              allowed: await isCaptureAllowedFromRequest(),
              role: isFirstUser ? 'admin' : 'user',
              properties: { provider: acc?.provider ?? null },
              setOnce,
            });
          } catch {
            // analytics is best-effort — never block account creation
          }

          if (!isFirstUser) return;

          // First user: promote to admin and claim orphaned workspaces
          await db.update(users).set({ role: 'admin' }).where(eq(users.id, user.id));

          const allWorkspaces = await db.select({ id: workspaces.id }).from(workspaces);
          for (const ws of allWorkspaces) {
            const existing = await db
              .select({ id: workspaceMembers.id })
              .from(workspaceMembers)
              .where(eq(workspaceMembers.workspaceId, ws.id));
            if (existing.length === 0) {
              await db.insert(workspaceMembers).values({
                workspaceId: ws.id,
                userId: user.id,
                role: 'owner',
                createdAt: new Date(),
              });
              await db.update(workspaces).set({ billingOwnerId: user.id }).where(eq(workspaces.id, ws.id));
            }
          }
        },
      },
    },
  },
});
