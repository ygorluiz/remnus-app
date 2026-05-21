import { auth } from '@/auth';
import MarketingHeader from './MarketingHeader';
import MarketingFooter from './MarketingFooter';

interface Props {
  children: React.ReactNode;
}

export default async function MarketingShell({ children }: Props) {
  const session = await auth();
  const user = session?.user
    ? { name: session.user.name ?? null, email: session.user.email ?? null }
    : null;

  return (
    <div className="min-h-screen bg-neutral-950">
      <MarketingHeader user={user} />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
