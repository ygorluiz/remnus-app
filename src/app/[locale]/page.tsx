import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import LandingBridgeSwitcher from '@/components/marketing/LandingBridgeSwitcher';

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect('/app');
  return <LandingBridgeSwitcher />;
}
