export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';

// POST /api/aspirasi/[id]/admin-status - Admin update status aspirasi
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const token = cookies().get('token')?.value;
    if (!token) return NextResponse.redirect(new URL('/login', request.url));
    const session = await verifyJWT(token);
    if (!session || !['admin', 'staff'].includes(session.role)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    const formData = await request.formData();
    const status_baru = formData.get('status')?.toString().trim();

    if (!status_baru) {
      return NextResponse.redirect(new URL('/riwayat-aspirasi', request.url));
    }

    const aspirasi = await db.prepare('SELECT * FROM aspirations WHERE id = ? AND is_deleted = 0').get(params.id) as any;
    if (!aspirasi) {
      return NextResponse.redirect(new URL('/riwayat-aspirasi', request.url));
    }

    const now = new Date().toISOString();
    await db.prepare('UPDATE aspirations SET updated_at = ? WHERE id = ?').run(now, params.id);

    await db.prepare('INSERT INTO notifications (user_id, message, created_at) VALUES (?, ?, ?)').run(
      aspirasi.user_id, `Aspirasi "${aspirasi.judul}" diperbarui statusnya menjadi ${status_baru}`, now
    );

    return NextResponse.redirect(new URL('/riwayat-aspirasi', request.url));
  } catch (error) {
    console.error('Admin status aspirasi error:', error);
    return NextResponse.redirect(new URL('/riwayat-aspirasi', request.url));
  }
}
