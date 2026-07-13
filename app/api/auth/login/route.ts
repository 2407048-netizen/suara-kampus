export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { signJWT } from '@/lib/auth';
import { verifyPassword } from '@/lib/password';

export async function POST(request: Request) {
  try {
    const { nim, password } = await request.json();

    if (!nim || !password) {
      return NextResponse.json({ success: false, message: 'NIM/NIP dan password harus diisi.' }, { status: 400 });
    }

    const user = await db.prepare('SELECT * FROM users WHERE nim = ?').get(nim) as any;

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json({ success: false, message: 'NIM/NIP atau password salah!' }, { status: 401 });
    }

    // Check email verification
    // Hanya blokir user yang sedang dalam proses verifikasi (ada otp_hash / email_token).
    // User lama yang terdaftar sebelum fitur verifikasi tetap bisa login jika mereka tidak punya token.
    const isInVerificationFlow = user.is_verified === 0 && ((user.email_token != null && user.email_token !== '') || (user.otp_hash != null && user.otp_hash !== ''));
    if (isInVerificationFlow) {
      return NextResponse.json({ 
        success: false, 
        message: 'Akun Anda belum diverifikasi. Silakan masukkan kode OTP yang telah dikirim ke email kampus Anda.',
        error_code: 'UNVERIFIED'
      }, { status: 403 });
    }

    const token = await signJWT({
      user_id: user.id,
      role: user.role,
      nama: user.nama,
      nim: user.nim,
      email: user.email,
    });

    const response = NextResponse.json({ success: true, message: `Selamat datang, ${user.nama}!` });
    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    // Log activity
    await db.prepare('INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, ?)').run(
      user.id, 'login', 'Login berhasil', new Date().toISOString()
    );

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
