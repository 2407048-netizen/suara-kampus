export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Client from './Client';

export default async function AdminLaporanDosenPage() {
  const token = cookies().get('token')?.value;
  if (!token) redirect('/login');
  const session = await verifyJWT(token);
  if (!session || !['admin', 'staff'].includes(session.role)) {
    redirect('/dashboard');
  }

  return <Client user={session} />;
}
