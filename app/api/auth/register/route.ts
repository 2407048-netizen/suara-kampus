import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { hashPassword } from '@/lib/password';

export async function POST(request: Request) {
  try {
    const { nim, nama, email, password } = await request.json();

    if (!nim || !nama || !email || !password) {
      return NextResponse.json({ success: false, message: 'Semua field wajib diisi.' }, { status: 400 });
    }

    if (!email.toLowerCase().endsWith('@itg.ac.id')) {
      return NextResponse.json({ success: false, message: 'Email harus menggunakan domain @itg.ac.id!' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, message: 'Password minimal 6 karakter!' }, { status: 400 });
    }

    const checkStmt = db.prepare('SELECT id FROM users WHERE nim = ? OR email = ?');
    const existing = checkStmt.get(nim, email.toLowerCase()) as any;
    
    if (existing) {
      return NextResponse.json({ success: false, message: 'NIM/NIP atau Email sudah terdaftar!' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    const role = 'mahasiswa';
    const fakultas = 'Umum';
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO users (nim, nama, email, password_hash, role, fakultas, status_aktif, is_deleted, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(nim, nama, email.toLowerCase(), hashedPassword, role, fakultas, 'aktif', 0, now, now);
    
    // Log activity
    db.prepare('INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, ?)').run(
      result.lastInsertRowid, 'register', 'Registrasi akun berhasil', now
    );

    return NextResponse.json({ success: true, message: 'Registrasi berhasil! Silakan login.' });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
