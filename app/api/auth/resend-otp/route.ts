export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { sendOtpEmail } from '@/lib/mailer';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { nim } = await request.json();

    if (!nim) {
      return NextResponse.json({ success: false, message: 'NIM harus diisi.' }, { status: 400 });
    }

    const user = await db.prepare('SELECT * FROM users WHERE nim = ?').get(nim) as any;

    if (!user) {
      return NextResponse.json({ success: false, message: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    if (user.is_verified === 1) {
      return NextResponse.json({ success: false, message: 'Akun sudah diverifikasi.' }, { status: 400 });
    }

    const now = new Date();

    // Rate limiting: 60 seconds
    if (user.otp_last_sent) {
      const lastSent = new Date(user.otp_last_sent);
      const diffSeconds = (now.getTime() - lastSent.getTime()) / 1000;
      if (diffSeconds < 60) {
        const remaining = Math.ceil(60 - diffSeconds);
        return NextResponse.json({ 
          success: false, 
          message: `Tunggu ${remaining} detik sebelum meminta OTP baru.` 
        }, { status: 429 });
      }
    }

    // Generate new OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiry = new Date(now.getTime() + 10 * 60 * 1000).toISOString(); // 10 menit
    const nowStr = now.toISOString();

    await db.prepare('UPDATE users SET otp_hash = ?, otp_expiry = ?, otp_attempts = 0, otp_last_sent = ? WHERE id = ?')
      .run(otpHash, otpExpiry, nowStr, user.id);

    // Send email
    const emailTo = user.email || `${user.nim}@itg.ac.id`;
    try {
      await sendOtpEmail(emailTo.toLowerCase(), user.nama, otp);
    } catch (err) {
      console.error('Email sending failed in resend:', err);
      return NextResponse.json({ success: false, message: 'Gagal mengirim email OTP. Periksa konfigurasi SMTP.' }, { status: 500 });
    }

    await db.prepare('INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, ?)')
      .run(user.id, 'resend_otp', 'Kirim ulang email OTP', nowStr);

    return NextResponse.json({ success: true, message: `OTP baru telah dikirim ke ${emailTo}` });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server saat mengirim ulang OTP.' }, { status: 500 });
  }
}
