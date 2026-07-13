import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { put } from '@vercel/blob';
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
    const admin_response = formData.get('admin_response')?.toString().trim() || null;
    const proof_file = formData.get('proof_file') as File | null;
    
    if (status_baru) {
      const ticket = await db.prepare('SELECT * FROM reports WHERE id = ?').get(params.id) as any;
      
      if (ticket) {
        const old_status = ticket.status;
        const now = new Date().toISOString();
        let proof_url = ticket.proof_file;

        let proof_file_name = null;
        let proof_file_size = null;
        let proof_file_type = null;

        if (proof_file && proof_file.size > 0) {
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
            if (!allowedTypes.includes(proof_file.type)) {
                return NextResponse.json({ success: false, message: 'Format file tidak didukung. Gunakan JPG, PNG, atau WEBP.' }, { status: 400 });
            }
            if (proof_file.size > 5 * 1024 * 1024) {
                return NextResponse.json({ success: false, message: 'Ukuran file maksimal 5 MB.' }, { status: 400 });
            }

            if (!process.env.BLOB_READ_WRITE_TOKEN) {
                return NextResponse.json({ success: false, message: 'Konfigurasi Vercel Blob belum diatur (BLOB_READ_WRITE_TOKEN hilang).' }, { status: 500 });
            }

            const ext = proof_file.name.split('.').pop() || 'jpg';
            const uniqueFilename = `proof_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
            
            const blob = await put(uniqueFilename, proof_file, { access: 'public' });
            
            proof_url = blob.url;
            proof_file_name = proof_file.name;
            proof_file_size = proof_file.size;
            proof_file_type = proof_file.type;
        }

        await db.prepare('UPDATE reports SET status = ?, admin_response = ?, proof_file = ?, proof_file_name = ?, proof_file_size = ?, proof_file_type = ?, updated_at = ? WHERE id = ?')
          .run(status_baru, admin_response, proof_url, proof_file_name, proof_file_size, proof_file_type, now, params.id);
        
        await db.prepare('INSERT INTO notifications (user_id, message, created_at) VALUES (?, ?, ?)').run(
          ticket.user_id, `Status tiket "${ticket.judul}" berubah menjadi ${status_baru}`, now
        );

        if (status_baru === 'Selesai' && old_status !== 'Selesai') {
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
      }
    }
    
    return NextResponse.redirect(new URL(`/admin/reports/${params.id}`, request.url));
  } catch (error) {
    console.error('Update status error:', error);
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
}
