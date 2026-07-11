import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { redirect } from 'next/navigation';
import BuatPengaduanClient from './BuatPengaduanClient';

export default async function BuatPengaduan() {
  const token = cookies().get('token')?.value;
  if (!token) redirect('/login');
  const session = await verifyJWT(token);
  if (!session) redirect('/login');

  return <BuatPengaduanClient user={session} />;
}
