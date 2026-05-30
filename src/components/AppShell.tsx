'use client';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import TauriTitlebar from './features/TauriTitlebar';

export default function AppShell({
  sidebar,
  mobileNav,
  demoBanner,
  children,
}: {
  sidebar: ReactNode;
  mobileNav: ReactNode;
  demoBanner?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isMarketing = pathname === '/';

  if (isMarketing) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden lg:flex w-72 bg-neutral-900 border-r border-neutral-800 flex-col">
        {sidebar}
      </aside>
      {mobileNav}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-850 pb-14 lg:pb-0">
        <TauriTitlebar />
        {demoBanner}
        {children}
      </main>
    </div>
  );
}
