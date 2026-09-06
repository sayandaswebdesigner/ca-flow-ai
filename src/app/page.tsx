import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function Home() {
  const store = await cookies();
  const token = store.get('ca_session')?.value;
  redirect(token ? '/dashboard' : '/login');
}
