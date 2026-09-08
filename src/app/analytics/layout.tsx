import { redirect } from 'next/navigation';
import { getCurrentUser, isAdminEmail } from '@/lib/auth';

export default async function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || !isAdminEmail(user.email)) {
    redirect('/dashboard');
  }
  return <>{children}</>;
}
