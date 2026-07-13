export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { nim, otp } = await request.json();

    if (!nim || !otp) {
      return NextResponse.json({ success: false, message: 'NIM dan OTP wajib diisi.' }, { status: 400 });
    }

    const user = await db.prepare('SELECT * FROM users WHERE nim = ?').get(nim) as any;

    if (!user) {
      return NextResponse.json({ success: false, message: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    if (user.is_verified === 1) {
      return NextResponse.json({ success: false, message: 'Akun sudah diverifikasi.' }, { status: 400 });
    }

    if (!user.otp_hash) {
      return NextResponse.json({ success: false, message: 'Kode OTP tidak ditemukan. Silakan kirim ulang OTP.' }, { status: 400 });
    }

    // Cek batas percobaan
    if (user.otp_attempts >= 5) {
      return NextResponse.json({ 
        success: false, 
        message: 'Maksimal percobaan OTP tercapai. Silakan kirim ulang OTP.' 
      }, { status: 403 });
    }

    // Cek kedaluwarsa
    if (user.otp_expiry && new Date(user.otp_expiry) < new Date()) {
      return NextResponse.json({ 
        success: false, 
        message: 'Kode OTP telah kedaluwarsa.' 
      }, { status: 400 });
    }

    // Verifikasi OTP
    const isValid = await bcrypt.compare(otp, user.otp_hash);

    if (!isValid) {
      // Increment attempts
      await db.prepare('UPDATE users SET otp_attempts = otp_attempts + 1 WHERE id = ?').run(user.id);
      return NextResponse.json({ success: false, message: 'Kode OTP tidak valid.' }, { status: 400 });
    }

    // Berhasil verifikasi
    await db.prepare('UPDATE users SET is_verified = 1, otp_hash = NULL, otp_expiry = NULL, otp_attempts = 0, updated_at = ? WHERE id = ?')
      .run(new Date().toISOString(), user.id);

    await db.prepare('INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, ?)')
      .run(user.id, 'verify_otp', 'Email berhasil diverifikasi via OTP', new Date().toISOString());

    return NextResponse.json({ success: true, message: 'Akun berhasil diverifikasi! Silakan login.' });

  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
