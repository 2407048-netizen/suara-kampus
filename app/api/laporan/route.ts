export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { put } from '@vercel/blob';

export async function POST(request: Request) {
  try {
    const token = cookies().get('token')?.value;
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const session = await verifyJWT(token);
    if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const today = new Date().toISOString().split('T')[0];
    const todayCount = ((await db.prepare(`
      SELECT COUNT(*) as count FROM reports 
      WHERE user_id = ? AND kategori != 'Aspirasi & Saran' AND date(created_at) = ?
    `).get(session.user_id, today)) as any).count;

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

    let foto_url = null;
    let file_name = null;
    let file_size = null;
    let file_type = null;

    if (foto && foto.size > 0) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(foto.type)) {
        return NextResponse.json({ success: false, message: 'Format file tidak didukung. Gunakan JPG, PNG, atau WEBP.' }, { status: 400 });
      }
      if (foto.size > 5 * 1024 * 1024) {
        return NextResponse.json({ success: false, message: 'Ukuran file maksimal 5 MB.' }, { status: 400 });
      }

      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return NextResponse.json({ success: false, message: 'Konfigurasi Vercel Blob belum diatur (BLOB_READ_WRITE_TOKEN hilang).' }, { status: 500 });
      }

      const ext = foto.name.split('.').pop() || 'jpg';
      const uniqueFilename = `pengaduan_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
      
      const blob = await put(uniqueFilename, foto, { access: 'public' });
      
      foto_url = blob.url;
      file_name = foto.name;
      file_size = foto.size;
      file_type = foto.type;
    }

    const now = new Date().toISOString();
    await db.prepare(`
      INSERT INTO reports (user_id, judul, kategori, prioritas, lokasi, deskripsi, foto, file_name, file_size, file_type, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(session.user_id, judul, kategori, prioritas, lokasi, deskripsi, foto_url, file_name, file_size, file_type, 'Menunggu Persetujuan', now, now);

    // Log activity
    await db.prepare('INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, ?)').run(
      session.user_id, 'buat_pengaduan', `Buat laporan: ${judul}`, now
    );

    return NextResponse.json({ success: true, message: 'Laporan berhasil dikirim! Menunggu persetujuan admin.' });
  } catch (error) {
    console.error('Buat laporan error:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
