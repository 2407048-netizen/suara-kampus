-- ============================================================
-- Suara Kampus ITG - Turso Database Schema (Production)
-- Jalankan sekali saja di database Turso Anda untuk inisialisasi.
-- Gunakan: turso db shell <nama-db> < turso_schema.sql
-- ============================================================

-- USERS
CREATE TABLE IF NOT EXISTS users (
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
);

-- REPORTS (Pengaduan Mahasiswa)
CREATE TABLE IF NOT EXISTS reports (
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
);

-- LECTURER REPORTS (Laporan Dosen)
CREATE TABLE IF NOT EXISTS lecturer_reports (
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
);

-- ASPIRATIONS (Aspirasi & Saran)
CREATE TABLE IF NOT EXISTS aspirations (
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
);

-- ASPIRATION VOTES
CREATE TABLE IF NOT EXISTS aspiration_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  aspiration_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  vote_type TEXT NOT NULL,
  created_at TEXT,
  UNIQUE(aspiration_id, user_id),
  FOREIGN KEY (aspiration_id) REFERENCES aspirations(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ASPIRATION REACTIONS (alternative vote table)
CREATE TABLE IF NOT EXISTS aspiration_reactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  aspirasi_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  tipe TEXT NOT NULL,
  created_at TEXT
);

-- CHATS (per tiket laporan)
-- ticket_id = reports.id ; sender_id = users.id
CREATE TABLE IF NOT EXISTS chats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at TEXT,
  FOREIGN KEY (ticket_id) REFERENCES reports(id),
  FOREIGN KEY (sender_id) REFERENCES users(id)
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  link TEXT,
  created_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  created_at TEXT
);

-- CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama TEXT NOT NULL,
  deskripsi TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- PDF REPORTS
CREATE TABLE IF NOT EXISTS pdf_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER,
  file_path TEXT,
  generated_at TEXT
);

-- ============================================================
-- SEED: Admin Account (password: admin123)
-- bcrypt hash of 'admin123'
-- ============================================================
INSERT OR IGNORE INTO users (nim, nama, email, password_hash, role, status_aktif, is_deleted, is_verified, created_at, updated_at)
VALUES (
  'ADMIN001',
  'Administrator',
  'admin@itg.ac.id',
  '$2b$10$rBqKrNXZR.d8ViTFQT2nAuQxYkzFjbj0Tpqk.P6cHJI1KXEhT.VRu',
  'admin',
  'aktif',
  0,
  1,
  datetime('now'),
  datetime('now')
);

-- ============================================================
-- SEED: Default Categories
-- ============================================================
INSERT OR IGNORE INTO categories (nama, deskripsi, created_at, updated_at) VALUES
  ('Infrastruktur', 'Masalah bangunan, fasilitas fisik kampus', datetime('now'), datetime('now')),
  ('Akademik', 'Masalah perkuliahan, nilai, dan akademik', datetime('now'), datetime('now')),
  ('Layanan Administrasi', 'Masalah administrasi dan pelayanan', datetime('now'), datetime('now')),
  ('Kebersihan & Lingkungan', 'Masalah kebersihan dan lingkungan kampus', datetime('now'), datetime('now')),
  ('Teknologi & IT', 'Masalah sistem informasi dan teknologi', datetime('now'), datetime('now')),
  ('Lainnya', 'Kategori lainnya', datetime('now'), datetime('now'));
