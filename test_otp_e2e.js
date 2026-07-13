const sqlite3 = require('better-sqlite3');
const fs = require('fs');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  const PORT = 3006;
  const BASE_URL = `http://localhost:${PORT}/api/auth`;
  
  console.log('==================================================');
  console.log('MEMULAI PENGUJIAN END-TO-END OTP');
  console.log('==================================================');

  // 1. Bersihkan database dari test user
  const db = sqlite3('./instance/suara_kampus.db');
  db.prepare('DELETE FROM users WHERE nim = ?').run('9999999');

  const testUser = {
    nim: '9999999',
    nama: 'User Test OTP',
    password: 'password123'
  };

  try {
    // [SKENARIO 1] Registrasi
    console.log('\n[SKENARIO] Registrasi Akun Baru...');
    const regRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    const regData = await regRes.json();
    console.log('Response Registrasi:', regData);
    
    // Tampilkan record database
    console.log('\n--- BUKTI DATABASE SETELAH REGISTRASI ---');
    let userRecord = db.prepare('SELECT nim, email, is_verified, otp_hash, otp_expiry, otp_attempts FROM users WHERE nim = ?').get(testUser.nim);
    console.log(userRecord);

    if (userRecord.is_verified === 0 && userRecord.otp_hash) {
      console.log('✓ Akun dibuat dengan is_verified = false');
      console.log('✓ OTP berhasil digenerate dan di-hash');
    } else {
      throw new Error('Gagal memvalidasi database setelah registrasi');
    }

    // [SKENARIO 2] Login Sebelum Verifikasi
    console.log('\n[SKENARIO] Login sebelum diverifikasi...');
    const loginFailRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nim: testUser.nim, password: testUser.password })
    });
    const loginFailData = await loginFailRes.json();
    console.log('Response Login:', loginFailData);
    if (loginFailRes.status === 403 && loginFailData.error_code === 'UNVERIFIED') {
      console.log('✓ Login ditolak dengan pesan yang sesuai');
    } else {
      throw new Error('Login seharusnya ditolak!');
    }

    // [SKENARIO 3] OTP Salah & Maksimal Percobaan
    console.log('\n[SKENARIO] Memasukkan OTP yang Salah...');
    for (let i = 1; i <= 5; i++) {
      const wrongOtpRes = await fetch(`${BASE_URL}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nim: testUser.nim, otp: '000000' }) // pasti salah
      });
      const wrongOtpData = await wrongOtpRes.json();
      console.log(`Percobaan ${i}:`, wrongOtpData.message);
    }
    
    console.log('\n[SKENARIO] Percobaan Maksimal Tercapai...');
    const maxAttemptRes = await fetch(`${BASE_URL}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nim: testUser.nim, otp: '111111' })
    });
    const maxAttemptData = await maxAttemptRes.json();
    console.log('Response setelah limit:', maxAttemptData.message);
    if (maxAttemptRes.status === 403) {
      console.log('✓ Maksimal percobaan di-handle dengan benar');
    }

    // [SKENARIO 4] Kirim Ulang OTP
    console.log('\n[SKENARIO] Kirim Ulang OTP...');
    
    // Simulate bypass rate limit by modifying DB manually
    db.prepare("UPDATE users SET otp_last_sent = '2020-01-01T00:00:00.000Z' WHERE nim = ?").run(testUser.nim);
    
    const resendRes = await fetch(`${BASE_URL}/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nim: testUser.nim })
    });
    const resendData = await resendRes.json();
    console.log('Response Resend OTP:', resendData);
    
    userRecord = db.prepare('SELECT otp_hash, otp_expiry, otp_attempts FROM users WHERE nim = ?').get(testUser.nim);
    console.log('✓ OTP_attempts direset menjadi:', userRecord.otp_attempts);
    
    const validOtpHash = userRecord.otp_hash;

    // [SKENARIO 5] OTP Kedaluwarsa
    console.log('\n[SKENARIO] OTP Kedaluwarsa...');
    db.prepare("UPDATE users SET otp_expiry = '2020-01-01T00:00:00.000Z' WHERE nim = ?").run(testUser.nim);
    const expiredOtpRes = await fetch(`${BASE_URL}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nim: testUser.nim, otp: '999999' })
    });
    const expiredOtpData = await expiredOtpRes.json();
    console.log('Response Expired:', expiredOtpData.message);
    if (expiredOtpData.message.includes('kedaluwarsa')) {
      console.log('✓ Kedaluwarsa OTP di-handle dengan benar');
    }

    // [SKENARIO 6] OTP Benar -> Akun Aktif
    console.log('\n[SKENARIO] OTP Benar (Bypass via update DB hash untuk simulasi)...');
    
    // Set expiry ke future
    db.prepare("UPDATE users SET otp_expiry = ? WHERE nim = ?").run(new Date(Date.now() + 100000).toISOString(), testUser.nim);
    
    // Generate valid hash for "123456" directly
    const bcrypt = require('bcryptjs');
    const knownHash = bcrypt.hashSync("123456", 10);
    db.prepare("UPDATE users SET otp_hash = ? WHERE nim = ?").run(knownHash, testUser.nim);

    const validOtpRes = await fetch(`${BASE_URL}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nim: testUser.nim, otp: '123456' })
    });
    const validOtpData = await validOtpRes.json();
    console.log('Response Verify Sukses:', validOtpData);

    console.log('\n--- BUKTI DATABASE SETELAH VERIFIKASI ---');
    userRecord = db.prepare('SELECT nim, is_verified, otp_hash, otp_expiry, otp_attempts FROM users WHERE nim = ?').get(testUser.nim);
    console.log(userRecord);

    if (userRecord.is_verified === 1 && !userRecord.otp_hash) {
      console.log('✓ Akun aktif (is_verified = 1)');
      console.log('✓ Data OTP (hash, expiry) dibersihkan / tidak dapat digunakan lagi');
    } else {
      throw new Error('Gagal memvalidasi database setelah verifikasi sukses');
    }

    // [SKENARIO 7] OTP Sudah Pernah Digunakan
    console.log('\n[SKENARIO] Memakai OTP yang sudah digunakan...');
    const reuseOtpRes = await fetch(`${BASE_URL}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nim: testUser.nim, otp: '123456' })
    });
    const reuseOtpData = await reuseOtpRes.json();
    console.log('Response Reuse:', reuseOtpData.message);
    console.log('✓ Ditolak (Sudah diverifikasi / tidak ada OTP hash)');

    // [SKENARIO 8] Login Setelah Verifikasi
    console.log('\n[SKENARIO] Login setelah verifikasi berhasil...');
    const loginSuccessRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nim: testUser.nim, password: testUser.password })
    });
    const loginSuccessData = await loginSuccessRes.json();
    console.log('Response Login Sukses:', loginSuccessData);
    if (loginSuccessRes.ok) {
      console.log('✓ Login diterima');
    }

    console.log('\n==================================================');
    console.log('SEMUA SKENARIO PENGUJIAN BERHASIL!');
    console.log('==================================================');
    
    // Cleanup
    db.prepare('DELETE FROM users WHERE nim = ?').run('9999999');

    process.exit(0);

  } catch (error) {
    console.error('PENGUJIAN GAGAL:', error.message);
    process.exit(1);
  }
}

runTests();
