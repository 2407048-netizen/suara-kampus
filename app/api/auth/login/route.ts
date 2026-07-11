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

    const stmt = db.prepare('SELECT * FROM users WHERE nim = ?');
    const user = stmt.get(nim) as any;

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json({ success: false, message: 'NIM/NIP atau password salah!' }, { status: 401 });
    }

    const token = await signJWT({
      user_id: user.id,
      role: user.role,
      nama: user.nama,
      nim: user.nim
    });

    const response = NextResponse.json({ success: true, message: 'Selamat datang!' });
    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    // Log activity
    db.prepare('INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, ?)').run(
      user.id, 'login', 'Login berhasil', new Date().toISOString()
    );

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
