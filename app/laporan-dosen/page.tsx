import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LaporanDosenClient from './LaporanDosenClient';

export default async function LaporanDosen() {
  const token = cookies().get('token')?.value;
  if (!token) redirect('/login');
  const session = await verifyJWT(token);
  if (!session) redirect('/login');

  return <LaporanDosenClient user={session} />;
}
