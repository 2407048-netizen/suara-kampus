import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const token = cookies().get('token')?.value;
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const session = await verifyJWT(token);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const reports = db.prepare(`
      SELECT r.*, u.nim 
      FROM reports r 
      LEFT JOIN users u ON r.user_id = u.id 
      WHERE r.kategori != 'Aspirasi & Saran'
      ORDER BY r.created_at DESC
    `).all() as any[];

    const header = ['ID', 'Tanggal', 'Pelapor (NIM)', 'Judul', 'Kategori', 'Lokasi', 'Prioritas', 'Status', 'Tanggapan Admin', 'Deskripsi'];
    const rows = reports.map(r => [
      r.id,
      r.created_at,
      r.nim || '-',
      r.judul,
      r.kategori,
      r.lokasi,
      r.prioritas,
      r.status,
      r.tanggapan_admin || r.admin_response || '-',
      r.deskripsi
    ]);

    const csvContent = [
      header.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return new NextResponse('\uFEFF' + csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="Laporan_SuaraKampus_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.csv"`
      }
    });
  } catch (error) {
    console.error('Export CSV error:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
