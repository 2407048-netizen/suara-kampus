import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_SERVER || 'smtp.gmail.com',
  port: parseInt(process.env.MAIL_PORT || '587'),
  secure: process.env.MAIL_USE_TLS === 'true' ? false : false,
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
});

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
    const admin_response = formData.get('admin_response')?.toString().trim();
    const proof_file = formData.get('proof_file') as File;
    
    const ticket = await db.prepare('SELECT * FROM reports WHERE id = ?').get(params.id) as any;
    
    if (!ticket) {
      return NextResponse.json({ success: false, message: 'Laporan tidak ditemukan' }, { status: 404 });
    }

    let proof_filename = ticket.proof_file;
    if (proof_file && proof_file.size > 0) {
      proof_filename = `proof_${Date.now()}_${proof_file.name}`;
      // handle blob upload
    }

    const now = new Date().toISOString();
    
    await db.prepare(`
      UPDATE reports 
      SET status = COALESCE(?, status), admin_response = COALESCE(?, admin_response), proof_file = ?, updated_at = ?
      WHERE id = ?
    `).run(status_baru || null, admin_response || null, proof_filename, now, params.id);
    
    // Notify
    await db.prepare('INSERT INTO notifications (user_id, message, created_at) VALUES (?, ?, ?)').run(
      ticket.user_id, `Status tiket "${ticket.judul}" berubah menjadi ${status_baru || ticket.status}`, now
    );
    
    if (status_baru === 'Selesai' && ticket.status !== 'Selesai') {
      const user = await db.prepare('SELECT email FROM users WHERE id = ?').get(ticket.user_id) as any;
      if (user && user.email) {
        try {
          await transporter.sendMail({
            from: process.env.MAIL_DEFAULT_SENDER || 'Suara Kampus ITG <email_anda@gmail.com>',
            to: user.email,
            subject: `Update Status Laporan #${ticket.id} - Suara Kampus ITG`,
            text: `Halo,\n\nLaporan Anda dengan judul "${ticket.judul}" telah diperbarui.\n\nStatus Terbaru: Selesai\n\nSilakan login ke sistem Suara Kampus untuk melihat detail dan mengunduh laporan PDF.\n\nTerima kasih,\nAdmin Suara Kampus ITG`
          });
        } catch (e) {
          console.error("Email error:", e);
        }
      }
    }
    
    return NextResponse.json({ success: true, message: `Status berhasil diperbarui` });
  } catch (error) {
    console.error('Update status error:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
