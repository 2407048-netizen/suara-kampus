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

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    
    const checkStmt = db.prepare(`
      SELECT COUNT(*) as count FROM lecturer_reports 
      WHERE user_id = ? AND created_at >= ?
    `);
    const recentCount = (checkStmt.get(session.user_id, twoDaysAgo.toISOString()) as any).count;

    if (recentCount >= 1) {
      return NextResponse.json({ success: false, message: 'Anda hanya boleh membuat 1 laporan dosen setiap 2 hari.' }, { status: 429 });
    }

    const formData = await request.formData();
    const nama_dosen = formData.get('nama_dosen')?.toString().trim();
    const mata_kuliah = formData.get('mata_kuliah')?.toString().trim();
    const kelas = formData.get('kelas')?.toString().trim() || null;
    const semester = formData.get('semester')?.toString().trim() || null;
    const judul = formData.get('judul')?.toString().trim();
    const kronologi = formData.get('kronologi')?.toString().trim();
    const dampak = formData.get('dampak')?.toString().trim() || null;
    const bukti = formData.get('bukti') as File;

    if (!nama_dosen || !mata_kuliah || !judul || !kronologi) {
      return NextResponse.json({ success: false, message: 'Field wajib (Nama Dosen, Matkul, Judul, Kronologi) harus diisi!' }, { status: 400 });
    }

    if (kronologi.length < 50) {
      return NextResponse.json({ success: false, message: 'Kronologi minimal 50 karakter!' }, { status: 400 });
    }

    let bukti_filename = null;
    if (bukti && bukti.size > 0) {
      // Vercel Blob implementation placeholder
      bukti_filename = `dosen_${Date.now()}_${bukti.name}`;
    }

    const now = new Date().toISOString();
    const insertStmt = db.prepare(`
      INSERT INTO lecturer_reports (user_id, nama_dosen, mata_kuliah, kelas, semester, judul, kronologi, dampak, bukti_path, status, is_archived, is_deleted, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Diajukan', 0, 0, ?, ?)
    `);
    
    insertStmt.run(session.user_id, nama_dosen, mata_kuliah, kelas, semester, judul, kronologi, dampak, bukti_filename, now, now);

    db.prepare('INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, ?)').run(
      session.user_id, 'buat_pengaduan_dosen', `Laporan dosen: ${judul}`, now
    );

    return NextResponse.json({ success: true, message: 'Laporan kinerja dosen berhasil dikirim! Menunggu tinjauan admin.' });
  } catch (error) {
    console.error('Laporan dosen error:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
