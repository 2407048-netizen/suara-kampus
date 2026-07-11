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
      SELECT COUNT(*) as count FROM reports 
      WHERE user_id = ? AND kategori != 'Aspirasi & Saran' AND date(created_at) = ?
    `);
    const todayCount = (checkStmt.get(session.user_id, today) as any).count;

    if (todayCount >= 2) {
      return NextResponse.json({ success: false, message: 'Anda sudah mencapai batas maksimal 2 laporan hari ini.' }, { status: 429 });
    }

    const formData = await request.formData();
    const judul = formData.get('judul')?.toString().trim();
    const kategori = formData.get('kategori')?.toString().trim();
    const prioritas = formData.get('prioritas')?.toString().trim() || 'Sedang';
    const lokasi = formData.get('lokasi')?.toString().trim() || '-';
    const deskripsi = formData.get('deskripsi')?.toString().trim();
    const foto = formData.get('foto') as File;

    if (!judul || !kategori || !deskripsi) {
      return NextResponse.json({ success: false, message: 'Judul, kategori, dan deskripsi wajib diisi!' }, { status: 400 });
    }

    if (deskripsi.length < 20) {
      return NextResponse.json({ success: false, message: 'Deskripsi minimal 20 karakter!' }, { status: 400 });
    }

    let foto_filename = null;
    if (foto && foto.size > 0) {
      // For Vercel Blob or similar, this would be an upload call.
      // Since we simulate local storage for Vercel Blob placeholder here:
      foto_filename = `${Date.now()}_${foto.name}`;
      // Note: Actual Vercel Blob upload would happen here:
      // const blob = await put(foto_filename, foto, { access: 'public' });
      // foto_filename = blob.url;
    }

    const now = new Date().toISOString();
    const insertStmt = db.prepare(`
      INSERT INTO reports (user_id, judul, kategori, prioritas, lokasi, deskripsi, foto, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    insertStmt.run(session.user_id, judul, kategori, prioritas, lokasi, deskripsi, foto_filename, 'Menunggu Persetujuan', now, now);

    // Log activity
    db.prepare('INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, ?)').run(
      session.user_id, 'buat_pengaduan', `Buat laporan: ${judul}`, now
    );

    return NextResponse.json({ success: true, message: 'Laporan berhasil dikirim! Menunggu persetujuan admin.' });
  } catch (error) {
    console.error('Buat laporan error:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
