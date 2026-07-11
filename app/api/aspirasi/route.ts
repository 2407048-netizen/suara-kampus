import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const token = cookies().get('token')?.value;
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const session = await verifyJWT(token);
    if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const today = new Date().toISOString().split('T')[0];
    const checkStmt = db.prepare(`
      SELECT COUNT(*) as count FROM aspirations 
      WHERE user_id = ? AND date(created_at) = ?
    `);
    const todayCount = (checkStmt.get(session.user_id, today) as any).count;

    if (todayCount >= 2) {
      return NextResponse.json({ success: false, message: 'Anda sudah mencapai batas maksimal 2 aspirasi hari ini.' }, { status: 429 });
    }

    const formData = await request.formData();
    const judul = formData.get('judul')?.toString().trim();
    const isi = formData.get('isi')?.toString().trim();
    const is_anonim = formData.get('is_anonim') === 'true' ? 1 : 0;

    if (!judul || !isi) {
      return NextResponse.json({ success: false, message: 'Judul dan isi aspirasi wajib diisi.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const insertStmt = db.prepare(`
      INSERT INTO aspirations (judul, isi, is_anonymous, user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    insertStmt.run(judul, isi, is_anonim, session.user_id, now, now);

    // Log activity
    db.prepare('INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, ?)').run(
      session.user_id, 'buat_aspirasi', `Buat aspirasi: ${judul}`, now
    );

    return NextResponse.json({ success: true, message: 'Aspirasi berhasil dikirim!' });
  } catch (error) {
    console.error('Buat aspirasi error:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
