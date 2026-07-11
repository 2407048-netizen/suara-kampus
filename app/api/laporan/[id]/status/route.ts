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
    if (!token) return NextResponse.redirect(new URL('/login', request.url));
    const session = await verifyJWT(token);
    if (!session || !['admin', 'staff'].includes(session.role)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    const formData = await request.formData();
    const status_baru = formData.get('status')?.toString().trim();
    
    if (status_baru) {
      const getReport = db.prepare('SELECT * FROM reports WHERE id = ?');
      const ticket = getReport.get(params.id) as any;
      
      if (ticket) {
        const old_status = ticket.status;
        const now = new Date().toISOString();
        db.prepare('UPDATE reports SET status = ?, updated_at = ? WHERE id = ?').run(status_baru, now, params.id);
        
        db.prepare('INSERT INTO notifications (user_id, message, created_at) VALUES (?, ?, ?)').run(
          ticket.user_id, `Status tiket "${ticket.judul}" berubah menjadi ${status_baru}`, now
        );

        if (status_baru === 'Selesai' && old_status !== 'Selesai') {
          const user = db.prepare('SELECT email FROM users WHERE id = ?').get(ticket.user_id) as any;
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
      }
    }
    
    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (error) {
    console.error('Update status error:', error);
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
}
