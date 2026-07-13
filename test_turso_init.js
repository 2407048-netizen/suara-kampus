const https = require('https');

const TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODM5NDY2NjEsImlkIjoiMDE5ZjVhNTEtM2MwMS03Njc3LWFjNjQtOGEwZjI5NTI4ZmJlIiwia2lkIjoieXVxaWFzNF9MSVFKc3JoRzRBUG15bkVDTl90TmxSODVlYW1KbmFJWTJrSSIsInJpZCI6IjJhNGJkYThiLTk4MzItNDMyYi1iMDM5LTZmODc1ZmU1MTgxOSJ9.80fNqMSm9pz30aAHrgIlyzoY8nHUrl5GMat3bmCcNmtAbFiK9FPqPyTUt8WhalzRvvN9TQBxEJdrdS0N62BeAg';
const HOST = 'suara-kampus-2407048-netizen.aws-ap-northeast-1.turso.io';

function tursoExec(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ requests: [{ type: 'execute', stmt: { sql } }, { type: 'close' }] });
    const req = https.request({
      hostname: HOST, path: '/v2/pipeline', method: 'POST',
      headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
        const parsed = JSON.parse(data);
        const result = parsed.results[0];
        if (result.type === 'error') return reject(new Error(result.error.message));
        resolve(result.response.result);
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// All CREATE TABLE statements as an array (no semicolons needed individually)
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nim TEXT NOT NULL UNIQUE,
    nama TEXT NOT NULL,
    email TEXT,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'mahasiswa',
    fakultas TEXT DEFAULT 'Umum',
    jurusan TEXT,
    angkatan TEXT,
    foto_profil TEXT,
    status_aktif TEXT DEFAULT 'aktif',
    is_deleted INTEGER DEFAULT 0,
    is_verified INTEGER DEFAULT 0,
    email_token TEXT,
    token_expiry TEXT,
    otp_hash TEXT,
    otp_expiry TEXT,
    otp_attempts INTEGER DEFAULT 0,
    otp_last_sent TEXT,
    created_at TEXT,
    updated_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    kategori_id INTEGER,
    judul TEXT NOT NULL,
    kategori TEXT,
    prioritas TEXT DEFAULT 'Sedang',
    lokasi TEXT,
    deskripsi TEXT NOT NULL,
    foto TEXT,
    bukti_path TEXT,
    status TEXT DEFAULT 'Menunggu Persetujuan',
    tanggapan_admin TEXT,
    support_count INTEGER DEFAULT 0,
    admin_response TEXT,
    proof_file TEXT,
    is_deleted INTEGER DEFAULT 0,
    created_at TEXT,
    updated_at TEXT,
    file_name TEXT,
    file_size INTEGER,
    file_type TEXT,
    proof_file_name TEXT,
    proof_file_size INTEGER,
    proof_file_type TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS lecturer_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    nama_dosen TEXT NOT NULL,
    mata_kuliah TEXT NOT NULL,
    kelas TEXT,
    semester TEXT,
    judul TEXT NOT NULL,
    kronologi TEXT NOT NULL,
    dampak TEXT,
    bukti_path TEXT,
    status TEXT DEFAULT 'Diajukan',
    tanggapan_admin TEXT,
    is_archived INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0,
    created_at TEXT,
    updated_at TEXT,
    file_name TEXT,
    file_size INTEGER,
    file_type TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS aspirations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    judul TEXT NOT NULL,
    isi TEXT NOT NULL,
    is_anonymous INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    catatan_admin TEXT,
    like_count INTEGER DEFAULT 0,
    dislike_count INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0,
    created_at TEXT,
    updated_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS aspiration_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aspiration_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    vote_type TEXT NOT NULL,
    created_at TEXT,
    UNIQUE(aspiration_id, user_id),
    FOREIGN KEY (aspiration_id) REFERENCES aspirations(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS aspiration_reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aspirasi_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    tipe TEXT NOT NULL,
    created_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at TEXT,
    FOREIGN KEY (ticket_id) REFERENCES reports(id),
    FOREIGN KEY (sender_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    link TEXT,
    created_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    created_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    deskripsi TEXT,
    created_at TEXT,
    updated_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS pdf_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER,
    file_path TEXT,
    generated_at TEXT
  )`,
  // Seed admin (password: admin123)
  `INSERT OR IGNORE INTO users (nim, nama, email, password_hash, role, status_aktif, is_deleted, is_verified, created_at, updated_at)
   VALUES ('ADMIN001', 'Administrator', 'admin@itg.ac.id', '$2b$10$rBqKrNXZR.d8ViTFQT2nAuQxYkzFjbj0Tpqk.P6cHJI1KXEhT.VRu', 'admin', 'aktif', 0, 1, datetime('now'), datetime('now'))`,
  // Seed categories
  `INSERT OR IGNORE INTO categories (nama, deskripsi, created_at, updated_at) VALUES ('Infrastruktur', 'Masalah bangunan dan fasilitas fisik', datetime('now'), datetime('now'))`,
  `INSERT OR IGNORE INTO categories (nama, deskripsi, created_at, updated_at) VALUES ('Akademik', 'Masalah perkuliahan dan akademik', datetime('now'), datetime('now'))`,
  `INSERT OR IGNORE INTO categories (nama, deskripsi, created_at, updated_at) VALUES ('Layanan Administrasi', 'Masalah administrasi', datetime('now'), datetime('now'))`,
  `INSERT OR IGNORE INTO categories (nama, deskripsi, created_at, updated_at) VALUES ('Kebersihan & Lingkungan', 'Masalah kebersihan kampus', datetime('now'), datetime('now'))`,
  `INSERT OR IGNORE INTO categories (nama, deskripsi, created_at, updated_at) VALUES ('Teknologi & IT', 'Masalah sistem dan teknologi', datetime('now'), datetime('now'))`,
  `INSERT OR IGNORE INTO categories (nama, deskripsi, created_at, updated_at) VALUES ('Lainnya', 'Kategori lainnya', datetime('now'), datetime('now'))`,
];

async function main() {
  console.log('=== STEP 1: KONEKSI ===');
  await tursoExec('SELECT 1');
  console.log('✅ Koneksi Turso: BERHASIL');

  console.log('\n=== STEP 2: INISIALISASI SCHEMA ===');
  for (let i = 0; i < SCHEMA.length; i++) {
    const label = SCHEMA[i].trim().slice(0, 50).replace(/\n/g, ' ') + '...';
    try {
      await tursoExec(SCHEMA[i]);
      console.log(`✅ [${i+1}/${SCHEMA.length}] ${label}`);
    } catch (e) {
      console.warn(`⚠️  [${i+1}/${SCHEMA.length}] SKIP: ${e.message.slice(0,80)}`);
    }
  }

  console.log('\n=== STEP 3: VERIFIKASI ===');
  const tables = await tursoExec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log('Tabel:', tables.rows.map(r => r[0].value).join(', '));

  const users = await tursoExec('SELECT COUNT(*) as c FROM users');
  console.log('Jumlah users:', users.rows[0][0].value);

  const admin = await tursoExec("SELECT nim, nama, role FROM users WHERE role='admin'");
  if (admin.rows.length > 0) {
    const r = admin.rows[0];
    console.log('Admin: NIM=' + r[0].value + ', Nama=' + r[1].value + ', Role=' + r[2].value);
  }

  console.log('\n=== HASIL ===');
  console.log('✅ Database Turso siap digunakan!');
  console.log('✅ Admin login: NIM=ADMIN001, Password=admin123');
}

main().catch(e => console.error('FATAL:', e.message));
