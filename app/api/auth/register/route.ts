export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { sendOtpEmail } from '@/lib/mailer';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// Helper: log error detail ke console agar muncul di Vercel Functions logs
function logError(stage: string, error: unknown) {
  const e = error as any;
  console.error(`[REGISTER][ERROR][${stage}]`, {
    name: e?.name,
    message: e?.message,
    stack: e?.stack,
    raw: String(error),
  });
}

export async function POST(request: Request) {
  // ── 1. ENV VARS CHECK ──────────────────────────────────────────
  const envLog = {
    TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ? '✅ SET' : '❌ MISSING',
    TURSO_AUTH_TOKEN:   process.env.TURSO_AUTH_TOKEN   ? '✅ SET' : '❌ MISSING',
    JWT_SECRET_KEY:     process.env.JWT_SECRET_KEY     ? '✅ SET' : '❌ MISSING',
    SMTP_HOST:          process.env.SMTP_HOST           ? '✅ SET' : '❌ MISSING',
    SMTP_USER:          process.env.SMTP_USER           ? '✅ SET' : '❌ MISSING',
    SMTP_PASS:          process.env.SMTP_PASS           ? '✅ SET' : '❌ MISSING',
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN ? '✅ SET' : '❌ MISSING',
  };
  console.log('[REGISTER][ENV]', envLog);

  // ── 2. PARSE REQUEST ───────────────────────────────────────────
  let nim: string, nama: string, password: string;
  try {
    const body = await request.json();
    nim      = body.nim;
    nama     = body.nama;
    password = body.password;
    console.log('[REGISTER][REQUEST] nim:', nim, '| nama:', nama, '| password length:', password?.length);
  } catch (err) {
    logError('PARSE_REQUEST', err);
    return NextResponse.json({ success: false, message: 'Request body tidak valid.', stage: 'PARSE_REQUEST' }, { status: 400 });
  }

  // ── 3. VALIDATE INPUT ─────────────────────────────────────────
  if (!nim || !nama || !password) {
    console.warn('[REGISTER][VALIDATE] Field kosong:', { nim: !!nim, nama: !!nama, password: !!password });
    return NextResponse.json({ success: false, message: 'Semua field wajib diisi.' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ success: false, message: 'Password minimal 6 karakter!' }, { status: 400 });
  }
  const email = `${nim.trim()}@itg.ac.id`.toLowerCase();
  console.log('[REGISTER][VALIDATE] email generated:', email);

  // ── 4. DATABASE CONNECTION CHECK ──────────────────────────────
  try {
    console.log('[REGISTER][DB] Attempting DB connection check...');
    const pingResult = await db.prepare('SELECT 1 as ping').get() as any;
    console.log('[REGISTER][DB] Connection OK, ping:', pingResult);
  } catch (err) {
    logError('DB_CONNECTION', err);
    return NextResponse.json({
      success: false,
      message: 'Koneksi ke database gagal.',
      stage: 'DB_CONNECTION',
      detail: (err as any)?.message,
    }, { status: 500 });
  }

  // ── 5. CHECK EXISTING USER ────────────────────────────────────
  try {
    console.log('[REGISTER][DB] Checking existing user...');
    const existing = await db.prepare('SELECT id FROM users WHERE nim = ? OR email = ?').get(nim, email) as any;
    if (existing) {
      console.log('[REGISTER][DB] Existing user found, id:', existing.id);
      return NextResponse.json({ success: false, message: 'NIM/NIP atau Email sudah terdaftar!' }, { status: 400 });
    }
    console.log('[REGISTER][DB] No existing user found, proceeding...');
  } catch (err) {
    logError('DB_CHECK_EXISTING', err);
    return NextResponse.json({
      success: false,
      message: 'Gagal memeriksa data pengguna.',
      stage: 'DB_CHECK_EXISTING',
      detail: (err as any)?.message,
    }, { status: 500 });
  }

  // ── 6. HASH PASSWORD ──────────────────────────────────────────
  let hashedPassword: string;
  try {
    console.log('[REGISTER][HASH] Hashing password...');
    hashedPassword = await hashPassword(password);
    console.log('[REGISTER][HASH] Password hashed OK');
  } catch (err) {
    logError('HASH_PASSWORD', err);
    return NextResponse.json({ success: false, message: 'Gagal memproses password.', stage: 'HASH_PASSWORD', detail: (err as any)?.message }, { status: 500 });
  }

  // ── 7. GENERATE OTP ───────────────────────────────────────────
  let otp: string, otpHash: string, otpExpiry: string;
  try {
    console.log('[REGISTER][OTP] Generating OTP...');
    otp      = crypto.randomInt(100000, 999999).toString();
    otpHash  = await bcrypt.hash(otp, 10);
    otpExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    console.log('[REGISTER][OTP] OTP generated, expiry:', otpExpiry);
  } catch (err) {
    logError('GENERATE_OTP', err);
    return NextResponse.json({ success: false, message: 'Gagal membuat OTP.', stage: 'GENERATE_OTP', detail: (err as any)?.message }, { status: 500 });
  }

  // ── 8. AUTO MIGRATION (safe) ──────────────────────────────────
  console.log('[REGISTER][MIGRATION] Running safe ALTER TABLE migrations...');
  try { await db.prepare(`ALTER TABLE users ADD COLUMN otp_hash TEXT`).run(); console.log('[REGISTER][MIGRATION] otp_hash: added'); } catch (_) { console.log('[REGISTER][MIGRATION] otp_hash: already exists (OK)'); }
  try { await db.prepare(`ALTER TABLE users ADD COLUMN otp_expiry TEXT`).run(); console.log('[REGISTER][MIGRATION] otp_expiry: added'); } catch (_) { console.log('[REGISTER][MIGRATION] otp_expiry: already exists (OK)'); }
  try { await db.prepare(`ALTER TABLE users ADD COLUMN otp_attempts INTEGER DEFAULT 0`).run(); console.log('[REGISTER][MIGRATION] otp_attempts: added'); } catch (_) { console.log('[REGISTER][MIGRATION] otp_attempts: already exists (OK)'); }
  try { await db.prepare(`ALTER TABLE users ADD COLUMN otp_last_sent TEXT`).run(); console.log('[REGISTER][MIGRATION] otp_last_sent: added'); } catch (_) { console.log('[REGISTER][MIGRATION] otp_last_sent: already exists (OK)'); }

  // ── 9. INSERT USER ────────────────────────────────────────────
  const now = new Date().toISOString();
  let newUserId: unknown;
  try {
    console.log('[REGISTER][DB] Inserting new user...');
    const result = await db.prepare(`
      INSERT INTO users (nim, nama, email, password_hash, role, fakultas, status_aktif, is_deleted, is_verified, otp_hash, otp_expiry, otp_attempts, otp_last_sent, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      nim, nama, email, hashedPassword,
      'mahasiswa', 'Umum', 'aktif', 0,
      0, otpHash, otpExpiry, 0, now,
      now, now
    );
    newUserId = result.lastInsertRowid;
    console.log('[REGISTER][DB] User inserted, id:', newUserId);
  } catch (err) {
    logError('DB_INSERT_USER', err);
    return NextResponse.json({
      success: false,
      message: 'Gagal menyimpan data pengguna ke database.',
      stage: 'DB_INSERT_USER',
      detail: (err as any)?.message,
    }, { status: 500 });
  }

  // ── 10. LOG ACTIVITY ──────────────────────────────────────────
  try {
    await db.prepare('INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, ?)').run(
      newUserId, 'register', 'Registrasi akun - menunggu OTP', now
    );
    console.log('[REGISTER][DB] Activity logged OK');
  } catch (err) {
    // Tidak fatal, lanjutkan
    logError('DB_ACTIVITY_LOG', err);
  }

  // ── 11. SEND OTP EMAIL ────────────────────────────────────────
  try {
    console.log('[REGISTER][EMAIL] Sending OTP email to:', email);
    await sendOtpEmail(email, nama, otp);
    console.log('[REGISTER][EMAIL] Email sent successfully to:', email);
  } catch (emailError) {
    logError('SMTP_SEND', emailError);
    // Akun sudah dibuat, tapi email gagal → user bisa resend OTP
    return NextResponse.json({
      success: true,
      message: 'Registrasi berhasil! Namun OTP gagal terkirim ke email kampus. Silakan gunakan fitur Kirim Ulang OTP di halaman verifikasi.',
      emailError: (emailError as any)?.message,
    });
  }

  // ── 12. SUCCESS ───────────────────────────────────────────────
  console.log('[REGISTER][SUCCESS] Registration complete for nim:', nim);
  return NextResponse.json({
    success: true,
    message: `Registrasi berhasil! OTP telah dikirim ke ${email}.`
  });
}
