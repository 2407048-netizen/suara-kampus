import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import AspirasiClient from './AspirasiClient';

export default async function Aspirasi({ searchParams }: { searchParams: { q?: string, sort?: string } }) {
  const token = cookies().get('token')?.value;
  if (!token) redirect('/login');
  const session = await verifyJWT(token);
  if (!session) redirect('/login');

  const q = searchParams.q || '';
  const sort = searchParams.sort || 'terbaru';

  let query = `
    SELECT a.*, u.nama as user_nama 
    FROM aspirations a 
    LEFT JOIN users u ON a.user_id = u.id 
    WHERE 1=1
  `;
  
  const params: any[] = [];
  
  if (q) {
    query += ` AND (a.judul LIKE ? OR a.isi LIKE ?)`;
    params.push(`%${q}%`, `%${q}%`);
  }

  if (sort === 'terpopuler') {
    query += ` ORDER BY a.like_count DESC, a.created_at DESC`;
  } else {
    query += ` ORDER BY a.created_at DESC`;
  }

  const aspirasiList = db.prepare(query).all(...params);

  return <AspirasiClient user={session} aspirasiList={aspirasiList} q={q} sort={sort} />;
}
