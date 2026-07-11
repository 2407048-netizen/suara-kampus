import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const token = cookies().get('token')?.value;
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const session = await verifyJWT(token);
    if (!session || (session.role !== 'admin' && session.role !== 'staff')) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const status_baru = formData.get('status')?.toString().trim();
    const tanggapan_admin = formData.get('tanggapan_admin')?.toString().trim();
    const is_archived = formData.get('is_archived') === 'on' ? 1 : 0;
    
    const valid_statuses = ['Diajukan', 'Ditinjau', 'Diproses', 'Selesai', 'Ditolak'];
    
    const getReport = db.prepare('SELECT * FROM lecturer_reports WHERE id = ?');
    const laporan = getReport.get(params.id) as any;
    
    if (!laporan) {
      return NextResponse.json({ success: false, message: 'Laporan tidak ditemukan' }, { status: 404 });
    }
    
    let currentStatus = laporan.status;
    if (status_baru && valid_statuses.includes(status_baru)) {
      currentStatus = status_baru;
    }
    
    const now = new Date().toISOString();
    
    db.prepare(`
      UPDATE lecturer_reports 
      SET status = ?, tanggapan_admin = COALESCE(?, tanggapan_admin), is_archived = ?, updated_at = ?
      WHERE id = ?
    `).run(currentStatus, tanggapan_admin || null, is_archived, now, params.id);
    
    db.prepare('INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, ?)').run(
      session.user_id, `update_laporan_dosen_${params.id}`, `Status: ${laporan.status} -> ${currentStatus}`, now
    );
    
    // Notify
    db.prepare('INSERT INTO notifications (user_id, message, created_at) VALUES (?, ?, ?)').run(
      laporan.user_id, `Laporan dosen "${laporan.judul}" berubah status menjadi ${currentStatus}`, now
    );
    
    return NextResponse.json({ success: true, message: `Status berhasil diperbarui menjadi ${currentStatus}` });
  } catch (error) {
    console.error('Update laporan dosen error:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
